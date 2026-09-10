import {
  createField,
  soilQuality,
  statusLabel,
  plotColor,
  currentStage,
  estimateYield,
  advanceDay,
  waterAllDry,
  fertilizeAllLow,
  treatAllPest,
  waterOne,
  fertilizeOne,
  treatOne,
  STAGES,
  COL_LABELS,
  ROWS,
  COLS,
  createSensorLog,
  pushSensorSample,
  avgMoisture,
} from './store.js';
import { createWeather, updateWeather } from './weather.js';
import { FIELD, RULES } from './data.js';

const Chart = window.Chart;

let day = 22;
let simHour = 13; // start afternoon for 12h labels
let playing = false;
let timer = null;
let selected = null;
let plots = createField();
let weather = createWeather();
let baseYield = estimateYield(plots, day, false, null);
let yieldHistory = {
  labels: ['Start'],
  withSys: [estimateYield(plots, day, true, baseYield)],
  without: [baseYield],
};
let yieldChart = null;
let sensorChart = null;
let stressChart = null;
let sensorLog = createSensorLog();
let autoIrrigate = false;
let autoFertilize = false;
let actionLog = []; // { time, text }


function getPlot(r, c) {
  return plots.find((p) => p.r === r && p.c === c);
}

function logAction(text) {
  const label = 'D' + day + ' · ' + hourLabel(simHour);
  actionLog.unshift({ time: label, text });
  if (actionLog.length > 40) actionLog.pop();
  renderActionLog();
}

function renderActionLog() {
  const box = document.getElementById('actionLog');
  if (!box) return;
  if (!actionLog.length) {
    box.innerHTML = '<p class="hint" style="margin:0">No actions yet. Water, fertilize, or run auto modes to fill this log.</p>';
    return;
  }
  box.innerHTML = actionLog.map((e) =>
    `<div class="log-item"><span class="log-time">${e.time}</span><span class="log-text">${e.text}</span></div>`
  ).join('');
}

function toast(msg) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}

function hourLabel(h) {
  const x = ((h % 24) + 24) % 24;
  return String(x).padStart(2, '0') + ':00';
}

function seedSensorLog() {
  sensorLog = createSensorLog();
  let h = simHour - 11;
  for (let i = 0; i < 12; i++) {
    const w = {
      temp: weather.temp + (Math.random() * 2 - 1),
      humidity: weather.humidity + (Math.random() * 6 - 3),
    };
    const m = avgMoisture(plots) + (Math.random() * 8 - 4);
    pushSensorSample(sensorLog, w, m, hourLabel(h + i));
  }
}

/** Rice texture closer to reference screenshot */
function riceSVG(p) {
  let stem = '#2f6b3c';
  if (p.pest >= RULES.pestHigh) stem = '#9f1239';
  else if (p.moisture < RULES.dryMoisture) stem = '#c4a35a';
  else if (p.moisture > RULES.wetMoisture) stem = '#1d4e7a';
  else if (p.plant < 50) stem = '#a16207';
  else if (p.plant >= 75) stem = '#166534';

  return `<svg viewBox="0 0 48 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="${stem}" stroke-width="1.8" fill="none" stroke-linecap="round">
      <path d="M9 42 C9 28 7 18 10 8"/>
      <path d="M16 42 C15 30 14 18 18 9"/>
      <path d="M24 42 C24 29 22 16 24 6"/>
      <path d="M32 42 C33 30 34 18 30 8"/>
      <path d="M39 42 C39 28 41 18 38 9"/>
    </g>
    <g fill="${stem}">
      <ellipse cx="10" cy="7" rx="2.2" ry="3.2"/>
      <ellipse cx="18" cy="8" rx="2.2" ry="3.2"/>
      <ellipse cx="24" cy="5" rx="2.4" ry="3.4"/>
      <ellipse cx="30" cy="7" rx="2.2" ry="3.2"/>
      <ellipse cx="38" cy="8" rx="2.2" ry="3.2"/>
    </g>
  </svg>`;
}

function soilBase(p) {
  // screenshot-like soil tones under stalks
  if (p.pest >= RULES.pestHigh) return '#4a1c1c';
  if (p.moisture > RULES.wetMoisture) return '#2c4a3e';
  if (p.moisture < RULES.dryMoisture) return '#8b7355';
  if (p.plant < 50) return '#6b5a3e';
  if (p.plant >= 75) return '#3d4a2e';
  return '#4a5636';
}

