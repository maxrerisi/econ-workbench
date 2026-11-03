// Simulate tab: LLN, CLT, confidence-interval coverage and sampling distributions of estimators.
(function () {
  const EW = window.EW;
  const el = EW.el;
  const { texEl, distPicker, verdict } = EW.ui;
  const { mean, varP, varS } = EW.stats;
  const f = (x) => EW.fmt(x);
  const rng = () => EW.dist.makeRng(EW.settings.seed === '' ? null : EW.settings.seed);
  const num = (inp, lo, hi, def) => { const v = parseFloat(inp.value); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : def; };

  function build(root) {
    const modes = [['lln', 'Law of large numbers'], ['clt', 'Central limit theorem'], ['ci', 'CI coverage'], ['est', 'Estimators']];
    const seg = el('div', { class: 'seg seg-wide', role: 'group', 'aria-label': 'Simulation' });
    const body = el('div');
    root.append(el('div', { class: 'panel' }, el('div', { class: 'panel-title' }, el('h3', {}, 'Simulations'), el('span', { class: 'hint' }, 'Draw many samples and watch the theorems happen. Set a seed in ⚙ to make runs repeatable.')), seg, body));
    const panels = {};
    for (const [k, label] of modes) {
      seg.append(el('button', { type: 'button', 'data-sim': k, onclick: () => show(k) }, label));
      panels[k] = el('div', { class: 'sim-panel', hidden: true });
      body.append(panels[k]);
    }
    let cur = null;
    function show(k) {
      cur = k;
      seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.sim === k));
      for (const [p, e] of Object.entries(panels)) e.hidden = p !== k;
      if (!panels[k].dataset.built) { BUILDERS[k](panels[k]); panels[k].dataset.built = '1'; }
    }
    show('clt');
    return { show };
  }

  const row = (...kids) => el('div', { class: 'sim-row' }, ...kids);
  const lab = (text, inp) => el('label', { class: 'sim-lab' }, text, inp);
  const numIn = (v, w = 6) => el('input', { type: 'number', class: 'dp-in mono', value: v, style: `width:${w}em` });

  const BUILDERS = {
    lln(p) {
      const dp = el('span');
      const nIn = numIn(2000), kIn = numIn(3, 4);
      const out = el('div');
      p.append(el('p', { class: 'small muted' }, 'Running sample mean X̄ₙ for several independent sequences. The WLLN says X̄ₙ →p μ: every path settles at the true mean.'));
      p.append(row(dp, lab('n up to ', nIn), lab('paths ', kIn), el('button', { type: 'button', class: 'primary', onclick: go }, 'Run')), out);
      const pick = distPicker(dp, { initial: 'exp', onChange: () => {} });
      function go() {
        out.innerHTML = '';
        let D;
        try { D = pick.get(); } catch (e) { out.append(verdict('bad', '⚠', e.message)); return; }
        const n = Math.round(num(nIn, 10, 100000, 2000)), k = Math.round(num(kIn, 1, 8, 3));
        const mu = D.d.mean(D.params);
        if (!isFinite(mu)) { out.append(verdict('warn', '!', `${D.d.name} with these parameters has no finite mean, so there is no law of large numbers to see — the paths keep jumping.`)); }
        const g = rng();
        const series = [], finals = [];
        for (let j = 0; j < k; j++) {
          let s = 0;
          const pts = [];
          const step = Math.max(1, Math.floor(n / 400));
          for (let i = 1; i <= n; i++) { s += D.d.sample(g, D.params); if (i % step === 0 || i < 50) pts.push([i, s / i]); }
          finals.push(s / n);
          series.push({ pts, cls: `pl-line s${j % 4}` });
        }
        const box = el('div');
        out.append(box);
        box.innerHTML = EW.plot.lines(series, { hline: isFinite(mu) ? mu : null, hlabel: isFinite(mu) ? `μ = ${f(mu)}` : '', xlabel: 'n', ylabel: 'X̄ₙ' });
        out.append(texEl(`\\mu = E[X] = ${EW.tex(mu)},\\quad \\bar X_{${n}} = ${finals.map((x) => EW.tex(x)).join(',\\ ')}`, true));
        if (isFinite(mu)) out.append(el('p', { class: 'small' }, `Typical distance from μ after n draws is σ/√n = ${f(Math.sqrt(D.d.var(D.params) / n))} — quadrupling n halves it.`));
      }
      go();
    },

    clt(p) {
      const dp = el('span');
      const nIn = numIn(30), rIn = numIn(5000);
      const std = el('input', { type: 'checkbox', checked: true });
      const out = el('div');
      p.append(el('p', { class: 'small muted' }, 'Histogram of the sample mean over many samples of size n. Even for skewed or discrete X, √n(X̄ₙ − μ)/σ looks like N(0, 1) once n is moderate.'));
      const presets = el('span', { class: 'chips', style: 'margin:0' }, ...[1, 2, 5, 10, 30, 100].map((k) => el('button', { type: 'button', class: 'chip', onclick: () => { nIn.value = k; go(); } }, `n = ${k}`)));
      p.append(row(dp, lab('n ', nIn), lab('samples ', rIn), el('label', { class: 'sim-lab' }, std, ' standardize'), el('button', { type: 'button', class: 'primary', onclick: go }, 'Run')), row(presets), out);
      const pick = distPicker(dp, { initial: 'exp' });
      function go() {
        out.innerHTML = '';
        let D;
        try { D = pick.get(); } catch (e) { out.append(verdict('bad', '⚠', e.message)); return; }
        const n = Math.round(num(nIn, 1, 5000, 30)), R = Math.round(num(rIn, 100, 50000, 5000));
        if (n * R > 5e6) { out.append(verdict('warn', '!', 'That is a lot of draws — reduce n or the number of samples.')); return; }
        const mu = D.d.mean(D.params), sd = Math.sqrt(D.d.var(D.params));
        if (!isFinite(mu) || !isFinite(sd)) { out.append(verdict('warn', '!', 'This distribution has no finite variance with these parameters, so the CLT does not apply.')); }
        const g = rng();
        const means = new Array(R);
        for (let r = 0; r < R; r++) { let s = 0; for (let i = 0; i < n; i++) s += D.d.sample(g, D.params); means[r] = s / n; }
        const z = std.checked && isFinite(sd) && sd > 0;
        const vals = z ? means.map((m) => (Math.sqrt(n) * (m - mu)) / sd) : means;
        const se = sd / Math.sqrt(n);
        const overlay = z ? EW.sp.phi : (x) => EW.sp.phi((x - mu) / se) / se;
        const xr = z ? [-4, 4] : [Math.min(...vals), Math.max(...vals)];
        const box = el('div');
        box.innerHTML = EW.plot.hist(vals.filter((v) => v >= xr[0] && v <= xr[1]), { overlay, xr, xlabel: z ? '√n (X̄ₙ − μ)/σ' : 'X̄ₙ', k: Math.min(60, Math.max(20, Math.round(Math.sqrt(R)))) });
        out.append(box);
        const m3 = mean(vals.map((v) => (v - mean(vals)) ** 3)) / varP(vals) ** 1.5;
        const tail = vals.filter((v) => Math.abs(z ? v : (v - mu) / se) > 1.96).length / R;
        out.append(texEl(`${z ? '\\sqrt n\\,\\frac{\\bar X_n - \\mu}{\\sigma}' : '\\bar X_n'} \\overset{a}{\\sim} ${z ? 'N(0,1)' : `N\\!\\left(${EW.tex(mu)},\\ \\frac{${EW.tex(sd * sd)}}{${n}}\\right)`}\\qquad \\text{simulated mean } ${EW.tex(mean(means))},\\ \\operatorname{sd}(\\bar X_n) = ${EW.tex(Math.sqrt(varP(means)))}\\ (\\text{theory } ${EW.tex(se)})`, true));
        out.append(el('p', { class: 'small' }, `Skewness of the simulated means: ${f(m3)} (the normal has 0; X itself has ${f(D.d.skew(D.params))}, and it shrinks like 1/√n). Share with |z| > 1.96: ${f(tail * 100)}% (normal: 5%).`));
      }
      go();
    },

    ci(p) {
      const dp = el('span');
      const nIn = numIn(50), kIn = numIn(1000), lvIn = numIn(0.95, 5);
      const out = el('div');
      p.append(el('p', { class: 'small muted' }, 'Draw k independent samples of size n, build the asymptotic interval X̄ₙ ± z·σ̂/√n from each, and count how many contain the true mean (PSET 6 Q6.3). The plot shows the first 100; misses are highlighted.'));
      p.append(row(dp, lab('n ', nIn), lab('intervals k ', kIn), lab('level ', lvIn), el('button', { type: 'button', class: 'primary', onclick: go }, 'Run')), out);
      const pick = distPicker(dp, { initial: 'bern' });
      function go() {
        out.innerHTML = '';
        let D;
        try { D = pick.get(); } catch (e) { out.append(verdict('bad', '⚠', e.message)); return; }
        const n = Math.round(num(nIn, 2, 10000, 50)), k = Math.round(num(kIn, 10, 20000, 1000)), lv = num(lvIn, 0.5, 0.999, 0.95);
        if (n * k > 5e6) { out.append(verdict('warn', '!', 'Too many draws — reduce n or k.')); return; }
        const mu = D.d.mean(D.params);
        const { z, table } = EW.dist.zq(1 - (1 - lv) / 2);
        const g = rng();
        const ivs = [];
        let cover = 0;
        for (let j = 0; j < k; j++) {
          const v = Array.from({ length: n }, () => D.d.sample(g, D.params));
          const m = mean(v), se = Math.sqrt((EW.settings.divisor === 'n' ? varP(v) : varS(v)) / n);
          const iv = { lo: m - z * se, hi: m + z * se };
          iv.cover = iv.lo <= mu && mu <= iv.hi;
          if (iv.cover) cover++;
          if (ivs.length < 100) ivs.push(iv);
        }
        const exp = k * lv, sd = Math.sqrt(k * lv * (1 - lv));
        const box = el('div');
        box.innerHTML = EW.plot.intervals(ivs, mu, { truthLabel: `μ = ${f(mu)}`, xlabel: 'interval endpoints' });
        out.append(box);
        out.append(verdict(Math.abs(cover - exp) <= 3 * sd ? 'good' : 'warn', '◎', `${cover} of ${k} intervals cover μ (${f((100 * cover) / k)}%). Expected ≈ ${f(exp)} ± ${f(sd)}, since the count is Bin(${k}, ${f(lv)}).`));
        out.append(el('p', { class: 'small' }, `z = ${table ? z.toFixed(3) + ' (Table 1)' : f(z)}. Coverage is only approximately ${f(lv * 100)}%: the interval is asymptotic. Try a small n with a skewed distribution (e.g. Bernoulli with p = 0.05, n = 20) to see it undercover. A 95% interval does not mean 900 of 1000 cover — that would be 90%.`));
      }
      go();
    },

    est(p) {
      const M = EW.derive.MODELS;
      const sel = el('select', { class: 'mini-select', 'aria-label': 'Model' }, ...Object.values(M).map((m) => el('option', { value: m.key }, m.plain)));
      sel.value = 'unift1';
      const meth = el('select', { class: 'mini-select' }, el('option', { value: 'both' }, 'MLE vs MoM'), el('option', { value: 'mle' }, 'MLE'), el('option', { value: 'mom' }, 'MoM'));
      const nIn = numIn(20), truth = el('span', { class: 'dp-params' });
      const out = el('div');
      p.append(el('p', { class: 'small muted' }, 'Sampling distribution of an estimator: draw many samples of size n, compute θ̂ₙ on each, and look at its bias, variance and MSE. Rerun with larger n to see consistency.'));
      p.append(row(sel, meth, truth, lab('n ', nIn), el('button', { type: 'button', class: 'primary', onclick: go }, 'Run')), out);
      const tin = {};
      function buildTruth() {
        truth.innerHTML = '';
        const m = M[sel.value];
        for (const [k, v] of Object.entries(m.truth)) {
          tin[k] = el('input', { type: 'text', class: 'dp-in mono', value: v, style: 'width:4.5em' });
          truth.append(el('label', { class: 'dp-lab' }, texEl(m.paramTex[k], false, 'span'), ' = ', tin[k]));
        }
      }
      sel.addEventListener('change', () => { buildTruth(); go(); });
      buildTruth();
      function go() {
        out.innerHTML = '';
        const m = M[sel.value];
        const tr = {};
        for (const k of Object.keys(m.truth)) tr[k] = parseFloat(tin[k].value);
        if (Object.values(tr).some((v) => !isFinite(v))) { out.append(verdict('bad', '⚠', 'True parameter values must be numbers')); return; }
        if ((sel.value === 'unift1' && tr.theta >= 1) || (sel.value === 'unif' && tr.b <= tr.a) || ((sel.value === 'bern' || sel.value === 'geom') && !(tr.p > 0 && tr.p < 1)) || (['normal0', 'normal'].includes(sel.value) && tr.sigma2 <= 0) || (['exp', 'pois'].includes(sel.value) && tr.lambda <= 0) || (sel.value === 'unif0' && tr.theta <= 0)) {
          out.append(verdict('bad', '⚠', 'Those parameter values are outside the parameter space')); return;
        }
        const n = Math.round(num(nIn, 2, 5000, 20));
        const methods = meth.value === 'both' ? ['mle', 'mom'] : [meth.value];
        const ns = [n, n * 10, n * 100].filter((x) => x <= 20000);
        const rows = [];
        let first = null;
        for (const me of methods) {
          const res = EW.derive.numericCheck(sel.value, me, { truth: tr, ns });
          for (const r of res) rows.push([me.toUpperCase(), r.param, r.n, f(r.truth), f(r.mean), f(r.bias), f(r.var), f(r.mse)]);
          if (!first) first = { me, res };
        }
        // histogram for the first n, first parameter, all methods overlaid side by side
        const g = rng();
        const pk = Object.keys(m.truth)[0];
        const draws = methods.map((me) => Array.from({ length: 3000 }, () => m[me].est(Array.from({ length: n }, () => m.sample(g, tr)))[pk]));
        const all = draws.flat();
        const xr = [Math.min(...all), Math.max(...all)];
        const grid = el('div', { class: 'sim-hists' });
        methods.forEach((me, i) => {
          const b = el('div');
          b.innerHTML = EW.plot.hist(draws[i], { xr, xlabel: `${me.toUpperCase()} of ${m.paramTex[pk].replace(/\\/g, '')}`, vlines: [[tr[pk], 'pl-truth', 'truth']] });
          grid.append(el('div', {}, el('div', { class: 'info-title' }, `${me === 'mle' ? 'Maximum likelihood' : 'Method of moments'} (n = ${n})`), texEl(m[me].result, false), b));
        });
        out.append(grid);
        const tb = el('table', { class: 'data-table' }, el('tr', {}, ...['method', 'param', 'n', 'true', 'mean of θ̂', 'bias', 'variance', 'MSE'].map((h) => el('th', {}, h))));
        for (const r of rows) tb.append(el('tr', {}, ...r.map((c) => el('td', {}, String(c)))));
        out.append(el('div', { class: 'table-wrap' }, tb));
        out.append(el('p', { class: 'small' }, 'MSE = bias² + variance. Consistency shows up as the MSE shrinking toward 0 as n grows by ×10.' + (sel.value === 'unift1' || sel.value === 'unif0' ? ' For the uniform, the MLE (an order statistic) has MSE shrinking like 1/n², much faster than the moment estimator’s 1/n — but it is biased (always on one side of θ).' : '')));
      }
      go();
    },
  };

  EW.sim = { build };
})();
