# Krishi Bondhu

**Robofest Buildathon — Track C Agritech**

Smart helper for a **1-acre Aman rice field** (Paba, Rajshahi).
Sensors + simple rules show which sectors need water, fertilizer, or pest care — and compare expected yield **with** the system vs **without**.

## One-line idea
Farmers stop watering the whole field on a fixed schedule. They act only where the map is yellow or red, and can fix all problem plots in **one click**.

## Open locally
Double-click `index.html` or open the folder with a simple static server.

If the browser blocks ES modules from file://, deploy to Vercel (below) or use any static server.

## Deploy to Vercel (no build step)
1. Push this folder to a public GitHub repo (name e.g. `krishi-bondhu`).
2. Go to vercel.com → Add New Project → import the repo.
3. Framework: Other. Build command: empty. Output directory: empty (or `.`).
4. Deploy → paste the live URL into this README.

You can also drag-and-drop the folder on Vercel.

## Project layout
```
index.html          entry
src/
  main.js           UI, day clock, chart, buttons
  store.js          field, yield math, bulk actions
  weather.js        rain / humidity / season
  style.css         layout
docs/
  ARCHITECTURE.md   system design for judges
  FEASIBILITY.md    cost, sustainability, scale
  AI_USAGE.md       required AI disclosure
```

## Features (Track C aligned)
- Field map (48 plots) with soil type, quality, moisture, N-P-K, plant health, pest
- Rain chance + growth path to harvest
- Bulk actions: Water all dry / Fertilize all low / Treat all pest
- Auto water toggle
- Yield graph: with system vs without
- Simple English UI for a short live demo

## Docs for judges
- docs/ARCHITECTURE.md
- docs/FEASIBILITY.md
- docs/AI_USAGE.md

## Note
Concept simulation for the Buildathon — clear idea and UX, not a claim of trained ML or finished hardware.