function shell() {
  return `
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark">KB</div>
      <div>
        <h1>Krishi Bondhu</h1>
        <p>Aman field intelligence</p>
      </div>
    </div>
    <nav class="nav">
      <button type="button" data-page="field" class="active">Field</button>
      <button type="button" data-page="sensors">Sensors</button>
      <button type="button" data-page="charts">Charts</button>
      <button type="button" data-page="advise">Advise</button>
      <button type="button" data-page="guide">How it works</button>
    </nav>
  </header>

  <div id="page-field" class="page active">
    <p class="page-kicker">${FIELD.name}</p>
    <h2 class="page-title">Live field grid</h2>
    <p class="page-sub">${FIELD.acres} acre · ${FIELD.crop}. Each square is a management zone a farmer can walk to. Color and rice texture show crop condition — not decoration.</p>

    <div class="summary">
      <div class="item"><div class="lab">Moisture</div><div class="num" id="sumMoist">—</div></div>
      <div class="item"><div class="lab">Pest load</div><div class="num" id="sumPest">—</div></div>
      <div class="item"><div class="lab">Plant health</div><div class="num" id="sumPlant">—</div></div>
    </div>

    <div class="weather-strip">
      <div>
        <div class="day" id="dayLabel">Aman day 22</div>
        <div class="meta" id="weatherMeta">Typical Chattogram morning</div>
      </div>
      <div class="metrics">
        <span id="airTemp">—</span>
        <span id="airHum">—</span>
        <span id="rainMm">—</span>
        <span id="rainBadge">—</span>
      </div>
      <button type="button" class="btn btn-primary" id="btnPlay">Run clock</button>
      <button type="button" class="btn" id="btnReset">Reset field</button>
      <label class="check-label"><input type="checkbox" id="autoIrrigate" /> Auto water</label>
      <label class="check-label"><input type="checkbox" id="autoFertilize" /> Auto fertilizer</label>
    </div>

    <div class="layout">
      <section>
        <div class="field-frame">
          <div class="field-meta">
            <span>North bund · road</span>
            <span>${FIELD.acres} acre · ${FIELD.plots} plots</span>
          </div>
          <div class="col-labels">${[...COL_LABELS].map((l) => `<div>${l}</div>`).join('')}</div>
          <div id="fieldGrid"></div>
        </div>
        <div class="legend">
          <span><span class="swatch" style="background:#3d4a2e"></span> Healthy</span>
          <span><span class="swatch" style="background:#8b7355"></span> Dry / weak</span>
          <span><span class="swatch" style="background:#4a1c1c"></span> Pest risk</span>
          <span><span class="swatch" style="background:#2c4a3e"></span> Too wet</span>
        </div>

        <div class="card" style="margin-top:1rem">
          <h2>Fix all problem plots</h2>
          <div class="bulk-row">
            <button type="button" class="btn btn-sky" id="bulkWater">Water all dry</button>
            <button type="button" class="btn btn-amber" id="bulkFert">Fertilize all low</button>
            <button type="button" class="btn btn-rose" id="bulkPest">Treat all pest</button>
          </div>
          <p class="hint">Manual one-click for the whole field. Or turn on Auto water / Auto fertilizer above.</p>
        </div>
      </section>

      <aside class="side-stack">
        <div class="card">
          <h2>Field overview</h2>
          <div class="stats-mini">
            <div class="stat-mini"><div class="lab">Avg moisture</div><div class="val" id="ovMoist">—</div></div>
            <div class="stat-mini"><div class="lab">Avg plant</div><div class="val" id="ovPlant">—</div></div>
            <div class="stat-mini"><div class="lab">Need water</div><div class="val" id="ovWater">—</div></div>
            <div class="stat-mini"><div class="lab">Pest plots</div><div class="val" id="ovPest">—</div></div>
          </div>
          <p class="hint" style="margin-top:0.65rem">Whole-field snapshot. Detail is in the plot inspector below.</p>
        </div>

        <div class="card" id="inspectorCard">
          <h2>Plot inspector</h2>
          <div id="plotEmpty" class="hint" style="padding:1.25rem 0;text-align:center">Click any square on the grid</div>
          <div id="plotDetail" style="display:none">
            <div class="inspector-title" id="plotTitle">A1</div>
            <div class="inspector-status" id="pStatus">—</div>
            <div class="meter"><div class="top"><span class="lab">Soil moisture</span><span class="val" id="pMoisture">—</span></div><div class="track"><div class="fill fill-moist" id="barMoist" style="width:40%"></div></div></div>
            <div class="meter"><div class="top"><span class="lab">Nitrogen (N)</span><span class="val" id="valN">—</span></div><div class="track"><div class="fill fill-n" id="barN" style="width:40%"></div></div></div>
            <div class="meter"><div class="top"><span class="lab">Phosphorus (P)</span><span class="val" id="valP">—</span></div><div class="track"><div class="fill fill-p" id="barP" style="width:40%"></div></div></div>
            <div class="meter"><div class="top"><span class="lab">Potassium (K)</span><span class="val" id="valK">—</span></div><div class="track"><div class="fill fill-k" id="barK" style="width:40%"></div></div></div>
            <div class="meter"><div class="top"><span class="lab">Pest load</span><span class="val" id="pPest">—</span></div><div class="track"><div class="fill fill-pest" id="barPest" style="width:20%"></div></div></div>
            <div class="meter"><div class="top"><span class="lab">Plant health</span><span class="val" id="pPlant">—</span></div><div class="track"><div class="fill fill-plant" id="barPlant" style="width:60%"></div></div></div>
            <div class="hint" id="pSoilLine">Soil type · quality</div>
            <div class="action-row">
              <button type="button" class="btn btn-primary" id="actWater">Irrigate</button>
              <button type="button" class="btn" id="actFert">Urea</button>
              <button type="button" class="btn btn-rose" id="actPest">Treat pest</button>
            </div>
            <p class="hint" id="pestHint" style="margin-top:0.5rem"></p>
            <button type="button" class="linkish" id="clearSel">Clear selection</button>
          </div>
        </div>

        <div class="card">
          <h2>Action log</h2>
          <p class="hint" style="margin-top:-0.25rem;margin-bottom:0.55rem">What was applied, roughly how much, and when (sim time).</p>
          <div id="actionLog" class="action-log"></div>
        </div>
      </aside>
    </div>
  </div>

  <div id="page-sensors" class="page">
    <p class="page-kicker">Live averages</p>
    <h2 class="page-title">Sensors</h2>
    <p class="page-sub">Field-wide readings from the simulated probes. Full charts are under the Charts tab.</p>

    <div class="stats-mini" style="margin-top:0.25rem">
      <div class="stat-mini"><div class="lab">Avg moisture</div><div class="val" id="avgMoist">—</div></div>
      <div class="stat-mini"><div class="lab">Avg plant health</div><div class="val" id="avgPlant">—</div></div>
      <div class="stat-mini"><div class="lab">Plots need water</div><div class="val" id="needWater">—</div></div>
      <div class="stat-mini"><div class="lab">Plots with pest</div><div class="val" id="needPest">—</div></div>
    </div>

    <div class="stats-mini" style="margin-top:0.5rem">
      <div class="stat-mini"><div class="lab">Avg nitrogen (N)</div><div class="val" id="avgN">—</div></div>
      <div class="stat-mini"><div class="lab">Avg phosphorus (P)</div><div class="val" id="avgP">—</div></div>
      <div class="stat-mini"><div class="lab">Avg potassium (K)</div><div class="val" id="avgK">—</div></div>
      <div class="stat-mini"><div class="lab">Soil quality avg</div><div class="val" id="avgSQ">—</div></div>
    </div>

    <div class="layout" style="margin-top:1rem">
      <div class="card">
        <h2>Air & weather probes</h2>
        <div class="stats-mini">
          <div class="stat-mini"><div class="lab">Air temperature</div><div class="val" id="senTemp">—</div></div>
          <div class="stat-mini"><div class="lab">Air humidity</div><div class="val" id="senHum">—</div></div>
          <div class="stat-mini"><div class="lab">Rain today</div><div class="val" id="senRain">—</div></div>
          <div class="stat-mini"><div class="lab">Rain chance</div><div class="val" id="senChance">—</div></div>
        </div>
        <p class="hint" style="margin-top:0.65rem">Used for irrigation timing and rain-aware advice.</p>
      </div>
      <div class="card">
        <h2>Field risk counts</h2>
        <div class="stats-mini">
          <div class="stat-mini"><div class="lab">Too dry</div><div class="val" id="cntDry">—</div></div>
          <div class="stat-mini"><div class="lab">Too wet</div><div class="val" id="cntWet">—</div></div>
          <div class="stat-mini"><div class="lab">Low nitrogen</div><div class="val" id="cntLowN">—</div></div>
          <div class="stat-mini"><div class="lab">Pest alerts</div><div class="val" id="cntPest">—</div></div>
        </div>
        <p class="hint" style="margin-top:0.65rem">Treat flagged plots from the Field map or with “Treat all pest”.</p>
      </div>
    </div>

    <div class="card" style="margin-top:1rem">
      <h2>Growth path to harvest</h2>
      <div id="growthPath"></div>
      <p class="hint">Plan follows weather and field data — not a fixed calendar.</p>
    </div>
  </div>

  <div id="page-advise" class="page">
    <p class="page-kicker">Recommendations</p>
    <h2 class="page-title">Advise</h2>
    <p class="page-sub">What to do now based on live field data — not a fixed calendar. Includes which fertilizer or supplement the field needs.</p>

    <div class="layout">
      <div class="card">
        <h2>What to do now</h2>
        <ul class="advice" id="adviceList"></ul>
      </div>
      <div class="card">
        <h2>Fertilizer & supplements</h2>
        <p class="hint" style="margin-top:-0.25rem;margin-bottom:0.75rem">Based on average N · P · K and plant condition across the field.</p>
        <ul class="advice" id="fertList"></ul>
      </div>
    </div>

    <div class="card" style="margin-top:1rem">
      <h2>Water & pest summary</h2>
      <ul class="advice" id="extraAdvice"></ul>
    </div>
  </div>

  <div id="page-charts" class="page">
    <p class="page-kicker">Visual analytics</p>
    <h2 class="page-title">Charts</h2>
    <p class="page-sub">Probe history, yield meter, and field stress at a glance. Same numbers the system uses for advice.</p>

    <div class="card">
      <h2>Last twelve field-hours</h2>
      <p class="hint" style="margin-top:-0.35rem;margin-bottom:0.75rem">Simulated probe log stored on-device. Moisture % · Temp °C · RH %</p>
      <div class="chart-wrap tall"><canvas id="sensorChart"></canvas></div>
    </div>

    <div class="layout" style="margin-top:1rem">
      <div class="card">
        <h2>Yield meter</h2>
        <p class="hint" style="margin-top:-0.35rem;margin-bottom:0.75rem">Expected t/ha with Krishi Bondhu vs without help</p>
        <div class="chart-wrap"><canvas id="yieldChart"></canvas></div>
        <div class="yield-boxes">
          <div class="yield-box"><div class="label">Without help</div><div class="value" id="yieldBase">—</div></div>
          <div class="yield-box good"><div class="label">With Krishi Bondhu</div><div class="value" id="yieldNow">—</div></div>
        </div>
      </div>
      <div class="card">
        <h2>Field stress snapshot</h2>
        <p class="hint" style="margin-top:-0.35rem;margin-bottom:0.75rem">How many plots need action right now</p>
        <div class="chart-wrap"><canvas id="stressChart"></canvas></div>
      </div>
    </div>
  </div>

  <div id="page-guide" class="page">
    <p class="page-kicker">Track C · Agritech</p>
    <h2 class="page-title">How it works</h2>
    <div class="card">
      <ol style="margin:0;padding-left:1.15rem;color:var(--muted);line-height:1.6;font-size:0.92rem">
        <li><strong style="color:var(--ink)">Sensors</strong> read soil type, quality, moisture, N·P·K, plant health, air humidity, and season / rain chance.</li>
        <li><strong style="color:var(--ink)">System</strong> predicts yield and builds a water / fertilizer / pest plan from live data — not a fixed timetable.</li>
        <li><strong style="color:var(--ink)">Map</strong> shows each sector. Yellow / red need attention. Auto or one-click water, fertilizer, and pest treatment. Graphs show 12-hour probes and yield with vs without the system.</li>
      </ol>
    </div>
  </div>

  <footer>Krishi Bondhu · Robofest Buildathon Track C (Agritech) · Concept simulation</footer>
  `;
}

