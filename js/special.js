// Special functions: log-gamma, regularized incomplete gamma/beta, erf, Φ and Φ⁻¹.
(function () {
  const EW = window.EW;

  // Lanczos approximation (g = 7, n = 9), |error| ~ 1e-15
  const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    let a = LG[0];
    const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }
  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return Math.exp(lgamma(n + 1));
    let r = 1;
    for (let k = 2; k <= n; k++) r *= k;
    return r;
  }
  // C(n, k) exactly for moderate n (product form keeps integers exact up to 2^53)
  function choose(n, k) {
    if (k < 0 || k > n) return 0;
    k = Math.min(k, n - k);
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return Math.round(r) === r || r > 1e15 ? r : Math.round(r);
  }

  // Regularized lower incomplete gamma P(a, x): series for x < a + 1, continued fraction otherwise
  function gammaP(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) {
      let ap = a, s = 1 / a, d = s;
      for (let n = 0; n < 500; n++) { ap += 1; d *= x / ap; s += d; if (Math.abs(d) < Math.abs(s) * 1e-16) break; }
      return s * Math.exp(-x + a * Math.log(x) - lgamma(a));
    }
    return 1 - gammaQcf(a, x);
  }
  function gammaQ(a, x) { return x <= 0 ? 1 : x < a + 1 ? 1 - gammaP(a, x) : gammaQcf(a, x); }
  function gammaQcf(a, x) {
    const FPMIN = 1e-300;
    let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }

  // Regularized incomplete beta I_x(a, b) via Lentz's continued fraction
  function betacf(a, b, x) {
    const FPMIN = 1e-300;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - (qab * x) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 500; m++) {
      const m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return h;
  }
  function betaI(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
  }

  // erf / erfc through the incomplete gamma function (keeps relative accuracy in the tails)
  const erf = (x) => (x >= 0 ? gammaP(0.5, x * x) : -gammaP(0.5, x * x));
  const erfc = (x) => (x >= 0 ? gammaQ(0.5, x * x) : 1 + gammaP(0.5, x * x));
  const Phi = (z) => 0.5 * erfc(-z / Math.SQRT2);
  const phi = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

  // Acklam's rational approximation for Φ⁻¹, polished with one Halley step
  const A = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const B = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const C = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const D = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  function PhiInv(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const lo = 0.02425;
    let x;
    if (p < lo) {
      const q = Math.sqrt(-2 * Math.log(p));
      x = (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
    } else if (p <= 1 - lo) {
      const q = p - 0.5, r = q * q;
      x = ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) / (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1);
    } else {
      const q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1);
    }
    const e = Phi(x) - p;
    const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
    return x - u / (1 + (x * u) / 2);
  }

  // Generic quantile by bisection on a monotone cdf over [lo, hi] (expanding the bracket as needed)
  function invert(cdf, p, lo = -1, hi = 1, discrete = false) {
    let it = 0;
    while (cdf(lo) > p && it++ < 200) lo = lo * 2 - 1;
    it = 0;
    while (cdf(hi) < p && it++ < 200) hi = hi * 2 + 1;
    if (discrete) {
      lo = Math.floor(lo); hi = Math.ceil(hi);
      while (hi - lo > 1) { const m = Math.floor((lo + hi) / 2); if (cdf(m) >= p - 1e-12) hi = m; else lo = m; }
      return cdf(lo) >= p - 1e-12 ? lo : hi;
    }
    for (let i = 0; i < 200; i++) {
      const m = (lo + hi) / 2;
      if (cdf(m) < p) lo = m; else hi = m;
      if (hi - lo < 1e-13 * Math.max(1, Math.abs(m))) break;
    }
    return (lo + hi) / 2;
  }

  EW.sp = { lgamma, factorial, choose, gammaP, gammaQ, betaI, erf, erfc, Phi, phi, PhiInv, invert };
})();
