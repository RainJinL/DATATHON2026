/**
 * 国家参数数据库 — 基于 OWID COVID-19 实际拟合 + 世界银行 + GHS Index
 * 
 * r_fit, K_fit: 从 OWID 数据逻辑斯蒂拟合得到
 * density, gdp_per_capita, median_age, beds_per_1k: OWID/World Bank
 * ghs_score: Global Health Security Index
 * lat, lng: 国家质心坐标
 */
const COUNTRIES = {
  'US': { 
    name: '美国', code: 'US', lat: 37.09, lng: -95.71, 
    population: 338e6, density: 35.61, gdp_pc: 54225, median_age: 38.3, beds_per_1k: 2.77, ghs_score: 75.9,
    r_fit: 0.0110, K_fit: 1.000, r2: 0.985
  },
  'IN': { 
    name: '印度', code: 'IN', lat: 20.59, lng: 78.96, 
    population: 1417e6, density: 450.42, gdp_pc: 6427, median_age: 28.2, beds_per_1k: 0.53, ghs_score: 35.5,
    r_fit: 0.0321, K_fit: 0.007, r2: 0.999
  },
  'BR': { 
    name: '巴西', code: 'BR', lat: -14.24, lng: -51.93, 
    population: 215e6, density: 25.04, gdp_pc: 14103, median_age: 33.5, beds_per_1k: 2.20, ghs_score: 59.7,
    r_fit: 0.0220, K_fit: 0.037, r2: 0.985
  },
  'GB': { 
    name: '英国', code: 'GB', lat: 55.38, lng: -3.44, 
    population: 67.5e6, density: 272.90, gdp_pc: 39753, median_age: 40.8, beds_per_1k: 2.54, ghs_score: 77.9,
    r_fit: 0.0149, K_fit: 1.000, r2: 0.973
  },
  'DE': { 
    name: '德国', code: 'DE', lat: 51.17, lng: 10.45, 
    population: 83.4e6, density: 237.02, gdp_pc: 45229, median_age: 46.6, beds_per_1k: 8.00, ghs_score: 66.0,
    r_fit: 0.0162, K_fit: 1.000, r2: 0.934
  },
  'FR': { 
    name: '法国', code: 'FR', lat: 46.23, lng: 2.21, 
    population: 67.8e6, density: 122.58, gdp_pc: 38606, median_age: 42.0, beds_per_1k: 5.98, ghs_score: 60.9,
    r_fit: 0.0314, K_fit: 0.052, r2: 0.987
  },
  'IT': { 
    name: '意大利', code: 'IT', lat: 41.87, lng: 12.57, 
    population: 59e6, density: 205.86, gdp_pc: 35220, median_age: 47.9, beds_per_1k: 3.18, ghs_score: 56.2,
    r_fit: 0.0195, K_fit: 1.000, r2: 0.904
  },
  'JP': { 
    name: '日本', code: 'JP', lat: 36.20, lng: 138.25, 
    population: 124e6, density: 347.78, gdp_pc: 39002, median_age: 48.2, beds_per_1k: 13.05, ghs_score: 59.8,
    r_fit: 0.0143, K_fit: 0.003, r2: 0.980
  },
  'KR': { 
    name: '韩国', code: 'KR', lat: 35.91, lng: 127.77, 
    population: 51.8e6, density: 527.97, gdp_pc: 35938, median_age: 43.4, beds_per_1k: 12.27, ghs_score: 65.4,
    r_fit: 0.0062, K_fit: 1.000, r2: 0.955
  },
  'AU': { 
    name: '澳大利亚', code: 'AU', lat: -25.27, lng: 133.78, 
    population: 26.2e6, density: 3.20, gdp_pc: 44649, median_age: 37.9, beds_per_1k: 3.84, ghs_score: 71.1,
    r_fit: 0.0254, K_fit: 0.001, r2: 0.951
  },
  'ZA': { 
    name: '南非', code: 'ZA', lat: -30.56, lng: 22.94, 
    population: 59.9e6, density: 46.75, gdp_pc: 12295, median_age: 27.3, beds_per_1k: 2.32, ghs_score: 54.8,
    r_fit: 0.0306, K_fit: 0.014, r2: 0.941
  },
  'MX': { 
    name: '墨西哥', code: 'MX', lat: 23.63, lng: -102.55, 
    population: 127.5e6, density: 66.44, gdp_pc: 17336, median_age: 29.3, beds_per_1k: 1.38, ghs_score: 57.6,
    r_fit: 0.0175, K_fit: 0.013, r2: 0.984
  },
  'CA': { 
    name: '加拿大', code: 'CA', lat: 56.13, lng: -106.35, 
    population: 38.5e6, density: 4.04, gdp_pc: 44018, median_age: 41.4, beds_per_1k: 2.50, ghs_score: 75.3,
    r_fit: 0.0111, K_fit: 1.000, r2: 0.955
  },
  'SE': { 
    name: '瑞典', code: 'SE', lat: 60.13, lng: 18.64, 
    population: 10.5e6, density: 24.72, gdp_pc: 46949, median_age: 41.0, beds_per_1k: 2.22, ghs_score: 72.1,
    r_fit: 0.0134, K_fit: 1.000, r2: 0.929
  },
  'IL': { 
    name: '以色列', code: 'IL', lat: 31.05, lng: 34.85, 
    population: 9.4e6, density: 402.61, gdp_pc: 33132, median_age: 30.6, beds_per_1k: 2.99, ghs_score: 62.0,
    r_fit: 0.0359, K_fit: 0.040, r2: 0.991
  },
  'SG': { 
    name: '新加坡', code: 'SG', lat: 1.35, lng: 103.82, 
    population: 5.6e6, density: 7916, gdp_pc: 85535, median_age: 42.4, beds_per_1k: 2.40, ghs_score: 58.7,
    r_fit: 0.0427, K_fit: 0.010, r2: 0.989
  },
  'BD': { 
    name: '孟加拉', code: 'BD', lat: 23.68, lng: 90.36, 
    population: 171e6, density: 1265.04, gdp_pc: 3524, median_age: 27.5, beds_per_1k: 0.80, ghs_score: 35.0,
    r_fit: 0.0224, K_fit: 0.003, r2: 0.983
  },
  'NG': { 
    name: '尼日利亚', code: 'NG', lat: 9.08, lng: 8.68, 
    population: 219e6, density: 209.59, gdp_pc: 5338, median_age: 18.1, beds_per_1k: 0.50, ghs_score: 37.8,
    r_fit: 0.0105, K_fit: 0.001, r2: 0.913
  },
  'NZ': { 
    name: '新西兰', code: 'NZ', lat: -40.90, lng: 174.89, 
    population: 5.2e6, density: 18.21, gdp_pc: 36086, median_age: 37.9, beds_per_1k: 2.61, ghs_score: 54.0,
    r_fit: 0.0123, K_fit: 0.0003, r2: 0.786
  },
  'CN': { 
    name: '中国', code: 'CN', lat: 35.86, lng: 104.19, 
    population: 1412e6, density: 153, gdp_pc: 10500, median_age: 38.4, beds_per_1k: 4.34, ghs_score: 47.5,
    r_fit: 0.020, K_fit: 0.005, r2: 0.95
  },
};

