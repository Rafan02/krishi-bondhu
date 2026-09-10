import { STAGES, RULES, YIELD } from './data.js';
export { STAGES };

/**
 * Farm state — 1-acre Aman rice field (48 plots).
 * North dries faster, south near canal wetter, center pest risk.
 */

export const COLS = 8;
export const ROWS = 6;
export const COL_LABELS = 'ABCDEFGH';

function rnd(a, b) {
  return a + Math.random() * (b - a);
}
function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function createField() {
  const plots = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const north = r < 2;
      const south = r >= 4;
      const center = r >= 2 && r <= 3 && c >= 2 && c <= 4;

      let moisture = rnd(48, 68);
      if (north) moisture -= rnd(12, 22);
      if (south) moisture += rnd(10, 18);
      moisture = clamp(moisture, 25, 95);

      let n = rnd(45, 70);
      let p = rnd(40, 65);
      let k = rnd(42, 68);
      if (north) {
        n -= 8;
        p -= 5;
      }
      if (center) n -= 5;

      let pest = rnd(5, 18);
      if (center) pest = rnd(28, 48);

      let plant = clamp(
        70 - pest * 0.4 + (moisture > 40 && moisture < 80 ? 10 : -8) + rnd(-5, 5),
        20,
        95
      );

      let soilType = 'Clay loam';
      if (north && c > 5) soilType = 'Sandy loam';
      else if (south) soilType = Math.random() > 0.5 ? 'Silty clay' : 'Clay loam';
      else if (c < 2) soilType = 'Loam';

      plots.push({
        r,
        c,
        id: COL_LABELS[c] + (r + 1),
        soilType,
        moisture,
        n,
        p,
        k,
        pest,
        plant,
        irrigatedToday: false,
      });
    }
  }
  return plots;
}

export function soilQuality(p) {
  const moistScore =
    p.moisture >= 45 && p.moisture <= 75 ? 90 : p.moisture >= 35 && p.moisture <= 85 ? 65 : 35;
  const nutScore = (p.n + p.p + p.k) / 3;
  const pestScore = clamp(100 - p.pest * 1.5, 0, 100);
  return Math.round(moistScore * 0.35 + nutScore * 0.4 + pestScore * 0.25);
}

export function statusLabel(p) {
  if (p.pest >= 35) return { text: 'Pest risk', color: 'text-rose' };
  if (p.moisture < 38) return { text: 'Too dry', color: 'text-amber' };
  if (p.moisture > 88) return { text: 'Too wet', color: 'text-sky' };
  if (soilQuality(p) < 45) return { text: 'Poor soil', color: 'text-orange' };
  if (p.plant < 50) return { text: 'Weak plants', color: 'text-amber' };
  return { text: 'Healthy', color: 'text-green' };
}

export function plotColor(p) {
  if (p.pest >= 35) return '#9f1239';
  if (p.moisture > 88) return '#0369a1';
  if (p.moisture < 38) return '#b45309';
  if (soilQuality(p) < 48 || p.plant < 48) return '#ca8a04';
  if (p.plant >= 75) return '#15803d';
  if (p.plant >= 60) return '#16a34a';
  return '#4d7c0f';
}

export function currentStage(day) {
  return STAGES.find((s) => day >= s.dayFrom && day <= s.dayTo) || STAGES[STAGES.length - 1];
}

export function estimateYield(plots, day, withSystem, baseYield) {
  let m = 0, nut = 0, pest = 0, plant = 0, sq = 0;
  plots.forEach((p) => {
    m += p.moisture;
    nut += (p.n + p.p + p.k) / 3;
    pest += p.pest;
    plant += p.plant;
    sq += soilQuality(p);
  });
  const n = plots.length;
  m /= n; nut /= n; pest /= n; plant /= n; sq /= n;

  let y = 2.2;
  if (m >= 50 && m <= 75) y += 1.1;
  else if (m >= 40 && m <= 85) y += 0.5;
  else y -= 0.4;
  y += (nut - 40) * 0.025;
  y += (plant - 50) * 0.02;
  y += (sq - 50) * 0.015;
  y -= pest * 0.025;
  const stage = currentStage(day);
  if (stage.name === 'Flowering' || stage.name === 'Grain fill') y += 0.15;

  if (!withSystem) {
    y *= 0.78;
    if (baseYield != null) y = Math.min(y, baseYield + 0.15);
  }
  return clamp(Math.round(y * 100) / 100, 1.5, 6.2);
}

