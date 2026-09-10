# Feasibility & scalability — Krishi Bondhu

## Problem
Small rice farmers in Bangladesh often water and fertilize the **whole field** on a fixed schedule.  
That wastes water, money, and still misses dry or pest-hit pockets.

## Solution (this prototype)
Show the field as **sectors**. Sensors + simple rules say:
- which plots need water, fertilizer, or pest treatment
- expected yield **with** care vs **without**
- growth stage tips until harvest

## Feasibility (real world)
| Item | Approx. cost (pilot) | Notes |
|------|----------------------|--------|
| ESP32 board | low | Local shops / online |
| Soil moisture sensors | low | One per sector or zone |
| Basic NPK / EC probe | medium | Shared or fewer units |
| Solar + battery | medium | Off-grid capable |
| Phone app / web view | low | Same UI idea as this demo |

Farmer flow: open app → see red/yellow plots → water or treat those only (or use auto rules).

## Sustainability
- Less over-irrigation → saves water and fuel/pump time  
- Targeted fertilizer → less runoff  
- Early pest alert → lower crop loss  

## Scalability
1. **One acre** (this demo)  
2. **Several acres** — same sector map, more sensor nodes  
3. **Cooperative** — shared dashboard for a village group  

No need for heavy cloud AI on day one. Rules can run on phone or a small local device.

## What this Buildathon build proves
- Clear UX for non-technical farmers (simple words, color map)  
- Measurable benefit idea (yield with vs without)  
- Path from simulation → cheap IoT pilot without claiming fake accuracy  
