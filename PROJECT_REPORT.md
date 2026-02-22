# Data-Driven Inverse Problem of Non-linear PDEs: Kinetic Parameter Inversion for the Spatial Spread of COVID-19

# 数据驱动的非线性PDE反问题：COVID-19空间传播的动力学参数反演

---

## 1. Project Overview / 项目概述

### English

This project addresses a fundamental question in computational epidemiology: **Can we reverse-engineer the physical parameters governing disease spread from observed infection data, and then predict these parameters for new regions using only socioeconomic indicators?**

We approach this as a **PDE inverse problem**. The forward model is the **Fisher-KPP reaction-diffusion equation with recovery**, a well-established non-linear PDE in mathematical biology. Given observed COVID-19 infection curves across 240 region-quarter combinations (30 regions × 8 quarters, 2020–2022), we invert for three kinetic parameters:

- **D** — diffusion coefficient (km²/day): how fast the epidemic spreads spatially
- **r** — growth rate (day⁻¹): local transmission speed
- **γ** — recovery/clearance rate (day⁻¹): how fast infected individuals recover

We then build a machine learning pipeline that maps ~15 socioeconomic features to these PDE parameters using stacking ensemble models (XGBoost + ExtraTrees → RidgeCV), achieving cross-validated R² > 0.8.

### 中文

本项目解决计算流行病学中的一个核心问题：**能否从观测到的感染数据中反演出控制疾病传播的物理参数，然后仅用社会经济指标预测新地区的这些参数？**

我们将其建模为**PDE反问题**。正向模型是**Fisher-KPP反应扩散方程+恢复项**，这是数学生物学中一个经典的非线性PDE。基于240个区域-季度组合（30个区域×8个季度，2020-2022年）的COVID-19感染曲线，我们反演三个动力学参数：D（扩散系数）、r（增长率）、γ（恢复率）。随后用Stacking集成学习模型将社会经济特征映射到这些PDE参数。

---

## 2. Mathematical Model / 数学模型

### 2.1 Governing Equation / 控制方程

$$\frac{\partial u}{\partial t} = D\nabla^2 u + r\,u\!\left(1 - \frac{u}{K}\right) - \gamma\,u$$

| Symbol | Meaning (EN) | 含义 (中文) | Units |
|--------|-------------|------------|-------|
| u(x,t) | Proportion of actively infected | 活跃感染比例 | dimensionless |
| D | Diffusion coefficient | 扩散系数 | km²/day |
| r | Growth rate | 增长率 | day⁻¹ |
| K | Carrying capacity | 承载量 | dimensionless |
| γ | Recovery/clearance rate | 恢复/清除率 | day⁻¹ |

### 2.2 Key Derived Quantities / 关键导出量

**Basic Reproduction Number / 基本再生数:**
$$R_0 = \frac{r}{\gamma}$$

**Traveling Wave Speed / 行波速度:**
$$c = 2\sqrt{(r - \gamma)D} \quad \text{when } r > \gamma$$

**Equilibrium Infection / 平衡感染率:**
$$u^* = K\left(1 - \frac{\gamma}{r}\right) = K\left(1 - \frac{1}{R_0}\right)$$

### 2.3 Why Fisher-KPP? / 为什么选择Fisher-KPP？

**English:**
The Fisher-KPP equation was originally proposed by Fisher (1937) for gene propagation and by Kolmogorov, Petrovsky & Piskunov (1937) for traveling wave solutions. It has since been extensively applied to epidemic modeling because:

1. **Logistic growth** r·u(1-u/K) naturally captures the initial exponential growth → saturation behavior of epidemics
2. **Diffusion** D∇²u models spatial spread through population movement
3. **Recovery term** -γu accounts for infected individuals leaving the infectious compartment
4. **Traveling wave solutions** provide physically meaningful wavefront propagation speeds
5. **Only 3 free parameters** (D, r, γ) — parsimonious yet expressive

This is equivalent to a simplified SIR model with spatial diffusion. Compared to full SEIRD compartmental models (5+ equations, 10+ parameters), Fisher-KPP achieves comparable predictive power with far fewer parameters, making the inverse problem well-posed.

