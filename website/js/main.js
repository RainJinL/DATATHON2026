/**
 * Main UI Logic — Fisher-KPP + Recovery Single-Equation Model
 */

// Virus presets: now use r, γ, K, D directly
const PRESETS = {
  'covid-original': { name: 'COVID-19 Wild Type',  r: 0.30, gamma: 0.10, K: 1.0, D: 0.5 },
  'delta':          { name: 'COVID-19 Delta',      r: 0.55, gamma: 0.09, K: 1.0, D: 0.7 },
  'omicron':        { name: 'COVID-19 Omicron',    r: 0.80, gamma: 0.12, K: 1.0, D: 1.0 },
  'ebola':          { name: 'Ebola',               r: 0.14, gamma: 0.07, K: 0.3, D: 0.2 },
  'h1n1':           { name: 'Seasonal Flu H1N1',   r: 0.20, gamma: 0.14, K: 1.0, D: 0.3 },
  'measles':        { name: 'Measles',             r: 1.30, gamma: 0.09, K: 1.0, D: 0.8 },
  'sars':           { name: 'SARS',                r: 0.30, gamma: 0.10, K: 0.5, D: 0.3 },
  'custom':         { name: 'Custom Parameters',   r: 0.30, gamma: 0.10, K: 1.0, D: 0.5 },
};

let seirdAnimator, fisherAnimator, optimizer;
let currentData = null;

document.addEventListener('DOMContentLoaded', () => {
  // Init animators
  seirdAnimator = new SEIRDAnimator(document.getElementById('seird-canvas'));
  fisherAnimator = new FisherKPPAnimator(document.getElementById('fisher-canvas'));

  // Preset selector
  const presetSel = document.getElementById('preset');
  presetSel.addEventListener('change', () => {
    const p = PRESETS[presetSel.value];
    if (p && presetSel.value !== 'custom') {
      setSlider('param-r', p.r);
      setSlider('param-gamma', p.gamma);
      setSlider('param-K', p.K);
      setSlider('param-D', p.D);
    }
  });

  // Slider value displays
  document.querySelectorAll('input[type="range"]').forEach(el => {
    el.addEventListener('input', () => {
      const display = document.getElementById(el.id + '-val');
      if (display) {
        let v = parseFloat(el.value);
        if (el.id === 'param-r') display.textContent = v.toFixed(2);
        else if (el.id === 'param-gamma') display.textContent = v.toFixed(3);
        else if (el.id === 'param-K') display.textContent = v.toFixed(2);
        else if (el.id === 'param-D') display.textContent = v.toFixed(2);
        else display.textContent = v.toFixed(1);
      }
    });
  });

  // Policy sliders
  document.querySelectorAll('.policy-slider').forEach(el => {
    el.addEventListener('input', () => {
      const display = document.getElementById(el.id + '-val');
      if (display) display.textContent = Math.round(el.value) + '%';
      updatePolicyReff();
    });
  });

  // Budget slider
  const budgetSlider = document.getElementById('budget');
  if (budgetSlider) {
    budgetSlider.addEventListener('input', () => {
      document.getElementById('budget-val').textContent = Math.round(budgetSlider.value) + '%';
      autoAllocateBudget(parseFloat(budgetSlider.value) / 100);
    });
  }

  // Run button
  document.getElementById('run-btn').addEventListener('click', runSimulation);

  // Controls
  document.getElementById('play-btn').addEventListener('click', () => { seirdAnimator.play(); fisherAnimator.play(); });
  document.getElementById('pause-btn').addEventListener('click', () => { seirdAnimator.pause(); fisherAnimator.pause(); });
  document.getElementById('reset-btn').addEventListener('click', () => { seirdAnimator.reset(); fisherAnimator.reset(); });

  const speedSlider = document.getElementById('speed');
  speedSlider.addEventListener('input', () => {
    const s = parseInt(speedSlider.value);
    seirdAnimator.setSpeed(s);
    fisherAnimator.setSpeed(s);
    document.getElementById('speed-val').textContent = s + 'x';
  });

  seirdAnimator.onFrame = (day) => {
    document.getElementById('day-counter').textContent = 'Day ' + Math.round(day);
  };

  // Scenario buttons
  document.querySelectorAll('.scenario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const scenario = btn.dataset.scenario;
      applyScenario(scenario);
    });
  });

  // Resize handling
  window.addEventListener('resize', () => {
    seirdAnimator.resize();
    fisherAnimator.resize();
  });

  // Load default preset
  presetSel.value = 'covid-original';
  presetSel.dispatchEvent(new Event('change'));
});

function setSlider(id, value) {
  const el = document.getElementById(id);
  if (el) {
    el.value = value;
    el.dispatchEvent(new Event('input'));
  }
}

function getParams() {
  return {
    r: parseFloat(document.getElementById('param-r').value),
    gamma: parseFloat(document.getElementById('param-gamma').value),
    K: parseFloat(document.getElementById('param-K').value),
    D: parseFloat(document.getElementById('param-D').value),
    days: 365,
  };
}

