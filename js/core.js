// Shared helpers: DOM builder, errors, number formatting, value types.
(function () {
  const EW = (window.EW = window.EW || {});

  class MathError extends Error {}
  EW.MathError = MathError;

  const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null && v !== false) e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids) if (k != null) e.append(k);
    return e;
  };
  EW.el = el;

  // ---------- settings shared by every module ----------
  // divisor: 'n-1' (s²) or 'n' (σ̂²) for SEs and CIs · zTable: use the PSET's Table 1 quantiles when they apply
  const settings = { divisor: 'n-1', zTable: true, dp: 4, alpha: 0.05, robust: false, seed: '', steps: true, mode: 'dec' };
  EW.settings = settings;

  // ---------- number formatting ----------
  // Recognize floats that are (to ~1e-11) a fraction with a small denominator, e.g. 0.171875 = 11/64.
  function asFraction(x, maxDen = 1000) {
    if (!isFinite(x) || Number.isInteger(x)) return null;
    const tol = 1e-11 * Math.max(1, Math.abs(x));
    let h0 = 0, h1 = 1, k0 = 1, k1 = 0, b = x;
    for (let i = 0; i < 30; i++) {
      const a = Math.floor(b);
      [h0, h1] = [h1, a * h1 + h0];
      [k0, k1] = [k1, a * k1 + k0];
      if (k1 > maxDen) return null;
      if (Math.abs(x - h1 / k1) < tol) return k1 === 1 ? null : [h1, k1];
      const f = b - a;
      if (f < 1e-15) return null;
      b = 1 / f;
    }
    return null;
  }
  // Decimal text: dp decimal places, trailing zeros trimmed; tiny/huge values in scientific form.
  function dec(x, dp = settings.dp) {
    if (typeof x !== 'number') return String(x);
    if (Number.isNaN(x)) return 'NaN';
    if (!isFinite(x)) return x > 0 ? '∞' : '−∞';
    if (Object.is(x, -0) || Math.abs(x) < 1e-14) return '0';
    if (Number.isInteger(x) && Math.abs(x) < 1e15) return String(x);
    const ax = Math.abs(x);
    if (ax < Math.pow(10, -dp) || ax >= 1e9) {
      let [m, e] = x.toExponential(Math.max(2, dp - 1)).split('e');
      m = m.replace(/0+$/, '').replace(/\.$/, '');
      return `${m}e${e.replace('+', '')}`;
    }
    // small numbers keep at least 4 significant digits (SE = 0.05747, not 0.0575)
    if (ax < 1) dp = Math.min(10, Math.max(dp, Math.ceil(-Math.log10(ax)) + 3));
    let s = x.toFixed(dp);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s === '-0' ? '0' : s;
  }
  function fmt(x, dp) {
    if (typeof x !== 'number') return String(x);
    if (settings.mode === 'frac') {
      const f = asFraction(x);
      if (f) return `${f[0]}/${f[1]}`;
    }
    return dec(x, dp);
  }
  function tex(x, dp) {
    if (typeof x !== 'number') return String(x);
    if (settings.mode === 'frac') {
      const f = asFraction(x);
      if (f) return `${f[0] < 0 ? '-' : ''}\\tfrac{${Math.abs(f[0])}}{${f[1]}}`;
    }
    const s = dec(x, dp);
    if (s === '∞') return '\\infty';
    if (s === '−∞') return '-\\infty';
    return s.includes('e') ? s.replace(/e(-?\d+)/, '\\times 10^{$1}') : s;
  }
  // Wrap a negative number in parentheses for "a − (−b)" style formulas
  const ptex = (x, dp) => (x < 0 ? `(${tex(x, dp)})` : tex(x, dp));
  EW.fmt = fmt;
  EW.tex = tex;
  EW.ptex = ptex;
  EW.dec = dec;
  EW.asFraction = asFraction;

  // ---------- value types ----------
  // A list of observations (or any list of numbers). freq = {values, counts} when it came from a frequency table.
  class Data {
    constructor(vals, freq = null) { this.vals = vals; this.freq = freq; }
    get n() { return this.vals.length; }
  }
  // A random variable / distribution: key into EW.dist.REG plus parameters, or a custom discrete pmf.
  class RV {
    constructor(key, params) { this.key = key; this.params = params; }
    get d() { return EW.dist.REG[this.key]; }
  }
  // A fitted regression
  class Model {
    constructor(o) { Object.assign(this, o); }
  }
  // A result card. blocks: [{tex} | {text} | {svg} | {table: {head, rows}}]; value: what the card stands for in later expressions.
  class Info {
    constructor(title, blocks = [], value = null, extra = {}) { this.title = title; this.blocks = blocks; this.value = value; Object.assign(this, extra); }
  }
  Object.assign(EW, { Data, RV, Model, Info });

  // ---------- small numeric helpers ----------
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  // Neumaier-compensated sum: keeps 0.1 + 0.2 + … sums clean enough for fraction detection
  function ksum(a) {
    let s = 0, c = 0;
    for (const x of a) {
      const t = s + x;
      c += Math.abs(s) >= Math.abs(x) ? (s - t) + x : (x - t) + s;
      s = t;
    }
    return s + c;
  }
  // Snap results within ~1e-12 of a short decimal (e.g. 2.2399999999 → 2.24)
  function clean(x) {
    if (!isFinite(x) || x === 0) return x;
    const r = Math.round(x * 1e10) / 1e10;
    return Math.abs(r - x) < 1e-12 * Math.max(1, Math.abs(x)) ? r : x;
  }
  EW.util = { sum, ksum, clean };

  // ---------- LaTeX helpers ----------
  const T = {
    mat(rows, f = tex) { return `\\begin{bmatrix}${rows.map((r) => r.map(f).join(' & ')).join('\\\\')}\\end{bmatrix}`; },
    vec(v, f = tex) { return T.mat(v.map((x) => [x]), f); },
    // (a, b, c, …) list, truncated for long data
    list(v, max = 12, f = tex) {
      if (v.length <= max) return `(${v.map(f).join(',\\ ')})`;
      return `(${v.slice(0, max - 2).map(f).join(',\\ ')},\\ \\ldots,\\ ${f(v[v.length - 1])})`;
    },
    text: (s) => `\\text{${String(s).replace(/([#$%&_{}])/g, '\\$1')}}`,
  };
  EW.T = T;
})();
