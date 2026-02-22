/**
 * Lockdown Fatigue Decay Model
 * effectiveness(t) = max(0, η₀ × (1 - t/112))
 * At t=112 days, lockdown effect drops to 0
 */

class FatigueSimulator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = Math.min(350, w * 0.5);
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
  }

  /**
   * Draw fatigue decay + R_eff over time
   * @param {number} R0 - base R0
   * @param {number} initialReduction - initial lockdown reduction (0-1)
   */
  draw(R0, initialReduction) {
    const ctx = this.ctx;
    const w = this.w, h = this.h;
    const pad = { top: 30, right: 60, bottom: 50, left: 60 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;
    const T_fatigue = 112; // days until full decay
    const days = 200;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + ph * (1 - i/5);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left+pw, y); ctx.stroke();
    }

    // X-axis labels
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let d = 0; d <= days; d += 40) {
      const x = pad.left + (d/days) * pw;
      ctx.fillText('Day ' + d, x, h - pad.bottom + 18);
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top+ph); ctx.stroke();
    }

    // Fatigue curve: η(t)
    ctx.beginPath();
    ctx.strokeStyle = '#d29922';
    ctx.lineWidth = 2.5;
    for (let d = 0; d <= days; d++) {
      const eta = Math.max(0, initialReduction * (1 - d / T_fatigue));
      const x = pad.left + (d/days) * pw;
      const y = pad.top + ph * (1 - eta);
      d === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // R_eff curve
    ctx.beginPath();
    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 2.5;
    const maxReff = R0 * 1.1;
    for (let d = 0; d <= days; d++) {
      const eta = Math.max(0, initialReduction * (1 - d / T_fatigue));
      const rEff = R0 * (1 - eta);
      const x = pad.left + (d/days) * pw;
      const y = pad.top + ph * (1 - rEff / maxReff);
      d === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // R_eff = 1 line
    const y1 = pad.top + ph * (1 - 1 / maxReff);
    if (y1 > pad.top && y1 < pad.top + ph) {
      ctx.beginPath();
      ctx.strokeStyle = '#3fb950';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.moveTo(pad.left, y1);
      ctx.lineTo(pad.left + pw, y1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#3fb950';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Reff = 1 (critical line)', pad.left + pw + 4, y1 + 4);
    }

    // Fatigue deadline vertical
    if (T_fatigue <= days) {
      const xf = pad.left + (T_fatigue/days) * pw;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(188,140,255,0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(xf, pad.top); ctx.lineTo(xf, pad.top+ph);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#bc8cff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('t=112 days (fatigue fully decayed)', xf, pad.top - 8);
    }

    // Y-axis left: effectiveness
    ctx.fillStyle = '#d29922';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + ph * (1 - i/5);
      ctx.fillText((i*20) + '%', pad.left - 8, y + 4);
    }
    ctx.save();
    ctx.translate(14, pad.top + ph/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center';
    ctx.fillText('Lockdown Effectiveness η(t)', 0, 0);
    ctx.restore();

    // Y-axis right: Reff
    ctx.fillStyle = '#f85149';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + ph * (1 - i/5);
      const rVal = (maxReff * i / 5).toFixed(1);
      ctx.fillText(rVal, pad.left + pw + 6, y + 4);
    }
    ctx.save();
    ctx.translate(w - 10, pad.top + ph/2);
    ctx.rotate(Math.PI/2);
    ctx.textAlign = 'center';
    ctx.fillText('Effective Reproduction Number Reff', 0, 0);
    ctx.restore();

    // Axes
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.stroke();

    // Legend
    const legendY = pad.top + 10;
    ctx.font = '12px sans-serif';
    [['#d29922', 'Lockdown Effectiveness η(t)'], ['#f85149', 'Effective Reproduction Number Reff']].forEach(([c, l], i) => {
      const lx = pad.left + 10 + i * 160;
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx, legendY); ctx.lineTo(lx + 25, legendY); ctx.stroke();
      ctx.fillStyle = c;
      ctx.textAlign = 'left';
      ctx.fillText(l, lx + 30, legendY + 4);
    });

    // X label
    ctx.fillStyle = '#8b949e';
    ctx.textAlign = 'center';
    ctx.fillText('Time (days)', pad.left + pw/2, h - 8);
  }
}

window.FatigueSimulator = FatigueSimulator;