function renderField() {
  const grid = document.getElementById('fieldGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = getPlot(r, c);
      const div = document.createElement('div');
      div.className = 'plot' + (selected && selected.r === r && selected.c === c ? ' selected' : '');
      div.style.backgroundColor = soilBase(p);
      div.innerHTML = riceSVG(p) + `<span class="plot-tag">${p.id}<br>${Math.round(p.moisture)}</span>`;
      div.title = `${p.id} · moisture ${Math.round(p.moisture)}% · plant ${Math.round(p.plant)}`;
      div.onclick = () => { selected = { r, c }; renderAll(); };
      grid.appendChild(div);
    }
  }
}

function renderInspector() {
  const empty = document.getElementById('plotEmpty');
  const detail = document.getElementById('plotDetail');
  if (!empty || !detail) return;
  if (!selected) {
    empty.style.display = 'block';
    detail.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  detail.style.display = 'block';
  const p = getPlot(selected.r, selected.c);
  document.getElementById('plotTitle').textContent = p.id;
  document.getElementById('pStatus').textContent = statusLabel(p).text;
  document.getElementById('pMoisture').textContent = Math.round(p.moisture) + '%';
  document.getElementById('barMoist').style.width = Math.min(100, p.moisture) + '%';
  document.getElementById('valN').textContent = Math.round(p.n);
  document.getElementById('valP').textContent = Math.round(p.p);
  document.getElementById('valK').textContent = Math.round(p.k);
  document.getElementById('barN').style.width = p.n + '%';
  document.getElementById('barP').style.width = p.p + '%';
  document.getElementById('barK').style.width = p.k + '%';
  document.getElementById('pPest').textContent = (Math.round(p.pest * 10) / 10).toString();
  document.getElementById('barPest').style.width = Math.min(100, p.pest) + '%';
  document.getElementById('pPlant').textContent = Math.round(p.plant).toString();
  document.getElementById('barPlant').style.width = p.plant + '%';
  document.getElementById('pSoilLine').textContent =
    p.soilType + ' · soil quality ' + soilQuality(p) + '/100';
  const ph = document.getElementById('pestHint');
  if (ph) {
    ph.textContent = p.pest >= 30
      ? 'Pest detected on this plot — use Treat pest to reduce load.'
      : 'No high pest signal on this plot.';
  }
}

function renderWeather() {
  document.getElementById('dayLabel').textContent = 'Aman day ' + day + ' · ' + hourLabel(simHour);
  document.getElementById('weatherMeta').textContent =
    currentStage(day).name + ' · typical Chattogram conditions';
  document.getElementById('airTemp').textContent = Math.round(weather.temp) + '°C air';
  document.getElementById('airHum').textContent = Math.round(weather.humidity) + '% RH';
  document.getElementById('rainMm').textContent = weather.rainMm + ' mm rain';
  document.getElementById('rainBadge').textContent = 'Rain chance ' + weather.rainChance + '%';
}

function renderSummary() {
  let m = 0, pest = 0, plant = 0, water = 0, pestN = 0;
  plots.forEach((p) => {
    m += p.moisture; pest += p.pest; plant += p.plant;
    if (p.moisture < RULES.autoWaterBelow) water++;
    if (p.pest >= RULES.pestAlert) pestN++;
  });
  const n = plots.length;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('sumMoist', Math.round(m / n) + '%');
  set('sumPest', Math.round(pest / n));
  set('sumPlant', Math.round(plant / n) + '%');
  set('ovMoist', Math.round(m / n) + '%');
  set('ovPlant', Math.round(plant / n) + '/100');
  set('ovWater', water);
  set('ovPest', pestN);
  set('avgMoist', Math.round(m / n) + '%');
  set('avgPlant', Math.round(plant / n) + '/100');
  set('needWater', water);
  set('needPest', pestN);

  let sumN = 0, sumP = 0, sumK = 0, sumSQ = 0, dry = 0, wet = 0, lowN = 0;
  plots.forEach((p) => {
    sumN += p.n; sumP += p.p; sumK += p.k; sumSQ += soilQuality(p);
    if (p.moisture < RULES.dryMoisture) dry++;
    if (p.moisture > RULES.wetMoisture) wet++;
    if (p.n < RULES.lowNitrogen) lowN++;
  });
  set('avgN', Math.round(sumN / n));
  set('avgP', Math.round(sumP / n));
  set('avgK', Math.round(sumK / n));
  set('avgSQ', Math.round(sumSQ / n) + '/100');
  set('senTemp', Math.round(weather.temp) + '°C');
  set('senHum', Math.round(weather.humidity) + '%');
  set('senRain', weather.rainMm + ' mm');
  set('senChance', weather.rainChance + '%');
  set('cntDry', dry);
  set('cntWet', wet);
  set('cntLowN', lowN);
  set('cntPest', pestN);
}

function renderGrowthPath() {
  const box = document.getElementById('growthPath');
  if (!box) return;
  const cur = currentStage(day);
  box.innerHTML = STAGES.map((s) => {
    const active = s.name === cur.name;
    const done = day > s.dayTo;
    return `<div class="path-item ${active ? 'active' : ''}">
      <div class="dot ${done ? 'done' : active ? 'now' : ''}"></div>
      <div>
        <div style="font-weight:600">${s.name}
          <span style="font-weight:400;color:var(--muted);font-size:0.75rem"> Day ${s.dayFrom}–${s.dayTo}</span>
        </div>
        <div style="font-size:0.78rem;color:var(--muted)">${active ? s.tip + ' (now)' : s.tip}</div>
      </div>
    </div>`;
  }).join('');
}

function renderAdvice() {
  const list = [];
  const fert = [];
  const extra = [];
  const dry = plots.filter((p) => p.moisture < RULES.dryMoisture).length;
  const wet = plots.filter((p) => p.moisture > RULES.wetMoisture).length;
  const pest = plots.filter((p) => p.pest >= RULES.pestAlert).length;
  const lowN = plots.filter((p) => p.n < RULES.lowNitrogen).length;
  const lowP = plots.filter((p) => p.p < 40).length;
  const lowK = plots.filter((p) => p.k < 40).length;
  const weak = plots.filter((p) => p.plant < 50).length;
  const stage = currentStage(day);

  let avgN = 0, avgP = 0, avgK = 0;
  plots.forEach((p) => { avgN += p.n; avgP += p.p; avgK += p.k; });
  const n = plots.length || 1;
  avgN /= n; avgP /= n; avgK /= n;

  if (dry > 0) list.push(`${dry} plot(s) are dry. Use “Water all dry” or turn on Auto water.`);
  if (wet > 0) list.push(`${wet} plot(s) are too wet. Ease irrigation there; drain if near harvest.`);
  if (lowN > 3) list.push(`${lowN} plot(s) are low on nitrogen. Use “Fertilize all low” or Auto fertilizer.`);
  if (weak > 0) list.push(`${weak} plot(s) show weak plant health — check moisture and nutrients on the map.`);
  if (stage.name === 'Flowering') list.push('Flowering stage: keep moisture steady; avoid big water stress.');
  if (stage.name === 'Mature') list.push('Almost ready to harvest. Drain extra water from wet plots.');
  if (!list.length) list.push('Field looks balanced. Keep watching the map each day.');

  // Fertilizer / supplement recommendations
  if (avgN < 45 || lowN > 5) {
    fert.push('Urea (nitrogen) — field average N is low. Priority supplement for leafy growth and tillering.');
  } else if (avgN < 55) {
    fert.push('Light urea top-up — N is moderate. A small dose on pale plots is enough.');
  } else {
    fert.push('Nitrogen (urea) — levels look OK. No heavy urea needed right now.');
  }

  if (avgP < 42 || lowP > 5) {
    fert.push('TSP / DAP (phosphorus) — low P. Helps roots and early growth; apply on weak plots.');
  } else {
    fert.push('Phosphorus — average looks acceptable. No urgent P fertilizer.');
  }

  if (avgK < 42 || lowK > 5) {
    fert.push('MOP (potassium) — low K. Supports grain fill and stress tolerance.');
  } else {
    fert.push('Potassium — average looks acceptable. No urgent K fertilizer.');
  }

  if (stage.name === 'Tillering' && avgN < 60) {
    fert.push('Tillering stage tip: a split urea dose often works better than one heavy application.');
  }
  if (stage.name === 'Grain fill') {
    fert.push('Grain-fill tip: avoid heavy new nitrogen; focus on steady moisture and existing K.');
  }
  if (avgN >= 55 && avgP >= 45 && avgK >= 45) {
    fert.push('Overall: N·P·K are in a fair range. Prefer targeted plot fixes over broadcasting the whole field.');
  }

  // Water & pest summary
  if (weather.rainChance >= RULES.highRainChance) {
    extra.push(`Rain chance is high (${weather.rainChance}%). You can skip some watering today.`);
  } else if (dry > 0) {
    extra.push('Rain chance is not high — dry plots still need irrigation (manual or Auto water).');
  } else {
    extra.push('Moisture looks manageable field-wide. Watch the map after the next hot day.');
  }

  if (pest > 0) {
    extra.push(`${pest} plot(s) flagged for pest risk. Check red zones on the Field map and use Treat pest or “Treat all pest”.`);
  } else {
    extra.push('No high pest signal field-wide right now. Keep scanning the map after humid days.');
  }

  if (autoIrrigate) extra.push('Auto water is ON — dry plots will be watered as the clock runs.');
  if (autoFertilize) extra.push('Auto fertilizer is ON — low-nutrient plots get urea-style top-ups as the clock runs.');

  const ul = document.getElementById('adviceList');
  if (ul) ul.innerHTML = list.map((x) => `<li>${x}</li>`).join('');
  const fl = document.getElementById('fertList');
  if (fl) fl.innerHTML = fert.map((x) => `<li>${x}</li>`).join('');
  const ex = document.getElementById('extraAdvice');
  if (ex) ex.innerHTML = extra.map((x) => `<li>${x}</li>`).join('');
}

function renderSensorChart() {
  const canvas = document.getElementById('sensorChart');
  if (!canvas || !window.Chart) return;
  if (!sensorChart) {
    sensorChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: sensorLog.labels,
        datasets: [
          { label: 'Moisture %', data: sensorLog.moisture, borderColor: '#1f6b3a', backgroundColor: 'transparent', tension: 0.35, pointRadius: 0, borderWidth: 2 },
          { label: 'Temp °C', data: sensorLog.temp, borderColor: '#9a6b3a', backgroundColor: 'transparent', tension: 0.35, pointRadius: 0, borderWidth: 2 },
          { label: 'RH %', data: sensorLog.rh, borderColor: '#3d5a6b', backgroundColor: 'transparent', tension: 0.35, pointRadius: 0, borderWidth: 2 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#6b7c6b', boxWidth: 12, font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#8a9a8a', maxRotation: 0 }, grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false } },
          y: { min: 0, max: 100, ticks: { color: '#8a9a8a' }, grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false } },
        },
      },
    });
  } else {
    sensorChart.data.labels = sensorLog.labels;
    sensorChart.data.datasets[0].data = sensorLog.moisture;
    sensorChart.data.datasets[1].data = sensorLog.temp;
    sensorChart.data.datasets[2].data = sensorLog.rh;
    sensorChart.update('none');
  }
}

