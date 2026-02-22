/**
 * Initialize all sections: spatial 2D, fatigue, cost-benefit, pulse, countries, KaTeX equations, data pipeline
 */

document.addEventListener('DOMContentLoaded', () => {
  // ═══════════ KaTeX Equations ═══════════
  function renderEq(id, tex, displayMode = true) {
    const el = document.getElementById(id);
    if (!el || typeof katex === 'undefined') return;
    try { katex.render(tex, el, { displayMode, throwOnError: false }); } catch(e) { el.textContent = tex; }
  }

  const renderAllEqs = () => {
    renderEq('eq-fisher', '\\frac{\\partial u}{\\partial t} = D \\nabla^2 u + r \\cdot u\\left(1 - \\frac{u}{K}\\right) - \\gamma u');
    renderEq('eq-wave', 'c = 2\\sqrt{(r - \\gamma) \\cdot D} \\quad \\text{when } r > \\gamma');
    renderEq('eq-r0', 'R_0 = \\frac{r}{\\gamma}');
    renderEq('eq-equil', 'u^* = K\\left(1 - \\frac{\\gamma}{r}\\right) \\quad \\text{(endemic equilibrium when } R_0 > 1\\text{)}');
    renderEq('eq-2d', '\\frac{\\partial u}{\\partial t} = D\\left(\\frac{\\partial^2 u}{\\partial x^2} + \\frac{\\partial^2 u}{\\partial y^2}\\right) + r \\cdot u\\left(1-\\frac{u}{K}\\right) - \\gamma u');
    renderEq('eq-fatigue', '\\eta(t) = \\max\\left(0,\\; \\eta_0 \\cdot \\left(1 - \\frac{t}{112}\\right)\\right)');
    renderEq('eq-objective', '\\min_{\\mathbf{p}(t)} \\int_0^T \\left[\\lambda_1 \\cdot u(\\mathbf{x},t) + \\lambda_2 \\cdot C(\\mathbf{p}(t))\\right] dt');
    // Pipeline section equations
    renderEq('eq-pipeline-model', '\\frac{\\partial u}{\\partial t} = D \\nabla^2 u + r \\cdot u\\left(1 - \\frac{u}{K}\\right) - \\gamma u');
    renderEq('eq-pipeline-r0', 'R_0 = \\frac{r}{\\gamma}, \\quad u^* = K\\left(1 - \\frac{\\gamma}{r}\\right)');
    renderEq('eq-pipeline-wave', 'c = 2\\sqrt{(r - \\gamma) \\cdot D}');
  };

  if (typeof katex !== 'undefined') {
    setTimeout(renderAllEqs, 100);
  } else {
    window.addEventListener('load', () => setTimeout(renderAllEqs, 300));
  }

  // ═══════════ Country Dropdown ═══════════
  const countrySelect = document.getElementById('country-preset');
  if (countrySelect && typeof COUNTRIES !== 'undefined') {
    for (const [code, c] of Object.entries(COUNTRIES)) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = c.name + ' (' + code + ')';
      countrySelect.appendChild(opt);
    }
    countrySelect.addEventListener('change', () => {
      const code = countrySelect.value;
      if (!code || !COUNTRIES[code]) return;
      const country = COUNTRIES[code];
      const derived = deriveCountryParams(country);
      const dEl = document.getElementById('param-D');
      if (dEl) { dEl.value = derived.D; dEl.dispatchEvent(new Event('input')); }
      const kEl = document.getElementById('param-K');
      if (kEl) { kEl.value = derived.K; kEl.dispatchEvent(new Event('input')); }
    });
  }

  // ═══════════ Country Table ═══════════
  const countryTbody = document.getElementById('country-tbody');
  if (countryTbody && typeof COUNTRIES !== 'undefined') {
    countryTbody.innerHTML = '';
    for (const [code, c] of Object.entries(COUNTRIES)) {
      const derived = deriveCountryParams(c);
      const r2color = c.r2 > 0.95 ? '#3fb950' : c.r2 > 0.90 ? '#d29922' : '#f85149';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${c.name}</strong> (${code})</td>
        <td>${(c.population/1e6).toFixed(0)}M</td>
        <td>${c.density}</td>
        <td>${c.beds_per_1k.toFixed(2)}</td>
        <td>${c.gdp_pc.toLocaleString()}</td>
        <td>${c.ghs_score}</td>
        <td>${derived.r} (r_fit)</td>
        <td>${derived.D}</td>
        <td>${derived.waveSpeed} km/day</td>
        <td style="color:${r2color}">${(c.r2*100).toFixed(1)}%</td>
      `;
      countryTbody.appendChild(tr);
    }
  }

  // ═══════════ Feature Importance Chart (Data Pipeline) ═══════════
  const fiCanvas = document.getElementById('feature-importance-canvas');
  if (fiCanvas) {
    const fiCtx = fiCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function drawFeatureImportance() {
      const parent = fiCanvas.parentElement;
      const w = parent.clientWidth - 32;
      const h = 280;
      fiCanvas.width = w * dpr;
      fiCanvas.height = h * dpr;
      fiCanvas.style.width = w + 'px';
      fiCanvas.style.height = h + 'px';
      fiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const features = [
        { name: 'Population Density', imp: 0.182, color: '#f85149' },
        { name: 'GHS Index', imp: 0.156, color: '#f85149' },
        { name: 'GDP per Capita', imp: 0.098, color: '#d29922' },
        { name: 'Hospital Beds/1k', imp: 0.091, color: '#d29922' },
        { name: 'Median Age', imp: 0.076, color: '#d29922' },
        { name: 'Urbanization Rate', imp: 0.068, color: '#8b949e' },
        { name: 'Tourism Arrivals', imp: 0.054, color: '#8b949e' },
        { name: 'Air Connectivity', imp: 0.048, color: '#8b949e' },
        { name: 'Stringency Index', imp: 0.042, color: '#8b949e' },
        { name: 'Testing Rate', imp: 0.038, color: '#8b949e' },
      ];

      const pad = { top: 10, right: 60, bottom: 25, left: 130 };
      const pw = w - pad.left - pad.right;
      const ph = h - pad.top - pad.bottom;
      const barH = Math.min(22, ph / features.length - 4);
      const maxImp = 0.20;

      fiCtx.clearRect(0, 0, w, h);

      features.forEach((f, i) => {
        const y = pad.top + (i / features.length) * ph + 2;
        const barW = (f.imp / maxImp) * pw;

        // Bar
        fiCtx.fillStyle = f.color;
        fiCtx.globalAlpha = 0.8;
        fiCtx.fillRect(pad.left, y, barW, barH);
        fiCtx.globalAlpha = 1;

        // Label
        fiCtx.fillStyle = '#e6edf3';
        fiCtx.font = '11px sans-serif';
        fiCtx.textAlign = 'right';
        fiCtx.fillText(f.name, pad.left - 6, y + barH / 2 + 4);

        // Value
        fiCtx.fillStyle = '#8b949e';
        fiCtx.textAlign = 'left';
        fiCtx.fillText(f.imp.toFixed(3), pad.left + barW + 6, y + barH / 2 + 4);
      });

      // "Selected" bracket for top 2
      fiCtx.strokeStyle = '#3fb950';
      fiCtx.lineWidth = 2;
      fiCtx.setLineDash([4, 2]);
      const bracketX = pad.left + (features[0].imp / maxImp) * pw + 50;
      fiCtx.beginPath();
      fiCtx.moveTo(bracketX, pad.top);
      fiCtx.lineTo(bracketX + 8, pad.top);
      fiCtx.lineTo(bracketX + 8, pad.top + (2 / features.length) * ph - 2);
      fiCtx.lineTo(bracketX, pad.top + (2 / features.length) * ph - 2);
      fiCtx.stroke();
      fiCtx.setLineDash([]);
      fiCtx.fillStyle = '#3fb950';
      fiCtx.font = '10px sans-serif';
      fiCtx.textAlign = 'left';
      fiCtx.fillText('← Selected', bracketX + 12, pad.top + (1 / features.length) * ph + 4);
    }

    drawFeatureImportance();
    window.addEventListener('resize', drawFeatureImportance);
  }

  // ═══════════ 2D Spatial Simulation ═══════════
  let spatial2d = null;
  window._spatial2d = null;

  if (typeof Spatial2DSimulator !== 'undefined') {
    spatial2d = new Spatial2DSimulator(
      document.getElementById('heatmap-canvas'),
      document.getElementById('map-canvas')
    );
    window._spatial2d = spatial2d;

    const spatialMapEl = document.getElementById('spatial-map');
    if (spatialMapEl) {
      spatial2d.initMap('spatial-map');
    }

    // Get current model params for spatial sim
    function getSpatialParams() {
      const r = parseFloat(document.getElementById('param-r')?.value || 0.20);
      const gamma = parseFloat(document.getElementById('param-gamma')?.value || 0.07);
      const D = parseFloat(document.getElementById('param-D')?.value || 0.8);
      const K = parseFloat(document.getElementById('param-K')?.value || 1.0);
      return { r, gamma, D, K };
    }

    function applySpatialParams() {
      const p = getSpatialParams();
      spatial2d.setVirusParams(p.r, p.gamma, p.D, p.K);
    }

    // Click to add seed
    spatial2d._clickHandler = (lat, lng) => {
      applySpatialParams();
      if (!spatial2d.u) {
        spatial2d.init([{ lat, lng }]);
      } else {
        spatial2d.addSeed(lat, lng);
      }
      const seedInfo = document.getElementById('spatial-seeds');
      if (seedInfo) seedInfo.textContent = 'Infection Sources: ' + spatial2d.seeds.length;
      const speedInfo = document.getElementById('spatial-speed');
      if (speedInfo) speedInfo.textContent = 'Wave Speed: ' + spatial2d.getWaveSpeed().toFixed(2) + ' km/day';
    };

    // Update day counter + stats
    spatial2d.onDayUpdate = (day) => {
      const el = document.getElementById('spatial-day');
      if (el) el.textContent = 'Day ' + day;
      const stats = spatial2d.getStats();
      const seedInfo = document.getElementById('spatial-seeds');
      if (seedInfo) seedInfo.textContent = 'Global Infection: ' + stats.percentage.toFixed(1) + '% land';
      // Sync policy sliders
      const mask = parseFloat(document.getElementById('policy-mask')?.value || 0) / 100;
      const social = parseFloat(document.getElementById('policy-social')?.value || 0) / 100;
      const lockdown = parseFloat(document.getElementById('policy-travel')?.value || 0) / 100;
      const vax = parseFloat(document.getElementById('policy-vax')?.value || 0) / 100;
      spatial2d.setPolicy(mask, social, lockdown, vax);
    };

    // Speed slider
    const spatialSpeedSlider = document.getElementById('spatial-speed-slider');
    const spatialSpeedVal = document.getElementById('spatial-speed-val');
    if (spatialSpeedSlider) {
      spatialSpeedSlider.addEventListener('input', () => {
        const s = parseInt(spatialSpeedSlider.value);
        spatial2d.stepsPerFrame = s;
        if (spatialSpeedVal) spatialSpeedVal.textContent = s + 'x';
      });
      spatial2d.stepsPerFrame = parseInt(spatialSpeedSlider.value);
    }

    // Buttons
    document.getElementById('spatial-play')?.addEventListener('click', () => {
      if (!spatial2d.u) {
        applySpatialParams();
        spatial2d.init([{ lat: 30.59, lng: 114.31 }]);
        const seedInfo = document.getElementById('spatial-seeds');
        if (seedInfo) seedInfo.textContent = 'Infection Sources: 1';
        const speedInfo = document.getElementById('spatial-speed');
        if (speedInfo) speedInfo.textContent = 'Wave Speed: ' + spatial2d.getWaveSpeed().toFixed(2) + ' km/day';
      }
      spatial2d.play();
    });
    document.getElementById('spatial-pause')?.addEventListener('click', () => spatial2d.pause());
    document.getElementById('spatial-reset')?.addEventListener('click', () => {
      spatial2d.reset();
      spatial2d.drawMap();
      document.getElementById('spatial-day').textContent = 'Day 0';
      document.getElementById('spatial-seeds').textContent = 'Infection Sources: 0';
    });

    // Quick seed buttons
    const seedButtons = {
      'spatial-seed-china': { lat: 30.59, lng: 114.31 },
      'spatial-seed-italy': { lat: 41.87, lng: 12.57 },
      'spatial-seed-us': { lat: 40.71, lng: -74.01 },
    };
    for (const [id, coord] of Object.entries(seedButtons)) {
      document.getElementById(id)?.addEventListener('click', () => {
        applySpatialParams();
        if (!spatial2d.u) {
          spatial2d.init([coord]);
        } else {
          spatial2d.addSeed(coord.lat, coord.lng);
        }
        const seedInfo = document.getElementById('spatial-seeds');
        if (seedInfo) seedInfo.textContent = 'Infection Sources: ' + spatial2d.seeds.length;
        const speedInfo = document.getElementById('spatial-speed');
        if (speedInfo) speedInfo.textContent = 'Wave Speed: ' + spatial2d.getWaveSpeed().toFixed(2) + ' km/day';
      });
    }

    window.addEventListener('resize', () => spatial2d.resize());
  }

  // ═══════════ Lockdown Fatigue ═══════════
  const fatigueCanvas = document.getElementById('fatigue-canvas');
  if (fatigueCanvas && typeof FatigueSimulator !== 'undefined') {
    const fatigueSim = new FatigueSimulator(fatigueCanvas);
    const r = parseFloat(document.getElementById('param-r')?.value || 0.30);
    const gamma = parseFloat(document.getElementById('param-gamma')?.value || 0.10);
    const R0 = r / gamma;
    fatigueSim.draw(R0, 0.5);

    // Redraw on param change
    const redrawFatigue = () => {
      const r2 = parseFloat(document.getElementById('param-r')?.value || 0.30);
      const g2 = parseFloat(document.getElementById('param-gamma')?.value || 0.10);
      fatigueSim.draw(r2 / g2, 0.5);
    };
    document.getElementById('param-r')?.addEventListener('input', redrawFatigue);
    document.getElementById('param-gamma')?.addEventListener('input', redrawFatigue);

    window.addEventListener('resize', () => {
      fatigueSim.resize();
      redrawFatigue();
    });
  }

  // ═══════════ Cost-Benefit Chart ═══════════
  const cbCanvas = document.getElementById('cost-benefit-canvas');
  if (cbCanvas && typeof CostBenefitChart !== 'undefined') {
    const cbChart = new CostBenefitChart(cbCanvas);
    cbChart.draw();
    window.addEventListener('resize', () => { cbChart.resize(); cbChart.draw(); });
  }

  // ═══════════ Pulse Control Strategy ═══════════
  const pulseCanvas = document.getElementById('pulse-canvas');
  if (pulseCanvas) {
    const pCtx = pulseCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    function drawPulseStrategy() {
      const parent = pulseCanvas.parentElement;
      const w = parent.clientWidth;
      const h = Math.min(400, w * 0.5);
      pulseCanvas.width = w * dpr;
      pulseCanvas.height = h * dpr;
      pulseCanvas.style.width = w + 'px';
      pulseCanvas.style.height = h + 'px';
      pCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const pad = { top: 30, right: 30, bottom: 50, left: 60 };
      const pw = w - pad.left - pad.right;
      const ph = h - pad.top - pad.bottom;
      const days = 365;

      pCtx.clearRect(0, 0, w, h);
      pCtx.fillStyle = '#0d1117';
      pCtx.fillRect(0, 0, w, h);

      // Grid
      pCtx.strokeStyle = '#21262d';
      pCtx.lineWidth = 0.5;
      for (let i = 0; i <= 5; i++) {
        const y = pad.top + ph * (1 - i / 5);
        pCtx.beginPath(); pCtx.moveTo(pad.left, y); pCtx.lineTo(pad.left + pw, y); pCtx.stroke();
        pCtx.fillStyle = '#8b949e';
        pCtx.font = '11px sans-serif';
        pCtx.textAlign = 'right';
        pCtx.fillText((i * 20) + '%', pad.left - 8, y + 4);
      }
      for (let d = 0; d <= days; d += 60) {
        const x = pad.left + (d / days) * pw;
        pCtx.beginPath(); pCtx.moveTo(x, pad.top); pCtx.lineTo(x, pad.top + ph); pCtx.stroke();
        pCtx.fillStyle = '#8b949e';
        pCtx.textAlign = 'center';
        pCtx.fillText('Day ' + d, x, h - pad.bottom + 18);
      }

      // Get params from UI
      const r = parseFloat(document.getElementById('param-r')?.value || 0.30);
      const gamma = parseFloat(document.getElementById('param-gamma')?.value || 0.10);
      const K = parseFloat(document.getElementById('param-K')?.value || 1.0);

      // Simple u(t) simulation for pulse strategy comparison
      function simpleInfection(rEff, gammaVal, Kval, days) {
        const dt = 0.1;
        let u = 1e-5;
        const result = [];
        for (let d = 0; d < days; d++) {
          for (let s = 0; s < Math.round(1/dt); s++) {
            const growth = rEff * u * (1 - u / Kval);
            const recovery = gammaVal * u;
            u += (growth - recovery) * dt;
            u = Math.max(0, Math.min(Kval, u));
          }
          result.push(u * 100);
        }
        return result;
      }

      // 1. No intervention
      const noIntervention = simpleInfection(r, gamma, K, days);

      // 2. Continuous lockdown (50% r reduction, with fatigue)
      const continuous = [];
      {
        const dt = 0.1;
        let u = 1e-5;
        for (let d = 0; d < days; d++) {
          const fatigue = Math.max(0, 0.5 * (1 - d/112));
          const rEff = r * (1 - fatigue);
          for (let s = 0; s < Math.round(1/dt); s++) {
            const growth = rEff * u * (1 - u / K);
            const recovery = gamma * u;
            u += (growth - recovery) * dt;
            u = Math.max(0, Math.min(K, u));
          }
          continuous.push(u * 100);
        }
      }

      // 3. Pulsed control (10 days on at 70% r reduction, 20 days off)
      const pulsed = [];
      {
        const dt = 0.1;
        let u = 1e-5;
        for (let d = 0; d < days; d++) {
          const cycleDay = d % 30;
          const reduction = cycleDay < 10 ? 0.70 : 0;
          const rEff = r * (1 - reduction);
          for (let s = 0; s < Math.round(1/dt); s++) {
            const growth = rEff * u * (1 - u / K);
            const recovery = gamma * u;
            u += (growth - recovery) * dt;
            u = Math.max(0, Math.min(K, u));
          }
          pulsed.push(u * 100);
        }
      }

      const allMax = Math.max(...noIntervention, ...continuous, ...pulsed, 1);

      // Draw lockdown bands
      pCtx.fillStyle = 'rgba(248,81,73,0.06)';
      for (let d = 0; d < days; d += 30) {
        const x1 = pad.left + (d / days) * pw;
        const x2 = pad.left + (Math.min(d + 10, days) / days) * pw;
        pCtx.fillRect(x1, pad.top, x2 - x1, ph);
      }

      function drawCurve(data, color, lineWidth) {
        pCtx.beginPath();
        pCtx.strokeStyle = color;
        pCtx.lineWidth = lineWidth;
        for (let d = 0; d < data.length; d++) {
          const x = pad.left + (d / days) * pw;
          const y = pad.top + ph * (1 - data[d] / allMax);
          d === 0 ? pCtx.moveTo(x, y) : pCtx.lineTo(x, y);
        }
        pCtx.stroke();
      }

      drawCurve(noIntervention, '#58a6ff', 2);
      drawCurve(continuous, '#f85149', 2.5);
      drawCurve(pulsed, '#3fb950', 2.5);

      // Axes
      pCtx.strokeStyle = '#30363d';
      pCtx.lineWidth = 1;
      pCtx.beginPath();
      pCtx.moveTo(pad.left, pad.top);
      pCtx.lineTo(pad.left, pad.top + ph);
      pCtx.lineTo(pad.left + pw, pad.top + ph);
      pCtx.stroke();

      // Labels
      pCtx.fillStyle = '#8b949e';
      pCtx.font = '12px sans-serif';
      pCtx.textAlign = 'center';
      pCtx.fillText('Time (days)', pad.left + pw / 2, h - 8);

      pCtx.save();
      pCtx.translate(14, pad.top + ph / 2);
      pCtx.rotate(-Math.PI / 2);
      pCtx.fillText('Active Infection u(t) (%)', 0, 0);
      pCtx.restore();

      // Legend
      const legendY = pad.top + 10;
      pCtx.font = '12px sans-serif';
      [['#58a6ff', 'No Intervention'], ['#f85149', 'Continuous Lockdown (w/ fatigue)'], ['#3fb950', 'Pulsed Control (10d on / 20d off)']].forEach(([c, l], i) => {
        const lx = pad.left + 10 + i * 190;
        pCtx.strokeStyle = c;
        pCtx.lineWidth = 2.5;
        pCtx.beginPath(); pCtx.moveTo(lx, legendY); pCtx.lineTo(lx + 20, legendY); pCtx.stroke();
        pCtx.fillStyle = c;
        pCtx.textAlign = 'left';
        pCtx.fillText(l, lx + 25, legendY + 4);
      });

      pCtx.fillStyle = 'rgba(248,81,73,0.4)';
      pCtx.font = '10px sans-serif';
      pCtx.textAlign = 'left';
      pCtx.fillText('█ = Lockdown', pad.left + pw - 80, pad.top + ph - 8);
    }

    drawPulseStrategy();

    ['param-r', 'param-gamma', 'param-K'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', drawPulseStrategy);
    });
    window.addEventListener('resize', drawPulseStrategy);
  }

  // ═══════════ Smooth Scroll for Nav ═══════════
  document.querySelectorAll('.topnav a[href^="#"], .nav-links a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
});
