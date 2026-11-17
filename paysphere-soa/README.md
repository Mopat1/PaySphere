# PaySphere: Self-Healing SOA for UPI-Scale Payments

Case study for **21CSE457T Service Oriented Architecture** (SRM Institute of Science and Technology).

PaySphere is a 23-service enterprise SOA for a UPI-style payments company. The study injects faults (a core-banking brown-out and an NPCI latency spike) and measures how resilience patterns, saga orchestration, QoS-aware composition and runtime governance keep payments flowing.

## What's in the site

| Page | What it does | Syllabus |
|---|---|---|
| Architecture | Interactive service graph: click a service to fail it and see its blast radius | Units 1, 3 |
| Chaos Lab | Live traffic simulation comparing naive calls, retries and circuit breaker + fallback | Unit 2 |
| Circuit Breaker | Drive the CLOSED / OPEN / HALF-OPEN state machine yourself | Units 2, 5 |
| Saga Orchestrator | Run payment sagas and watch compensating transactions roll back failures | Unit 3 |
| QoS Composer | Pick providers from 7,776 compositions using weighted multi-objective optimisation | Units 2, 3 |
| Business Case | Monte Carlo NPV of SOA vs a monolith with adjustable assumptions | Unit 4 |
| Results Gallery | All figures from the Python / Colab study | Units 1–5 |

All simulations run in the browser in plain HTML, CSS and JavaScript, with no frameworks and no build step.

## Run locally

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Project structure

```
index.html            # all pages (hash-routed single-page app)
styles.css            # styling
app.js                # simulators, charts, routing
assets/figures/       # figures exported from the Colab notebook
notebook/             # PaySphere_SOA_CaseStudy.ipynb and .py source
netlify.toml          # Netlify config (static, publish root)
```

## Reproduce the figures

Open `notebook/PaySphere_SOA_CaseStudy.ipynb` in Google Colab and choose Runtime → Run all. It uses only numpy, pandas, networkx and matplotlib, with random seed 42.

> All data is synthetic. Parameters were chosen to be realistic, not measured from a production payment system.

## Author

MD Shadaan Moin, B.Tech CSE, SRMIST
