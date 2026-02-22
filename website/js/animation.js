/**
 * Canvas-based Animations for Fisher-KPP Infection Model
 */

class SEIRDAnimator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = null;
    this.frame = 0;
    this.playing = false;
    this.speed = 1;
    this.rafId = null;
    this.onFrame = null;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = Math.min(400, w * 0.55);
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
    if (this.data) this.drawFrame();
  }

  setData(data) {
    this.data = data;
    this.frame = 0;
    this.drawFrame();
  }

  drawFrame() {
    if (!this.data) return;
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const pad = { top: 20, right: 20, bottom: 40, left: 55 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const data = this.data;
    const maxDay = this.frame;
    if (maxDay < 1) { this.drawAxes(ctx, pad, pw, ph); return; }

    // Find y max from u values
    let yMax = 0;
    for (let i = 0; i <= maxDay && i < data.t.length; i++) {
      yMax = Math.max(yMax, data.u[i]);
    }
    yMax = Math.max(yMax * 1.2, 0.001);

    // Draw grid
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + ph * (1 - i/4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + pw, y); ctx.stroke();
      ctx.fillStyle = '#8b949e';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText((yMax * i / 4 * 100).toFixed(2) + '%', pad.left - 6, y + 4);
    }

    // X axis labels
    const totalDays = data.t[data.t.length - 1];
    ctx.textAlign = 'center';
    for (let d = 0; d <= totalDays; d += Math.ceil(totalDays/6)) {
      const x = pad.left + (d / totalDays) * pw;
      ctx.fillStyle = '#8b949e';
      ctx.fillText('Day ' + d, x, h - pad.bottom + 20);
    }

    // Draw growth rate curve (secondary, dashed)
    ctx.beginPath();
    ctx.strokeStyle = '#d29922';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    for (let i = 0; i <= maxDay && i < data.t.length; i++) {
      const x = pad.left + (data.t[i] / totalDays) * pw;
      const y = pad.top + ph * (1 - data.growth[i] / yMax);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw recovery rate curve (secondary, dashed)
    ctx.beginPath();
    ctx.strokeStyle = '#3fb950';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    for (let i = 0; i <= maxDay && i < data.t.length; i++) {
      const x = pad.left + (data.t[i] / totalDays) * pw;
      const y = pad.top + ph * (1 - data.recovery[i] / yMax);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw main u(t) curve (solid, prominent)
    ctx.beginPath();
    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= maxDay && i < data.t.length; i++) {
      const x = pad.left + (data.t[i] / totalDays) * pw;
      const y = pad.top + ph * (1 - data.u[i] / yMax);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill under u curve
    ctx.lineTo(pad.left + (data.t[Math.min(maxDay, data.t.length-1)] / totalDays) * pw, pad.top + ph);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.closePath();
    ctx.fillStyle = 'rgba(248,81,73,0.1)';
    ctx.fill();

    // Draw equilibrium line if r > γ
    if (data._uStar && data._uStar > 0) {
      const eqY = pad.top + ph * (1 - data._uStar / yMax);
      if (eqY > pad.top && eqY < pad.top + ph) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(188,140,255,0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.moveTo(pad.left, eqY);
        ctx.lineTo(pad.left + pw, eqY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#bc8cff';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('u* = ' + (data._uStar * 100).toFixed(2) + '%', pad.left + pw - 100, eqY - 5);
      }
    }

    this.drawAxes(ctx, pad, pw, ph);
  }

  drawAxes(ctx, pad, pw, ph) {
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.stroke();
  }

  play() {
    if (!this.data || this.playing) return;
    this.playing = true;
    const animate = () => {
      if (!this.playing) return;
      for (let i = 0; i < this.speed; i++) {
        if (this.frame < this.data.t.length - 1) this.frame++;
      }
      this.drawFrame();
      if (this.onFrame) this.onFrame(this.data.t[this.frame] || 0);
      if (this.frame < this.data.t.length - 1) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        this.playing = false;
      }
    };
    this.rafId = requestAnimationFrame(animate);
  }

  pause() { this.playing = false; cancelAnimationFrame(this.rafId); }
  reset() { this.pause(); this.frame = 0; this.drawFrame(); if(this.onFrame) this.onFrame(0); }
  setSpeed(s) { this.speed = Math.max(1, Math.round(s)); }

  jumpToEnd() {
    if (!this.data) return;
    this.frame = this.data.t.length - 1;
    this.drawFrame();
    if (this.onFrame) this.onFrame(this.data.t[this.frame]);
  }
}


class FisherKPPAnimator {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.snapshots = null;
    this.frame = 0;
    this.playing = false;
    this.speed = 1;
    this.rafId = null;
    this.waveSpeed = 0;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = rect.width;
    const h = Math.min(300, w * 0.45);
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.w = w;
    this.h = h;
    if (this.snapshots) this.drawFrame();
  }

  setData(snapshots, waveSpeed) {
    this.snapshots = snapshots;
    this.waveSpeed = waveSpeed;
    this.frame = 0;
    this.drawFrame();
  }

  drawFrame() {
    if (!this.snapshots || !this.snapshots.length) return;
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    const pad = { top: 15, right: 15, bottom: 35, left: 50 };
    const pw = w - pad.left - pad.right;
    const ph = h - pad.top - pad.bottom;

    ctx.clearRect(0, 0, w, h);

    const snap = this.snapshots[this.frame];
    const u = snap.u;
    const nx = u.length;

    // Heatmap bar at bottom
    const barH = 20;
    for (let i = 0; i < pw; i++) {
      const idx = Math.floor(i / pw * nx);
      const val = Math.min(1, u[idx]);
      const r = Math.round(val * 248 + (1-val) * 13);
      const g = Math.round(val * 81 + (1-val) * 17);
      const b = Math.round(val * 73 + (1-val) * 23);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(pad.left + i, pad.top + ph - barH, 1, barH);
    }

    // Line plot
    ctx.beginPath();
    ctx.strokeStyle = '#f85149';
    ctx.lineWidth = 2;
    for (let i = 0; i < nx; i++) {
      const x = pad.left + (i / nx) * pw;
      const y = pad.top + (ph - barH) * (1 - Math.min(1, u[i]));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(pad.left + pw, pad.top + ph - barH);
    ctx.lineTo(pad.left, pad.top + ph - barH);
    ctx.closePath();
    ctx.fillStyle = 'rgba(248,81,73,0.15)';
    ctx.fill();

    // Axes
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + ph);
    ctx.lineTo(pad.left + pw, pad.top + ph);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Distance (km)', pad.left + pw/2, h - 5);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#58a6ff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Day ${snap.day}  |  Wave Speed c = ${this.waveSpeed.toFixed(2)} km/day`, pad.left + 5, pad.top + 14);

    // Y-axis
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('1.0', pad.left - 5, pad.top + 10);
    ctx.fillText('0.0', pad.left - 5, pad.top + ph - barH);
  }

  play() {
    if (!this.snapshots || this.playing) return;
    this.playing = true;
    const animate = () => {
      if (!this.playing) return;
      for (let i = 0; i < this.speed; i++) {
        if (this.frame < this.snapshots.length - 1) this.frame++;
      }
      this.drawFrame();
      if (this.frame < this.snapshots.length - 1) {
        this.rafId = requestAnimationFrame(animate);
      } else { this.playing = false; }
    };
    this.rafId = requestAnimationFrame(animate);
  }

  pause() { this.playing = false; cancelAnimationFrame(this.rafId); }
  reset() { this.pause(); this.frame = 0; this.drawFrame(); }
  setSpeed(s) { this.speed = Math.max(1, Math.round(s)); }
}

window.SEIRDAnimator = SEIRDAnimator;
window.FisherKPPAnimator = FisherKPPAnimator;
