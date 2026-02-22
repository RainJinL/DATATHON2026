/**
 * Fisher-KPP with Recovery — Single-Equation ODE Solver (time domain)
 * du/dt = r·u·(1 - u/K) - γ·u
 *
 * u = proportion of actively infected population
 * R₀ = r / γ
 * Equilibrium: u* = K·(1 - γ/r) when r > γ
 */

class InfectionSolver {
  constructor(params) {
    this.r = params.r;          // intrinsic growth rate
    this.K = params.K || 1.0;   // carrying capacity
    this.gamma = params.gamma;  // recovery rate
    this.D = params.D || 0.5;   // diffusion (stored for reference)
    this.days = params.days || 365;
    this.dt = params.dt || 0.05;
    this.u0 = params.u0 || 1e-4; // initial infected fraction
  }

  /**
   * Build solver from UI-style epi parameters
   * r = intrinsic growth, gamma = recovery, K = carrying capacity
   */
  static fromEpiParams(p) {
    return new InfectionSolver({
      r: p.r || 0.3,
      K: p.K || 1.0,
      gamma: p.gamma || 0.1,
      D: p.D || 0.5,
      days: p.days || 365,
      dt: p.dt || 0.05,
      u0: p.u0 || 1e-4,
    });
  }

  // Derivative: du/dt = r·u·(1 - u/K) - γ·u
  deriv(u) {
    return this.r * u * (1 - u / this.K) - this.gamma * u;
  }

  // RK4 step
  rk4Step(u) {
    const dt = this.dt;
    const k1 = this.deriv(u);
    const k2 = this.deriv(u + 0.5 * dt * k1);
    const k3 = this.deriv(u + 0.5 * dt * k2);
    const k4 = this.deriv(u + dt * k3);
    return Math.max(0, u + (dt / 6) * (k1 + 2*k2 + 2*k3 + k4));
  }

  solve() {
    const steps = Math.ceil(this.days / this.dt);
    const recordEvery = Math.round(1.0 / this.dt);
    let u = this.u0;
    const result = { t: [0], u: [u], growth: [0], recovery: [0] };

    for (let step = 1; step <= steps; step++) {
      // Record growth & recovery components before stepping
      u = this.rk4Step(u);
      if (step % recordEvery === 0) {
        const day = step * this.dt;
        result.t.push(day);
        result.u.push(u);
        result.growth.push(this.r * u * (1 - u / this.K));
        result.recovery.push(this.gamma * u);
      }
    }
    return result;
  }

  // Solve with policy-modified r (and optionally D)
  solveWithPolicy(rReduction, dReduction) {
    const origR = this.r;
    const origD = this.D;
    this.r = origR * (1 - (rReduction || 0));
    this.D = origD * (1 - (dReduction || 0));
    const result = this.solve();
    this.r = origR;
    this.D = origD;
    return result;
  }

  getR0() {
    return this.gamma > 0 ? this.r / this.gamma : Infinity;
  }

  getEquilibrium() {
    // u* = K(1 - γ/r) when r > γ, else 0
    return this.r > this.gamma ? this.K * (1 - this.gamma / this.r) : 0;
  }

  getWaveSpeed() {
    // c = 2√((r-γ)D) when r > γ
    const netGrowth = this.r - this.gamma;
    return netGrowth > 0 ? 2 * Math.sqrt(netGrowth * this.D) : 0;
  }
}

// Keep backward compat name
window.InfectionSolver = InfectionSolver;
window.SEIRDSolver = InfectionSolver; // alias for optimizer.js
