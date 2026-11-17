**Live demo:** (https://paysphere0.netlify.app/)

A case study for **21CSE457T Service Oriented Architecture** at SRM Institute of Science and Technology.

PaySphere is a 23-service enterprise SOA for a UPI-style payments company. We deliberately break it by injecting a core-banking brown-out and an NPCI latency spike. We then measure how **resilience patterns, saga orchestration, QoS-aware composition and runtime governance** keep payments flowing.

The project has two parts:
1. **A Python simulation study** (Google Colab): 11 cells that produce 10 figures.
2. **An interactive website**: a dashboard of live simulators that run entirely in the browser.

---

## Key findings

| Metric | Result |
|---|---|
| Availability during the bank brown-out | **91.1%** with circuit breaker + fallback, vs **35.0%** with naive synchronous calls |
| p99 latency under faults | **~1.3 s** with circuit breaker, vs **~7.3 s** with 3× retries (retry storm) |
| Saga consistency | **5,000** sagas, **0** left in a partial state; every failure fully compensated |
| QoS composition | **161** Pareto-optimal bindings out of **7,776** candidates |
| Highest blast radius | **CustomerDB**, a database shared by several services (an SOA anti-pattern) |
| Business case | SOA has a higher 5-year NPV in **98.9%** of 10,000 Monte Carlo scenarios |

> All data is synthetic. Parameters were chosen to be realistic, not measured from a production payment system.

---

## Website features

| Page | What you can do | Syllabus |
|---|---|---|
| **Architecture** | Click any service to fail it; see every impacted caller and which business capabilities degrade | Units 1, 3 |
| **Chaos Lab** | Run live traffic through 3 resilience strategies; inject faults and tune the failure rate and breaker threshold | Unit 2 |
| **Circuit Breaker** | Drive the CLOSED → OPEN → HALF-OPEN state machine request by request | Units 2, 5 |
| **Saga Orchestrator** | Choose where a payment fails and watch compensating transactions roll it back | Unit 3 |
| **QoS Composer** | Adjust latency/cost/reliability weights; the optimiser re-selects providers from the Pareto front | Units 2, 3 |
| **Business Case** | Change capex, growth, tech-debt and discount rate; 3,000-run Monte Carlo NPV updates live | Unit 4 |
| **Results Gallery** | All 10 notebook figures, filterable by unit, with click-to-enlarge | Units 1–5 |
| **Report** | Method, findings, best practices, limitations, and notebook downloads | Unit 5 |

---

## Syllabus mapping

| Unit | Topic covered |
|---|---|
| 1. Introduction | Enterprise SOA reference architecture, layered service inventory |
| 2. Analysis & Design | Service design patterns (circuit breaker, bulkhead, fallback), nonfunctional properties, composite applications |
| 3. Technologies for SOA | Service orchestration (saga), design-time and run-time governance, blast-radius analysis |
| 4. Big Data & SOA | Event-stream analytics on the service bus; business case, ROI and NPV |
| 5. SOA Best Practices | Governance best practices, policy as code, error budgets, aligning enterprise architecture with SOA |

---

## Tech stack

- **Simulation study:** Python, NumPy, pandas, NetworkX, Matplotlib (fixed seed `42`)
- **Website:** plain HTML, CSS and JavaScript; canvas and SVG charts; no frameworks, no build step
- **Hosting:** Netlify (static)

---

## Project structure

```
paysphere-soa/
├── index.html              # all pages (hash-routed single-page app)
├── styles.css              # styling
├── app.js                  # simulators, charts, routing
├── netlify.toml            # Netlify config (static, publish root)
├── assets/
│   └── figures/            # 10 figures exported from the notebook
└── notebook/
    ├── PaySphere_SOA_CaseStudy.ipynb
    └── PaySphere_SOA_CaseStudy.py
```

---

## Run locally

```bash
git clone https://github.com/<your-username>/paysphere-soa.git
cd paysphere-soa
python -m http.server 8000
# open http://localhost:8000
```

## Reproduce the figures

1. Open `notebook/PaySphere_SOA_CaseStudy.ipynb` in [Google Colab](https://colab.research.google.com/).
2. Choose **Runtime → Run all**. It takes under a minute and uses only libraries Colab already has.

## Deploy

1. Push this repo to GitHub.
2. On Netlify, choose **Add new site → Import an existing project → GitHub** and pick this repo.
3. Leave the build command empty and the publish directory as `.`, then click **Deploy**.

---

## Limitations

- Latency is modelled as log-normal with no queueing, so real retry storms can be worse because thread pools run out.
- The financial model uses simple normal and Poisson assumptions and leaves out organisational and skills costs.
- The QoS model assumes a sequential workflow; parallel branches would add latencies differently.
- The website's QoS page generates its own random provider set, so its Pareto count differs from the notebook's.

---

## Author

**MD Shadaan Moin**
