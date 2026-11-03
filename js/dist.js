// Distribution registry (pdf/pmf, cdf, quantile, moments, sampling) and a seeded RNG.
(function () {
  const EW = window.EW;
  const S = EW.sp;
  const t = (x) => EW.tex(x);

  // ---------- RNG ----------
  function makeRng(seed) {
    let a = (seed == null || seed === '' ? Math.floor(Math.random() * 2 ** 32) : Number(seed) * 2654435761) >>> 0;
    const u = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let x = a;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    let spare = null;
    const normal = () => {
      if (spare != null) { const s = spare; spare = null; return s; }
      let x, y, r;
      do { x = 2 * u() - 1; y = 2 * u() - 1; r = x * x + y * y; } while (r >= 1 || r === 0);
      const f = Math.sqrt((-2 * Math.log(r)) / r);
      spare = y * f;
      return x * f;
    };
    // Marsaglia–Tsang gamma(shape k, scale 1)
    const gamma = (k) => {
      if (k < 1) return gamma(k + 1) * Math.pow(u(), 1 / k);
      const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
      for (;;) {
        let x, v;
        do { x = normal(); v = 1 + c * x; } while (v <= 0);
        v = v * v * v;
        const uu = u();
        if (uu < 1 - 0.0331 * x ** 4 || Math.log(uu) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
      }
    };
    const poisson = (l) => {
      if (l > 50) return Math.max(0, Math.round(l + Math.sqrt(l) * normal()));
      const L = Math.exp(-l);
      let k = 0, p = 1;
      do { k++; p *= u(); } while (p > L);
      return k - 1;
    };
    return { u, normal, gamma, poisson };
  }

  // ---------- registry ----------
  const P = (k, label, texName, def, o = {}) => ({ k, label, tex: texName, def, ...o });
  const REG = {
    normal: {
      name: 'Normal', ctor: 'Normal', params: [P('mu', 'μ (mean)', '\\mu', 0), P('sigma', 'σ (sd)', '\\sigma', 1, { min: 0, strict: true })],
      tex: (p) => `N(${t(p.mu)},\\ ${t(p.sigma * p.sigma)})`,
      pdfTex: '\\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-(x-\\mu)^2/(2\\sigma^2)}',
      pdf: (x, p) => S.phi((x - p.mu) / p.sigma) / p.sigma,
      cdf: (x, p) => S.Phi((x - p.mu) / p.sigma),
      q: (r, p) => p.mu + p.sigma * S.PhiInv(r),
      mean: (p) => p.mu, var: (p) => p.sigma * p.sigma, skew: () => 0,
      sample: (g, p) => p.mu + p.sigma * g.normal(),
      range: (p) => [p.mu - 4 * p.sigma, p.mu + 4 * p.sigma],
    },
    t: {
      name: "Student's t", ctor: 'T', params: [P('df', 'ν (degrees of freedom)', '\\nu', 10, { min: 0, strict: true })],
      tex: (p) => `t_{${t(p.df)}}`,
      pdfTex: '\\frac{\\Gamma(\\frac{\\nu+1}{2})}{\\sqrt{\\nu\\pi}\\,\\Gamma(\\frac{\\nu}{2})}\\left(1+\\frac{x^2}{\\nu}\\right)^{-\\frac{\\nu+1}{2}}',
      pdf: (x, p) => Math.exp(S.lgamma((p.df + 1) / 2) - S.lgamma(p.df / 2) - 0.5 * Math.log(p.df * Math.PI) - ((p.df + 1) / 2) * Math.log(1 + (x * x) / p.df)),
      cdf: (x, p) => { const ib = S.betaI(p.df / (p.df + x * x), p.df / 2, 0.5); return x >= 0 ? 1 - ib / 2 : ib / 2; },
      q: (r, p) => S.invert((x) => REG.t.cdf(x, p), r, -5, 5),
      mean: (p) => (p.df > 1 ? 0 : NaN), var: (p) => (p.df > 2 ? p.df / (p.df - 2) : p.df > 1 ? Infinity : NaN), skew: (p) => (p.df > 3 ? 0 : NaN),
      sample: (g, p) => g.normal() / Math.sqrt((2 * g.gamma(p.df / 2)) / p.df),
      range: (p) => { const q = Math.min(REG.t.q(0.995, p), 12); return [-q, q]; },
    },
    chisq: {
      name: 'Chi-squared', ctor: 'Chisq', params: [P('k', 'k (degrees of freedom)', 'k', 3, { min: 0, strict: true })],
      tex: (p) => `\\chi^2_{${t(p.k)}}`,
      pdfTex: '\\frac{1}{2^{k/2}\\Gamma(k/2)} x^{k/2-1} e^{-x/2},\\ x > 0',
      pdf: (x, p) => (x <= 0 ? 0 : Math.exp((p.k / 2 - 1) * Math.log(x) - x / 2 - (p.k / 2) * Math.LN2 - S.lgamma(p.k / 2))),
      cdf: (x, p) => S.gammaP(p.k / 2, x / 2),
      q: (r, p) => S.invert((x) => REG.chisq.cdf(x, p), r, 0, p.k + 10),
      mean: (p) => p.k, var: (p) => 2 * p.k, skew: (p) => Math.sqrt(8 / p.k),
      sample: (g, p) => 2 * g.gamma(p.k / 2),
      range: (p) => [0, REG.chisq.q(0.995, p)],
    },
    f: {
      name: 'F', ctor: 'Fdist', params: [P('d1', 'd₁ (numerator df)', 'd_1', 3, { min: 0, strict: true }), P('d2', 'd₂ (denominator df)', 'd_2', 20, { min: 0, strict: true })],
      tex: (p) => `F_{${t(p.d1)},\\,${t(p.d2)}}`,
      pdfTex: '\\frac{\\sqrt{\\frac{(d_1x)^{d_1} d_2^{d_2}}{(d_1x+d_2)^{d_1+d_2}}}}{x\\,B(d_1/2,\\,d_2/2)},\\ x > 0',
      pdf: (x, p) => {
        if (x <= 0) return 0;
        const { d1, d2 } = p;
        return Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - (S.lgamma(d1 / 2) + S.lgamma(d2 / 2) - S.lgamma((d1 + d2) / 2)));
      },
      cdf: (x, p) => (x <= 0 ? 0 : S.betaI((p.d1 * x) / (p.d1 * x + p.d2), p.d1 / 2, p.d2 / 2)),
      q: (r, p) => S.invert((x) => REG.f.cdf(x, p), r, 0, 10),
      mean: (p) => (p.d2 > 2 ? p.d2 / (p.d2 - 2) : NaN),
      var: (p) => (p.d2 > 4 ? (2 * p.d2 ** 2 * (p.d1 + p.d2 - 2)) / (p.d1 * (p.d2 - 2) ** 2 * (p.d2 - 4)) : NaN),
      skew: (p) => (p.d2 > 6 ? ((2 * p.d1 + p.d2 - 2) * Math.sqrt(8 * (p.d2 - 4))) / ((p.d2 - 6) * Math.sqrt(p.d1 * (p.d1 + p.d2 - 2))) : NaN),
      sample: (g, p) => (g.gamma(p.d1 / 2) / p.d1) / (g.gamma(p.d2 / 2) / p.d2),
      range: (p) => [0, Math.min(REG.f.q(0.99, p), 20)],
    },
    unif: {
      name: 'Uniform', ctor: 'Unif', params: [P('a', 'a (lower)', 'a', 0), P('b', 'b (upper)', 'b', 1)],
      check: (p) => (p.b > p.a ? null : 'Need a < b'),
      tex: (p) => `U(${t(p.a)},\\ ${t(p.b)})`,
      pdfTex: '\\frac{1}{b-a}\\mathbf 1\\{x \\in [a, b]\\}',
      pdf: (x, p) => (x >= p.a && x <= p.b ? 1 / (p.b - p.a) : 0),
      cdf: (x, p) => (x <= p.a ? 0 : x >= p.b ? 1 : (x - p.a) / (p.b - p.a)),
      q: (r, p) => p.a + r * (p.b - p.a),
      mean: (p) => (p.a + p.b) / 2, var: (p) => (p.b - p.a) ** 2 / 12, skew: () => 0,
      sample: (g, p) => p.a + (p.b - p.a) * g.u(),
      range: (p) => { const w = p.b - p.a; return [p.a - 0.15 * w, p.b + 0.15 * w]; },
    },
    exp: {
      name: 'Exponential', ctor: 'Exp', params: [P('lambda', 'λ (rate)', '\\lambda', 1, { min: 0, strict: true })],
      tex: (p) => `\\operatorname{Exp}(${t(p.lambda)})`,
      pdfTex: '\\lambda e^{-\\lambda x},\\ x \\ge 0',
      pdf: (x, p) => (x < 0 ? 0 : p.lambda * Math.exp(-p.lambda * x)),
      cdf: (x, p) => (x <= 0 ? 0 : 1 - Math.exp(-p.lambda * x)),
      q: (r, p) => -Math.log(1 - r) / p.lambda,
      mean: (p) => 1 / p.lambda, var: (p) => 1 / p.lambda ** 2, skew: () => 2,
      sample: (g, p) => -Math.log(1 - g.u()) / p.lambda,
      range: (p) => [0, 5 / p.lambda],
    },
    bern: {
      name: 'Bernoulli', ctor: 'Bern', discrete: true, params: [P('p', 'p (success prob.)', 'p', 0.5, { min: 0, max: 1 })],
      tex: (p) => `\\operatorname{Bernoulli}(${t(p.p)})`,
      pdfTex: 'p^x(1-p)^{1-x},\\ x \\in \\{0, 1\\}',
      pdf: (x, p) => (x === 0 ? 1 - p.p : x === 1 ? p.p : 0),
      cdf: (x, p) => (x < 0 ? 0 : x < 1 ? 1 - p.p : 1),
      q: (r, p) => (r <= 1 - p.p ? 0 : 1),
      mean: (p) => p.p, var: (p) => p.p * (1 - p.p), skew: (p) => (1 - 2 * p.p) / Math.sqrt(p.p * (1 - p.p)),
      sample: (g, p) => (g.u() < p.p ? 1 : 0),
      support: () => [0, 1],
    },
    binom: {
      name: 'Binomial', ctor: 'Binom', discrete: true, params: [P('n', 'n (trials)', 'n', 10, { int: true, min: 1 }), P('p', 'p (success prob.)', 'p', 0.5, { min: 0, max: 1 })],
      tex: (p) => `\\operatorname{Bin}(${t(p.n)},\\ ${t(p.p)})`,
      pdfTex: '\\binom{n}{x} p^x (1-p)^{n-x},\\ x = 0, \\ldots, n',
      pdf: (x, p) => (Number.isInteger(x) && x >= 0 && x <= p.n ? S.choose(p.n, x) * p.p ** x * (1 - p.p) ** (p.n - x) : 0),
      cdf: (x, p) => { let s = 0; for (let k = 0; k <= Math.min(Math.floor(x), p.n); k++) s += REG.binom.pdf(k, p); return Math.min(1, s); },
      q: (r, p) => S.invert((x) => REG.binom.cdf(x, p), r, 0, p.n, true),
      mean: (p) => p.n * p.p, var: (p) => p.n * p.p * (1 - p.p), skew: (p) => (1 - 2 * p.p) / Math.sqrt(p.n * p.p * (1 - p.p)),
      sample: (g, p) => { let s = 0; for (let i = 0; i < p.n; i++) s += g.u() < p.p ? 1 : 0; return s; },
      support: (p) => [0, p.n],
    },
    pois: {
      name: 'Poisson', ctor: 'Pois', discrete: true, params: [P('lambda', 'λ (mean)', '\\lambda', 3, { min: 0, strict: true })],
      tex: (p) => `\\operatorname{Poisson}(${t(p.lambda)})`,
      pdfTex: '\\frac{e^{-\\lambda}\\lambda^x}{x!},\\ x = 0, 1, 2, \\ldots',
      pdf: (x, p) => (Number.isInteger(x) && x >= 0 ? Math.exp(-p.lambda + x * Math.log(p.lambda) - S.lgamma(x + 1)) : 0),
      cdf: (x, p) => (x < 0 ? 0 : S.gammaQ(Math.floor(x) + 1, p.lambda)),
      q: (r, p) => S.invert((x) => REG.pois.cdf(x, p), r, 0, p.lambda + 10, true),
      mean: (p) => p.lambda, var: (p) => p.lambda, skew: (p) => 1 / Math.sqrt(p.lambda),
      sample: (g, p) => g.poisson(p.lambda),
      support: (p) => [0, Math.max(5, Math.ceil(p.lambda + 4 * Math.sqrt(p.lambda)))],
    },
    geom: {
      name: 'Geometric', ctor: 'Geom', discrete: true, params: [P('p', 'p (success prob.)', 'p', 0.3, { min: 0, max: 1, strict: true })],
      tex: (p) => `\\operatorname{Geom}(${t(p.p)})`,
      pdfTex: '(1-p)^{x-1}p,\\ x = 1, 2, \\ldots\\ \\text{(trials until the first success)}',
      pdf: (x, p) => (Number.isInteger(x) && x >= 1 ? (1 - p.p) ** (x - 1) * p.p : 0),
      cdf: (x, p) => (x < 1 ? 0 : 1 - (1 - p.p) ** Math.floor(x)),
      q: (r, p) => Math.max(1, Math.ceil(Math.log(1 - r) / Math.log(1 - p.p) - 1e-12)),
      mean: (p) => 1 / p.p, var: (p) => (1 - p.p) / p.p ** 2, skew: (p) => (2 - p.p) / Math.sqrt(1 - p.p),
      sample: (g, p) => Math.max(1, Math.ceil(Math.log(1 - g.u()) / Math.log(1 - p.p))),
      support: (p) => [1, Math.max(6, REG.geom.q(0.99, p))],
    },
    // custom pmf: params = { values: [...], probs: [...] }
    discrete: {
      name: 'Discrete', ctor: 'dist', discrete: true, params: [],
      tex: () => 'X',
      pdf: (x, p) => { let s = 0; p.values.forEach((v, i) => { if (Math.abs(v - x) < 1e-12) s += p.probs[i]; }); return s; },
      cdf: (x, p) => EW.util.ksum(p.values.map((v, i) => (v <= x + 1e-12 ? p.probs[i] : 0))),
      q: (r, p) => { const o = order(p); let c = 0; for (const i of o) { c += p.probs[i]; if (c >= r - 1e-12) return p.values[i]; } return p.values[o[o.length - 1]]; },
      mean: (p) => EW.util.ksum(p.values.map((v, i) => v * p.probs[i])),
      var: (p) => { const m = REG.discrete.mean(p); return EW.util.ksum(p.values.map((v, i) => (v - m) ** 2 * p.probs[i])); },
      skew: (p) => { const m = REG.discrete.mean(p), s2 = REG.discrete.var(p); return EW.util.ksum(p.values.map((v, i) => (v - m) ** 3 * p.probs[i])) / s2 ** 1.5; },
      sample: (g, p) => { const r = g.u(); let c = 0; for (let i = 0; i < p.values.length; i++) { c += p.probs[i]; if (r < c) return p.values[i]; } return p.values[p.values.length - 1]; },
      support: (p) => [Math.min(...p.values), Math.max(...p.values)],
    },
  };
  for (const [k, d] of Object.entries(REG)) d.key = k;
  function order(p) { return p.values.map((_, i) => i).sort((a, b) => p.values[a] - p.values[b]); }

  // Table 1 of the problem set: selected quantiles of the standard normal
  const ZTABLE = [[0.9, 1.282], [0.95, 1.645], [0.975, 1.96], [0.99, 2.326], [0.995, 2.576]];
  // Φ⁻¹(p), using the table value when settings allow and p is one of the tabulated probabilities (or their complements)
  function zq(p) {
    if (EW.settings.zTable) {
      for (const [pp, z] of ZTABLE) {
        if (Math.abs(p - pp) < 1e-9) return { z, table: true };
        if (Math.abs(p - (1 - pp)) < 1e-9) return { z: -z, table: true };
      }
    }
    return { z: S.PhiInv(p), table: false };
  }

  function checkParams(key, p) {
    const d = REG[key];
    for (const pr of d.params) {
      const v = p[pr.k];
      if (typeof v !== 'number' || !isFinite(v)) throw new EW.MathError(`${d.name}: ${pr.label} must be a number`);
      if (pr.int && !Number.isInteger(v)) throw new EW.MathError(`${d.name}: ${pr.label} must be an integer`);
      if (pr.min != null && (pr.strict ? v <= pr.min : v < pr.min)) throw new EW.MathError(`${d.name}: ${pr.label} must be ${pr.strict ? '>' : '≥'} ${pr.min}`);
      if (pr.max != null && v > pr.max) throw new EW.MathError(`${d.name}: ${pr.label} must be ≤ ${pr.max}`);
    }
    if (d.check) { const e = d.check(p); if (e) throw new EW.MathError(`${d.name}: ${e}`); }
  }

  EW.dist = { REG, ZTABLE, zq, makeRng, checkParams };
})();
