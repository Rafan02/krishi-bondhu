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
// ---------- state ----------
let day = 22;
let playing = false;
let timer = null;
let selected = null; // { r, c }
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

// ---------- helpers ----------
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

// ---------- shell ----------
function shell() {
  return `
  <header>
    <div class="brand">
      <div class="brand-icon">🌾</div>
      <div>
        <h1>Krishi Bondhu</h1>
        <p>1-acre Aman rice · Paba, Rajshahi</p>
      </div>
    </div>
    <div class="badges">
      <span class="badge" id="seasonBadge">Aman season</span>
      <span class="badge" id="rainBadge">Rain chance —</span>
      <span class="badge" id="dayLabel">Day 1</span>
    </div>
  </header>

  <div class="layout">
    <section>
      <div class="card">
        <div class="row" style="justify-content:space-between;margin-bottom:0.75rem">
          <h2 style="margin:0"><i class="fa-solid fa-cloud-sun"></i> Field conditions</h2>
          <div class="row">
            <button class="btn" id="btnPlay"><i class="fa-solid fa-play"></i> Start day</button>
            <button class="btn btn-ghost" id="btnReset">Reset</button>
            <label class="check-label">
              <input type="checkbox" id="autoIrrigate" />
              Auto water dry plots
            </label>
          </div>
        </div>
        <div class="stats four">
          <div class="stat"><div class="label">Air temp</div><div class="value" id="airTemp">—</div></div>
          <div class="stat"><div class="label">Air humidity</div><div class="value" id="airHum">—</div></div>
          <div class="stat"><div class="label">Today rain</div><div class="value" id="rainMm">—</div></div>
          <div class="stat"><div class="label">Growth stage</div><div class="value" id="growthStage" style="font-size:1rem">—</div></div>
        </div>
      </div>

      <div class="card">
        <h2><i class="fa-solid fa-border-all"></i> Field map <span style="font-weight:400;color:var(--muted);font-size:0.75rem">(48 plots · click one)</span></h2>
        <div class="col-labels">
          ${[...COL_LABELS].map((l) => `<div>${l}</div>`).join('')}
        </div>
        <div id="fieldGrid"></div>
        <div class="legend">
          <span><span class="swatch" style="background:#15803d"></span> Good</span>
          <span><span class="swatch" style="background:#ca8a04"></span> Dry / low</span>
          <span><span class="swatch" style="background:#9f1239"></span> Pest</span>
          <span><span class="swatch" style="background:#0369a1"></span> Too wet</span>
        </div>
        <p class="hint">North dries faster · South near canal stays wetter · Center can get pest risk</p>
      </div>

      <div class="card">
        <h2><i class="fa-solid fa-bolt"></i> Fix all problem plots (one click)</h2>
        <div class="bulk-row">
          <button class="btn btn-sky" id="bulkWater"><i class="fa-solid fa-droplet"></i> Water all dry</button>
          <button class="btn btn-amber" id="bulkFert"><i class="fa-solid fa-flask"></i> Fertilize all low</button>
          <button class="btn btn-rose" id="bulkPest"><i class="fa-solid fa-bug"></i> Treat all pest</button>
        </div>
        <p class="hint">No need to click every bad square. These buttons fix the whole field at once.</p>
      </div>

      <div class="card">
        <h2><i class="fa-solid fa-chart-column"></i> Yield: with system vs without</h2>
        <div class="chart-wrap"><canvas id="yieldChart"></canvas></div>
        <div class="yield-boxes">
          <div class="yield-box">
            <div class="label">Without help (start)</div>
            <div class="value" style="color:var(--amber)" id="yieldBase">—</div>
          </div>
          <div class="yield-box good">
            <div class="label">With Krishi Bondhu</div>
            <div class="value" style="color:var(--green)" id="yieldNow">—</div>
          </div>
        </div>
      </div>
    </section>

    <aside>
      <div class="card">
        <h2><i class="fa-solid fa-seedling"></i> <span id="plotTitle">Select a plot</span></h2>
        <div id="plotEmpty" class="hint" style="text-align:center;padding:1.5rem 0">Click any square on the field map</div>
        <div id="plotDetail" style="display:none">
          <div class="stats" style="margin-bottom:0.65rem">
            <div class="stat"><div class="label">Soil type</div><div class="value" style="font-size:0.95rem" id="pSoilType">—</div></div>
            <div class="stat"><div class="label">Soil quality</div><div class="value" style="font-size:0.95rem" id="pSoilQuality">—</div></div>
            <div class="stat"><div class="label">Moisture</div><div class="value" style="font-size:0.95rem" id="pMoisture">—</div></div>
            <div class="stat"><div class="label">Plant health</div><div class="value" style="font-size:0.95rem" id="pPlant">—</div></div>
          </div>
          <div class="label" style="font-size:0.7rem;color:var(--muted);margin-bottom:0.35rem">Nutrients (N · P · K)</div>
          <div class="bars" id="npkBars"></div>
          <div class="stats" style="margin:0.65rem 0">
            <div class="stat"><div class="label">Pest risk</div><div class="value" style="font-size:0.95rem" id="pPest">—</div></div>
            <div class="stat"><div class="label">Status</div><div class="value" style="font-size:0.95rem" id="pStatus">—</div></div>
          </div>
          <div class="row">
            <button class="btn btn-sky" id="actWater"><i class="fa-solid fa-droplet"></i> Water</button>
            <button class="btn btn-amber" id="actFert"><i class="fa-solid fa-flask"></i> Fertilizer</button>
            <button class="btn btn-rose" id="actPest"><i class="fa-solid fa-bug"></i> Treat pest</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2><i class="fa-solid fa-route"></i> Growth path to harvest</h2>
        <div id="growthPath"></div>
        <p class="hint">Plan changes with weather and field data — not a fixed calendar.</p>
      </div>

      <div class="card">
        <h2><i class="fa-solid fa-lightbulb"></i> What to do now</h2>
        <ul class="advice" id="adviceList"></ul>
      </div>

      <div class="card">
        <h2><i class="fa-solid fa-gauge-high"></i> Field average</h2>
        <div class="stats">
          <div class="stat"><div class="label">Avg moisture</div><div class="value" id="avgMoist">—</div></div>
          <div class="stat"><div class="label">Avg plant health</div><div class="value" id="avgPlant">—</div></div>
          <div class="stat"><div class="label">Plots need water</div><div class="value" style="color:var(--amber)" id="needWater">—</div></div>
          <div class="stat"><div class="label">Plots with pest</div><div class="value" style="color:var(--rose)" id="needPest">—</div></div>
        </div>
      </div>

      <div class="card">
        <h2>How it works</h2>
        <ol style="margin:0;padding-left:1.1rem;font-size:0.8rem;color:var(--muted);line-height:1.55">
          <li><strong style="color:var(--muted-2)">Sensors</strong> read soil type, quality, moisture, N-P-K, plant health, air humidity, and season.</li>
          <li><strong style="color:var(--muted-2)">System</strong> predicts yield and builds a water / fertilizer / pest plan from live data.</li>
          <li><strong style="color:var(--muted-2)">Map</strong> shows each sector. Use one-click bulk actions. Graph compares yield with vs without the system.</li>
        </ol>
      </div>
    </aside>
  </div>

  <footer>Krishi Bondhu · Robofest Buildathon Track C (Agritech) · Concept simulation</footer>
  `;
}

