// Statistics functions for the command line. Each one records its working as steps (formula → numbers → result).
(function () {
  const EW = window.EW;
  const { Data, RV, Info, Model, MathError, T } = EW;
  const X = EW.expr;
  const { def, asNum, asInt, asProb, asData, asRV, asStr, asAlt, group } = X;
  const D = EW.dist;
  const S = EW.sp;
  const { ksum, clean } = EW.util;
  const t = (x) => EW.tex(x);
  const pt = (x) => EW.ptex(x);
  const f = (x) => EW.fmt(x);
  const st = () => EW.settings;

  // Name of the i-th argument as typed (for labels like \bar{income})
  const nm = (node, i, fb = 'x') => { const a = node && node.args[i]; return a && a.t === 'id' ? a.name : fb; };
  const vt = (name) => (name.length === 1 ? name : `{\\mathit{${name.replace(/_/g, '\\_')}}}`);
  // x̄ for one letter, a wide bar over longer names
  const bar = (name) => (name.length === 1 ? `\\bar ${name}` : `\\overline{${vt(name)}}`);
  const ivl = (lo, hi) => { const d = new Data([lo, hi]); d.interval = true; return d; };

  // ---------- pure statistics ----------
  const mean = (v) => clean(ksum(v) / v.length);
  const ss = (v, m = mean(v)) => clean(ksum(v.map((x) => (x - m) ** 2)));
  const varS = (v) => ss(v) / (v.length - 1);
  const varP = (v) => ss(v) / v.length;
  const rawMoment = (v, k) => clean(ksum(v.map((x) => x ** k)) / v.length);
  const cMoment = (v, k) => { const m = mean(v); return clean(ksum(v.map((x) => (x - m) ** k)) / v.length); };
  function quantile(v, p) {
    const s = [...v].sort((a, b) => a - b);
    const h = (s.length - 1) * p;
    const lo = Math.floor(h);
    return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo];
  }
  // variance used for standard errors, per settings (s² or σ̂²)
  const seVar = (v) => (st().divisor === 'n' ? varP(v) : varS(v));
  EW.stats = { mean, ss, varS, varP, rawMoment, cMoment, quantile, seVar };

  // ---------- LaTeX for sums ----------
  // Terms of Σ g(xᵢ): "count·g(value)" for frequency tables, explicit terms for short lists, null otherwise
  function terms(d, g) {
    if (d.freq && d.freq.values.length <= 12) return d.freq.values.map((v, i) => `${d.freq.counts[i]}\\cdot ${g(v)}`).join(' + ');
    if (!d.freq && d.n <= 10) return d.vals.map(g).join(' + ');
    return null;
  }
  const sumSym = (d, body) => (d.freq ? `\\sum_k n_k\\,${body.replace(/_i/g, '_k').replace('x_k', 'v_k')}` : `\\sum_{i=1}^{n} ${body}`);
  function meanSteps(g, d, name) {
    const n = d.n, s = clean(ksum(d.vals)), m = mean(d.vals);
    const tm = terms(d, t);
    g.tex(`${bar(name)}_n = \\frac{1}{n}\\sum_{i=1}^{n} ${vt(name)}_i${d.freq ? ' = \\frac{1}{n}\\sum_k v_k\\, n_k' : ''}`);
    g.tex(`= ${tm ? `\\frac{${tm}}{${n}} = ` : ''}\\frac{${t(s)}}{${n}} = ${t(m)}`);
    if (d.freq) g.text(`Each value vₖ appears nₖ times; n = ${d.freq.counts.join(' + ')} = ${n}.`);
    return m;
  }
  function ssSteps(g, d, name) {
    const n = d.n, m = mean(d.vals);
    const sx2 = clean(ksum(d.vals.map((x) => x * x)));
    const tm = terms(d, (v) => `${pt(v)}^2`);
    const S2 = ss(d.vals);
    g.tex(`\\sum_{i=1}^{n} (${vt(name)}_i - ${bar(name)}_n)^2 = \\sum_{i=1}^{n} ${vt(name)}_i^2 - n${bar(name)}_n^2`);
    g.tex(`\\sum ${vt(name)}_i^2 = ${tm ? `${tm} = ` : ''}${t(sx2)}`);
    g.tex(`\\Rightarrow\\ ${t(sx2)} - ${n}\\cdot ${pt(m)}^2 = ${t(S2)}`);
    return S2;
  }

  const info = (title, blocks, value, extra) => new Info(title, blocks, value, extra);
  const head = (s) => ({ tex: s });
  const txt = (s) => ({ text: s });

  // ---------- elementwise & list helpers ----------
  const mapD = (v, fn, what) => {
    v = X.unwrap(v);
    if (typeof v === 'number') return fn(v);
    return new Data(asData(v, what).vals.map(fn));
  };
  const C = 'Lists & arithmetic';
  def('sqrt', 'sqrt(x)', 1, 1, ([a]) => mapD(a, (x) => { if (x < 0) throw new MathError('Square root of a negative number'); return Math.sqrt(x); }), 'square root (elementwise on lists)', C);
  def('log ln', 'log(x)', 1, 1, ([a]) => mapD(a, (x) => { if (x <= 0) throw new MathError('log needs a positive number'); return Math.log(x); }), 'natural logarithm', C);
  def('exp', 'exp(x)', 1, 1, ([a]) => mapD(a, Math.exp), 'eˣ', C);
  def('abs', 'abs(x)', 1, 1, ([a]) => mapD(a, Math.abs), 'absolute value', C);
  def('round', 'round(x, d)', 1, 2, ([a, d]) => { const k = d === undefined ? 0 : asInt(d); return mapD(a, (x) => Math.round(x * 10 ** k) / 10 ** k); }, 'round to d decimals', C);
  def('sum', 'sum(x)', 1, 1, ([a]) => clean(ksum(asData(a).vals)), 'Σ xᵢ', C);
  def('prod', 'prod(x)', 1, 1, ([a]) => asData(a).vals.reduce((p, x) => p * x, 1), 'Π xᵢ', C);
  def('length count nobs', 'length(x)', 1, 1, ([a]) => asData(a).n, 'number of observations', C);
  def('min', 'min(x)', 1, Infinity, (args) => Math.min(...args.flatMap((a) => asData(a).vals)), 'smallest value (X₍₁₎)', C);
  def('max', 'max(x)', 1, Infinity, (args) => Math.max(...args.flatMap((a) => asData(a).vals)), 'largest value (X₍ₙ₎)', C);
  def('sort', 'sort(x)', 1, 1, ([a]) => new Data([...asData(a).vals].sort((p, q) => p - q)), 'order statistics X₍₁₎ ≤ … ≤ X₍ₙ₎', C);
  def('seq', 'seq(a, b, step)', 2, 3, ([a, b, s]) => {
    const lo = asNum(a), hi = asNum(b), stp = s === undefined ? 1 : asNum(s);
    if (stp === 0 || (hi - lo) / stp > 100000 || (hi - lo) / stp < 0) throw new MathError('Bad range');
    const k = Math.floor((hi - lo) / stp + 1e-9);
    return new Data(Array.from({ length: k + 1 }, (_, i) => clean(lo + i * stp)));
  }, 'a, a+step, …, b (also [a:b] or [a:step:b])', C);
  def('rep', 'rep(v, k)', 2, 2, ([a, k]) => { const v = asData(a).vals, m = asInt(k); return new Data(Array.from({ length: m }, () => v).flat()); }, 'repeat a value or list k times', C);
  def('cumsum', 'cumsum(x)', 1, 1, ([a]) => { let s = 0; return new Data(asData(a).vals.map((x) => (s = clean(s + x)))); }, 'running totals', C);
  def('fact factorial', 'fact(n)', 1, 1, ([a], ctx) => {
    const n = asInt(a);
    if (n < 0) throw new MathError('Factorial of a negative number');
    if (n <= 12) group(ctx, 'Factorial').tex(`${n}! = ${n <= 1 ? '1' : Array.from({ length: n }, (_, i) => n - i).join('\\cdot ')} = ${S.factorial(n)}`);
    return S.factorial(n);
  }, 'n! (also typed as 5!)', 'Probability');

  // ---------- data constructors ----------
  def('freq', 'freq(values, counts)', 2, 2, ([a, b]) => {
    const v = asData(a, 'a list of values').vals, c = asData(b, 'a list of counts').vals;
    if (v.length !== c.length) throw new MathError(`${v.length} values but ${c.length} counts`);
    if (c.some((k) => !Number.isInteger(k) || k < 0)) throw new MathError('Counts must be whole numbers ≥ 0');
    const vals = v.flatMap((x, i) => Array(c[i]).fill(x));
    if (!vals.length) throw new MathError('All counts are 0');
    return new Data(vals, { values: v, counts: c });
  }, 'frequency table → data, e.g. freq([0 1 2], [10 30 60])', 'Data');
  def('sample draw', 'sample(X, n)', 2, 2, ([a, b]) => {
    const R = asRV(a), n = asInt(b);
    if (n < 1 || n > 100000) throw new MathError('n must be between 1 and 100000');
    const g = D.makeRng(st().seed === '' ? null : st().seed);
    return new Data(Array.from({ length: n }, () => R.d.sample(g, R.params)));
  }, 'n i.i.d. draws from a distribution (seed in ⚙)', 'Data');

  // ---------- distributions as values ----------
  const PCAT = 'Distributions';
  for (const d of Object.values(D.REG)) {
    if (d.key === 'discrete') continue;
    const sig = `${d.ctor}(${d.params.map((p) => p.tex.replace(/\\/g, '').replace('_', '')).join(', ')})`;
    def(d.ctor + (d.ctor === 'Normal' ? ' Norm' : d.ctor === 'Binom' ? ' Bin Binomial' : d.ctor === 'Pois' ? ' Poisson' : d.ctor === 'Bern' ? ' Bernoulli' : d.ctor === 'Unif' ? ' Uniform' : d.ctor === 'Geom' ? ' Geometric' : d.ctor === 'Exp' ? ' Expo' : ''),
      sig, d.params.length, d.params.length, (args) => {
        const p = {};
        d.params.forEach((pr, i) => { p[pr.k] = asNum(args[i], pr.label); });
        D.checkParams(d.key, p);
        return new RV(d.key, p);
      }, `${d.name} distribution${d.key === 'normal' ? ' (μ, σ — standard deviation, not variance)' : ''}`, PCAT);
  }
  def('dist pmf_table', 'dist(values, probs)', 2, 2, ([a, b], ctx) => {
    const v = asData(a, 'a list of values').vals, p = asData(b, 'a list of probabilities').vals;
    if (v.length !== p.length) throw new MathError(`${v.length} values but ${p.length} probabilities`);
    if (p.some((x) => x < 0 || x > 1)) throw new MathError('Probabilities must be between 0 and 1');
    const tot = ksum(p);
    if (Math.abs(tot - 1) > 1e-9) throw new MathError(`The probabilities add up to ${f(clean(tot))}, not 1`);
    group(ctx, 'Check it is a valid pmf').tex(`p(x) \\ge 0,\\quad \\sum_x p(x) = ${p.map(t).join(' + ')} = 1\\ \\checkmark`);
    return new RV('discrete', { values: v, probs: p });
  }, 'discrete random variable from its pmf', PCAT);

  function rvTex(R) { return R.key === 'discrete' ? 'X' : R.d.tex(R.params); }

  // E[X^k] for a distribution, with working
  function rvMoment(R, k, ctx) {
    const d = R.d, p = R.params;
    if (R.key === 'discrete') {
      const g = group(ctx, k === 1 ? 'Expected value' : `E[X^${k}]`);
      const pw = (v) => (k === 1 ? pt(v) : `${pt(v)}^{${k}}`);
      const val = clean(ksum(p.values.map((v, i) => v ** k * p.probs[i])));
      g.tex(`E[X${k === 1 ? '' : `^{${k}}`}] = \\sum_x x${k === 1 ? '' : `^{${k}}`}\\, p(x) = ${p.values.map((v, i) => `${pw(v)}\\cdot ${t(p.probs[i])}`).join(' + ')} = ${t(val)}`);
      return val;
    }
    const m = d.mean(p), v = d.var(p);
    if (k === 1) {
      group(ctx, 'Expected value').tex(`X \\sim ${rvTex(R)}:\\quad E[X] = ${MEANTEX[R.key] || '\\mu'} = ${t(m)}`);
      return m;
    }
    if (k === 2) {
      group(ctx, 'Second moment').tex(`E[X^2] = \\operatorname{Var}(X) + (E[X])^2 = ${t(v)} + ${pt(m)}^2 = ${t(clean(v + m * m))}`);
      return clean(v + m * m);
    }
    // numeric integration / summation for higher moments
    let val;
    if (d.discrete) { const [lo, hi] = d.support(p); val = 0; for (let x = lo; x <= hi + 200; x++) val += x ** k * d.pdf(x, p); }
    else { const [a, b] = [d.q(1e-10, p), d.q(1 - 1e-10, p)]; const N = 4000; val = 0; for (let i = 0; i < N; i++) { const x = a + ((b - a) * (i + 0.5)) / N; val += x ** k * d.pdf(x, p) * ((b - a) / N); } }
    group(ctx, `E[X^${k}]`).tex(`E[X^{${k}}] = \\int x^{${k}} f(x)\\,dx \\approx ${t(val)}\\ \\text{(numerically)}`);
    return clean(val);
  }
  const MEANTEX = { normal: '\\mu', t: '0', chisq: 'k', f: '\\frac{d_2}{d_2-2}', unif: '\\frac{a+b}{2}', exp: '\\frac{1}{\\lambda}', bern: 'p', binom: 'np', pois: '\\lambda', geom: '\\frac{1}{p}' };
  const VARTEX = { normal: '\\sigma^2', t: '\\frac{\\nu}{\\nu-2}', chisq: '2k', f: '\\frac{2d_2^2(d_1+d_2-2)}{d_1(d_2-2)^2(d_2-4)}', unif: '\\frac{(b-a)^2}{12}', exp: '\\frac{1}{\\lambda^2}', bern: 'p(1-p)', binom: 'np(1-p)', pois: '\\lambda', geom: '\\frac{1-p}{p^2}' };
  function rvVar(R, ctx) {
    if (R.key === 'discrete') {
      const m = rvMoment(R, 1, ctx), m2 = rvMoment(R, 2, ctx);
      const v = clean(m2 - m * m);
      group(ctx, 'Variance').tex(`\\operatorname{Var}(X) = E[X^2] - (E[X])^2 = ${t(m2)} - ${pt(m)}^2 = ${t(v)}`);
      return v;
    }
    const v = R.d.var(R.params);
    group(ctx, 'Variance').tex(`X \\sim ${rvTex(R)}:\\quad \\operatorname{Var}(X) = ${VARTEX[R.key] || ''} = ${t(v)}`);
    return v;
  }

  // ---------- descriptive statistics ----------
  const DC = 'Descriptive statistics';
  def('mean avg E', 'mean(x)  ·  E(X, k)', 1, 2, ([a, k], ctx, node) => {
    const v = X.unwrap(a);
    if (v instanceof RV) {
      const kk = k === undefined ? 1 : asInt(k);
      const val = rvMoment(v, kk, ctx);
      return info(kk === 1 ? 'Expected value' : `Moment E[X^${kk}]`, [head(`E[${kk === 1 ? 'X' : `X^{${kk}}`}] = ${t(val)}`)], val);
    }
    const d = asData(a);
    const name = nm(node, 0);
    if (k !== undefined) {
      const kk = asInt(k);
      const val = rawMoment(d.vals, kk);
      group(ctx, `Sample moment of order ${kk}`).tex(`\\hat\\theta_{${kk}} = \\frac{1}{n}\\sum_{i=1}^{n} ${vt(name)}_i^{${kk}} = ${t(val)}`);
      return info(`Sample moment (k = ${kk})`, [head(`\\frac{1}{n}\\sum ${vt(name)}_i^{${kk}} = ${t(val)}`)], val);
    }
    const m = meanSteps(group(ctx, 'Sample mean'), d, name);
    return info('Sample mean', [head(`${bar(name)}_n = ${t(m)}`), txt(`n = ${d.n}`)], m);
  }, 'sample mean X̄ₙ, or E[Xᵏ] of a distribution', DC);

  def('var Var', 'var(x)', 1, 1, ([a], ctx, node) => {
    const v = X.unwrap(a);
    if (v instanceof RV) { const val = rvVar(v, ctx); return info('Variance', [head(`\\operatorname{Var}(X) = ${t(val)}`)], val); }
    const d = asData(a, 'a list', 2), name = nm(node, 0);
    meanSteps(group(ctx, 'Sample mean'), d, name);
    const S2 = ssSteps(group(ctx, 'Sum of squared deviations'), d, name);
    const s2 = S2 / (d.n - 1);
    group(ctx, 'Sample variance (divide by n − 1)').tex(`s^2 = \\frac{1}{n-1}\\sum (${vt(name)}_i - ${bar(name)}_n)^2 = \\frac{${t(S2)}}{${d.n - 1}} = ${t(s2)}`)
      .text(`The 1/n version σ̂² = ${f(S2)}/${d.n} = ${f(S2 / d.n)} is the MLE/plug-in estimate; s² is unbiased.`);
    return info('Sample variance', [head(`s^2 = ${t(s2)}`), txt(`σ̂² (divide by n) = ${f(S2 / d.n)}`)], s2);
  }, 's² (divides by n − 1), or Var(X) of a distribution', DC);

  def('varp', 'varp(x)', 1, 1, ([a], ctx, node) => {
    const d = asData(a), name = nm(node, 0);
    const m = meanSteps(group(ctx, 'Sample mean'), d, name);
    const m2 = rawMoment(d.vals, 2);
    const v = clean(m2 - m * m);
    const g = group(ctx, 'Plug-in variance (divide by n)');
    g.tex(`\\hat\\sigma^2 = \\frac{1}{n}\\sum (${vt(name)}_i - ${bar(name)}_n)^2 = \\overline{${vt(name)}^2} - ${bar(name)}_n^2`);
    g.tex(`= ${t(m2)} - ${pt(m)}^2 = ${t(v)}`);
    return info('Plug-in variance σ̂²', [head(`\\hat\\sigma^2 = ${t(v)}`)], v);
  }, 'σ̂² = (1/n) Σ (xᵢ − x̄)²  (MLE / method of moments)', DC);

  def('sd SD std', 'sd(x)', 1, 1, ([a], ctx, node) => {
    const v = X.unwrap(a);
    if (v instanceof RV) { const val = Math.sqrt(rvVar(v, ctx)); group(ctx, 'Standard deviation').tex(`\\operatorname{sd}(X) = \\sqrt{\\operatorname{Var}(X)} = ${t(val)}`); return info('Standard deviation', [head(`\\operatorname{sd}(X) = ${t(val)}`)], val); }
    const d = asData(a, 'a list', 2), name = nm(node, 0);
    const s2 = varS(d.vals), s = Math.sqrt(s2);
    group(ctx, 'Sample standard deviation').tex(`s = \\sqrt{s^2} = \\sqrt{${t(s2)}} = ${t(s)}`).text(`(Using 1/n instead: σ̂ = ${f(Math.sqrt(varP(d.vals)))})`);
    return info('Sample standard deviation', [head(`s = ${t(s)}`)], s);
  }, 's = √s²', DC);
  def('sdp', 'sdp(x)', 1, 1, ([a]) => Math.sqrt(varP(asData(a).vals)), 'σ̂ = √σ̂² (divides by n)', DC);

  def('se', 'se(x)', 1, 1, ([a], ctx, node) => {
    const d = asData(a, 'a list', 2), name = nm(node, 0);
    const n = d.n, v = seVar(d.vals), se = Math.sqrt(v / n);
    const g = group(ctx, 'Standard error of the mean');
    const lab = st().divisor === 'n' ? '\\hat\\sigma' : 's';
    g.tex(`\\operatorname{SE}(${bar(name)}_n) = \\frac{${lab}}{\\sqrt n} = \\sqrt{\\frac{${t(v)}}{${n}}} = ${t(se)}`);
    if (d.vals.every((x) => x === 0 || x === 1)) {
      const p = mean(d.vals);
      g.text(`0/1 data: σ̂² = p̂(1 − p̂) = ${f(p)}·${f(1 - p)}, so SE = √(p̂(1 − p̂)/n) = ${f(Math.sqrt((p * (1 - p)) / n))} (note the square root!)`);
    }
    return info('Standard error', [head(`\\operatorname{SE} = ${t(se)}`), txt(`uses ${st().divisor === 'n' ? 'σ̂² (1/n)' : 's² (1/(n − 1))'} — change in ⚙`)], se);
  }, 'standard error σ̂/√n of the sample mean', DC);

  def('median', 'median(x)', 1, 1, ([a], ctx) => {
    const d = asData(a), s = [...d.vals].sort((p, q) => p - q), n = d.n;
    const m = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
    const g = group(ctx, 'Median');
    if (n <= 15) g.tex(`\\text{sorted: } ${T.list(s, 15)}`);
    g.tex(n % 2 ? `n = ${n}\\ \\text{odd: middle value } x_{(${(n + 1) / 2})} = ${t(m)}` : `n = ${n}\\ \\text{even: } \\frac{x_{(${n / 2})} + x_{(${n / 2 + 1})}}{2} = \\frac{${t(s[n / 2 - 1])} + ${t(s[n / 2])}}{2} = ${t(m)}`);
    return info('Median', [head(`\\operatorname{median} = ${t(m)}`)], m);
  }, 'middle value', DC);

  def('quantile', 'quantile(x, p)', 2, 2, ([a, b], ctx) => {
    const p = asProb(b);
    const v = X.unwrap(a);
    if (v instanceof RV) {
      const q = v.d.q(p, v.params);
      group(ctx, 'Quantile').tex(`F^{-1}(${t(p)}) = \\min\\{x : F(x) \\ge ${t(p)}\\} = ${t(q)}`);
      return info(`${f(p * 100)}th percentile`, [head(`F^{-1}(${t(p)}) = ${t(q)}`)], q);
    }
    const d = asData(a), s = [...d.vals].sort((x, y) => x - y);
    const q = quantile(d.vals, p);
    const h = (d.n - 1) * p;
    group(ctx, 'Sample quantile (linear interpolation)').tex(`h = (n-1)p = ${d.n - 1}\\cdot ${t(p)} = ${t(h)}\\ \\Rightarrow\\ x_{(${Math.floor(h) + 1})} + ${t(clean(h - Math.floor(h)))}\\,(x_{(${Math.floor(h) + 2})} - x_{(${Math.floor(h) + 1})}) = ${t(q)}`);
    return info(`Sample ${f(p * 100)}th percentile`, [head(`\\hat q_{${t(p)}} = ${t(q)}`)], q);
  }, 'sample quantile, or F⁻¹(p) of a distribution', DC);

  def('moment', 'moment(x, k)', 2, 2, ([a, k], ctx, node) => {
    const v = X.unwrap(a), kk = asInt(k);
    if (v instanceof RV) { const val = rvMoment(v, kk, ctx); return info(`E[X^${kk}]`, [head(`E[X^{${kk}}] = ${t(val)}`)], val); }
    const d = asData(a), name = nm(node, 0), val = rawMoment(d.vals, kk);
    const tm = terms(d, (x) => `${pt(x)}^{${kk}}`);
    group(ctx, `Sample moment θ̂${kk}`).tex(`\\hat\\theta_{${kk}} = \\frac{1}{n}\\sum_{i=1}^n ${vt(name)}_i^{${kk}} = ${tm ? `\\frac{${tm}}{${d.n}} = ` : ''}${t(val)}`);
    return info(`Sample moment of order ${kk}`, [head(`\\hat\\theta_{${kk}} = ${t(val)}`)], val);
  }, 'raw moment (1/n) Σ xᵢᵏ  (estimates E[Xᵏ])', DC);
  def('cmoment', 'cmoment(x, k)', 2, 2, ([a, k], ctx, node) => {
    const d = asData(a), kk = asInt(k), name = nm(node, 0), val = cMoment(d.vals, kk);
    group(ctx, 'Central moment').tex(`\\frac{1}{n}\\sum_{i=1}^n (${vt(name)}_i - ${bar(name)}_n)^{${kk}} = ${t(val)}`);
    return info(`Central moment of order ${kk}`, [head(`m_{${kk}} = ${t(val)}`)], val);
  }, 'central moment (1/n) Σ (xᵢ − x̄)ᵏ', DC);

  function skewSteps(ctx, th1, th2, th3, hat = true) {
    const h = hat ? '\\hat\\theta' : '\\theta';
    const num = clean(th3 - 3 * th1 * th2 + 2 * th1 ** 3), vr = clean(th2 - th1 ** 2);
    const g = group(ctx, 'Skewness from raw moments');
    g.tex(`\\operatorname{skew}(X) = \\frac{E[(X-\\theta_1)^3]}{\\operatorname{Var}(X)^{3/2}} = \\frac{\\theta_3 - 3\\theta_1\\theta_2 + 2\\theta_1^3}{(\\theta_2 - \\theta_1^2)^{3/2}}`);
    g.tex(`= \\frac{${t(th3)} - 3(${t(th1)})(${t(th2)}) + 2(${t(th1)})^3}{(${t(th2)} - ${pt(th1)}^2)^{3/2}} = \\frac{${t(num)}}{${pt(vr)}^{3/2}} = ${t(num / vr ** 1.5)}`);
    if (hat) g.text(`f(${h.replace(/\\/g, '')}₁, θ̂₂, θ̂₃) — plug the method-of-moments estimates into f.`);
    return num / vr ** 1.5;
  }
  def('skew skewness', 'skew(x)', 1, 1, ([a], ctx, node) => {
    const v = X.unwrap(a);
    if (v instanceof RV) {
      if (v.key === 'discrete') { const th = [1, 2, 3].map((k) => rvMoment(v, k, ctx)); const s = skewSteps(ctx, ...th, false); return info('Skewness', [head(`\\operatorname{skew}(X) = ${t(s)}`)], s); }
      const s = v.d.skew(v.params);
      group(ctx, 'Skewness').tex(`X \\sim ${rvTex(v)}:\\ \\operatorname{skew}(X) = ${t(s)}`);
      return info('Skewness', [head(`\\operatorname{skew}(X) = ${t(s)}`)], s);
    }
    const d = asData(a, 'a list', 2), name = nm(node, 0);
    const th = [1, 2, 3].map((k) => rawMoment(d.vals, k));
    group(ctx, 'Method-of-moments estimates').tex(`\\hat\\theta_k = \\frac{1}{n}\\sum ${vt(name)}_i^k:\\quad \\hat\\theta_1 = ${t(th[0])},\\ \\hat\\theta_2 = ${t(th[1])},\\ \\hat\\theta_3 = ${t(th[2])}`);
    const s = skewSteps(ctx, ...th);
    return info('Sample skewness', [head(`\\widehat{\\operatorname{skew}} = ${t(s)}`), txt(s > 0.05 ? 'Positive: a longer right tail.' : s < -0.05 ? 'Negative: a longer left tail.' : 'About 0: roughly symmetric.')], s);
  }, 'skewness (plug-in m₃/m₂^{3/2}, via θ̂₁, θ̂₂, θ̂₃)', DC);
  def('skewmom', 'skewmom(x)', 1, 1, (args, ctx, node) => X.FUNCS.skew.fn(args, ctx, node), 'PSET 6 Q3: estimate skew(X) by plugging MoM moments into f(θ₁, θ₂, θ₃)', 'Estimators');

  def('kurt kurtosis', 'kurt(x)', 1, 1, ([a], ctx, node) => {
    const d = asData(a, 'a list', 2), name = nm(node, 0);
    const m2 = cMoment(d.vals, 2), m4 = cMoment(d.vals, 4), k = m4 / (m2 * m2);
    group(ctx, 'Kurtosis').tex(`\\hat\\kappa = \\frac{\\frac1n\\sum (${vt(name)}_i-${bar(name)})^4}{\\left(\\frac1n\\sum (${vt(name)}_i-${bar(name)})^2\\right)^2} = \\frac{${t(m4)}}{${pt(m2)}^2} = ${t(k)}`).text(`Excess kurtosis κ − 3 = ${f(k - 3)} (normal ⇒ 0).`);
    return info('Kurtosis', [head(`\\hat\\kappa = ${t(k)}`)], k);
  }, 'kurtosis m₄/m₂² (normal = 3)', DC);

  def('cov', 'cov(x, y)', 2, 2, ([a, b], ctx, node) => {
    const x = asData(a, 'a list', 2), y = asData(b, 'a list', 2);
    if (x.n !== y.n) throw new MathError(`x has ${x.n} values but y has ${y.n}`);
    const nx = nm(node, 0), ny = nm(node, 1, 'y');
    const mx = mean(x.vals), my = mean(y.vals);
    const sxy = clean(ksum(x.vals.map((v, i) => (v - mx) * (y.vals[i] - my))));
    const c = sxy / (x.n - 1);
    group(ctx, 'Sample covariance').tex(`${bar(nx)} = ${t(mx)},\\ ${bar(ny)} = ${t(my)}`).tex(`s_{${vt(nx)}${vt(ny)}} = \\frac{1}{n-1}\\sum (${vt(nx)}_i - ${bar(nx)})(${vt(ny)}_i - ${bar(ny)}) = \\frac{${t(sxy)}}{${x.n - 1}} = ${t(c)}`);
    return info('Sample covariance', [head(`s_{${vt(nx)}${vt(ny)}} = ${t(c)}`)], c);
  }, 'sample covariance (n − 1)', DC);
  def('cor corr', 'cor(x, y)', 2, 2, ([a, b], ctx, node) => {
    const x = asData(a, 'a list', 2), y = asData(b, 'a list', 2);
    if (x.n !== y.n) throw new MathError(`x has ${x.n} values but y has ${y.n}`);
    const nx = nm(node, 0), ny = nm(node, 1, 'y');
    const mx = mean(x.vals), my = mean(y.vals);
    const sxy = ksum(x.vals.map((v, i) => (v - mx) * (y.vals[i] - my))), sxx = ss(x.vals), syy = ss(y.vals);
    const r = sxy / Math.sqrt(sxx * syy);
    group(ctx, 'Correlation').tex(`r = \\frac{\\sum (${vt(nx)}_i-${bar(nx)})(${vt(ny)}_i-${bar(ny)})}{\\sqrt{\\sum (${vt(nx)}_i-${bar(nx)})^2 \\sum (${vt(ny)}_i-${bar(ny)})^2}} = \\frac{${t(clean(sxy))}}{\\sqrt{${t(sxx)}\\cdot ${t(syy)}}} = ${t(r)}`);
    return info('Correlation', [head(`r = ${t(r)}`), txt(`r² = ${f(r * r)}`)], r);
  }, 'sample correlation r', DC);

  def('zscore', 'zscore(x, μ, σ)', 1, 3, ([a, m, s], ctx) => {
    if (m === undefined) {
      const d = asData(a, 'a list', 2), mu = mean(d.vals), sd = Math.sqrt(varS(d.vals));
      group(ctx, 'Standardize').tex(`z_i = \\frac{x_i - \\bar x}{s},\\quad \\bar x = ${t(mu)},\\ s = ${t(sd)}`);
      return new Data(d.vals.map((x) => (x - mu) / sd));
    }
    const x = asNum(a), mu = asNum(m), sd = s === undefined ? 1 : asNum(s);
    const z = (x - mu) / sd;
    group(ctx, 'Standardize').tex(`z = \\frac{x - \\mu}{\\sigma} = \\frac{${t(x)} - ${pt(mu)}}{${t(sd)}} = ${t(z)}`);
    return info('z-score', [head(`z = ${t(z)}`)], z);
  }, 'standardize: (x − μ)/σ, or a whole list', DC);

  def('summary describe', 'summary(x)', 1, 1, ([a], ctx, node) => {
    const d = asData(a), v = d.vals, name = nm(node, 0);
    const m = mean(v);
    meanSteps(group(ctx, 'Mean'), d, name);
    const rows = [['n', d.n], ['mean x̄', m], ['median', quantile(v, 0.5)], ['s² (n − 1)', d.n > 1 ? varS(v) : NaN], ['σ̂² (n)', varP(v)], ['s', d.n > 1 ? Math.sqrt(varS(v)) : NaN],
      ['SE = σ̂/√n', d.n > 1 ? Math.sqrt(seVar(v) / d.n) : NaN], ['min', Math.min(...v)], ['Q1', quantile(v, 0.25)], ['Q3', quantile(v, 0.75)], ['max', Math.max(...v)], ['skewness', d.n > 2 ? cMoment(v, 3) / cMoment(v, 2) ** 1.5 : NaN]];
    return info(`Summary of ${name}`, [{ table: { head: ['statistic', 'value'], rows: rows.map(([k, x]) => [k, f(x)]) } }, { svg: EW.plot.hist(v, { xlabel: name }) }], d);
  }, 'n, mean, median, variances, quartiles, skewness + histogram', DC);
  def('hist histogram', 'hist(x)', 1, 2, ([a, k], ctx, node) => {
    const d = asData(a);
    return info(`Histogram of ${nm(node, 0)}`, [{ svg: EW.plot.hist(d.vals, { k: k === undefined ? undefined : asInt(k), xlabel: nm(node, 0) }) }], d);
  }, 'histogram (optionally with k bins)', DC);

  // ---------- probability of a distribution ----------
  function normStd(g, x, mu, sd) {
    const z = (x - mu) / sd;
    if (mu !== 0 || sd !== 1) g.tex(`z = \\frac{${t(x)} - ${pt(mu)}}{${t(sd)}} = ${t(z)}`);
    return z;
  }
  // P(a ≤ X ≤ b) (inclusive for discrete), with working
  function probRange(R, a, b, ctx) {
    const d = R.d, p = R.params;
    const g = group(ctx, 'Probability');
    const F = (x) => d.cdf(x, p);
    if (d.discrete) {
      const lo = Math.ceil(a - 1e-12), hi = Math.floor(b + 1e-12);
      if (hi < lo) { g.text('No possible values in that range.'); return 0; }
      let pts;
      if (R.key === 'discrete') pts = [...new Set(p.values)].filter((v) => v >= a - 1e-12 && v <= b + 1e-12).sort((x, y) => x - y);
      else { const [s0, s1] = d.support(p); pts = []; for (let k = Math.max(lo, s0); k <= Math.min(hi, isFinite(b) ? hi : s1 + 60); k++) pts.push(k); }
      const val = clean(Math.min(1, isFinite(b) || R.key === 'discrete' ? ksum(pts.map((k) => d.pdf(k, p))) : 1 - (isFinite(a) ? F(lo - 1) : 0)));
      const lhsD = isFinite(a) ? `P(${t(a)} \\le X \\le ${t(b)})` : `P(X \\le ${t(b)})`;
      if (pts.length <= 8 && isFinite(b)) g.tex(`${lhsD} = ${pts.map((k) => `P(X = ${t(k)})`).join(' + ') || '0'} = ${pts.map((k) => t(d.pdf(k, p))).join(' + ') || '0'} = ${t(val)}`);
      else if (!isFinite(b)) g.tex(`P(X \\ge ${t(lo)}) = 1 - P(X \\le ${t(lo - 1)}) = 1 - ${t(F(lo - 1))} = ${t(val)}`);
      else g.tex(`P(${t(lo)} \\le X \\le ${t(hi)}) = F(${t(hi)}) - F(${t(lo - 1)}) = ${t(F(hi))} - ${t(F(lo - 1))} = ${t(val)}`);
      return val;
    }
    const Fa = isFinite(a) ? F(a) : 0, Fb = isFinite(b) ? F(b) : 1;
    if (R.key === 'normal') {
      const { mu, sigma } = p;
      const za = isFinite(a) ? (a - mu) / sigma : -Infinity, zb = isFinite(b) ? (b - mu) / sigma : Infinity;
      if (mu !== 0 || sigma !== 1) g.tex(`\\text{Standardize: } Z = \\frac{X - \\mu}{\\sigma} \\sim N(0, 1)`);
      const lhs = `P(${isFinite(a) ? `${t(a)} \\le ` : ''}X${isFinite(b) ? ` \\le ${t(b)}` : ` \\ge ${t(a)}`})`;
      const zt = (x, z) => (mu !== 0 || sigma !== 1 ? `\\frac{${t(x)} - ${pt(mu)}}{${t(sigma)}}` : t(z));
      if (isFinite(a) && isFinite(b)) g.tex(`${lhs} = \\Phi\\!\\left(${zt(b, zb)}\\right) - \\Phi\\!\\left(${zt(a, za)}\\right) = \\Phi(${t(zb)}) - \\Phi(${t(za)})`).tex(`= ${t(Fb)} - ${t(Fa)} = ${t(Fb - Fa)}`);
      else if (isFinite(b)) g.tex(`${lhs} = \\Phi\\!\\left(${zt(b, zb)}\\right) = \\Phi(${t(zb)}) = ${t(Fb)}`);
      else g.tex(`${lhs} = 1 - \\Phi\\!\\left(${zt(a, za)}\\right) = 1 - \\Phi(${t(za)}) = ${t(1 - Fa)}`);
      return Fb - Fa;
    }
    if (isFinite(a) && isFinite(b)) g.tex(`P(${t(a)} \\le X \\le ${t(b)}) = F(${t(b)}) - F(${t(a)}) = ${t(Fb)} - ${t(Fa)} = ${t(Fb - Fa)}`);
    else if (isFinite(b)) g.tex(`P(X \\le ${t(b)}) = F(${t(b)}) = ${t(Fb)}`);
    else g.tex(`P(X \\ge ${t(a)}) = 1 - F(${t(a)}) = ${t(1 - Fa)}`);
    if (CDFTEX[R.key]) g.tex(`F(x) = ${CDFTEX[R.key]}`);
    return clean(Fb - Fa);
  }
  const CDFTEX = { unif: '\\frac{x-a}{b-a}\\ \\text{for } a \\le x \\le b', exp: '1 - e^{-\\lambda x}\\ \\text{for } x \\ge 0' };
  EW.stats.probRange = probRange;

  def('P prob', 'P(X, a, b)  ·  P(X, <, x)', 2, 3, ([a, b, c], ctx) => {
    const R = asRV(a);
    const d = R.d;
    let lo, hi, desc;
    const op = asStr(b);
    if (op) {
      const x = asNum(c, 'a number after the comparison');
      const eps = d.discrete ? 1 : 0;
      if (op === '<') { lo = -Infinity; hi = d.discrete ? Math.ceil(x) - eps : x; desc = `P(X < ${t(x)})`; }
      else if (op === '<=') { lo = -Infinity; hi = x; desc = `P(X \\le ${t(x)})`; }
      else if (op === '>') { lo = d.discrete ? Math.floor(x) + eps : x; hi = Infinity; desc = `P(X > ${t(x)})`; }
      else if (op === '>=') { lo = x; hi = Infinity; desc = `P(X \\ge ${t(x)})`; }
      else if (op === '!=') { const v = 1 - d.pdf(x, R.params); group(ctx, 'Complement').tex(`P(X \\ne ${t(x)}) = 1 - P(X = ${t(x)}) = ${t(v)}`); return info('Probability', [head(`P(X \\ne ${t(x)}) = ${t(v)}`)], v); }
      else throw new MathError('Use <, <=, > or >= between the distribution and the number');
      if (d.discrete && (op === '<' || op === '>')) group(ctx, 'Discrete: strict inequality').text(`X takes whole-number values, so ${op === '<' ? `X < ${f(x)} means X ≤ ${f(hi)}` : `X > ${f(x)} means X ≥ ${f(lo)}`}.`);
    } else if (c === undefined) {
      const x = asNum(b);
      const v = d.discrete ? d.pdf(x, R.params) : 0;
      group(ctx, d.discrete ? 'Point probability' : 'Continuous random variable').tex(d.discrete ? `P(X = ${t(x)}) = p(${t(x)}) = ${t(v)}` : `P(X = ${t(x)}) = \\int_{${t(x)}}^{${t(x)}} f(u)\\,du = 0`);
      return info('Probability', [head(`P(X = ${t(x)}) = ${t(v)}`)], v);
    } else { lo = asNum(b); hi = asNum(c); desc = `P(${t(lo)} \\le X \\le ${t(hi)})`; }
    const v = probRange(R, lo, hi, ctx);
    return info('Probability', [head(`${desc} = ${t(v)}`), { svg: EW.plot.density(d, R.params, { shade: [lo, hi] }) }], v);
  }, 'probability for a distribution: P(Binom(10, .5), 3, 5), P(Normal(0,1), >, 1.96)', PCAT);

  def('cdf', 'cdf(X, x)', 2, 2, ([a, b], ctx) => {
    const R = asRV(a), x = asNum(b);
    const v = probRange(R, -Infinity, x, ctx);
    return info('CDF', [head(`F(${t(x)}) = P(X \\le ${t(x)}) = ${t(v)}`)], v);
  }, 'F(x) = P(X ≤ x)', PCAT);
  def('pdf pmf density', 'pdf(X, x)', 2, 2, ([a, b], ctx) => {
    const R = asRV(a), x = asNum(b), v = R.d.pdf(x, R.params);
    if (R.d.pdfTex) group(ctx, R.d.discrete ? 'pmf' : 'pdf').tex(`${R.d.discrete ? 'p' : 'f'}(x) = ${R.d.pdfTex}`).tex(`${R.d.discrete ? 'p' : 'f'}(${t(x)}) = ${t(v)}`);
    return info(R.d.discrete ? 'pmf' : 'Density', [head(`${R.d.discrete ? 'p' : 'f'}(${t(x)}) = ${t(v)}`)], v);
  }, 'density f(x) or pmf p(x)', PCAT);

  // R-style shortcuts
  const RS = 'Distribution functions';
  const qNote = (g, p, z) => {
    const tab = D.ZTABLE.find(([pp]) => Math.abs(pp - p) < 1e-9 || Math.abs(1 - pp - p) < 1e-9);
    if (tab) g.text(`Table 1 of the problem set rounds this to ${p < 0.5 ? '−' : ''}${tab[1].toFixed(3)}.`);
  };
  def('pnorm Phi', 'pnorm(x, μ, σ)', 1, 3, ([x, m, s], ctx) => {
    const R = new RV('normal', { mu: m === undefined ? 0 : asNum(m), sigma: s === undefined ? 1 : asNum(s) });
    D.checkParams('normal', R.params);
    const xx = asNum(x), v = probRange(R, -Infinity, xx, ctx);
    return info('Normal CDF', [head(`P(X \\le ${t(xx)}) = ${t(v)}`)], v);
  }, 'Φ((x − μ)/σ): P(X ≤ x) for X ~ N(μ, σ²)', RS);
  def('qnorm invPhi', 'qnorm(p, μ, σ)', 1, 3, ([pp, m, s], ctx) => {
    const p = asProb(pp), mu = m === undefined ? 0 : asNum(m), sd = s === undefined ? 1 : asNum(s);
    const z = S.PhiInv(p), x = mu + sd * z;
    const g = group(ctx, 'Normal quantile');
    g.tex(`z = \\Phi^{-1}(${t(p)}) = ${EW.dec(z, Math.max(4, st().dp))}`);
    qNote(g, p, z);
    if (mu !== 0 || sd !== 1) g.tex(`x = \\mu + z\\sigma = ${t(mu)} + ${pt(z)}\\cdot ${t(sd)} = ${t(x)}`);
    return info('Normal quantile', [head(`${mu !== 0 || sd !== 1 ? 'x' : '\\Phi^{-1}'}(${t(p)}) = ${t(x)}`)], x);
  }, 'Φ⁻¹(p) (exact; Table 1 values are used inside ci/tests)', RS);
  def('dnorm phi', 'dnorm(x, μ, σ)', 1, 3, ([x, m, s]) => { const mu = m === undefined ? 0 : asNum(m), sd = s === undefined ? 1 : asNum(s); return S.phi((asNum(x) - mu) / sd) / sd; }, 'normal density', RS);
  const simple = (names, sig, key, argKeys, doc, kind = 'cdf') => def(names, sig, argKeys.length + 1, argKeys.length + 1, ([x, ...ps], ctx) => {
    const p = {};
    argKeys.forEach((k, i) => { p[k] = asNum(ps[i]); });
    D.checkParams(key, p);
    const R = new RV(key, p), xx = asNum(x);
    if (kind === 'q') {
      const v = R.d.q(asProb(xx), p);
      group(ctx, 'Quantile').tex(`${R.d.tex(p)}:\\ F^{-1}(${t(xx)}) = ${t(v)}`);
      return info('Quantile', [head(`F^{-1}(${t(xx)}) = ${t(v)}`)], v);
    }
    if (kind === 'pmf') {
      const v = R.d.pdf(xx, p);
      const g = group(ctx, R.d.name + ' pmf');
      g.tex(`P(X = x) = ${R.d.pdfTex}`);
      if (key === 'binom') g.tex(`P(X = ${t(xx)}) = \\binom{${p.n}}{${t(xx)}}(${t(p.p)})^{${t(xx)}}(${t(1 - p.p)})^{${t(p.n - xx)}} = ${S.choose(p.n, xx)}\\cdot ${t(p.p ** xx)}\\cdot ${t((1 - p.p) ** (p.n - xx))} = ${t(v)}`);
      else if (key === 'pois') g.tex(`P(X = ${t(xx)}) = \\frac{e^{-${t(p.lambda)}}\\,${pt(p.lambda)}^{${t(xx)}}}{${t(xx)}!} = ${t(v)}`);
      else g.tex(`P(X = ${t(xx)}) = ${t(v)}`);
      return info('Probability', [head(`P(X = ${t(xx)}) = ${t(v)}`)], v);
    }
    const v = probRange(R, -Infinity, xx, ctx);
    return info('CDF', [head(`P(X \\le ${t(xx)}) = ${t(v)}`)], v);
  }, doc, RS);
  simple('pt', 'pt(x, df)', 't', ['df'], 'P(T ≤ x), T ~ t(df)');
  simple('qt', 'qt(p, df)', 't', ['df'], 't quantile', 'q');
  simple('pchisq', 'pchisq(x, k)', 'chisq', ['k'], 'P(χ²ₖ ≤ x)');
  simple('qchisq', 'qchisq(p, k)', 'chisq', ['k'], 'χ² quantile', 'q');
  simple('pf', 'pf(x, d1, d2)', 'f', ['d1', 'd2'], 'P(F ≤ x)');
  simple('qf', 'qf(p, d1, d2)', 'f', ['d1', 'd2'], 'F quantile', 'q');
  simple('dbinom', 'dbinom(k, n, p)', 'binom', ['n', 'p'], 'P(X = k), X ~ Bin(n, p)', 'pmf');
  simple('pbinom', 'pbinom(k, n, p)', 'binom', ['n', 'p'], 'P(X ≤ k), X ~ Bin(n, p)');
  simple('dpois', 'dpois(k, λ)', 'pois', ['lambda'], 'P(X = k), X ~ Poisson(λ)', 'pmf');
  simple('ppois', 'ppois(k, λ)', 'pois', ['lambda'], 'P(X ≤ k), X ~ Poisson(λ)');
  simple('dgeom', 'dgeom(k, p)', 'geom', ['p'], 'P(X = k), trials until first success', 'pmf');
  simple('pgeom', 'pgeom(k, p)', 'geom', ['p'], 'P(X ≤ k)');
  simple('punif', 'punif(x, a, b)', 'unif', ['a', 'b'], 'P(X ≤ x), X ~ U(a, b)');
  simple('pexp', 'pexp(x, λ)', 'exp', ['lambda'], 'P(X ≤ x), X ~ Exp(λ)');
  def('normprob', 'normprob(a, b, μ, σ)', 2, 4, ([a, b, m, s], ctx) => {
    const R = new RV('normal', { mu: m === undefined ? 0 : asNum(m), sigma: s === undefined ? 1 : asNum(s) });
    D.checkParams('normal', R.params);
    const lo = asNum(a), hi = asNum(b), v = probRange(R, lo, hi, ctx);
    return info('Normal probability', [head(`P(${t(lo)} \\le X \\le ${t(hi)}) = ${t(v)}`), { svg: EW.plot.density(R.d, R.params, { shade: [lo, hi] }) }], v);
  }, 'P(a ≤ X ≤ b) for X ~ N(μ, σ²) by standardizing', RS);

  // ---------- probability rules ----------
  const PR = 'Probability';
  def('choose nCr', 'choose(n, k)', 2, 2, ([a, b], ctx) => {
    const n = asInt(a), k = asInt(b), v = S.choose(n, k);
    group(ctx, 'Combinations').tex(`\\binom{${n}}{${k}} = \\frac{${n}!}{${k}!\\,(${n} - ${k})!} = ${v}`);
    return info('Combinations', [head(`\\binom{${n}}{${k}} = ${v}`), txt('Ways to choose k of n items when order does not matter.')], v);
  }, 'n choose k', PR);
  def('perm nPr', 'perm(n, k)', 2, 2, ([a, b], ctx) => {
    const n = asInt(a), k = asInt(b);
    if (k < 0 || k > n) return 0;
    let v = 1; for (let i = 0; i < k; i++) v *= n - i;
    group(ctx, 'Permutations').tex(`P(${n}, ${k}) = \\frac{${n}!}{(${n} - ${k})!} = ${Array.from({ length: Math.min(k, 8) }, (_, i) => n - i).join('\\cdot ')}${k > 8 ? '\\cdots' : ''} = ${v}`);
    return info('Permutations', [head(`\\frac{${n}!}{(${n}-${k})!} = ${v}`), txt('Ordered arrangements of k out of n items.')], v);
  }, 'ordered arrangements n!/(n − k)!', PR);
  def('bayes', 'bayes(priors, likelihoods)  ·  bayes(P(A), P(B|A), P(B|Aᶜ))', 2, 3, (args, ctx) => {
    let pri, lik, two = false;
    if (args.length === 3) {
      const pA = asProb(args[0], 'P(A)'), l1 = asProb(args[1], 'P(B | A)'), l0 = asProb(args[2], 'P(B | Aᶜ)');
      pri = [pA, 1 - pA]; lik = [l1, l0]; two = true;
    } else {
      pri = asData(args[0], 'a list of prior probabilities').vals; lik = asData(args[1], 'a list of likelihoods').vals;
      if (pri.length !== lik.length) throw new MathError('Need one likelihood per prior');
      if (Math.abs(ksum(pri) - 1) > 1e-9) throw new MathError(`Priors add up to ${f(clean(ksum(pri)))}, not 1 — they should cover every case exactly once`);
    }
    const lab = two ? ['A', 'A^c'] : pri.map((_, i) => `A_{${i + 1}}`);
    const joint = pri.map((p, i) => clean(p * lik[i]));
    const pB = clean(ksum(joint));
    if (pB === 0) throw new MathError('P(B) = 0, so P(· | B) is undefined');
    const post = joint.map((j) => clean(j / pB));
    group(ctx, 'Law of total probability').tex(`P(B) = \\sum_i P(B \\mid ${two ? 'A_i' : 'A_i'})P(A_i) = ${lik.map((l, i) => `${t(l)}\\cdot ${t(pri[i])}`).join(' + ')} = ${joint.map(t).join(' + ')} = ${t(pB)}`);
    const g = group(ctx, "Bayes' rule");
    lab.forEach((L, i) => { if (two && i > 0) return; g.tex(`P(${L} \\mid B) = \\frac{P(B \\mid ${L})\\,P(${L})}{P(B)} = \\frac{${t(lik[i])}\\cdot ${t(pri[i])}}{${t(pB)}} = \\frac{${t(joint[i])}}{${t(pB)}} = ${t(post[i])}`); });
    const rows = lab.map((L, i) => [L.replace('^c', 'ᶜ').replace(/_\{(\d+)\}/, '$1'), f(pri[i]), f(lik[i]), f(joint[i]), f(post[i])]);
    return info('Posterior probabilities', [head(`P(${lab[0]} \\mid B) = ${t(post[0])}`), { table: { head: ['event', 'prior P(Aᵢ)', 'P(B | Aᵢ)', 'joint', 'posterior P(Aᵢ | B)'], rows } }, txt(`P(B) = ${f(pB)}`)], two ? post[0] : new Data(post));
  }, "Bayes' rule with the total-probability denominator", PR);
  def('indep', 'indep(P(A), P(B), P(A∩B))', 3, 3, (args, ctx) => {
    const [pA, pB, pAB] = args.map((a, i) => asProb(a, ['P(A)', 'P(B)', 'P(A ∩ B)'][i]));
    if (pAB > Math.min(pA, pB) + 1e-12) throw new MathError('P(A ∩ B) can’t exceed P(A) or P(B)');
    const prod = clean(pA * pB), yes = Math.abs(prod - pAB) < 1e-9;
    const g = group(ctx, 'Independence check');
    g.tex(`P(A)P(B) = ${t(pA)}\\cdot ${t(pB)} = ${t(prod)}\\ ${yes ? '=' : '\\ne'}\\ ${t(pAB)} = P(A \\cap B)`);
    if (pB > 0) g.tex(`P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} = \\frac{${t(pAB)}}{${t(pB)}} = ${t(clean(pAB / pB))}\\ ${yes ? '=' : '\\ne'}\\ P(A) = ${t(pA)}`);
    g.tex(`P(A \\cup B) = P(A) + P(B) - P(A \\cap B) = ${t(clean(pA + pB - pAB))}`);
    return info(yes ? 'Independent' : 'Not independent', [txt(yes ? 'A and B are independent: knowing B happened does not change the probability of A.' : `A and B are dependent: P(A | B) = ${f(clean(pAB / pB))} differs from P(A) = ${f(pA)}.`)], yes ? 1 : 0);
  }, 'are A and B independent? (also P(A|B), P(A∪B))', PR);
  def('cond', 'cond(P(A∩B), P(B))', 2, 2, ([a, b], ctx) => {
    const pAB = asProb(a), pB = asProb(b);
    if (pB === 0) throw new MathError('P(B) = 0');
    const v = clean(pAB / pB);
    group(ctx, 'Conditional probability').tex(`P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} = \\frac{${t(pAB)}}{${t(pB)}} = ${t(v)}`);
    return info('Conditional probability', [head(`P(A \\mid B) = ${t(v)}`)], v);
  }, 'P(A | B) = P(A ∩ B)/P(B)', PR);
  def('union', 'union(P(A), P(B), P(A∩B))', 3, 3, ([a, b, c], ctx) => {
    const pA = asProb(a), pB = asProb(b), pAB = asProb(c), v = clean(pA + pB - pAB);
    group(ctx, 'Inclusion–exclusion').tex(`P(A \\cup B) = P(A) + P(B) - P(A \\cap B) = ${t(pA)} + ${t(pB)} - ${t(pAB)} = ${t(v)}`);
    return info('Union', [head(`P(A \\cup B) = ${t(v)}`)], v);
  }, 'inclusion–exclusion', PR);

  // ---------- inference ----------
  const IC = 'Confidence intervals & tests';
  // Summary statistics from either data or (x̄, sd, n)
  function summaryFrom(args, ctx, node, what = 'mean') {
    const v = X.unwrap(args[0]);
    if (v instanceof Data && v.n > 1) {
      const name = nm(node, 0);
      const m = meanSteps(group(ctx, 'Sample mean'), v, name);
      const g = group(ctx, 'Spread');
      const S2 = ss(v.vals);
      const tm = v.n <= 10 || v.freq ? terms(v, (x) => `(${t(x)} - ${t(m)})^2`) : null;
      g.tex(`\\sum (${vt(name)}_i - ${bar(name)}_n)^2 = ${tm && tm.length < 260 ? `${tm} = ` : ''}${t(S2)}`);
      const useN = st().divisor === 'n';
      g.tex(`s^2 = \\frac{${t(S2)}}{${v.n - 1}} = ${t(S2 / (v.n - 1))},\\qquad \\hat\\sigma^2 = \\frac{${t(S2)}}{${v.n}} = ${t(S2 / v.n)}`);
      g.text(`Using ${useN ? 'σ̂² (divide by n)' : 's² (divide by n − 1)'} — the difference is negligible for large n. Change in ⚙.`);
      return { name, m, v2: useN ? S2 / v.n : S2 / (v.n - 1), n: v.n, rest: args.slice(1), data: v, lab: useN ? '\\hat\\sigma' : 's' };
    }
    // ci(x̄, sd, n, …)
    if (args.length < 3) throw new MathError(`Give data, or the summary statistics: ${what === 'mean' ? 'x̄, sd, n' : ''}`);
    const m = asNum(args[0], 'x̄'), sd = asNum(args[1], 'the standard deviation'), n = asInt(args[2], 'n');
    group(ctx, 'Summary statistics').tex(`\\bar x_n = ${t(m)},\\quad \\hat\\sigma = ${t(sd)},\\quad n = ${n}`);
    return { name: 'x', m, v2: sd * sd, n, rest: args.slice(3), lab: '\\hat\\sigma' };
  }
  function crit(level, ctx, two = true) {
    if (!(level > 0 && level < 1)) throw new MathError('Confidence level must be between 0 and 1, e.g. 0.95');
    const alpha = clean(1 - level), pp = two ? clean(1 - alpha / 2) : level;
    const { z, table } = D.zq(pp);
    group(ctx, 'Critical value').tex(`\\alpha = 1 - ${t(level)} = ${t(alpha)},\\quad z = \\Phi^{-1}(${two ? `1 - \\alpha/2` : '1-\\alpha'}) = \\Phi^{-1}(${t(pp)}) = ${table ? z.toFixed(3) : t(z)}`)
      .text(table ? 'From Table 1 of the problem set.' : 'Computed exactly (not one of the Table 1 values).');
    return z;
  }
  const pct = (level) => `${f(clean(level * 100))}%`;

  def('ci', 'ci(x, level)  ·  ci(x̄, sd, n, level)', 1, 4, (args, ctx, node) => {
    const s = summaryFrom(args, ctx, node);
    const level = s.rest[0] === undefined ? 0.95 : asProb(s.rest[0], 'a confidence level');
    const se = Math.sqrt(s.v2 / s.n);
    group(ctx, 'Standard error').tex(`\\operatorname{SE}(${bar(s.name)}_n) = \\frac{${s.lab}}{\\sqrt n} = \\frac{${t(Math.sqrt(s.v2))}}{\\sqrt{${s.n}}} = ${t(se)}`);
    const z = crit(level, ctx);
    const me = z * se, lo = s.m - me, hi = s.m + me;
    group(ctx, 'Interval').tex(`${bar(s.name)}_n \\pm z\\cdot\\operatorname{SE} = ${t(s.m)} \\pm ${EW.dec(z, 3)}\\times ${t(se)} = ${t(s.m)} \\pm ${t(me)}`).tex(`= [${t(lo)},\\ ${t(hi)}]`);
    if (s.n < 30) ctx.notes.push(`n = ${s.n} is small; this interval relies on the CLT. The t-based interval tci(…) uses t_${s.n - 1} = ${f(D.REG.t.q(1 - (1 - level) / 2, { df: s.n - 1 }))} instead of z.`);
    return info(`${pct(level)} confidence interval for μ`, [
      head(`\\mu \\in [${t(lo)},\\ ${t(hi)}]`),
      txt(`Interpretation: we are ${pct(level)} confident that the population mean lies between ${f(lo)} and ${f(hi)}. "Confident" refers to the procedure: across repeated samples, about ${pct(level)} of intervals built this way contain the true μ — any one interval either does or doesn't. This is an asymptotic interval: by the CLT, √n(X̄ₙ − μ)/σ̂ → N(0, 1), so it is valid for large n whatever the distribution of X.`),
    ], ivl(lo, hi), { parts: { lo, hi } });
  }, 'asymptotic CI for the mean: X̄ ± z·σ̂/√n', IC);

  def('tci', 'tci(x, level)', 1, 4, (args, ctx, node) => {
    const s = summaryFrom(args, ctx, node);
    const level = s.rest[0] === undefined ? 0.95 : asProb(s.rest[0]);
    const v2 = s.data ? varS(s.data.vals) : s.v2;
    const se = Math.sqrt(v2 / s.n), df = s.n - 1;
    const tq = D.REG.t.q(1 - (1 - level) / 2, { df });
    group(ctx, 't critical value').tex(`\\operatorname{SE} = \\frac{s}{\\sqrt n} = ${t(se)},\\quad t_{${df},\\,${t(1 - (1 - level) / 2)}} = ${t(tq)}`);
    const lo = s.m - tq * se, hi = s.m + tq * se;
    group(ctx, 'Interval').tex(`${t(s.m)} \\pm ${t(tq)}\\times ${t(se)} = [${t(lo)},\\ ${t(hi)}]`);
    return info(`${pct(level)} t-interval for μ`, [head(`\\mu \\in [${t(lo)},\\ ${t(hi)}]`), txt('Exact if X is normal; uses s (n − 1) and the t distribution with n − 1 df, so it is a bit wider than the z interval.')], ivl(lo, hi), { parts: { lo, hi } });
  }, 't-interval X̄ ± t_{n−1}·s/√n', IC);

  function propArgs(args) {
    const v = X.unwrap(args[0]);
    if (v instanceof Data && v.n > 1) {
      if (!v.vals.every((x) => x === 0 || x === 1)) throw new MathError('Proportion data should be 0s and 1s');
      return { k: ksum(v.vals), n: v.n, rest: args.slice(1) };
    }
    const k = asNum(args[0], 'the number of successes k'), n = asInt(args[1], 'n');
    if (k > n || k < 0) throw new MathError('Need 0 ≤ k ≤ n');
    return { k, n, rest: args.slice(2) };
  }
  def('propci', 'propci(k, n, level)', 1, 3, (args, ctx) => {
    const { k, n, rest } = propArgs(args);
    const level = rest[0] === undefined ? 0.95 : asProb(rest[0]);
    const p = clean(k / n), se = Math.sqrt((p * (1 - p)) / n);
    group(ctx, 'Sample proportion').tex(`\\hat p = \\bar X_n = \\frac{${t(k)}}{${n}} = ${t(p)}`);
    group(ctx, 'Standard error').tex(`\\operatorname{SE}(\\hat p) = \\sqrt{\\frac{\\hat p(1-\\hat p)}{n}} = \\sqrt{\\frac{${t(p)}\\cdot ${t(1 - p)}}{${n}}} = ${t(se)}`).text('For Bernoulli data Var(X) = p(1 − p), so SE = √(p(1 − p)/n) — the square root matters.');
    const z = crit(level, ctx);
    const lo = p - z * se, hi = p + z * se;
    group(ctx, 'Interval').tex(`${t(p)} \\pm ${EW.dec(z, 3)}\\times ${t(se)} = [${t(lo)},\\ ${t(hi)}]`);
    return info(`${pct(level)} confidence interval for p`, [head(`p \\in [${t(lo)},\\ ${t(hi)}]`)], ivl(lo, hi), { parts: { lo, hi } });
  }, 'CI for a proportion p̂ ± z√(p̂(1 − p̂)/n)', IC);

  def('ci2', 'ci2(x, y, level)', 2, 3, ([a, b, c], ctx, node) => {
    const x = asData(a, 'a list', 2), y = asData(b, 'a list', 2), level = c === undefined ? 0.95 : asProb(c);
    const nx = nm(node, 0), ny = nm(node, 1, 'y');
    const mx = mean(x.vals), my = mean(y.vals), vx = seVar(x.vals), vy = seVar(y.vals);
    const se = Math.sqrt(vx / x.n + vy / y.n);
    group(ctx, 'Two samples').tex(`${bar(nx)} = ${t(mx)},\\ ${bar(ny)} = ${t(my)},\\quad \\operatorname{SE} = \\sqrt{\\frac{${t(vx)}}{${x.n}} + \\frac{${t(vy)}}{${y.n}}} = ${t(se)}`);
    const z = crit(level, ctx);
    const d = mx - my, lo = d - z * se, hi = d + z * se;
    group(ctx, 'Interval').tex(`(${t(mx)} - ${pt(my)}) \\pm ${EW.dec(z, 3)}\\times ${t(se)} = [${t(lo)},\\ ${t(hi)}]`);
    return info(`${pct(level)} CI for μ_${nx} − μ_${ny}`, [head(`\\mu_{${vt(nx)}} - \\mu_{${vt(ny)}} \\in [${t(lo)},\\ ${t(hi)}]`), txt(lo > 0 || hi < 0 ? 'The interval excludes 0: the means differ at this level.' : 'The interval contains 0: no significant difference at this level.')], ivl(lo, hi), { parts: { lo, hi } });
  }, 'CI for a difference in means (independent samples)', IC);

  def('samplesize', 'samplesize(σ, E, level)', 2, 3, ([s, e, l], ctx) => {
    const sd = asNum(s), E = asNum(e), level = l === undefined ? 0.95 : asProb(l);
    const z = crit(level, ctx), n = (z * sd / E) ** 2;
    group(ctx, 'Solve for n').tex(`z\\frac{\\sigma}{\\sqrt n} \\le E \\iff n \\ge \\left(\\frac{z\\sigma}{E}\\right)^2 = \\left(\\frac{${EW.dec(z, 3)}\\cdot ${t(sd)}}{${t(E)}}\\right)^2 = ${t(n)}`);
    return info('Sample size', [head(`n = ${Math.ceil(n - 1e-9)}`), txt('Round up to keep the margin of error at most E.')], Math.ceil(n - 1e-9));
  }, 'smallest n with margin of error ≤ E', IC);

  function pval(stat, alt, cdf) {
    return alt === 'two' ? 2 * Math.min(cdf(stat), 1 - cdf(stat)) : alt === 'greater' ? 1 - cdf(stat) : cdf(stat);
  }
  const altSym = { two: '\\ne', greater: '>', less: '<' };
  function testSteps(ctx, { param, null0, stat, statName, alt, cdf, q, distTex }) {
    const alpha = st().alpha;
    group(ctx, 'Hypotheses').tex(`H_0: ${param} = ${t(null0)}\\quad\\text{vs}\\quad H_1: ${param} ${altSym[alt]} ${t(null0)}`);
    // show the hypotheses before the test statistic
    const hg = ctx.steps.pop(), at = ctx.steps.findIndex((g) => g.title.startsWith('Test statistic'));
    ctx.steps.splice(at < 0 ? ctx.steps.length : at, 0, hg);
    const p = pval(stat, alt, cdf);
    const g = group(ctx, 'p-value');
    if (alt === 'two') g.tex(`p = P(|${statName}| \\ge |${t(stat)}|) = 2\\,(1 - ${distTex}(${t(Math.abs(stat))})) = ${t(p)}`);
    else if (alt === 'greater') g.tex(`p = P(${statName} \\ge ${t(stat)}) = 1 - ${distTex}(${t(stat)}) = ${t(p)}`);
    else g.tex(`p = P(${statName} \\le ${t(stat)}) = ${distTex}(${t(stat)}) = ${t(p)}`);
    const cv = alt === 'two' ? q(1 - alpha / 2) : alt === 'greater' ? q(1 - alpha) : q(alpha);
    const reject = p < alpha;
    group(ctx, 'Decision').tex(alt === 'two' ? `\\text{Reject } H_0 \\text{ if } |${statName}| > ${t(cv)}:\\quad |${t(stat)}| ${Math.abs(stat) > cv ? '>' : '\\le'} ${t(cv)}` : `\\text{Reject } H_0 \\text{ if } ${statName} ${alt === 'greater' ? '>' : '<'} ${t(cv)}:\\quad ${t(stat)} ${(alt === 'greater' ? stat > cv : stat < cv) ? (alt === 'greater' ? '>' : '<') : (alt === 'greater' ? '\\le' : '\\ge')} ${t(cv)}`)
      .tex(`p = ${t(p)}\\ ${reject ? '<' : '\\ge'}\\ \\alpha = ${t(alpha)}\\ \\Rightarrow\\ \\text{${reject ? 'reject' : 'fail to reject'} } H_0`);
    return { p, reject, alpha };
  }
  function testCard(title, { p, reject, alpha }, stat, statName, nullTex) {
    return info(title, [head(`${statName} = ${t(stat)},\\quad p = ${t(p)}`),
      txt(reject ? `Reject H₀ at α = ${f(alpha)}: if ${nullTex} were true, a statistic this extreme would happen with probability only ${f(p)}.` : `Fail to reject H₀ at α = ${f(alpha)} (p = ${f(p)}). This is not evidence that H₀ is true — only that the data are consistent with it.`)], p, { parts: { stat, p } });
  }
  def('ztest', 'ztest(x, μ0, alt)  ·  ztest(x̄, μ0, sd, n, alt)', 2, 5, (args, ctx, node) => {
    let s, mu0, alt;
    const v = X.unwrap(args[0]);
    if (v instanceof Data && v.n > 1) { s = summaryFrom([args[0]], ctx, node); mu0 = asNum(args[1], 'μ₀'); alt = asAlt(args[2]); }
    else { if (args.length < 4) throw new MathError('Summary form: ztest(x̄, μ0, sd, n, alt)'); s = summaryFrom([args[0], args[2], args[3]], ctx, node); mu0 = asNum(args[1]); alt = asAlt(args[4]); }
    const se = Math.sqrt(s.v2 / s.n), z = (s.m - mu0) / se;
    group(ctx, 'Test statistic').tex(`Z = \\frac{\\bar X_n - \\mu_0}{${s.lab}/\\sqrt n} = \\frac{${t(s.m)} - ${pt(mu0)}}{${t(se)}} = ${t(z)}\\ \\overset{a}{\\sim}\\ N(0, 1)\\ \\text{under } H_0`);
    const r = testSteps(ctx, { param: '\\mu', null0: mu0, stat: z, statName: 'Z', alt, cdf: S.Phi, q: S.PhiInv, distTex: '\\Phi' });
    return testCard('z-test for a mean', r, z, 'Z', `μ = ${f(mu0)}`);
  }, 'large-sample test of H₀: μ = μ₀ (alt: two, greater, less)', IC);
  def('ttest', 'ttest(x, μ0, alt)  ·  ttest(x̄, μ0, s, n, alt)', 2, 5, (args, ctx, node) => {
    let s, mu0, alt;
    const v = X.unwrap(args[0]);
    if (v instanceof Data && v.n > 1) { s = summaryFrom([args[0]], ctx, node); s.v2 = varS(v.vals); s.lab = 's'; mu0 = asNum(args[1]); alt = asAlt(args[2]); }
    else { if (args.length < 4) throw new MathError('Summary form: ttest(x̄, μ0, s, n, alt)'); s = summaryFrom([args[0], args[2], args[3]], ctx, node); s.lab = 's'; mu0 = asNum(args[1]); alt = asAlt(args[4]); }
    const df = s.n - 1, se = Math.sqrt(s.v2 / s.n), tt = (s.m - mu0) / se;
    group(ctx, 'Test statistic').tex(`T = \\frac{\\bar X_n - \\mu_0}{s/\\sqrt n} = \\frac{${t(s.m)} - ${pt(mu0)}}{${t(se)}} = ${t(tt)}\\ \\sim\\ t_{${df}}\\ \\text{under } H_0`);
    const R = { df };
    const r = testSteps(ctx, { param: '\\mu', null0: mu0, stat: tt, statName: 'T', alt, cdf: (x) => D.REG.t.cdf(x, R), q: (p) => D.REG.t.q(p, R), distTex: `F_{t_{${df}}}` });
    return testCard('t-test for a mean', r, tt, 'T', `μ = ${f(mu0)}`);
  }, 't-test of H₀: μ = μ₀ with n − 1 df', IC);
  def('proptest', 'proptest(k, n, p0, alt)', 2, 4, (args, ctx) => {
    const { k, n, rest } = propArgs(args);
    const p0 = asProb(rest[0], 'p₀'), alt = asAlt(rest[1]);
    const ph = clean(k / n), se = Math.sqrt((p0 * (1 - p0)) / n), z = (ph - p0) / se;
    group(ctx, 'Test statistic').tex(`\\hat p = \\frac{${t(k)}}{${n}} = ${t(ph)},\\quad Z = \\frac{\\hat p - p_0}{\\sqrt{p_0(1-p_0)/n}} = \\frac{${t(ph)} - ${t(p0)}}{${t(se)}} = ${t(z)}`).text('Under H₀ the variance is p₀(1 − p₀), so the SE uses p₀ rather than p̂.');
    const r = testSteps(ctx, { param: 'p', null0: p0, stat: z, statName: 'Z', alt, cdf: S.Phi, q: S.PhiInv, distTex: '\\Phi' });
    return testCard('Test for a proportion', r, z, 'Z', `p = ${f(p0)}`);
  }, 'large-sample test of H₀: p = p₀', IC);
  def('ttest2 ztest2', 'ttest2(x, y, alt)', 2, 3, ([a, b, c], ctx, node) => {
    const x = asData(a, 'a list', 2), y = asData(b, 'a list', 2), alt = asAlt(c);
    const nx = nm(node, 0), ny = nm(node, 1, 'y');
    const mx = mean(x.vals), my = mean(y.vals), vx = varS(x.vals), vy = varS(y.vals);
    const se = Math.sqrt(vx / x.n + vy / y.n), tt = (mx - my) / se;
    const df = (vx / x.n + vy / y.n) ** 2 / ((vx / x.n) ** 2 / (x.n - 1) + (vy / y.n) ** 2 / (y.n - 1));
    group(ctx, 'Test statistic (Welch)').tex(`T = \\frac{${bar(nx)} - ${bar(ny)}}{\\sqrt{s_{${vt(nx)}}^2/n_{${vt(nx)}} + s_{${vt(ny)}}^2/n_{${vt(ny)}}}} = \\frac{${t(mx)} - ${pt(my)}}{${t(se)}} = ${t(tt)},\\quad \\nu \\approx ${t(df)}`);
    const R = { df };
    const r = testSteps(ctx, { param: `\\mu_{${vt(nx)}} - \\mu_{${vt(ny)}}`, null0: 0, stat: tt, statName: 'T', alt, cdf: (v) => D.REG.t.cdf(v, R), q: (p) => D.REG.t.q(p, R), distTex: `F_{t_{\\nu}}` });
    ctx.notes.push(`Large-sample z version: p = ${f(pval(tt, alt, S.Phi))}.`);
    return testCard('Two-sample t-test', r, tt, 'T', 'μ₁ = μ₂');
  }, 'Welch two-sample test of H₀: μ₁ = μ₂', IC);

  def('clt', 'clt(μ, σ, n, a, b)  ·  clt(X, n, a, b)', 4, 5, (args, ctx) => {
    let mu, sd, n, a, b;
    const v = X.unwrap(args[0]);
    if (v instanceof RV) { mu = v.d.mean(v.params); sd = Math.sqrt(v.d.var(v.params)); [n, a, b] = [asInt(args[1]), asNum(args[2]), asNum(args[3])]; group(ctx, 'Population moments').tex(`\\mu = E[X] = ${t(mu)},\\quad \\sigma = \\operatorname{sd}(X) = ${t(sd)}`); }
    else { if (args.length < 5) throw new MathError('clt(μ, σ, n, a, b)'); [mu, sd, n, a, b] = [asNum(args[0]), asNum(args[1]), asInt(args[2]), asNum(args[3]), asNum(args[4])]; }
    const se = sd / Math.sqrt(n);
    group(ctx, 'Central limit theorem').tex(`\\sqrt n\\,\\frac{\\bar X_n - \\mu}{\\sigma} \\xrightarrow{d} N(0,1)\\quad\\Rightarrow\\quad \\bar X_n \\overset{a}{\\sim} N\\!\\left(\\mu, \\frac{\\sigma^2}{n}\\right) = N\\!\\left(${t(mu)}, ${t(se * se)}\\right)`).tex(`\\operatorname{sd}(\\bar X_n) = \\frac{\\sigma}{\\sqrt n} = \\frac{${t(sd)}}{\\sqrt{${n}}} = ${t(se)}`);
    const R = new RV('normal', { mu, sigma: se });
    const pr = probRange(R, a, b, ctx);
    return info('CLT approximation', [head(`P(${isFinite(a) ? `${t(a)} \\le ` : ''}\\bar X_n${isFinite(b) ? ` \\le ${t(b)}` : ` \\ge ${t(a)}`}) \\approx ${t(pr)}`), { svg: EW.plot.density(R.d, R.params, { shade: [a, b] }) }], pr);
  }, 'P(a ≤ X̄ₙ ≤ b) by the CLT (use -Inf / Inf for one-sided)', IC);

  // ---------- estimators ----------
  const EC = 'Estimators';
  function modelKey(v) {
    const s = (asStr(v) || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const M = EW.derive && EW.derive.MODELS;
    if (!M) throw new MathError('Derivations are not loaded');
    const k = EW.derive.alias(s);
    if (!k) throw new MathError(`Unknown model "${asStr(v)}". Try: ${Object.values(M).map((m) => m.cli).join(', ')}`);
    return k;
  }
  function estimate(method) {
    return ([a, b], ctx, node) => {
      const d = asData(a, 'data', 2), key = modelKey(b), M = EW.derive.MODELS[key];
      const e = M[method];
      if (!e) throw new MathError(`${M.name}: no ${method.toUpperCase()} available`);
      const vals = e.est(d.vals);
      const g = group(ctx, `${method === 'mle' ? 'Maximum likelihood' : 'Method of moments'} for ${M.name.replace(/\$/g, '')}`);
      g.tex(e.result);
      for (const [k, v] of Object.entries(vals)) g.tex(`${M.paramTex[k] ? `\\hat ${M.paramTex[k]}` : k} = ${e.plug ? e.plug(d.vals, k) : ''}${t(v)}`);
      if (e.check) { const w = e.check(d.vals); if (w) ctx.notes.push(w); }
      const blocks = Object.entries(vals).map(([k, v]) => head(`\\hat ${M.paramTex[k] || k}_{${method === 'mle' ? '\\text{MLE}' : '\\text{MM}'}} = ${t(v)}`));
      blocks.push(txt('The Derive tab has the full derivation (likelihood, first-order condition, bias and consistency).'));
      const ks = Object.keys(vals);
      return info(`${method === 'mle' ? 'MLE' : 'Method-of-moments estimate'} — ${M.plain}`, blocks, ks.length === 1 ? vals[ks[0]] : new Data(ks.map((k) => vals[k])), { derive: { model: key, method }, parts: ks.length > 1 ? vals : undefined });
    };
  }
  def('mle', 'mle(x, model)', 2, 2, estimate('mle'), 'maximum likelihood estimate on data (models: normal, normal0, bernoulli, poisson, exponential, geometric, uniform0, uniform_t1, uniform…)', EC);
  def('mom', 'mom(x, model)', 2, 2, estimate('mom'), 'method-of-moments estimate on data', EC);
  def('mse', 'mse(bias, var)', 2, 2, ([b, v], ctx) => {
    const bias = asNum(b), vr = asNum(v), m = bias * bias + vr;
    group(ctx, 'Bias–variance decomposition').tex(`\\operatorname{MSE}(\\hat\\theta_n) = \\operatorname{Bias}(\\hat\\theta_n)^2 + \\operatorname{Var}(\\hat\\theta_n) = ${pt(bias)}^2 + ${t(vr)} = ${t(m)}`);
    return info('Mean squared error', [head(`\\operatorname{MSE} = ${t(m)}`)], m);
  }, 'MSE = Bias² + Var', EC);

  // ---------- regression ----------
  const RC = 'Regression';
  const Mx = {
    T: (A) => A[0].map((_, j) => A.map((r) => r[j])),
    mul: (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0))),
    inv(A) {
      const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
      for (let c = 0; c < n; c++) {
        let p = c;
        for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
        if (Math.abs(M[p][c]) < 1e-12) throw new MathError('XᵀX is singular — the regressors are perfectly collinear (or a regressor is constant)');
        [M[c], M[p]] = [M[p], M[c]];
        const d = M[c][c];
        M[c] = M[c].map((x) => x / d);
        for (let r = 0; r < n; r++) if (r !== c) { const k = M[r][c]; M[r] = M[r].map((x, j) => x - k * M[c][j]); }
      }
      return M.map((r) => r.slice(n).map(clean));
    },
  };
  EW.stats.Mx = Mx;
  def('ols reg lm', 'ols(y, x1, x2, …)', 2, 8, (args, ctx, node) => {
    const y = asData(args[0], 'y data', 3);
    const xs = args.slice(1).map((a, i) => { const d = asData(a, 'regressor data'); if (d.n !== y.n) throw new MathError(`${nm(node, i + 1, `x${i + 1}`)} has ${d.n} values but y has ${y.n}`); return d.vals; });
    const yn = nm(node, 0, 'y'), xn = args.slice(1).map((_, i) => nm(node, i + 1, `x${i + 1}`));
    const n = y.n, k = xs.length;
    if (n <= k + 1) throw new MathError(`Need more observations (${n}) than coefficients (${k + 1})`);
    const Xm = y.vals.map((_, i) => [1, ...xs.map((c) => c[i])]);
    let beta;
    if (k === 1) {
      const x = xs[0], mx = mean(x), my = mean(y.vals);
      const sxy = clean(ksum(x.map((v, i) => (v - mx) * (y.vals[i] - my)))), sxx = ss(x);
      if (sxx === 0) throw new MathError(`${xn[0]} doesn't vary, so its slope can't be estimated`);
      const b1 = sxy / sxx, b0 = my - b1 * mx;
      const g = group(ctx, 'Least-squares slope and intercept');
      g.tex(`${bar(xn[0])} = ${t(mx)},\\quad ${bar(yn)} = ${t(my)}`);
      if (n <= 8) g.tex(`\\sum (${vt(xn[0])}_i - ${bar(xn[0])})(${vt(yn)}_i - ${bar(yn)}) = ${x.map((v, i) => `(${t(clean(v - mx))})(${t(clean(y.vals[i] - my))})`).join(' + ')} = ${t(sxy)}`);
      g.tex(`\\hat\\beta_1 = \\frac{\\sum (${vt(xn[0])}_i - ${bar(xn[0])})(${vt(yn)}_i - ${bar(yn)})}{\\sum (${vt(xn[0])}_i - ${bar(xn[0])})^2} = \\frac{${t(sxy)}}{${t(sxx)}} = ${t(b1)}`);
      g.tex(`\\hat\\beta_0 = ${bar(yn)} - \\hat\\beta_1 ${bar(xn[0])} = ${t(my)} - ${pt(b1)}\\cdot ${pt(mx)} = ${t(b0)}`);
      beta = [b0, b1];
    } else {
      const XtX = Mx.mul(Mx.T(Xm), Xm), Xty = Mx.mul(Mx.T(Xm), y.vals.map((v) => [v]));
      const inv = Mx.inv(XtX);
      beta = Mx.mul(inv, Xty).map((r) => clean(r[0]));
      const g = group(ctx, 'Normal equations  XᵀX β̂ = Xᵀy');
      g.tex(`X = [\\mathbf 1\\ ${xn.map(vt).join('\\ ')}]\\ (${n}\\times ${k + 1}),\\quad X^{\\mathsf T}X = ${T.mat(XtX.map((r) => r.map(clean)))},\\quad X^{\\mathsf T}y = ${T.vec(Xty.map((r) => clean(r[0])))}`);
      g.tex(`\\hat\\beta = (X^{\\mathsf T}X)^{-1}X^{\\mathsf T}y = ${T.vec(beta)}`);
    }
    const fit = Xm.map((r) => r.reduce((s, x, j) => s + x * beta[j], 0));
    const res = y.vals.map((v, i) => clean(v - fit[i]));
    const my = mean(y.vals), SST = ss(y.vals), SSR = clean(ksum(res.map((e) => e * e)));
    const R2 = 1 - SSR / SST, adj = 1 - (1 - R2) * (n - 1) / (n - k - 1);
    const s2 = SSR / (n - k - 1);
    const XtXi = Mx.inv(Mx.mul(Mx.T(Xm), Xm));
    let V;
    if (st().robust) {
      const meat = Xm[0].map((_, a) => Xm[0].map((__, b) => ksum(Xm.map((r, i) => r[a] * r[b] * res[i] * res[i]))));
      V = Mx.mul(Mx.mul(XtXi, meat), XtXi).map((r) => r.map((x) => (x * n) / (n - k - 1)));
    } else V = XtXi.map((r) => r.map((x) => x * s2));
    const se = V.map((r, i) => Math.sqrt(r[i]));
    const df = n - k - 1;
    const tst = beta.map((b, i) => b / se[i]);
    const pv = tst.map((z) => 2 * (1 - D.REG.t.cdf(Math.abs(z), { df })));
    const g2 = group(ctx, 'Fit');
    g2.tex(`\\text{SSR} = \\sum \\hat u_i^2 = ${t(SSR)},\\quad \\text{SST} = \\sum (${vt(yn)}_i - ${bar(yn)})^2 = ${t(SST)},\\quad R^2 = 1 - \\frac{\\text{SSR}}{\\text{SST}} = ${t(R2)}`);
    g2.tex(`\\hat\\sigma_u^2 = \\frac{\\text{SSR}}{n - k - 1} = \\frac{${t(SSR)}}{${df}} = ${t(s2)}`);
    g2.tex(st().robust ? '\\widehat{\\operatorname{Var}}(\\hat\\beta) = (X^{\\mathsf T}X)^{-1}\\Big(\\sum \\hat u_i^2 x_i x_i^{\\mathsf T}\\Big)(X^{\\mathsf T}X)^{-1}\\cdot\\frac{n}{n-k-1}\\ \\text{(HC1 robust)}' : `\\widehat{\\operatorname{Var}}(\\hat\\beta) = \\hat\\sigma_u^2 (X^{\\mathsf T}X)^{-1}\\ \\text{(homoskedastic)}${k === 1 ? `,\\quad \\operatorname{SE}(\\hat\\beta_1) = \\sqrt{\\hat\\sigma_u^2 / \\sum (x_i - \\bar x)^2} = ${t(se[1])}` : ''}`);
    const g3 = group(ctx, 't statistics');
    beta.forEach((b, i) => { if (i) g3.tex(`t_{\\hat\\beta_{${i}}} = \\frac{\\hat\\beta_{${i}}}{\\operatorname{SE}(\\hat\\beta_{${i}})} = \\frac{${t(b)}}{${t(se[i])}} = ${t(tst[i])},\\quad p = ${t(pv[i])}\\ (t_{${df}})`); });
    const names = ['(intercept)', ...xn];
    const eq = `\\widehat{${vt(yn)}} = ${t(beta[0])}${beta.slice(1).map((b, i) => ` ${b < 0 ? '-' : '+'} ${t(Math.abs(b))}\\,${vt(xn[i])}`).join('')}`;
    const blocks = [head(eq), { table: { head: ['', 'β̂', 'SE', 't', 'p'], rows: beta.map((b, i) => [names[i], f(b), f(se[i]), f(tst[i]), f(pv[i])]) } }, txt(`n = ${n}, R² = ${f(R2)}, adjusted R² = ${f(adj)}${st().robust ? ' (robust SEs)' : ''}`)];
    if (k === 1) {
      blocks.push(txt(`Interpretation: a one-unit increase in ${xn[0]} is associated with a ${f(beta[1])} change in ${yn} on average. This is a correlation unless ${xn[0]} is as good as randomly assigned (no omitted variables).`));
      blocks.push({ svg: EW.plot.scatter(xs[0], y.vals, { line: (x) => beta[0] + beta[1] * x, resid: true, xlabel: xn[0], ylabel: yn }) });
    }
    const model = new Model({ beta, se, names, xn, yn, fit, res, R2, n, k });
    return info(`OLS regression of ${yn} on ${xn.join(', ')}`, blocks, model);
  }, 'least squares with SEs, t, p and R² (robust SEs in ⚙)', RC);
  const asModel = (v) => { v = X.unwrap(v); if (!(v instanceof Model)) throw new MathError('Expected a regression saved from ols(…), e.g. m = ols(y, x)'); return v; };
  def('predict', 'predict(m, x0, …)', 2, 8, ([a, ...xs], ctx) => {
    const m = asModel(a);
    if (xs.length !== m.k) throw new MathError(`This regression has ${m.k} regressor${m.k > 1 ? 's' : ''}`);
    const x0 = xs.map((v) => asNum(v));
    const yh = m.beta[0] + x0.reduce((s, x, i) => s + x * m.beta[i + 1], 0);
    group(ctx, 'Prediction').tex(`\\hat y = ${t(m.beta[0])}${x0.map((x, i) => ` + ${pt(m.beta[i + 1])}\\cdot ${pt(x)}`).join('')} = ${t(yh)}`);
    return info('Prediction', [head(`\\hat y = ${t(yh)}`)], yh);
  }, 'fitted value at new x', RC);
  def('resid residuals', 'resid(m)', 1, 1, ([a]) => new Data(asModel(a).res), 'residuals ûᵢ = yᵢ − ŷᵢ', RC);
  def('fitted', 'fitted(m)', 1, 1, ([a]) => new Data(asModel(a).fit.map(clean)), 'fitted values ŷᵢ', RC);
  def('coef', 'coef(m)', 1, 1, ([a]) => new Data(asModel(a).beta), 'coefficients β̂', RC);
})();