export function advanceDay(plots, weather) {
  plots.forEach((p) => {
    let evap = 2.2 + rnd(0, 1.5);
    if (p.r < 2) evap += 1.8;
    if (p.r >= 4) evap -= 1.2;
    p.moisture -= evap;

    if (weather.rainMm > 0) {
      p.moisture += weather.rainMm * (0.6 + rnd(0, 0.3));
    }

    p.n = clamp(p.n - rnd(0.3, 0.9), 15, 100);
    p.p = clamp(p.p - rnd(0.15, 0.5), 15, 100);
    p.k = clamp(p.k - rnd(0.2, 0.6), 15, 100);

    if (p.pest > 15 && weather.humidity > 70) {
      p.pest = clamp(p.pest + rnd(0.5, 2.2), 0, 80);
    } else {
      p.pest = clamp(p.pest - rnd(0, 0.8), 0, 80);
    }

    let plantDelta = 0;
    if (p.moisture >= 45 && p.moisture <= 78) plantDelta += 1.2;
    else if (p.moisture < 35 || p.moisture > 90) plantDelta -= 2.5;
    if ((p.n + p.p + p.k) / 3 > 50) plantDelta += 0.8;
    else plantDelta -= 0.6;
    if (p.pest > 30) plantDelta -= 2;
    p.plant = clamp(p.plant + plantDelta + rnd(-0.5, 0.5), 15, 98);
    p.moisture = clamp(p.moisture, 15, 98);
    p.irrigatedToday = false;
  });
}

export function waterAllDry(plots) {
  let count = 0;
  plots.forEach((p) => {
    if (p.moisture < 42) {
      p.moisture = clamp(p.moisture + rnd(18, 26), 15, 95);
      p.irrigatedToday = true;
      p.plant = clamp(p.plant + 2, 15, 98);
      count++;
    }
  });
  return count;
}

export function fertilizeAllLow(plots) {
  let count = 0;
  plots.forEach((p) => {
    if ((p.n + p.p + p.k) / 3 < 48 || p.n < 40) {
      p.n = clamp(p.n + rnd(12, 18), 15, 100);
      p.p = clamp(p.p + rnd(6, 10), 15, 100);
      p.k = clamp(p.k + rnd(6, 10), 15, 100);
      p.plant = clamp(p.plant + 3, 15, 98);
      count++;
    }
  });
  return count;
}

export function treatAllPest(plots) {
  let count = 0;
  plots.forEach((p) => {
    if (p.pest >= 28) {
      p.pest = clamp(p.pest - rnd(18, 28), 0, 80);
      p.plant = clamp(p.plant + 4, 15, 98);
      count++;
    }
  });
  return count;
}

export function waterOne(p) {
  p.moisture = clamp(p.moisture + rnd(20, 28), 15, 95);
  p.irrigatedToday = true;
  p.plant = clamp(p.plant + 2, 15, 98);
}

export function fertilizeOne(p) {
  p.n = clamp(p.n + rnd(12, 18), 15, 100);
  p.p = clamp(p.p + rnd(6, 10), 15, 100);
  p.k = clamp(p.k + rnd(6, 10), 15, 100);
  p.plant = clamp(p.plant + 3, 15, 98);
}

export function treatOne(p) {
  p.pest = clamp(p.pest - rnd(18, 28), 0, 80);
  p.plant = clamp(p.plant + 4, 15, 98);
}

export function createSensorLog() {
  return { labels: [], moisture: [], temp: [], rh: [] };
}

export function pushSensorSample(log, weather, avgMoisture, hourLabel) {
  log.labels.push(hourLabel);
  log.moisture.push(Math.round(avgMoisture));
  log.temp.push(Math.round(weather.temp * 10) / 10);
  log.rh.push(Math.round(weather.humidity));
  while (log.labels.length > 12) {
    log.labels.shift();
    log.moisture.shift();
    log.temp.shift();
    log.rh.shift();
  }
  return log;
}

export function avgMoisture(plots) {
  if (!plots.length) return 0;
  return plots.reduce((s, p) => s + p.moisture, 0) / plots.length;
}