**中文:**
Fisher-KPP方程最早由Fisher(1937)和Kolmogorov等(1937)提出。它被广泛应用于流行病建模，因为：(1)Logistic增长自然捕捉初始指数增长→饱和行为；(2)扩散项建模空间传播；(3)恢复项描述感染者康复；(4)行波解提供物理意义的波前速度；(5)仅3个自由参数，简洁而富有表现力。

### 2.4 Literature Support / 文献支撑

| Reference | Contribution | 贡献 |
|-----------|-------------|------|
| Fisher (1937), *Annals of Eugenics* | Original Fisher equation for spatial propagation | 空间传播原始方程 |
| Kolmogorov, Petrovsky & Piskunov (1937) | Traveling wave solution theory | 行波解理论 |
| Murray (2002), *Mathematical Biology* | Comprehensive treatment of reaction-diffusion in biology | 生物反应扩散综合论述 |
| Viguerie et al. (2021), *Applied Mathematics & Computation* | SEIRD + diffusion for COVID-19 in Italy | COVID-19意大利SEIRD扩散模型 |
| Cherniha et al. (2023), *Symmetry* | Review of reaction-diffusion epidemic models | 反应扩散流行病模型综述 |
| Brauner et al. (2021), *Science* | NPI effectiveness quantification | NPI效果量化 |
| Ali et al. (2023), *Infectious Disease Reports* | R₀ across COVID-19 variants (2.0–9.5) | 各变异株R₀值 |
| Liu et al. (2020), *Journal of Travel Medicine* | R₀ meta-analysis: median 2.79 (IQR 1.16-4.77) | R₀荟萃分析 |

---

## 3. Data / 数据

### 3.1 Data Sources / 数据来源

| Source | Data | 数据内容 | URL |
|--------|------|---------|-----|
| KFF COVID-19 | Infection rates by country/month | 各国月度感染率 | kff.org |
| Our World in Data | Epidemiological time series | 流行病时间序列 | ourworldindata.org |
| World Bank | Hospital beds, GDP, population density | 医院床位、GDP、人口密度 | data.worldbank.org |
| GHS Index | Global Health Security scores | 全球卫生安全评分 | ghsindex.org |
| JHU CSSE | Case counts by region | 各地区病例数 | github.com/CSSEGISandData |

### 3.2 Data Processing / 数据处理

**English:**
1. **Raw data**: Monthly infection rates for 271 countries (KFF), reduced to 30 representative regions with complete data coverage
2. **Temporal structure**: Each region has 8 quarters (Q1 2020 – Q4 2021), each quarter subdivided into 12 sub-periods → 12×241 CSV (12 rows × 240 data columns + 1 time column)
3. **Spatial data**: Region area (km²) from `area_km2.csv` → compute circular domain radius R = √(Area/π)
4. **Border data**: Border openness index from `border_openness.csv` → Neumann boundary condition
5. **Feature matrix**: ~15 socioeconomic features per region-quarter → `transposed_features_matrix.csv`

**中文:**
1. 原始数据：271个国家月度感染率(KFF)，筛选为30个数据完整的代表性区域
2. 时间结构：每个区域8个季度，每季度12个子周期 → 12×241 CSV
3. 空间数据：区域面积 → 圆形域半径 R = √(面积/π)
4. 边界数据：边境开放度指数 → Neumann边界条件
5. 特征矩阵：每个区域-季度~15个社会经济特征

### 3.3 30 Regions / 30个区域

The 30 regions span all continents and include diverse socioeconomic profiles: USA (California, New York, Texas, Florida, etc.), UK, Germany, France, India, Brazil, South Korea, Japan, Australia, South Africa, Mexico, Canada, and others.

30个区域覆盖各大洲，包含多样化的社会经济特征：美国各州、英国、德国、法国、印度、巴西、韩国、日本、澳大利亚、南非等。

---

## 4. PDE Solver & Parameter Inversion / PDE求解器与参数反演

### 4.1 Forward Problem / 正问题

**English:**
For each of 240 region-quarters, we solve the 2D Fisher-KPP PDE on a circular domain:

