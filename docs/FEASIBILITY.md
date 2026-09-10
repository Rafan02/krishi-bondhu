# Feasibility — Krishi Bondhu

## Problem (one line)

Fixed-schedule irrigation and fertilizer on small Aman fields waste water and inputs and miss stressed zones.

## Target user

Smallholder rice farmers in **Chattogram** (demo field: **Hathazari**), ~1 acre, phone access, limited budget.

## What this demo is

A **working software prototype** in the browser:

- Sector map, sensor-style readings, advice, optional auto water/fertilizer  
- Pest detection + treatment (manual / bulk)  
- Action log and yield comparison  

It does **not** claim a finished commercial product or a trained neural network in production.

## Hardware path (realistic next step)

| Item | Role | Rough cost (BDT, indicative) |
|------|------|------------------------------|
| Soil moisture sensors (3–6) | Zone moisture | 800–2,500 |
| Optional NPK / EC probe | Nutrients | 3,000–8,000 |
| ESP32 + power | Read sensors, send or store | 500–1,200 |
| Solar + battery (small) | Off-grid | 1,500–4,000 |
| Farmer phone + this web app | UI | 0 extra if phone exists |
| **Starter kit (estimate)** | One field pilot | **~7,000–15,000 BDT** |

No tractor robot required for the first version.

## Sustainability

- Water only dry zones (manual bulk or optional auto)  
- Fertilizer advice by nutrient (urea / TSP–DAP / MOP), not whole-field broadcast  
- Pest treatment targets flagged plots only (no whole-field spray)  
- Action log supports accountability and learning  

## Scalability

| Stage | Scope |
|-------|--------|
| Now | 1 acre, 48 plots, browser sim |
| Next | Same UI + real ESP32 moisture on 1 field |
| Later | Multiple fields / co-op dashboard |

## Offline-minded design

Static web app; probe log is simulated “on-device” series.  
Real deployment can buffer readings on ESP32 when the tower/network is down.

## Risks and honesty

| Risk | Mitigation |
|------|------------|
| Farmers distrust full auto fertilizer | Default = advise; auto is optional |
| Sensor drift / cost | Start with moisture only |
| Pest false alarms | Detection + human check; treat is manual (no auto spray) |

## Success metric (pilot idea)

Reduce unnecessary irrigation events and fertilizer bags per acre while keeping or improving yield — measured over one Aman season on a pilot plot.
