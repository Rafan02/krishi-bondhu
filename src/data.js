/**
 * Realism constants for 1-acre Aman rice — Hathazari, Chattogram.
 */

export const FIELD = {
  name: 'Demo field · Hathazari, Chattogram',
  crop: 'Aman rice',
  acres: 1.0,
  plots: 48,
  cols: 8,
  rows: 6,
  region: 'Chattogram',
};

export const STAGES = [
  { name: 'Seedling', dayFrom: 0, dayTo: 14, tip: 'Keep soil moist. Light water if dry.' },
  { name: 'Tillering', dayFrom: 15, dayTo: 40, tip: 'Main growth. Watch nitrogen and moisture.' },
  { name: 'Flowering', dayFrom: 41, dayTo: 65, tip: 'Avoid water stress. Check for blast.' },
  { name: 'Grain fill', dayFrom: 66, dayTo: 90, tip: 'Steady moisture. Reduce heavy fertilizer.' },
  { name: 'Mature', dayFrom: 91, dayTo: 110, tip: 'Drain water before harvest.' },
];

export const RULES = {
  dryMoisture: 40,
  autoWaterBelow: 42,
  wetMoisture: 88,
  pestAlert: 30,
  pestHigh: 35,
  lowNitrogen: 40,
  lowNutrientAvg: 48,
  lowSoilQuality: 45,
  highRainChance: 55,
};

export const YIELD = {
  min: 1.5,
  max: 6.2,
  baseWithoutFactor: 0.78,
};

export const CLIMATE = {
  tempMin: 25,
  tempMax: 34,
  humidityBase: 72,
};