function renderYield() {
  const withY = estimateYield(plots, day, true, baseYield);
  const b = document.getElementById('yieldBase');
  const n = document.getElementById('yieldNow');
  if (b) b.textContent = baseYield.toFixed(2) + ' t/ha';
  if (n) n.textContent = withY.toFixed(2) + ' t/ha';
  if (!window.Chart || !document.getElementById('yieldChart')) return;
  if (!yieldChart) {
    yieldChart = new Chart(document.getElementById('yieldChart').getContext('2d'), {
      type: 'line',
      data: {
        labels: yieldHistory.labels,
        datasets: [
          { label: 'With Krishi Bondhu', data: yieldHistory.withSys, borderColor: '#1f6b3a', backgroundColor: 'rgba(31,107,58,0.1)', fill: true, tension: 0.3, pointRadius: 3 },
          { label: 'Without system', data: yieldHistory.without, borderColor: '#b45309', borderDash: [5, 4], backgroundColor: 'transparent', tension: 0.3, pointRadius: 2 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#6b7c6b', font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#8a9a8a', maxTicksLimit: 8 }, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: { min: 1.5, max: 6.5, title: { display: true, text: 't/ha', color: '#8a9a8a' }, ticks: { color: '#8a9a8a' }, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
      },
    });
  } else {
    yieldChart.data.labels = yieldHistory.labels;
    yieldChart.data.datasets[0].data = yieldHistory.withSys;
    yieldChart.data.datasets[1].data = yieldHistory.without;
    yieldChart.update('none');
  }
}


function renderStressChart() {
  const canvas = document.getElementById('stressChart');
  if (!canvas || !window.Chart) return;
  let dry = 0, pest = 0, lowN = 0, ok = 0;
  plots.forEach((p) => {
    if (p.pest >= RULES.pestAlert) pest++;
    else if (p.moisture < RULES.dryMoisture) dry++;
    else if (p.n < RULES.lowNitrogen) lowN++;
    else ok++;
  });
  const labels = ['Healthy', 'Dry', 'Low N', 'Pest'];
  const data = [ok, dry, lowN, pest];
  const colors = ['#1f6b3a', '#b45309', '#ca8a04', '#9f1239'];
  if (!stressChart) {
    stressChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderRadius: 8, maxBarThickness: 48 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#6b7c6b' }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { stepSize: 1, color: '#8a9a8a' }, grid: { color: 'rgba(0,0,0,0.06)' } },
        },
      },
    });
  } else {
    stressChart.data.datasets[0].data = data;
    stressChart.update('none');
  }
}

