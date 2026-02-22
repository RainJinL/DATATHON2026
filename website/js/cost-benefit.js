/**
 * Cost-Benefit Analysis Visualization
 * Scatter plot: economic cost vs infection reduction
 */

class CostBenefitChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = Math.min(400, w * 0.6);
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.w, h = this.h;
    const pad = { top: 40, right: 30, bottom: 55, left: 65 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Policy data points: [economic_cost_%, infection_reduction_%, label, color]
    const policies = [
      { x: 0.5, y: 65, label: 'Mask Mandate (95%)', color: '#3fb950', r: 12 },
      { x: 5.4, y: 70, label: 'Full Lockdown', color: '#f85149', r: 14 },
      { x: 3.2, y: 45, label: 'School Closures', color: '#d29922', r: 10 },
      { x: 1.5, y: 40, label: 'Testing & Tracing', color: '#58a6ff', r: 10 },
      { x: 2.0, y: 55, label: 'Travel Restrictions', color: '#bc8cff', r: 11 },
      { x: 0.3, y: 30, label: 'Mask Mandate (50%)', color: '#3fb950', r: 8 },
      { x: 1.8, y: 50, label: 'Social Distancing', color: '#d29922', r: 10 },
      { x: 2.8, y: 75, label: 'Pulsed Lockdown', color: '#ff7b72', r: 13 },
      { x: 4.0, y: 80, label: 'Lockdown + Masks', color: '#ffa657', r: 14 },
      { x: 0.1, y: 10, label: 'No Intervention', color: '#8b949e', r: 7 },
    ];

    const maxX = 7;
    const maxY = 100;

    // Grid
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + ph * (1 - i/5);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left+pw, y); ctx.stroke();
      ctx.fillStyle = '#8b949e';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((maxY * i/5).toFixed(0) + '%', pad.left - 8, y + 4);
    }
    for (let i = 0; i <= 7; i++) {
      const x = pad.left + (i/7) * pw;
      ctx.beginPath(); ctx.moveTo(x, pad.top); ctx.lineTo(x, pad.top+ph); ctx.stroke();
      ctx.fillStyle = '#8b949e';
      ctx.textAlign = 'center';
      ctx.fillText(i + '%', x, h - pad.bottom + 16);
    }

    // Pareto frontier (connect dominant points sorted by x)
    const pareto = policies.slice().sort((a, b) => a.x - b.x);
    let frontier = [];
    let maxSoFar = -1;
    for (const p of pareto) {
      if (p.y > maxSoFar) {
        frontier.push(p);
        maxSoFar = p.y;
      }
    }
    // Also build from right
    frontier = [];
    const sorted = policies.slice().sort((a, b) => a.x - b.x);
    let bestY = 0;
    for (const p of sorted) {
      if (p.y >= bestY) {
        frontier.push(p);
        bestY = p.y;
      }
    }
    
    if (frontier.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(63,185,80,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      for (let i = 0; i < frontier.length; i++) {
        const px = pad.left + (frontier[i].x / maxX) * pw;
        const py = pad.top + ph * (1 - frontier[i].y / maxY);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // "Efficient frontier" label
    ctx.fillStyle = 'rgba(63,185,80,0.6)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('← Pareto Frontier (Efficient Frontier)', pad.left + pw * 0.55, pad.top + 15);

    // Draw points
    for (const p of policies) {
      const px = pad.left + (p.x / maxX) * pw;
      const py = pad.top + ph * (1 - p.y / maxY);

      // Glow
      const grad = ctx.createRadialGradient(px, py, 0, px, py, p.r * 2);
      grad.addColorStop(0, p.color + '40');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(px - p.r*2, py - p.r*2, p.r*4, p.r*4);

      // Circle
      ctx.beginPath();
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#e6edf3';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, px, py - p.r - 6);
    }

    // Axes
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#8b949e';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Economic Cost (GDP Loss %)', pad.left + pw/2, h - 8);
    ctx.save();
    ctx.translate(14, pad.top + ph/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText('Infection Reduction (%)', 0, 0);
    ctx.restore();

    // Title
    ctx.fillStyle = '#58a6ff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Control Strategy Cost-Benefit Analysis', w/2, 20);
  }
}

window.CostBenefitChart = CostBenefitChart;
