# Krishi Bondhu

**Smart field helper for Aman rice — Track C (Agritech)**

**Live demo:** https://krishi-bondhu-phi.vercel.app

---

## Problem

Many small rice farmers water and fertilize the **whole field on a fixed schedule**.  
That wastes water and fertilizer, and still misses dry or pest-stressed zones.

## Solution

**Krishi Bondhu** maps a **1-acre Aman field in Hathazari, Chattogram** into **48 plots**.  
Sensors and simple rules:

1. **Show** which zones are healthy, dry, or at pest risk  
2. **Advise** what to do (water, urea / TSP / MOP) — not a fixed calendar  
3. **Optional auto** for water and fertilizer; **pest is detection only**  
4. **Log** what was applied and roughly how much  
5. **Compare** expected yield with the system vs without  

This repo is a **browser concept simulation** (no real hardware required to demo).  
A low-cost sensor path is described in `docs/FEASIBILITY.md`.

---

## Quick start (local)

Open `index.html` via any static server (modules need HTTP, not `file://`):

```bash
npx serve .
# or: python -m http.server 5500
```

Then open the printed URL.

## Deploy

Static site — works on **Vercel** (Framework: Other, output = repo root).  
Public site: https://krishi-bondhu-phi.vercel.app

---

## Project structure

```
index.html
src/
  main.js      UI + charts + action log
  store.js     Field state, yield, bulk actions
  weather.js   Simple Chattogram-style weather
  data.js      Stages, thresholds, field constants
  style.css
docs/
  ARCHITECTURE.md
  FEASIBILITY.md
  AI_USAGE.md
```

---

## Features (demo)

| Area | What you can show |
|------|-------------------|
| Field map | 48 plots, rice texture, click inspector |
| Auto / manual | Auto water, auto fertilizer + one-plot / bulk buttons |
| Pest | Detection + alerts only (no treat step) |
| Advise | Actions + which fertilizer/supplement |
| Sensors | Averages, N·P·K, weather, risk counts |
| Charts | Last 12 field-hours, yield meter, stress bars |
| Log | Water / fertilizer applications with approximate amounts |

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md)  
- [Feasibility & cost](docs/FEASIBILITY.md)  
- [AI usage note](docs/AI_USAGE.md)  

---

## Team note

Robofest Buildathon — Track C Agritech.  
Concept simulation for presentation; hardware path is optional follow-on.