// ---------- render pieces ----------
function renderField() {
  const grid = document.getElementById('fieldGrid');
  grid.innerHTML = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = getPlot(r, c);
      const div = document.createElement('div');
      div.className = 'plot' + (selected && selected.r === r && selected.c === c ? ' selected' : '');
      div.style.backgroundColor = plotColor(p);
      div.innerHTML = `<span class="plot-label">${p.id}</span>`;
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
  if (!selected) {
    empty.style.display = 'block';
    detail.style.display = 'none';
    document.getElementById('plotTitle').textContent = 'Select a plot';
    return;
  }
  empty.style.display = 'none';
  detail.style.display = 'block';
  const p = getPlot(selected.r, selected.c);
  document.getElementById('plotTitle').textContent = 'Plot ' + p.id;
  document.getElementById('pSoilType').textContent = p.soilType;
  document.getElementById('pSoilQuality').textContent = soilQuality(p) + ' / 100';
  document.getElementById('pMoisture').textContent = Math.round(p.moisture) + '%';
  document.getElementById('pPlant').textContent = Math.round(p.plant) + ' / 100';
  document.getElementById('npkBars').innerHTML = `
    <div class="bar-row"><span>N</span><div class="bar-track"><div class="bar-fill bar-n" style="width:${p.n}%"></div></div><span>${Math.round(p.n)}</span></div>
    <div class="bar-row"><span>P</span><div class="bar-track"><div class="bar-fill bar-p" style="width:${p.p}%"></div></div><span>${Math.round(p.p)}</span></div>
    <div class="bar-row"><span>K</span><div class="bar-track"><div class="bar-fill bar-k" style="width:${p.k}%"></div></div><span>${Math.round(p.k)}</span></div>
  `;
  document.getElementById('pPest').textContent = Math.round(p.pest) + '% risk';
  const st = statusLabel(p);
  document.getElementById('pStatus').innerHTML = `<span class="${st.color}">${st.text}</span>`;
}

