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
} from './store.js';
import { createWeather, updateWeather } from './weather.js';

const Chart = window.Chart;

let day = 22;
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
let autoIrrigate = false;
let page = 'field';

function getPlot(r, c) {
  return plots.find((p) => p.r === r && p.c === c);
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

/** Rice stalks SVG — color follows plot condition */
function riceSVG(p) {
  const c = plotColor(p);
  return `<svg viewBox="0 0 40 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="${c}" stroke-width="1.6" fill="none" stroke-linecap="round">
      <path d="M8 34 C8 22 6 14 8 6" />
      <path d="M14 34 C13 24 12 16 15 8" />
      <path d="M20 34 C20 22 19 14 20 5" />
      <path d="M26 34 C27 24 28 15 25 7" />
      <path d="M32 34 C32 22 34 14 32 6" />
    </g>
    <g fill="${c}" opacity="0.9">
      <circle cx="8" cy="5" r="1.3"/>
      <circle cx="15" cy="7" r="1.3"/>
      <circle cx="20" cy="4" r="1.3"/>
      <circle cx="25" cy="6" r="1.3"/>
      <circle cx="32" cy="5" r="1.3"/>
    </g>
  </svg>`;
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
      <button type="button" data-page="advise">Advise</button>
      <button type="button" data-page="guide">How it works</button>
    </nav>
  </header>

  <div id="page-field" class="page active">
    <p class="page-kicker">Demo field · Paba, Rajshahi</p>
    <h2 class="page-title">Live field grid</h2>
    <p class="page-sub">1.0 acre · Aman paddy. Each square is a management zone a farmer can walk to. Color and rice texture show crop condition — not decoration.</p>

    <div class="summary">
      <div class="item"><div class="lab">Moisture</div><div class="num" id="sumMoist">—</div></div>
      <div class="item"><div class="lab">Pest load</div><div class="num" id="sumPest">—</div></div>
      <div class="item"><div class="lab">Plant health</div><div class="num" id="sumPlant">—</div></div>
    </div>

    <div class="weather-strip">
      <div>
        <div class="day" id="dayLabel">Aman day 22</div>
        <div class="meta" id="weatherMeta">Typical Rajshahi morning</div>
      </div>
      <div class="metrics">
        <span id="airTemp">—</span>
        <span id="airHum">—</span>
        <span id="rainMm">—</span>
        <span id="rainBadge">—</span>
      </div>
      <button type="button" class="btn btn-primary" id="btnPlay">Run clock</button>
      <button type="button" class="btn" id="btnReset">Reset field</button>
      <label class="check-label"><input type="checkbox" id="autoIrrigate" /> Auto water dry</label>
    </div>

    <div class="layout">
      <section>
        <div class="field-frame">
          <div class="field-meta">
            <span>North bund · road</span>
            <span>1 acre · 48 plots</span>
          </div>
          <div class="col-labels">${[...COL_LABELS].map((l) => `<div>${l}</div>`).join('')}</div>
          <div id="fieldGrid"></div>
        </div>
        <div class="legend">
          <span><span class="swatch" style="background:#15803d"></span> Healthy</span>
          <span><span class="swatch" style="background:#ca8a04"></span> Dry / weak</span>
          <span><span class="swatch" style="background:#9f1239"></span> Pest risk</span>
          <span><span class="swatch" style="background:#0369a1"></span> Too wet</span>
        </div>
        <p class="hint">North dries faster · South near canal stays wetter · Center can show pest / blast risk</p>

        <div class="card" style="margin-top:1rem">
          <h2>Fix all problem plots</h2>
          <div class="bulk-row">
            <button type="button" class="btn btn-sky" id="bulkWater">Water all dry</button>
            <button type="button" class="btn btn-amber" id="bulkFert">Fertilize all low</button>
            <button type="button" class="btn btn-rose" id="bulkPest">Treat all pest</button>
          </div>
          <p class="hint">One click for every bad zone — no need to tap each square.</p>
        </div>
      </section>

      <aside>
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
              <button type="button" class="btn" id="actPest">Treat</button>
            </div>
            <button type="button" class="linkish" id="clearSel">Clear selection</button>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <div id="page-sensors" class="page">
    <p class="page-kicker">Live averages</p>
    <h2 class="page-title">Sensors</h2>
    <p class="page-sub">Field-wide readings the system uses for advice and yield.</p>
    <div class="stats-mini" style="margin-bottom:1rem">
      <div class="stat-mini"><div class="lab">Avg moisture</div><div class="val" id="avgMoist">—</div></div>
      <div class="stat-mini"><div class="lab">Avg plant health</div><div class="val" id="avgPlant">—</div></div>
      <div class="stat-mini"><div class="lab">Plots need water</div><div class="val" id="needWater">—</div></div>
      <div class="stat-mini"><div class="lab">Plots with pest</div><div class="val" id="needPest">—</div></div>
    </div>
    <div class="card">
      <h2>Growth stage</h2>
      <div id="growthPath"></div>
      <p class="hint">Plan follows weather and field data — not a fixed calendar.</p>
    </div>
  </div>

  <div id="page-advise" class="page">
    <p class="page-kicker">Recommendations</p>
    <h2 class="page-title">Advise</h2>
    <p class="page-sub">What to do now, and expected yield with vs without the system.</p>
    <div class="layout">
      <div class="card">
        <h2>What to do now</h2>
        <ul class="advice" id="adviceList"></ul>
      </div>
      <div class="card">
        <h2>Yield: with system vs without</h2>
        <div class="chart-wrap"><canvas id="yieldChart"></canvas></div>
        <div class="yield-boxes">
          <div class="yield-box"><div class="label">Without help</div><div class="value" id="yieldBase">—</div></div>
          <div class="yield-box good"><div class="label">With Krishi Bondhu</div><div class="value" id="yieldNow">—</div></div>
        </div>
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
        <li><strong style="color:var(--ink)">Map</strong> shows each sector. Yellow / red need attention. One-click bulk actions fix all problem plots. Graph compares yield with vs without the system.</li>
      </ol>
    </div>
    <p class="hint" style="margin-top:1rem">See docs/ARCHITECTURE.md, FEASIBILITY.md, and AI_USAGE.md in the GitHub repo.</p>
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
      div.style.backgroundColor = plotColor(p);
      div.innerHTML = riceSVG(p) + `<span class="plot-tag">${p.id} · ${Math.round(p.moisture)}</span>`;
      div.title = `${p.id} · moisture ${Math.round(p.moisture)}% · plant ${Math.round(p.plant)}`;
      div.onclick = () => {
        selected = { r, c };
        renderAll();
      };
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
  const st = statusLabel(p);
  document.getElementById('pStatus').textContent = st.text;
  document.getElementById('pMoisture').textContent = Math.round(p.moisture) + '%';
  document.getElementById('barMoist').style.width = Math.min(100, p.moisture) + '%';
  document.getElementById('valN').textContent = Math.round(p.n);
  document.getElementById('valP').textContent = Math.round(p.p);
  document.getElementById('valK').textContent = Math.round(p.k);
  document.getElementById('barN').style.width = p.n + '%';
  document.getElementById('barP').style.width = p.p + '%';
  document.getElementById('barK').style.width = p.k + '%';
  document.getElementById('pPest').textContent = Math.round(p.pest * 10) / 10;
  document.getElementById('barPest').style.width = Math.min(100, p.pest) + '%';
  document.getElementById('pPlant').textContent = Math.round(p.plant);
  document.getElementById('barPlant').style.width = p.plant + '%';
  document.getElementById('pSoilLine').textContent =
    p.soilType + ' · soil quality ' + soilQuality(p) + '/100';
}
function renderWeather() {
  document.getElementById('dayLabel').textContent = 'Aman day ' + day;
  document.getElementById('weatherMeta').textContent =
    currentStage(day).name + ' · typical Rajshahi conditions';
  document.getElementById('airTemp').textContent = Math.round(weather.temp) + '°C air';
  document.getElementById('airHum').textContent = Math.round(weather.humidity) + '% RH';
  document.getElementById('rainMm').textContent = weather.rainMm + ' mm rain';
  document.getElementById('rainBadge').textContent = 'Rain chance ' + weather.rainChance + '%';
}

function renderSummary() {
  let m = 0, pest = 0, plant = 0;
  plots.forEach((p) => { m += p.moisture; pest += p.pest; plant += p.plant; });
  const n = plots.length;
  document.getElementById('sumMoist').textContent = Math.round(m / n) + '%';
  document.getElementById('sumPest').textContent = Math.round(pest / n);
  document.getElementById('sumPlant').textContent = Math.round(plant / n) + '%';
}

function renderAverages() {
  let m = 0, plant = 0, water = 0, pest = 0;
  plots.forEach((p) => {
    m += p.moisture; plant += p.plant;
    if (p.moisture < 42) water++;
    if (p.pest >= 30) pest++;
  });
  const el = (id, v) => { const n = document.getElementById(id); if (n) n.textContent = v; };
  el('avgMoist', Math.round(m / plots.length) + '%');
  el('avgPlant', Math.round(plant / plots.length) + '/100');
  el('needWater', water);
  el('needPest', pest);
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
  const dry = plots.filter((p) => p.moisture < 40).length;
  const pest = plots.filter((p) => p.pest >= 30).length;
  const lowN = plots.filter((p) => p.n < 40).length;
  const stage = currentStage(day);
  if (dry > 0) list.push(`${dry} plot(s) are dry. Use “Water all dry” or turn on auto water.`);
  if (pest > 0) list.push(`${pest} plot(s) show pest risk. Use “Treat all pest”.`);
  if (lowN > 3) list.push('Nitrogen is low on several plots. Use “Fertilize all low”.');
  if (weather.rainChance >= 55) list.push(`Rain chance is high (${weather.rainChance}%). You can skip some watering.`);
  if (stage.name === 'Flowering') list.push('Flowering stage: keep moisture steady.');
  if (stage.name === 'Mature') list.push('Almost ready to harvest. Drain extra water from wet plots.');
  if (!list.length) list.push('Field looks balanced. Keep watching the map each day.');
  const ul = document.getElementById('adviceList');
  if (ul) ul.innerHTML = list.map((t) => `<li>${t}</li>`).join('');
}

function renderYield() {
  const withY = estimateYield(plots, day, true, baseYield);
  const b = document.getElementById('yieldBase');
  const n = document.getElementById('yieldNow');
  if (b) b.textContent = baseYield.toFixed(2) + ' t/ha';
  if (n) n.textContent = withY.toFixed(2) + ' t/ha';
  if (!window.Chart || !document.getElementById('yieldChart')) return;
  if (!yieldChart) {
    const ctx = document.getElementById('yieldChart').getContext('2d');
    yieldChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: yieldHistory.labels,
        datasets: [
          {
            label: 'With Krishi Bondhu',
            data: yieldHistory.withSys,
            borderColor: '#1f6b3a',
            backgroundColor: 'rgba(31,107,58,0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
          },
          {
            label: 'Without system',
            data: yieldHistory.without,
            borderColor: '#b45309',
            borderDash: [5, 4],
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#6b7c6b', font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: '#8a9a8a', maxTicksLimit: 8 }, grid: { color: 'rgba(0,0,0,0.05)' } },
          y: {
            min: 1.5, max: 6.5,
            title: { display: true, text: 't/ha', color: '#8a9a8a' },
            ticks: { color: '#8a9a8a' },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
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

function renderAll() {
  renderField();
  renderInspector();
  renderWeather();
  renderSummary();
  renderAverages();
  renderGrowthPath();
  renderAdvice();
  renderYield();
}

function tick() {
  day += 1;
  updateWeather(weather, day);
  advanceDay(plots, weather);
  if (autoIrrigate) {
    const n = waterAllDry(plots);
    if (n > 0) toast('Auto water: ' + n + ' dry plot(s)');
  }
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
  page = name;
  document.querySelectorAll('.page').forEach((el) => el.classList.remove('active'));
  const el = document.getElementById('page-' + name);
  if (el) el.classList.add('active');
  document.querySelectorAll('.nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.page === name);
  });
  if (name === 'advise') renderYield();
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
    selected = null;
    plots = createField();
    weather = createWeather();
    updateWeather(weather, day);
    baseYield = estimateYield(plots, day, false, null);
    yieldHistory = {
      labels: ['Start'],
      withSys: [estimateYield(plots, day, true, baseYield)],
      without: [baseYield],
    };
    if (yieldChart) { yieldChart.destroy(); yieldChart = null; }
    renderAll();
    toast('Field reset to Day 22');
  };

  document.getElementById('autoIrrigate').onchange = (e) => {
    autoIrrigate = e.target.checked;
    if (autoIrrigate) {
      const n = waterAllDry(plots);
      renderAll();
      if (n > 0) toast('Auto water: ' + n + ' dry plot(s)');
    }
  };

  document.getElementById('bulkWater').onclick = () => {
    const n = waterAllDry(plots);
    renderAll();
    toast(n ? `Watered ${n} dry plot(s)` : 'No dry plots right now');
  };
  document.getElementById('bulkFert').onclick = () => {
    const n = fertilizeAllLow(plots);
    renderAll();
    toast(n ? `Fertilized ${n} low plot(s)` : 'Nutrients look fine');
  };
  document.getElementById('bulkPest').onclick = () => {
    const n = treatAllPest(plots);
    renderAll();
    toast(n ? `Treated ${n} pest plot(s)` : 'No high pest risk');
  };

  document.getElementById('actWater').onclick = () => {
    if (!selected) return toast('Select a plot first');
    waterOne(getPlot(selected.r, selected.c));
    renderAll();
    toast('Irrigated ' + getPlot(selected.r, selected.c).id);
  };
  document.getElementById('actFert').onclick = () => {
    if (!selected) return toast('Select a plot first');
    fertilizeOne(getPlot(selected.r, selected.c));
    renderAll();
    toast('Urea on ' + getPlot(selected.r, selected.c).id);
  };
  document.getElementById('actPest').onclick = () => {
    if (!selected) return toast('Select a plot first');
    treatOne(getPlot(selected.r, selected.c));
    renderAll();
    toast('Treated ' + getPlot(selected.r, selected.c).id);
  };
  document.getElementById('clearSel').onclick = () => {
    selected = null;
    renderAll();
  };
}

try {
  document.getElementById('app').innerHTML = shell();
  updateWeather(weather, day);
  bind();
  renderAll();
} catch (err) {
  console.error(err);
  document.getElementById('app').innerHTML =
    '<div style="padding:2rem;color:#9f1239;font-family:system-ui"><h2>App error</h2><pre style="white-space:pre-wrap">' +
    String(err && err.stack ? err.stack : err) +
    '</pre></div>';
}
