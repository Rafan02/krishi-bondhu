/**
 * Simple Aman-season weather for Rajshahi area.
 * Humidity drives rain chance; occasional rain events wet the field.
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
    humidity: 72,
    rainMm: 0,
    rainChance: 35,
  };
}

export function updateWeather(weather, day) {
  weather.humidity = clamp(65 + rnd(-8, 12) + (day % 7 === 0 ? 8 : 0), 45, 95);
  weather.temp = clamp(27 + rnd(-2, 3) - (weather.humidity > 80 ? 1 : 0), 24, 34);
  weather.rainChance = clamp(
    Math.round((weather.humidity - 50) * 1.4 + rnd(-10, 15)),
    5,
    90
  );
  if (Math.random() * 100 < weather.rainChance * 0.35) {
    weather.rainMm = Math.round(rnd(3, 18));
  } else {
    weather.rainMm = 0;
  }
}
