/**
 * Fisher-KPP PDE Solver (1D) with Recovery Term
 * ∂u/∂t = D · ∂²u/∂x² + r · u · (1 - u/K) - γ · u
 * Explicit Euler with CFL condition: dt <= dx² / (2D)
 * Wave speed: c = 2√((r-γ)D) when r > γ
 */

class FisherKPPSolver {
  constructor(params) {
    this.D = params.D || 0.5;       // diffusion coefficient (km²/day)
    this.r = params.r || 0.3;       // growth rate
    this.K = params.K || 1.0;       // carrying capacity (normalized)
    this.gamma = params.gamma || 0.1; // recovery rate
    this.L = params.L || 200;       // domain length (km)
    this.nx = params.nx || 400;     // spatial grid points
    this.days = params.days || 100;

    this.dx = this.L / this.nx;
    // CFL condition
    this.dt = Math.min(0.5 * this.dx * this.dx / (2 * this.D), 0.1);
    this.stepsPerDay = Math.ceil(1.0 / this.dt);

    // Net growth rate and wave speed
    this.netGrowth = this.r - this.gamma;
    this.waveSpeed = this.netGrowth > 0 ? 2 * Math.sqrt(this.netGrowth * this.D) : 0;
    // Equilibrium
    this.uStar = this.netGrowth > 0 ? this.K * (1 - this.gamma / this.r) : 0;
  }

  initCondition() {
    // Initial: compact support near x=0
    const u = new Float64Array(this.nx);
    for (let i = 0; i < this.nx; i++) {
      const x = i * this.dx;
      if (x < 10) {
        u[i] = this.uStar * Math.exp(-0.5 * x);
      }
    }
    return u;
  }

  step(u) {
    const nx = this.nx;
    const dt = this.dt;
    const dx = this.dx;
    const D = this.D;
    const r = this.r;
    const K = this.K;
    const gamma = this.gamma;
    const uNew = new Float64Array(nx);

    for (let i = 1; i < nx - 1; i++) {
      const diffusion = D * (u[i+1] - 2*u[i] + u[i-1]) / (dx * dx);
      const reaction = r * u[i] * (1 - u[i] / K) - gamma * u[i];
      uNew[i] = Math.max(0, Math.min(K, u[i] + dt * (diffusion + reaction)));
    }
    // Boundary: Neumann (zero flux)
    uNew[0] = uNew[1];
    uNew[nx-1] = uNew[nx-2];
    return uNew;
  }

  solve() {
    let u = this.initCondition();
    const snapshots = [{ day: 0, u: new Float64Array(u) }];

    for (let day = 1; day <= this.days; day++) {
      for (let s = 0; s < this.stepsPerDay; s++) {
        u = this.step(u);
      }
      snapshots.push({ day, u: new Float64Array(u) });
    }
    return snapshots;
  }
}

window.FisherKPPSolver = FisherKPPSolver;
