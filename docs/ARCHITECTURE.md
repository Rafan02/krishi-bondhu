# Architecture — Krishi Bondhu

## Overview

Client-only static web app (HTML + ES modules + Chart.js CDN).  
No backend required for the Buildathon demo.

```
Browser
  index.html
    └── src/main.js          UI, charts, action log, auto toggles
          ├── store.js       Plots, yield, bulk water/fertilizer
          ├── weather.js     Temp, RH, rain chance
          ├── data.js        Stages, thresholds, field metadata
          └── style.css
```

Live: https://krishi-bondhu-phi.vercel.app

## Data flow

1. **Init** — `createField()` builds 48 plots (north drier, south wetter, center higher pest risk).  
2. **Sensors (sim)** — moisture, N·P·K, plant health, pest score, weather.  
3. **Advise** — rules from `data.js` (`RULES`) → water / fertilizer / pest alerts.  
4. **Act** — manual (plot or bulk) or optional auto on day tick → **action log**.  
5. **Charts** — rolling 12-hour probe series; yield with system vs baseline; stress counts.

## Modules

| File | Responsibility |
|------|----------------|
| `data.js` | Field info, growth stages, thresholds, climate bounds |
| `weather.js` | Day-to-day temp / humidity / rain |
| `store.js` | Plot state, soil quality, yield estimate, bulk actions, sensor log buffer |
| `main.js` | Shell UI, pages (Field, Sensors, Charts, Advise, Guide), charts, log |

## Design choices

- **Rules over heavy ML** for a clear, demable prototype and offline logic  
- **Pest = detect only** — no treat pipeline in software  
- **Advise-first** — auto water/fertilizer are optional assists  
- **Static deploy** — Vercel / any static host  

## Future (hardware)

ESP32 reads moisture (and optional NPK) → HTTP or BLE → same UI fields.  
Architecture of the dashboard does not need to change.