function renderWeather() {
  document.getElementById('airTemp').textContent = Math.round(weather.temp) + '°C';
  document.getElementById('airHum').textContent = Math.round(weather.humidity) + '%';
  document.getElementById('rainMm').textContent = weather.rainMm + ' mm';
  document.getElementById('rainBadge').textContent = 'Rain chance ' + weather.rainChance + '%';
  document.getElementById('dayLabel').textContent = 'Day ' + day;
  document.getElementById('growthStage').textContent = currentStage(day).name;
}

function renderAverages() {
  let m = 0,
    plant = 0,
    water = 0,
    pest = 0;
  plots.forEach((p) => {
    m += p.moisture;
    plant += p.plant;
    if (p.moisture < 42) water++;
    if (p.pest >= 30) pest++;
  });
  document.getElementById('avgMoist').textContent = Math.round(m / plots.length) + '%';
  document.getElementById('avgPlant').textContent = Math.round(plant / plots.length) + '/100';
  document.getElementById('needWater').textContent = water;
  document.getElementById('needPest').textContent = pest;
}

function renderGrowthPath() {
  const cur = currentStage(day);
  document.getElementById('growthPath').innerHTML = STAGES.map((s) => {
    const active = s.name === cur.name;
    const done = day > s.dayTo;
    return `<div class="path-item ${active ? 'active' : ''}">
      <div class="dot ${done ? 'done' : active ? 'now' : ''}"></div>
      <div>
        <div style="font-weight:600;${active ? 'color:var(--amber)' : ''}">${s.name}
          <span style="font-weight:400;color:var(--muted);font-size:0.7rem"> Day ${s.dayFrom}–${s.dayTo}</span>
        </div>
        <div style="font-size:0.75rem;color:var(--muted)">${active ? s.tip + ' (now)' : s.tip}</div>
      </div>
    </div>`;
  }).join('');
}