function renderAll() {
  renderField();
  renderInspector();
  renderWeather();
  renderSummary();
  renderGrowthPath();
  renderAdvice();
  renderSensorChart();
  renderYield();
  renderStressChart();
  renderActionLog();
}

function tick() {
  day += 1;
  simHour = (simHour + 1) % 24;
  updateWeather(weather, day);
  advanceDay(plots, weather);
  if (autoIrrigate) {
    const n = waterAllDry(plots);
    if (n > 0) {
      logAction(`Water · ${n} dry plot(s) · ~18–26 mm each (auto)`);
      toast('Auto water: ' + n + ' dry plot(s)');
    }
  }
  if (autoFertilize) {
    const n = fertilizeAllLow(plots);
    if (n > 0) {
      logAction(`Urea (N) top-up · ${n} plot(s) · ~12–18 units (auto)`);
      toast('Auto fertilizer: ' + n + ' plot(s)');
    }
  }
  pushSensorSample(sensorLog, weather, avgMoisture(plots), hourLabel(simHour));
  const ys = estimateYield(plots, day, true, baseYield);
  yieldHistory.labels.push('D' + day);
  yieldHistory.withSys.push(ys);
  yieldHistory.without.push(baseYield);
  if (yieldHistory.labels.length > 12) {
    yieldHistory.labels.shift();
    yieldHistory.withSys.shift();
    yieldHistory.without.shift();
  }
  renderAll();
  toast('Day ' + day + ' · ' + currentStage(day).name);
}