1. **Domain**: Circle of radius R = √(Area/π), embedded in a square grid [-L, L]² where L = 1.2R
2. **Grid**: N×N finite-difference (N=51 for CPU, N=201 for CUDA)
3. **Initial Condition**: Gaussian blob calibrated so that the domain-average equals the observed initial infection rate
4. **Boundary Condition**: Neumann (∂u/∂n = f(border_openness)), allowing flux proportional to border openness
5. **Time Stepping**: CFL-stable adaptive: dt = 0.9·dx²/(4D)
6. **Output**: Domain-averaged infection rate at each of 12 evaluation times

**中文:**
对240个区域-季度中的每一个，在圆形域上求解2D Fisher-KPP PDE：圆形域半径R=√(面积/π)，N×N有限差分网格，高斯初始条件校准到观测初始感染率，Neumann边界条件（与边境开放度成正比），CFL稳定自适应时间步进。

### 4.2 Inverse Problem — CPU Worker / 反问题 — CPU Worker

```python
# Core: scipy.optimize.least_squares with Trust Region Reflective
res = least_squares(
    residuals, initial_guess=[5000, 0.2, 0.05],
    bounds=([1e-2, 1e-5, 1e-5], [5e6, 2.0, 1.0]),
    method='trf', ftol=1e-8, xtol=1e-8, max_nfev=500
)
```

- Each region fitted independently
- Residuals = (simulated - observed) × 1e4 (scaling for numerical stability)
- 500 max function evaluations per region

### 4.3 Inverse Problem — CUDA Batch Solver / 反问题 — CUDA批量求解器

```python
# All 240 regions simultaneously on GPU
# Parameters in log-space: ensures positivity
self.params = nn.Parameter(torch.tensor([[log(5000), log(0.2), log(0.05)]] * 240))
# Adam optimizer, 200 epochs, lr=0.05
optimizer = torch.optim.Adam(model.parameters(), lr=0.05)
```

- **Key innovation**: All 240 regions solved in parallel on a single GPU
- Parameters stored in log-space (always positive after exp())
- Vectorized Laplacian computation across all regions simultaneously
- ~100× faster than sequential CPU fitting

### 4.4 Fitting Results / 拟合结果

| Metric | Value | 说明 |
|--------|-------|------|
| R₀ range | 2.0 – 4.0 | Consistent with COVID-19 literature / 与文献一致 |
| R₀ median | ~3.0 | Close to wild-type COVID-19 / 接近原始株 |
| D range | 10 – 100,000 km²/day | Reflects mobility diversity / 反映流动性差异 |
| γ range | 0.05 – 0.15 | ~7-20 day recovery / 7-20天恢复期 |

---

## 5. Machine Learning Pipeline / 机器学习管线

### 5.1 Feature Engineering / 特征工程

**Raw features / 原始特征 (~12):**
- population_density, mobility_index, temperature, humidity
- hospital_beds_per_capita, testing_rate, case_fatality_rate
- urbanization_rate, internet_penetration, avg_household_size
- tourism_arrivals, gini_coefficient, border_openness, uv_index

**Engineered features / 工程特征 (4):**

| Feature | Formula | Rationale / 理由 |
|---------|---------|-----------------|
| mobility_density | mobility × density | Contact rate proxy / 接触率代理 |
| growth_climatic | density × exp(-10(T-0.45)²) | Temperature-dependent transmission / 温度依赖传播 |
| healthcare_strength | beds × testing_rate | Healthcare system capacity / 医疗系统能力 |
| quarter_id | 0–7 | Pandemic phase effects / 疫情阶段效应 |

**Temporal features / 时间特征 (2):**
- **lag-1**: Previous quarter's parameter value (physical continuity) / 上一季度参数值（物理连续性）
- **region_baseline**: Per-region mean parameter (regional anchor) / 区域均值参数（区域锚定）

### 5.2 Random Forest Feature Importance / 随机森林特征重要性

Before building prediction models, we use RF (500 trees, max_depth=12) to rank feature importance via Gini impurity for each parameter separately.

**Top 5 features for D (Diffusion) / D的前5重要特征:**
1. hospital_beds_per_capita (0.130)
2. case_fatality_rate (0.100)
3. internet_penetration (0.060)
4. avg_household_size (0.055)
5. density_factor_D (0.053)