function renderAdvice() {
  const list = [];
  const dry = plots.filter((p) => p.moisture < 40).length;
  const pest = plots.filter((p) => p.pest >= 30).length;
  const lowN = plots.filter((p) => p.n < 40).length;
  const lowQ = plots.filter((p) => soilQuality(p) < 45).length;
  const stage = currentStage(day);

  if (dry > 0)
    list.push({
      icon: 'fa-droplet',
      color: 'text-sky',
      text: `${dry} plot(s) are dry. Use “Water all dry” or turn on auto water.`,
    });
  if (pest > 0)
    list.push({
      icon: 'fa-bug',
      color: 'text-rose',
      text: `${pest} plot(s) show pest risk. Use “Treat all pest”.`,
    });
  if (lowN > 3)
    list.push({
      icon: 'fa-flask',
      color: 'text-amber',
      text: 'Nitrogen is low on several plots. Use “Fertilize all low”.',
    });
  if (lowQ > 2)
    list.push({
      icon: 'fa-triangle-exclamation',
      color: 'text-orange',
      text: 'Soil quality is weak on some sectors. Fix moisture and nutrients there.',
    });
  if (weather.rainChance >= 55)
    list.push({
      icon: 'fa-cloud-rain',
      color: 'text-sky',
      text: `Rain chance is high (${weather.rainChance}%). You can skip some watering.`,
    });
  if (stage.name === 'Flowering')
    list.push({
      icon: 'fa-spa',
      color: 'text-green',
      text: 'Flowering stage: keep moisture steady. Avoid big water stress.',
    });
  if (stage.name === 'Mature')
    list.push({
      icon: 'fa-scissors',
      color: 'text-green',
      text: 'Almost ready to harvest. Drain extra water from wet plots.',
    });
  if (list.length === 0)
    list.push({
      icon: 'fa-check',
      color: 'text-green',
      text: 'Field looks balanced. Keep watching the map each day.',
    });

  document.getElementById('adviceList').innerHTML = list
    .map(
      (a) =>
        `<li><i class="fa-solid ${a.icon} ${a.color}" style="margin-top:2px"></i><span>${a.text}</span></li>`
    )
    .join('');
}

function renderYield() {
  const withY = estimateYield(plots, day, true, baseYield);
  document.getElementById('yieldBase').textContent = baseYield.toFixed(2) + ' t/ha';
  document.getElementById('yieldNow').textContent = withY.toFixed(2) + ' t/ha';

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
            borderColor: '#4ade80',
            backgroundColor: 'rgba(74,222,128,0.12)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
          },
          {
            label: 'Without system (start)',
            data: yieldHistory.without,
            borderColor: '#fbbf24',
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
        plugins: { legend: { labels: { color: '#a7f3d0', font: { size: 11 } } },
        scales: {
          x: {
            ticks: { color: '#6b8f71', maxTicksLimit: 8 },
            grid: { color: 'rgba(255,255,255,0.05)' },
          },
          y: {
            min: 1.5,
            max: 6.5,
            title: { display: true, text: 't/ha', color: '#6b8f71' },
            ticks: { color: '#6b8f71' },
            grid: { color: 'rgba(255,255,255,0.05)' },
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
  renderAverages();
  renderGrowthPath();
  renderAdvice();
  renderYield();
}

// ---------- day tick ----------
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

// ---------- wire events ----------
function bind() {
  document.getElementById('btnPlay').onclick = () => {
    playing = !playing;
    const btn = document.getElementById('btnPlay');
    if (playing) {
      btn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
      timer = setInterval(tick, 2800);
    } else {
      btn.innerHTML = '<i class="fa-solid fa-play"></i> Start day';
      clearInterval(timer);
    }
  };

  document.getElementById('btnReset').onclick = () => {
    playing = false;
    clearInterval(timer);
    document.getElementById('btnPlay').innerHTML = '<i class="fa-solid fa-play"></i> Start day';
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
    if (yieldChart) {
      yieldChart.destroy();
      yieldChart = null;
    }
    renderAll();
    toast('Field reset to Day 22 (tillering)');
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
    toast('Watered plot ' + getPlot(selected.r, selected.c).id);
  };
  document.getElementById('actFert').onclick = () => {
    if (!selected) return toast('Select a plot first');
    fertilizeOne(getPlot(selected.r, selected.c));
    renderAll();
    toast('Fertilizer on ' + getPlot(selected.r, selected.c).id);
  };
  document.getElementById('actPest').onclick = () => {
    if (!selected) return toast('Select a plot first');
    treatOne(getPlot(selected.r, selected.c));
    renderAll();
    toast('Pest treatment on ' + getPlot(selected.r, selected.c).id);
  };
}

// ---------- start ----------
document.getElementById('app').innerHTML = shell();
updateWeather(weather, day);
bind();
renderAll();
