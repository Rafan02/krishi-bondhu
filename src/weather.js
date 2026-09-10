/**
 * Simple Aman-season weather for Chattogram area.
 */

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
function rnd(a, b) {
  return a + Math.random() * (b - a);
}

export function createWeather() {
  return {
    temp: 28,
    humidity: 76,
    rainMm: 0,
    rainChance: 40,
  };
}

export function updateWeather(weather, day) {
  weather.humidity = clamp(70 + rnd(-6, 12) + (day % 7 === 0 ? 8 : 0), 50, 95);
  weather.temp = clamp(27 + rnd(-2, 3) - (weather.humidity > 80 ? 1 : 0), 25, 34);
  weather.rainChance = clamp(
    Math.round((weather.humidity - 48) * 1.4 + rnd(-10, 15)),
    8,
    92
  );
  if (Math.random() * 100 < weather.rainChance * 0.35) {
    weather.rainMm = Math.round(rnd(3, 18));
  } else {
    weather.rainMm = 0;
  }
}