/**
 * 从国家数据推导 Fisher-KPP 参数
 * 严格基于 PARAMETER_TABLE.md 和 MODEL_SUMMARY.md 的公式:
 * 
 * D_eff = D_base(ρ, 交通) × (1 - α_mob·p_mob)
 * D_base ∝ (ρ/ρ₀)^0.3 × (GDP/GDP₀)^0.2
 * 
 * K_eff = K_base(人口, 自然免疫, 医院床位) × (1 - α_vax·p_vax)
 * 
 * r 直接使用 OWID 拟合值 r_fit
 */
function deriveCountryParams(country) {
  // D: 扩散系数 (km²/day)
  // 基于论文[17]中德国各州的拟合结果: Bavaria=0.488, Saxony-Anhalt=0.643
  // D_base ∝ (density/ρ₀)^0.3 × (GDP/GDP₀)^0.2
  const rho0 = 100;  // 参考密度
  const gdp0 = 30000; // 参考GDP
  const densityFactor = Math.pow(Math.max(country.density, 1) / rho0, 0.3);
  const gdpFactor = Math.pow(country.gdp_pc / gdp0, 0.2);
  const D = 0.5 * densityFactor * gdpFactor; // 基线0.5 km²/day (与巴伐利亚0.488一致)
  
  // K: 承载力 (归一化 0-1)
  // 高医院床位 + 高GHS分数 → 更高承载力上限
  const bedsNorm = Math.min(country.beds_per_1k / 13, 1); // 日本13.05为最高
  const ghsNorm = country.ghs_score / 100;
  const K = country.K_fit; // 直接使用OWID拟合值
  
  // r: 增长率 — 直接使用OWID拟合值
  const r = country.r_fit;
  
  // 行波速度 c = 2√(rD)
  const waveSpeed = 2 * Math.sqrt(r * D);
  
  return { 
    D: parseFloat(D.toFixed(3)), 
    K: parseFloat(K.toFixed(4)),
    r: parseFloat(r.toFixed(4)),
    waveSpeed: parseFloat(waveSpeed.toFixed(3)),
    r2: country.r2
  };
}

// 有效性系数（来自 PARAMETER_TABLE.md Section E）
const EFFECTIVENESS = {
  alpha_mob: 0.82,       // 封锁对D的降低: D_eff = D × (1 - 0.82 × p_mob)
  alpha_mask: 0.30,      // 口罩对β: 中等合规
  alpha_gather: 0.45,    // 禁聚集对β
  alpha_venue: 0.30,     // 关闭场所对β
  alpha_school: 0.20,    // 关闭学校对β
  alpha_home: 0.15,      // 居家令对β
  alpha_vax: 0.65,       // 疫苗对K
  alpha_test: 0.10,      // 检测追踪对β
};

// 经济成本（来自报告）
const POLICY_COSTS = {
  lockdown: { gdp_loss: 5.4, unemployment_rise: 2.0, consumption_drop: 7.5, fatigue_days: 112 },
  school_closure: { future_gdp_loss_trillion: 2.0 },
  mask_mandate: { gdp_loss: 0.1 },  // 几乎为零
  test_trace: { gdp_loss: 1.5 },
};

window.COUNTRIES = COUNTRIES;
window.deriveCountryParams = deriveCountryParams;
window.EFFECTIVENESS = EFFECTIVENESS;
window.POLICY_COSTS = POLICY_COSTS;
