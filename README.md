# Data-Driven Inverse Problem of Non-linear PDEs: Kinetic Parameter Inversion for the Spatial Spread of COVID-19

> **Data4Good 2026 · UCSB Datathon · Public Health & Wellbeing**

## Overview

We model COVID-19 spatial spread using the **Fisher-KPP reaction-diffusion equation with recovery**:

$$\frac{\partial u}{\partial t} = D\nabla^2 u + r\,u\!\left(1 - \frac{u}{K}\right) - \gamma\,u$$

where:
- **u(x, t)** — proportion of actively infected population
- **D** — diffusion coefficient (km²/day), governing spatial spread
- **r** — growth rate (day⁻¹), local transmission speed
- **K** — carrying capacity, maximum infection proportion
- **γ** — recovery/clearance rate (day⁻¹)
- **R₀ = r / γ** — basic reproduction number

We solve the **inverse problem**: given 240 observed infection curves (30 regions × 8 quarters), we invert for the kinetic parameters (D, r, γ) using CUDA-accelerated 2D PDE solvers, then use machine learning to map socioeconomic features to these parameters.

## Pipeline

```
Observed Infection Curves (240 region-quarters, 12 sub-periods each)
        │
        ▼
┌─────────────────────────────┐
│  2D PDE Solver (Forward)    │  Circular domain, R = √(Area/π)
│  • CPU: least_squares (TRF) │  Finite difference, CFL-stable
│  • GPU: PyTorch Adam batch  │  N=201 grid, all 240 simultaneous
└─────────────────────────────┘
        │
        ▼
   Fitted D, r, γ per region-quarter
        │
        ▼
┌─────────────────────────────┐
│  ML Feature Engineering     │  ~15 socioeconomic features
│  • Engineered interactions  │  + lag-1 temporal continuity
│  • RF Feature Importance    │  + region baseline anchors
└─────────────────────────────┘
        │
        ▼
┌─────────────────────────────┐
│  Stacking Ensemble ×3       │  Separate model per parameter
│  • XGBoost (1000 trees)     │  5-fold CV, out-of-fold R²
│  • ExtraTrees (1000 trees)  │
│  • Meta: RidgeCV            │
└─────────────────────────────┘
        │
        ▼
   Predicted D, r, γ for unseen regions
```

## Project Structure

```
├── README.md
├── Datathon.pptx                    # Presentation slides
├── website/                         # Interactive web application
│   ├── index.html                   # Main page (Fisher-KPP simulation)
│   ├── css/style.css
│   ├── js/                          # Simulation & visualization
│   └── img/                         # Result plots
├── src/                             # Core algorithms
│   ├── worker.py                    # CPU PDE solver + least_squares fitting
│   ├── worker_cuda.py               # CUDA PDE solver (single region)
│   ├── cuda_full_batch_optimize.py  # GPU batch optimization (all 240 regions)
│   ├── rf_importance.py             # Random Forest feature importance
│   ├── modelForD.py                 # Stacking ensemble for D (diffusion)
│   ├── modelForR.py                 # Stacking ensemble for r (growth rate)
│   ├── modelForGamma.py             # Stacking ensemble for γ (clearance)
│   ├── aggregate_results.py         # Collect per-region fitting results
│   ├── 3DPlot.nb                    # Mathematica 3D visualization
│   └── Datathon Covid-19.nb         # Mathematica analysis notebook
└── data/                            # Input datasets
    ├── regional_quarterly_infection_rate_v2.csv   # 12×241 infection rates
    ├── regional_quarterly_mapping.csv             # Region-quarter mapping
    ├── final_cuda_results.csv                     # CUDA fitting output
    ├── area_km2.csv                               # Region areas
    ├── border_openness.csv                        # Border openness index
    ├── infection_rate_by_month.csv                # Monthly rates (74 months)
    ├── regional_infection_rate.csv                # 39-month regional rates
    ├── regional_mapping.csv                       # Region definitions
    └── country_mapping.csv                        # Country code mapping
```

## Key Results

- **PDE Fitting**: Median R₀ ≈ 3.0–3.5 across 240 regions, consistent with COVID-19 literature
- **Wave Speed**: c = 2√((r−γ)D), physically meaningful propagation rates
- **ML Models**: Stacking ensemble with lag-1 features achieves balanced CV R² > 0.8
- **Top Features for D**: hospital beds per capita, case fatality rate, internet penetration, household size, population density

## Methods

### PDE Solver
- 2D finite-difference on circular domain per region
- Gaussian initial condition calibrated to first observed data point
- Neumann boundary condition scaled by border openness
- CFL-stable adaptive time stepping: dt = 0.9·dx²/(4D)

### Parameter Inversion
- **CPU**: `scipy.optimize.least_squares` with Trust Region Reflective (TRF), 500 max function evaluations
- **GPU**: PyTorch `nn.Module` with log-space parameters, Adam optimizer (lr=0.05, 200 epochs), all 240 regions in parallel

### Feature Engineering
- Raw features: population density, mobility index, temperature, hospital beds, testing rate, urbanization, tourism, UV index, etc.
- Engineered: `mobility × density`, `density × exp(-10(T−0.45)²)`, `beds × testing_rate`
- Temporal: `quarter_id`, `lag-1` (previous quarter value), `region_baseline` (per-region mean)

### Stacking Ensemble
- Base: XGBoost (n=1000, depth=8, lr=0.03) + ExtraTrees (n=1000, depth=15)
- Meta: RidgeCV
- Validation: 5-fold cross-validation with out-of-fold predictions

## Interactive Website

The website provides:
1. **Real-time Fisher-KPP simulation** with adjustable parameters and virus presets
2. **1D traveling wave visualization** showing wavefront propagation
3. **NPI policy controls** (masks, distancing, lockdown, vaccination) with scenario comparison
4. **Data pipeline visualization** showing the full inverse problem workflow
5. **Country parameter database** with World Bank + GHS Index data

## Data Sources

- [KFF COVID-19 Dataset](https://www.kff.org/) — Infection rates across countries and time
- [Our World in Data](https://ourworldindata.org/) — COVID-19 epidemiological data
- [World Bank](https://data.worldbank.org/) — Hospital beds, GDP, population density
- [GHS Index](https://www.ghsindex.org/) — Global Health Security preparedness scores

## Team

Zide Jia · Yushu Liu · Lian An · Bowen Zhang · Chenhao Wang

UCSB Data4Good 2026 Datathon
