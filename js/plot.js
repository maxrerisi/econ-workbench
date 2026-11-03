// Tiny SVG plotting helpers (styled by .pl-* classes in style.css so they follow the theme).
(function () {
  const EW = window.EW;
  const W = 520, H = 240, PAD = { l: 46, r: 14, t: 12, b: 34 };

  function niceTicks(a, b, n = 6) {
    if (!(b > a)) { b = a + 1; }
    const raw = (b - a) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9 * step; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return out;
  }
  const tk = (v) => { const s = EW.dec(v, 3); return s.length > 7 ? EW.dec(v, 1) : s; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // A coordinate frame with axes; returns scale functions and an svg string builder
  function frame(xr, yr, o = {}) {
    const w = o.w || W, h = o.h || H;
    const [x0, x1] = xr, [y0, y1] = yr;
    const sx = (x) => PAD.l + ((x - x0) / (x1 - x0 || 1)) * (w - PAD.l - PAD.r);
    const sy = (y) => h - PAD.b - ((y - y0) / (y1 - y0 || 1)) * (h - PAD.t - PAD.b);
    const parts = [];
    const xt = o.xticks || niceTicks(x0, x1, o.nx || 7), yt = niceTicks(y0, y1, 5);
    for (const v of yt) parts.push(`<line class="pl-grid" x1="${PAD.l}" x2="${w - PAD.r}" y1="${sy(v)}" y2="${sy(v)}"/><text class="pl-tick" x="${PAD.l - 6}" y="${sy(v) + 4}" text-anchor="end">${tk(v)}</text>`);
    for (const v of xt) parts.push(`<line class="pl-axis" x1="${sx(v)}" x2="${sx(v)}" y1="${h - PAD.b}" y2="${h - PAD.b + 4}"/><text class="pl-tick" x="${sx(v)}" y="${h - PAD.b + 16}" text-anchor="middle">${o.xfmt ? o.xfmt(v) : tk(v)}</text>`);
    parts.push(`<line class="pl-axis" x1="${PAD.l}" x2="${w - PAD.r}" y1="${h - PAD.b}" y2="${h - PAD.b}"/>`);
    if (o.xlabel) parts.push(`<text class="pl-label" x="${(PAD.l + w - PAD.r) / 2}" y="${h - 4}" text-anchor="middle">${esc(o.xlabel)}</text>`);
    if (o.ylabel) parts.push(`<text class="pl-label" x="12" y="${(PAD.t + h - PAD.b) / 2}" text-anchor="middle" transform="rotate(-90 12 ${(PAD.t + h - PAD.b) / 2})">${esc(o.ylabel)}</text>`);
    return {
      sx, sy, w, h, parts,
      add(s) { parts.push(s); return this; },
      path(pts, cls = 'pl-line') {
        const d = pts.filter(([x, y]) => isFinite(x) && isFinite(y)).map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`).join('');
        if (d) parts.push(`<path class="${cls}" d="${d}"/>`);
        return this;
      },
      hline(y, cls = 'pl-ref', label) {
        parts.push(`<line class="${cls}" x1="${PAD.l}" x2="${w - PAD.r}" y1="${sy(y)}" y2="${sy(y)}"/>`);
        if (label) parts.push(`<text class="pl-note" x="${w - PAD.r - 4}" y="${sy(y) - 4}" text-anchor="end">${esc(label)}</text>`);
        return this;
      },
      vline(x, cls = 'pl-ref', label) {
        parts.push(`<line class="${cls}" x1="${sx(x)}" x2="${sx(x)}" y1="${PAD.t}" y2="${h - PAD.b}"/>`);
        if (label) parts.push(`<text class="pl-note" x="${sx(x) + 4}" y="${PAD.t + 10}">${esc(label)}</text>`);
        return this;
      },
      svg(title = '') {
        return `<svg class="vplot pl" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
      },
    };
  }

  function bins(vals, k) {
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const ints = vals.every(Number.isInteger) && hi - lo <= 40;
    if (ints) { lo -= 0.5; hi += 0.5; k = hi - lo; }
    else {
      if (hi === lo) { lo -= 0.5; hi += 0.5; }
      k = k || Math.max(5, Math.min(40, Math.ceil(Math.sqrt(vals.length) * 1.3)));
    }
    const wd = (hi - lo) / k;
    const counts = Array(k).fill(0);
    for (const v of vals) counts[Math.min(k - 1, Math.floor((v - lo) / wd))]++;
    return { lo, hi, wd, counts, ints };
  }

  // Histogram (density scale when overlaying a pdf)
  function hist(vals, o = {}) {
    if (!vals.length) return '';
    const b = bins(vals, o.k);
    const n = vals.length;
    const dens = !!o.overlay;
    const ys = b.counts.map((c) => (dens ? c / (n * b.wd) : c));
    let xr = o.xr || [b.lo, b.hi];
    let ymax = Math.max(...ys);
    let curve = null;
    if (o.overlay) {
      curve = Array.from({ length: 161 }, (_, i) => { const x = xr[0] + ((xr[1] - xr[0]) * i) / 160; return [x, o.overlay(x)]; });
      ymax = Math.max(ymax, ...curve.map((p) => p[1]).filter(isFinite));
    }
    const f = frame(xr, [0, ymax * 1.08 || 1], { xlabel: o.xlabel, ylabel: o.ylabel || (dens ? 'density' : 'count'), xticks: b.ints && b.counts.length <= 16 ? b.counts.map((_, i) => b.lo + 0.5 + i) : null });
    b.counts.forEach((c, i) => {
      const x = b.lo + i * b.wd;
      const y = ys[i];
      f.add(`<rect class="pl-bar" x="${f.sx(x) + 0.5}" y="${f.sy(y)}" width="${Math.max(0.5, f.sx(x + b.wd) - f.sx(x) - 1)}" height="${f.sy(0) - f.sy(y)}"/>`);
    });
    if (curve) f.path(curve, 'pl-line2');
    for (const [x, cls, lab] of o.vlines || []) f.vline(x, cls, lab);
    return f.svg(o.title || 'Histogram');
  }

  // pdf (continuous) or pmf (discrete) with an optional shaded region [a, b]
  function density(d, p, o = {}) {
    if (d.discrete) {
      const [lo, hi] = d.support(p);
      const xs = d.key === 'discrete' ? [...new Set(p.values)].sort((a, b) => a - b) : Array.from({ length: Math.min(hi - lo + 1, 80) }, (_, i) => lo + i);
      const ys = xs.map((x) => d.pdf(x, p));
      const f = frame([xs[0] - 0.7, xs[xs.length - 1] + 0.7], [0, Math.max(...ys) * 1.1 || 1], { xlabel: 'x', ylabel: 'P(X = x)', xticks: xs.length <= 16 ? xs : null });
      xs.forEach((x, i) => {
        const on = o.shade && x >= o.shade[0] - 1e-9 && x <= o.shade[1] + 1e-9;
        const bw = Math.min(26, (f.sx(1) - f.sx(0)) * 0.6);
        f.add(`<rect class="${on ? 'pl-bar on' : 'pl-bar'}" x="${f.sx(x) - bw / 2}" y="${f.sy(ys[i])}" width="${bw}" height="${f.sy(0) - f.sy(ys[i])}"/>`);
      });
      return f.svg(o.title || 'pmf');
    }
    const [x0, x1] = o.xr || d.range(p);
    const N = 240;
    const pts = Array.from({ length: N + 1 }, (_, i) => { const x = x0 + ((x1 - x0) * i) / N; return [x, d.pdf(x, p)]; });
    const ymax = Math.min(Math.max(...pts.map((q) => q[1]).filter(isFinite)), o.ycap || Infinity);
    const f = frame([x0, x1], [0, ymax * 1.1 || 1], { xlabel: 'x', ylabel: 'f(x)' });
    if (o.shade) {
      const a = Math.max(x0, o.shade[0]), b = Math.min(x1, o.shade[1]);
      if (b > a) {
        const sp = Array.from({ length: 121 }, (_, i) => { const x = a + ((b - a) * i) / 120; return [x, Math.min(d.pdf(x, p), ymax * 1.1)]; });
        f.add(`<path class="pl-shade" d="M${f.sx(a)},${f.sy(0)}${sp.map(([x, y]) => `L${f.sx(x).toFixed(1)},${f.sy(y).toFixed(1)}`).join('')}L${f.sx(b)},${f.sy(0)}Z"/>`);
      }
    }
    f.path(pts.map(([x, y]) => [x, Math.min(y, ymax * 1.1)]));
    for (const [x, cls, lab] of o.vlines || []) f.vline(x, cls, lab);
    return f.svg(o.title || 'pdf');
  }

  function cdfPlot(d, p) {
    let x0, x1;
    if (d.discrete) { const [lo, hi] = d.support(p); x0 = lo - 1; x1 = hi + 1; } else [x0, x1] = d.range(p);
    const N = 300;
    const pts = Array.from({ length: N + 1 }, (_, i) => { const x = x0 + ((x1 - x0) * i) / N; return [x, d.cdf(x, p)]; });
    return frame([x0, x1], [0, 1.05], { xlabel: 'x', ylabel: 'F(x)' }).path(pts).svg('cdf');
  }

  function scatter(xs, ys, o = {}) {
    let [x0, x1] = [Math.min(...xs), Math.max(...xs)], [y0, y1] = [Math.min(...ys), Math.max(...ys)];
    const px = (x1 - x0) * 0.08 || 1, py = (y1 - y0) * 0.12 || 1;
    x0 -= px; x1 += px; y0 -= py; y1 += py;
    const f = frame([x0, x1], [y0, y1], { xlabel: o.xlabel, ylabel: o.ylabel });
    if (o.line) f.path([[x0, o.line(x0)], [x1, o.line(x1)]], 'pl-line2');
    if (o.resid && o.line) xs.forEach((x, i) => f.add(`<line class="pl-resid" x1="${f.sx(x)}" x2="${f.sx(x)}" y1="${f.sy(ys[i])}" y2="${f.sy(o.line(x))}"/>`));
    xs.forEach((x, i) => f.add(`<circle class="pl-pt" cx="${f.sx(x)}" cy="${f.sy(ys[i])}" r="3.6"/>`));
    return f.svg(o.title || 'Scatter plot');
  }

  function lines(series, o = {}) {
    const all = series.flatMap((s) => s.pts);
    const xr = o.xr || [Math.min(...all.map((p) => p[0])), Math.max(...all.map((p) => p[0]))];
    let ys = all.map((p) => p[1]).filter(isFinite);
    if (o.hline != null) ys.push(o.hline);
    let [y0, y1] = o.yr || [Math.min(...ys), Math.max(...ys)];
    const py = (y1 - y0) * 0.08 || 1;
    if (!o.yr) { y0 -= py; y1 += py; }
    const f = frame(xr, [y0, y1], { xlabel: o.xlabel, ylabel: o.ylabel, xfmt: o.xfmt, xticks: o.xticks });
    if (o.hline != null) f.hline(o.hline, 'pl-ref', o.hlabel);
    series.forEach((s) => f.path(s.pts, s.cls || 'pl-line'));
    return f.svg(o.title || 'Line plot');
  }

  // Confidence intervals stacked vertically, misses highlighted, truth as a vertical line
  function intervals(ivs, truth, o = {}) {
    const k = ivs.length;
    const lo = Math.min(truth, ...ivs.map((v) => v.lo)), hi = Math.max(truth, ...ivs.map((v) => v.hi));
    const pad = (hi - lo) * 0.05;
    const h = Math.max(200, Math.min(520, 40 + k * 4.2));
    const f = frame([lo - pad, hi + pad], [0, k + 1], { h, xlabel: o.xlabel || 'interval' });
    f.parts.splice(0, f.parts.length, ...f.parts.filter((s) => !s.includes('pl-grid')));
    ivs.forEach((v, i) => {
      const y = f.sy(i + 1);
      f.add(`<line class="${v.cover ? 'pl-iv' : 'pl-iv miss'}" x1="${f.sx(v.lo)}" x2="${f.sx(v.hi)}" y1="${y}" y2="${y}"/>`);
    });
    f.vline(truth, 'pl-truth', o.truthLabel || 'true value');
    return f.svg(o.title || 'Confidence intervals');
  }

  EW.plot = { frame, hist, density, cdfPlot, scatter, lines, intervals, niceTicks, bins };
})();
