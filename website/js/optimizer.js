/**
 * Policy Optimizer — Fisher-KPP + Recovery Model
 * Evaluates policy effects on r, D, and outcomes
 * R₀ = r / γ
 */

class PolicyOptimizer {
  constructor(baseParams) {
    this.baseParams = baseParams; // {r, gamma, K, D, days}

    // Policy effectiveness (reduction factors)
    this.policyEffects = {
      mask: { r: 0.30, D: 0.05 },        // masks mainly reduce r
      socialDist: { r: 0.40, D: 0.15 },   // social dist reduces r and D
      travel: { r: 0.05, D: 0.60 },       // travel restrictions mainly reduce D
      vaccination: { r: 0.60, D: 0.0 },   // vaccination reduces effective r
    };

    // Policy costs (relative, 0-1 scale per 100% implementation)
    this.policyCosts = {
      mask: 0.08,
      socialDist: 0.35,
      travel: 0.25,
      vaccination: 0.50
    };
  }

  // Calculate effective R0 = r_eff / γ
  calcReff(policies) {
    const rReduction = this.calcRReduction(policies);
    const rEff = this.baseParams.r * Math.max(0.05, 1 - rReduction);
    return rEff / this.baseParams.gamma;
  }

  calcRReduction(policies) {
    const reduction =
      policies.mask * this.policyEffects.mask.r +
      policies.socialDist * this.policyEffects.socialDist.r +
      policies.travel * this.policyEffects.travel.r +
      policies.vaccination * this.policyEffects.vaccination.r;
    return Math.min(reduction, 0.95);
  }

  calcDReduction(policies) {
    const reduction =
      policies.mask * this.policyEffects.mask.D +
      policies.socialDist * this.policyEffects.socialDist.D +
      policies.travel * this.policyEffects.travel.D +
      policies.vaccination * this.policyEffects.vaccination.D;
    return Math.min(reduction, 0.95);
  }

  // Total policy reduction factor (backward compat)
  calcReduction(policies) {
    return this.calcRReduction(policies);
  }

  calcCost(policies) {
    return policies.mask * this.policyCosts.mask +
           policies.socialDist * this.policyCosts.socialDist +
           policies.travel * this.policyCosts.travel +
           policies.vaccination * this.policyCosts.vaccination;
  }

  // Run simulation with given policies and return summary
  simulate(policies) {
    const rReduction = this.calcRReduction(policies);
    const rEff = this.baseParams.r * Math.max(0.05, 1 - rReduction);
    const rEffR0 = rEff / this.baseParams.gamma;

    const solver = InfectionSolver.fromEpiParams({
      r: rEff,
      gamma: this.baseParams.gamma,
      K: this.baseParams.K,
      D: this.baseParams.D,
      days: this.baseParams.days || 365,
    });
    const result = solver.solve();

    const peakI = Math.max(...result.u);
    const equilibrium = solver.getEquilibrium();
    const cost = this.calcCost(policies);

    return { rEff: rEffR0, peakI, totalDeaths: equilibrium, cost, result };
  }

  getScenarios() {
    return {
      'No Intervention': { mask: 0, socialDist: 0, travel: 0, vaccination: 0 },
      'Masks Only': { mask: 0.8, socialDist: 0, travel: 0, vaccination: 0 },
      'Masks + Social Distancing': { mask: 0.8, socialDist: 0.6, travel: 0, vaccination: 0 },
      'Full Intervention': { mask: 0.8, socialDist: 0.6, travel: 0.5, vaccination: 0.7 },
    };
  }
}

window.PolicyOptimizer = PolicyOptimizer;
