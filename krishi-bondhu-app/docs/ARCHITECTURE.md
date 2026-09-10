# Architecture — Krishi Bondhu

## What this is
A **browser simulation** of a 1-acre Aman rice field in Paba, Rajshahi.  
It shows how cheap sensors + simple rules can guide water, fertilizer, and pest action by sector.

## Layers

```
[ Sensors (simulated) ]
        ↓
[ Field model — 48 plots ]  ← soil type, moisture, N·P·K, plant health, pest
        ↓
[ Rules engine ]            ← yield estimate, growth stage, advice, bulk actions
        ↓
[ UI ]                      ← map, inspector, yield chart, one-click fixes
```

## Files
| File | Role |
|------|------|
| `src/store.js` | Field grid, soil/plant math, yield model, bulk actions |
| `src/weather.js` | Air temp, humidity, rain chance (Aman season) |
| `src/main.js` | UI, day clock, Chart.js yield graph |
| `src/style.css` | Layout and colors |
| `index.html` | Entry page |

## Why this design
- **Offline-friendly concept**: logic runs in the browser; no server required after load.
- **Sector-based**: farmers act only on dry / low / pest plots — not the whole field every time.
- **Feasible hardware path**: same ideas map to ESP32 + soil moisture + cheap NPK probes in a real pilot.

## Not a black-box ML model
Yield and advice use clear, explainable formulas so judges can follow the logic in a short demo.