function getPolicies() {
  return {
    mask: parseFloat(document.getElementById('policy-mask').value) / 100,
    socialDist: parseFloat(document.getElementById('policy-social').value) / 100,
    travel: parseFloat(document.getElementById('policy-travel').value) / 100,
    vaccination: parseFloat(document.getElementById('policy-vax').value) / 100,
  };
}

function runSimulation() {
  const params = getParams();

  // ODE time simulation
  const solver = InfectionSolver.fromEpiParams(params);
  currentData = solver.solve();
  // Attach equilibrium info for the animator
  currentData._uStar = solver.getEquilibrium();
  seirdAnimator.setData(currentData);

  // Fisher-KPP 1D PDE
  const fisherSolver = new FisherKPPSolver({
    D: params.D,
    r: params.r,
    K: params.K,
    gamma: params.gamma,
    L: 200,
    nx: 400,
    days: Math.min(100, params.days),
  });
  const snapshots = fisherSolver.solve();
  fisherAnimator.setData(snapshots, fisherSolver.waveSpeed);

  // Policy optimizer
  optimizer = new PolicyOptimizer(params);
  updatePolicyReff();
  runScenarios();

  // Auto play
  seirdAnimator.play();
  fisherAnimator.play();

  // Show info
  const R0 = params.gamma > 0 ? params.r / params.gamma : Infinity;
  document.getElementById('day-counter').textContent = 'Day 0';
  document.getElementById('peak-info').textContent =
    'Peak Infection: ' + (Math.max(...currentData.u) * 100).toFixed(2) + '%';
  document.getElementById('r0-display').textContent =
    'R₀ = r/γ = ' + R0.toFixed(2);
  const waveEl = document.getElementById('wave-speed-info');
  if (waveEl) waveEl.textContent = 'Wave Speed c = 2√((r−γ)D) = ' + solver.getWaveSpeed().toFixed(2) + ' km/day';
}

function updatePolicyReff() {
  if (!optimizer) return;
  const policies = getPolicies();
  const rEff = optimizer.calcReff(policies);
  const rEffEl = document.getElementById('r-eff-number');
  if (rEffEl) {
    rEffEl.textContent = rEff.toFixed(2);
    rEffEl.style.color = rEff > 1 ? '#f85149' : '#3fb950';
  }
  const cost = optimizer.calcCost(policies);
  const costEl = document.getElementById('policy-cost');
  if (costEl) costEl.textContent = 'Policy Cost Index: ' + (cost * 100).toFixed(1);
}

function runScenarios() {
  if (!optimizer) return;
  const scenarios = optimizer.getScenarios();
  const tbody = document.getElementById('scenario-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  for (const [name, pol] of Object.entries(scenarios)) {
    const sim = optimizer.simulate(pol);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${name}</td>
      <td style="color:${sim.rEff>1?'#f85149':'#3fb950'}">${sim.rEff.toFixed(2)}</td>
      <td>${(sim.peakI * 100).toFixed(3)}%</td>
      <td>${(sim.totalDeaths * 100).toFixed(4)}%</td>
      <td>${(sim.cost * 100).toFixed(1)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function applyScenario(name) {
  if (!optimizer) return;
  const scenarios = optimizer.getScenarios();
  const pol = scenarios[name];
  if (!pol) return;
  setSlider('policy-mask', pol.mask * 100);
  setSlider('policy-social', pol.socialDist * 100);
  setSlider('policy-travel', pol.travel * 100);
  setSlider('policy-vax', pol.vaccination * 100);
  document.querySelectorAll('.policy-slider').forEach(el => el.dispatchEvent(new Event('input')));

  // Re-run with modified r
  const params = getParams();
  const rReduction = optimizer.calcRReduction(pol);
  const modParams = { ...params, r: params.r * (1 - rReduction) };
  const solver = InfectionSolver.fromEpiParams(modParams);
  const data = solver.solve();
  data._uStar = solver.getEquilibrium();
  seirdAnimator.setData(data);
  seirdAnimator.play();
  updatePolicyReff();
}

function autoAllocateBudget(budget) {
  let remaining = budget;
  const alloc = { mask: 0, socialDist: 0, travel: 0, vaccination: 0 };
  const priorities = [
    { key: 'mask', maxCost: 0.08, maxEffect: 0.3 },
    { key: 'vaccination', maxCost: 0.50, maxEffect: 0.6 },
    { key: 'socialDist', maxCost: 0.35, maxEffect: 0.4 },
    { key: 'travel', maxCost: 0.25, maxEffect: 0.6 },
  ].sort((a, b) => (b.maxEffect/b.maxCost) - (a.maxEffect/a.maxCost));

  for (const p of priorities) {
    const canUse = Math.min(remaining / p.maxCost, 1);
    alloc[p.key] = canUse;
    remaining -= canUse * p.maxCost;
    if (remaining <= 0) break;
  }

  setSlider('policy-mask', alloc.mask * 100);
  setSlider('policy-social', alloc.socialDist * 100);
  setSlider('policy-travel', alloc.travel * 100);
  setSlider('policy-vax', alloc.vaccination * 100);
  document.querySelectorAll('.policy-slider').forEach(el => el.dispatchEvent(new Event('input')));
}