function showPage(name) {
  document.querySelectorAll('.page').forEach((el) => el.classList.remove('active'));
  const el = document.getElementById('page-' + name);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.page === name);
  });
  if (name === 'charts') { renderSensorChart(); renderYield(); renderStressChart(); }
}

function bind() {
  document.querySelectorAll('.nav button').forEach((b) => {
    b.onclick = () => showPage(b.dataset.page);
  });

  document.getElementById('btnPlay').onclick = () => {
    playing = !playing;
    const btn = document.getElementById('btnPlay');
    if (playing) {
      btn.textContent = 'Pause';
      timer = setInterval(tick, 2800);
    } else {
      btn.textContent = 'Run clock';
      clearInterval(timer);
    }
  };

  document.getElementById('btnReset').onclick = () => {
    playing = false;
    clearInterval(timer);
    document.getElementById('btnPlay').textContent = 'Run clock';
    day = 22;
    simHour = 13;
    selected = null;
    plots = createField();
    weather = createWeather();
    updateWeather(weather, day);
    baseYield = estimateYield(plots, day, false, null);
    yieldHistory = { labels: ['Start'], withSys: [estimateYield(plots, day, true, baseYield)], without: [baseYield] };
    if (yieldChart) { yieldChart.destroy(); yieldChart = null; }
    if (sensorChart) { sensorChart.destroy(); sensorChart = null; }
    if (stressChart) { stressChart.destroy(); stressChart = null; }
    seedSensorLog();
    actionLog = [];
    renderAll();
    toast('Field reset to Day 22');
  };

  document.getElementById('autoIrrigate').onchange = (e) => {
    autoIrrigate = e.target.checked;
    if (autoIrrigate) {
      logAction('Auto water turned ON');
      const n = waterAllDry(plots);
      renderAll();
      if (n > 0) {
        logAction(`Water · ${n} dry plot(s) · ~18–26 mm each (auto)`);
        toast('Auto water: ' + n + ' dry plot(s)');
      }
    } else {
      logAction('Auto water turned OFF');
      renderActionLog();
    }
  };

  document.getElementById('autoFertilize').onchange = (e) => {
    autoFertilize = e.target.checked;
    if (autoFertilize) {
      logAction('Auto fertilizer turned ON');
      const n = fertilizeAllLow(plots);
      renderAll();
      if (n > 0) {
        logAction(`Urea (N) top-up · ${n} plot(s) · ~12–18 units (auto)`);
        toast('Auto fertilizer: ' + n + ' plot(s)');
      }
    } else {
      logAction('Auto fertilizer turned OFF');
      renderActionLog();
    }
  };

  document.getElementById('bulkWater').onclick = () => {
    const n = waterAllDry(plots);
    renderAll();
    if (n) {
      logAction(`Water · ${n} dry plot(s) · ~20–25 mm each (manual bulk)`);
      toast(`Watered ${n} dry plot(s)`);
    } else toast('No dry plots right now');
  };
  document.getElementById('bulkFert').onclick = () => {
    const n = fertilizeAllLow(plots);
    renderAll();
    if (n) {
      logAction(`Urea (N) top-up · ${n} plot(s) · ~12–18 units N each (manual bulk)`);
      toast(`Fertilized ${n} low plot(s)`);
    } else toast('Nutrients look fine');
  };
  document.getElementById('bulkPest').onclick = () => {
    const n = treatAllPest(plots);
    renderAll();
    if (n) {
      logAction(`Pest treatment · ${n} plot(s) · load reduced (manual bulk)`);
      toast(`Treated ${n} pest plot(s)`);
    } else toast('No high-pest plots right now');
  };
  document.getElementById('actWater').onclick = () => {
    if (!selected) return toast('Select a plot first');
    const id = getPlot(selected.r, selected.c).id;
    waterOne(getPlot(selected.r, selected.c));
    renderAll();
    logAction(`Water · plot ${id} · ~20–28 mm (manual)`);
    toast('Irrigated ' + id);
  };
  document.getElementById('actFert').onclick = () => {
    if (!selected) return toast('Select a plot first');
    const id = getPlot(selected.r, selected.c).id;
    fertilizeOne(getPlot(selected.r, selected.c));
    renderAll();
    logAction(`Urea (N) + light P/K · plot ${id} · ~12–18 N units (manual)`);
    toast('Urea on ' + id);
  };
  document.getElementById('actPest').onclick = () => {
    if (!selected) return toast('Select a plot first');
    const p = getPlot(selected.r, selected.c);
    const id = p.id;
    treatOne(p);
    renderAll();
    logAction(`Pest treatment · plot ${id} · load reduced (manual)`);
    toast('Treated pest on ' + id);
  };
  document.getElementById('clearSel').onclick = () => {
    selected = null;
    renderAll();
  };
}

try {
  document.getElementById('app').innerHTML = shell();
  updateWeather(weather, day);
  seedSensorLog();
  bind();
  renderAll();
} catch (err) {
  console.error(err);
  document.getElementById('app').innerHTML =
    '<div style="padding:2rem;color:#9f1239;font-family:system-ui"><h2>App error</h2><pre style="white-space:pre-wrap">' +
    String(err && err.stack ? err.stack : err) +
    '</pre></div>';
}