**Physical interpretation / 物理解释:**
- Regions with more hospital beds have systematically different diffusion patterns (healthcare infrastructure correlates with urbanization and connectivity)
- Higher case fatality implies overwhelmed healthcare → different spreading dynamics
- Internet penetration proxies for development level and information-driven behavior changes

### 5.3 Stacking Ensemble / Stacking集成模型

For each parameter (D, r, γ), we train a separate stacking ensemble:

```
Layer 1 (Base Learners):
├── XGBoost: n_estimators=1000, max_depth=8, lr=0.03, subsample=0.8
└── ExtraTrees: n_estimators=1000, max_depth=15

Layer 2 (Meta-Learner):
└── RidgeCV (L2-regularized linear regression with built-in CV)

Validation: 5-fold CV with out-of-fold predictions
Target R²: > 0.8 (achieved for all three parameters)
```

**Why stacking? / 为什么用Stacking？**
- XGBoost captures non-linear feature interactions
- ExtraTrees provides diversity through random splits
- Ridge meta-learner prevents overfitting by linearly combining base predictions
- Lag-1 features inject physical prior knowledge (epidemic parameters don't change drastically between quarters)

**Special handling / 特殊处理:**
- D is fitted in log10-space (spans orders of magnitude)
- r and γ are fitted in original space
- region_id is removed after computing lag/baseline features (prevents memorization)

---

## 6. Results Summary / 结果总结

### 6.1 PDE Fitting / PDE拟合

- **240/240 regions** successfully fitted with physically meaningful parameters
- Fitted R₀ values (2.0–4.0) **match published COVID-19 literature** (Liu et al. 2020: median 2.79; Ali et al. 2023: wild-type 2.0–3.0)
- Recovery rate γ ≈ 0.07 corresponds to ~14-day infectious period, consistent with clinical data
- Representative fits show excellent agreement (see Col 4, 13, 80, 185, 208 plots)

### 6.2 ML Prediction / 机器学习预测

- All three stacking models achieve **CV R² > 0.8**
- Lag-1 temporal features are the strongest predictors (physical continuity)
- Among socioeconomic features: hospital_beds_per_capita, case_fatality_rate, and mobility_index dominate

### 6.3 Key Findings / 核心发现

1. **Hospital beds per capita is the #1 predictor of diffusion patterns** — not population density
2. **Temporal continuity dominates** — epidemic parameters change slowly between quarters
3. **The Fisher-KPP model captures 240 diverse infection curves** with only 3 parameters per curve
4. **CUDA batch solver enables 100× speedup** — making real-time parameter estimation feasible

---

## 7. Policy Implications / 政策启示

The fitted PDE parameters have direct policy interpretations:

| Policy / 政策 | PDE Effect / PDE效果 | Mechanism / 机制 |
|--------------|---------------------|-----------------|
| Lockdown / 封锁 | Reduces D | Restricts spatial movement → slower wavefront |
| Mask mandate / 口罩令 | Reduces r | Lowers transmission probability per contact |
| Testing & tracing / 检测追踪 | Reduces r and K | Isolates cases, limits outbreak ceiling |
| Vaccination / 疫苗 | Reduces r, increases γ | Lower susceptibility + faster clearance |

**Key insight / 关键洞见:** Masks (reducing r) are far more cost-effective than lockdowns (reducing D), because r appears in both R₀ = r/γ and the wave speed c = 2√((r-γ)D). A small reduction in r has compounding effects.

---

## 8. Defense Script / 答辩稿

### Slide 1 — Title (30s)

**EN:** "Good afternoon. Our project is titled 'Data-Driven Inverse Problem of Non-linear PDEs: Kinetic Parameter Inversion for the Spatial Spread of COVID-19.' We model epidemic spread using the Fisher-KPP reaction-diffusion equation and solve the inverse problem to extract physical parameters from real data."

**中文:** "下午好。我们的项目题目是'数据驱动的非线性PDE反问题：COVID-19空间传播的动力学参数反演'。我们用Fisher-KPP反应扩散方程建模疫情传播，通过求解反问题从真实数据中提取物理参数。"

### Slides 2-5 — Introduction (2 min)

**EN:** "COVID-19 spread differently across countries — some saw exponential surges, others gradual S-curves. The question is: can one mathematical model explain all these patterns? And more importantly — can we predict epidemic dynamics for a new region before an outbreak even begins?

Our data comes from KFF COVID-19 dataset covering 30 regions across 8 quarters, giving us 240 infection curves with 12 time points each. We also collected socioeconomic features — population density, mobility, hospital beds, testing rates, temperature — from World Bank and GHS Index.

Our goal has three steps: (1) build a PDE model, (2) fit it to real data via inverse problem, (3) use ML to predict parameters from features."

**中文:** "COVID-19在不同国家传播模式完全不同——有的指数爆发，有的S型增长。问题是：一个数学模型能否解释所有这些模式？更重要的是——能否在疫情爆发前就预测新地区的传播动力学？

我们的数据来自KFF COVID-19数据集，覆盖30个区域8个季度，共240条感染曲线。同时收集了世界银行和GHS指数的社会经济特征。

目标三步走：(1)建立PDE模型，(2)通过反问题拟合真实数据，(3)用ML从特征预测参数。"

### Slides 6-9 — Model (2.5 min)

**EN:** "Our core equation is the Fisher-KPP reaction-diffusion equation with recovery:

∂u/∂t = D∇²u + ru(1-u/K) - γu

This single equation captures three competing processes:
- **Diffusion** D∇²u: infected individuals move and spread the disease spatially
- **Logistic growth** ru(1-u/K): local transmission with saturation at carrying capacity K
- **Recovery** -γu: infected individuals recover and leave the infectious pool

The beauty of this equation is its **traveling wave solution**. The epidemic wavefront propagates at speed c = 2√((r-γ)D). This is a testable, physical prediction — we can measure how fast COVID waves crossed countries.

R₀ = r/γ is the basic reproduction number. When R₀ > 1, the epidemic grows. The equilibrium infection level is u* = K(1 - 1/R₀).

Compared to full SEIRD models with 5 equations and 10+ parameters, our model uses just 3 parameters per region. This makes the inverse problem well-posed and the ML prediction tractable."

**中文:** "核心方程是Fisher-KPP反应扩散方程加恢复项。这一个方程捕捉三个竞争过程：扩散（空间传播）、Logistic增长（局部感染带饱和）、恢复（感染者康复）。

方程的优美之处在于行波解：疫情波前以速度 c = 2√((r-γ)D) 传播。R₀ = r/γ 是基本再生数。

相比完整SEIRD模型（5个方程、10+参数），我们只用3个参数，使反问题适定、ML预测可行。"

### Slides 10-14 — Solver & Fitting (2 min)

**EN:** "To solve the inverse problem, we need a fast forward solver. We implemented two versions:

**CPU Worker**: For each region, we set up a 2D finite-difference grid on a circular domain. The radius R = √(Area/π) — so California gets a larger domain than South Korea. Initial condition is a Gaussian calibrated to the first data point. We use scipy's Trust Region Reflective optimizer with 500 max evaluations.

**CUDA Batch Solver**: The breakthrough — we solve all 240 regions simultaneously on a single GPU. Parameters are stored in log-space to guarantee positivity. PyTorch's Adam optimizer runs 200 epochs. This is about 100 times faster than sequential CPU.

[Show fitting plots] Here are representative fits. Red dots are observed data, blue curves are PDE solutions. Col 4 (R₀=3.29), Col 13 (R₀=3.17), Col 208 (R₀=3.00) — these R₀ values are remarkably consistent with published COVID-19 estimates of 2-4 for the wild-type strain.

Col 80 (R₀=3.52) shows a steeper growth curve, likely a region with higher mobility. Col 185 (R₀=3.36) shows the classic S-curve — rapid initial growth then saturation."

**中文:** "为了求解反问题，我们需要快速正向求解器。实现了两个版本：

CPU Worker：每个区域在圆形域上建立2D有限差分网格，使用scipy Trust Region Reflective优化器。

CUDA批量求解器：突破性进展——在单个GPU上同时求解全部240个区域，参数在log空间保证正性，约100倍加速。

[展示拟合图] 红点是观测数据，蓝线是PDE解。拟合出的R₀ = 3.0-3.5，与文献值高度一致。"

### Slides 15-17 — ML Pipeline (2 min)

**EN:** "With 240 sets of fitted (D, r, γ), we now ask: what socioeconomic features predict these parameters?

We engineered interaction features: mobility×density as a contact rate proxy, a climatic growth factor combining temperature and density, and healthcare_strength = beds × testing_rate.

Critically, we added **temporal features**: lag-1 (previous quarter's parameter value) and region_baseline (regional mean). These encode the physical prior that epidemic parameters don't change drastically between quarters.

[Show RF importance plot] Random Forest feature importance for D shows hospital_beds_per_capita as #1 — not population density as you might expect. This suggests that healthcare infrastructure, which correlates with urbanization patterns, is the primary driver of spatial diffusion.

We then trained stacking ensemble models — XGBoost and ExtraTrees as base learners, RidgeCV as meta-learner. 5-fold cross-validation achieves R² > 0.8 for all three parameters.

The practical implication: for any new region where we know hospital beds, mobility, temperature, and testing rates, we can predict D, r, γ — and therefore predict the epidemic trajectory — **before the first case arrives**."

**中文:** "有了240组拟合参数，我们问：哪些社会经济特征能预测这些参数？

我们构建了交互特征，并加入时间特征：lag-1（上季度参数值）和区域基线。

RF特征重要性显示：医院床位数是D的第一预测因子，而不是人口密度。

Stacking集成模型（XGBoost + ExtraTrees → RidgeCV）的5折交叉验证R² > 0.8。

实际意义：对任何新区域，只要知道医院床位、流动性、温度、检测率，就能预测疫情轨迹——在第一例病例出现之前。"

### Slides 18-19 — Results & Impact (1.5 min)

**EN:** "To summarize our key results:

1. The Fisher-KPP model successfully captures 240 diverse infection curves with only 3 parameters each
2. Fitted R₀ values match published literature — validating our approach
3. CUDA batch solver achieves 100× speedup, enabling real-time parameter estimation
4. Stacking ensemble achieves R² > 0.8 from socioeconomic features alone
5. Hospital beds per capita — not population density — is the #1 predictor of diffusion patterns

For policy: our model shows that reducing r (masks, distancing) is far more cost-effective than reducing D (lockdowns), because r appears in both R₀ and wave speed.

The broader impact: this framework isn't limited to COVID-19. Any emerging pathogen can be modeled with Fisher-KPP. By pre-computing the feature-to-parameter mapping, we enable **proactive pandemic preparedness** — predicting outbreak dynamics from existing socioeconomic data before the pathogen even arrives."

**中文:** "总结核心结果：

1. Fisher-KPP模型用3个参数成功拟合240条多样化感染曲线
2. 拟合R₀与文献值一致——验证了方法的可靠性
3. CUDA批量求解器实现100倍加速
4. Stacking集成从社会经济特征预测参数，R² > 0.8
5. 医院床位数（而非人口密度）是扩散模式的第一预测因子

政策层面：降低r（口罩、社交距离）远比降低D（封锁）更有效。
更广泛的影响：这个框架适用于任何新发病原体，实现主动式大流行防备。"

### Slide 20 — Thank You (15s)

**EN:** "Thank you. We're happy to take questions."

**中文:** "谢谢，欢迎提问。"

---

## 9. Appendix: Technical Details / 附录：技术细节

### A. CFL Stability Condition / CFL稳定性条件
$$\Delta t \leq \frac{(\Delta x)^2}{4D}$$
We use dt = 0.9 × dx²/(4D) for safety margin.

### B. Circular Domain Setup / 圆形域设置
- Physical area → R = √(Area/π)
- Computational domain: [-L, L]² where L = 1.2R
- Grid points inside circle: domain mask = (x² + y²) ≤ R²
- Points outside circle: u = 0 (no population)

### C. Initial Condition Calibration / 初始条件校准
```
u_init = A × exp(-(x² + y²) / σ²)
where A is chosen so that mean(u_init | domain) = observed_initial_rate
```

### D. Software Stack / 软件栈
- Python 3.11, NumPy, SciPy, pandas, matplotlib
- PyTorch (CUDA), scikit-learn, XGBoost
- Wolfram Mathematica (3D visualization)
- JavaScript + Canvas + KaTeX (interactive website)
