// UI wiring: workspace, data editor, command line, history, derive / distributions / simulate / practice tabs.
(function () {
  const EW = window.EW;
  const { Data, RV, Model, Info } = EW;
  const E = EW.expr;
  const el = EW.el;
  const { tex, texEl, proofTable, verdict, distPicker } = EW.ui;
  const settings = EW.settings;
  const $ = (id) => document.getElementById(id);
  const f = (x) => EW.fmt(x);

  // ---------- storage (session-scoped; every access guarded) ----------
  const store = {
    get(k, fallback, area = 'session') {
      try { const s = (area === 'local' ? localStorage : sessionStorage).getItem(k); return s ? JSON.parse(s) : fallback; }
      catch (e) { return fallback; }
    },
    set(k, v, area = 'session') {
      try { (area === 'local' ? localStorage : sessionStorage).setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ }
    },
  };

  // ---------- state ----------
  const ws = {};
  Object.assign(settings, store.get('ew-settings', {}, 'local'));
  const recall = store.get('ew-recall', []);
  let recallIdx = -1;

  function serVal(v) {
    if (typeof v === 'number') return { n: v };
    if (v instanceof Data) return { d: v.vals, fr: v.freq };
    if (v instanceof RV) return { rv: v.key, p: v.params };
    if (v instanceof Model) return { m: { ...v } };
    return null;
  }
  function deserVal(o) {
    if ('n' in o) return o.n;
    if (o.d) return new Data(o.d, o.fr || null);
    if (o.rv) return new RV(o.rv, o.p);
    if (o.m) return new Model(o.m);
    throw new Error('bad value');
  }
  function saveWs() {
    const out = {};
    for (const [k, v] of Object.entries(ws)) { const s = serVal(v); if (s) out[k] = s; }
    store.set('ew-ws', out);
  }
  (function loadWs() {
    for (const [k, v] of Object.entries(store.get('ew-ws', {}))) { try { ws[k] = deserVal(v); } catch (e) { /* skip */ } }
  })();
  const saveSettings = () => store.set('ew-settings', settings, 'local');

  // ---------- value display ----------
  function rvText(v) {
    if (v.key === 'discrete') return `dist([${v.params.values.map(f).join(' ')}], [${v.params.probs.map(f).join(' ')}])`;
    return `${v.d.ctor}(${v.d.params.map((p) => f(v.params[p.k])).join(', ')})`;
  }
  function valueText(v) {
    if (v instanceof Info) v = v.value;
    if (typeof v === 'number') return f(v);
    if (v instanceof Data) return v.freq ? `freq([${v.freq.values.join(' ')}], [${v.freq.counts.join(' ')}])` : `[${v.vals.map(f).join(' ')}]`;
    if (v instanceof RV) return rvText(v);
    if (v instanceof Model) return `ŷ = ${f(v.beta[0])}${v.beta.slice(1).map((b, i) => ` ${b < 0 ? '−' : '+'} ${f(Math.abs(b))}·${v.xn[i]}`).join('')}`;
    return '';
  }
  function badgeOf(v) {
    if (typeof v === 'number') return 'number';
    if (v instanceof Data) return v.interval ? 'interval' : v.freq ? `n = ${v.n} (table)` : `n = ${v.n}`;
    if (v instanceof RV) return v.key === 'discrete' ? 'pmf' : v.d.name;
    if (v instanceof Model) return 'regression';
    return '';
  }
  function dataTable(head, rows) {
    const tb = el('table', { class: 'data-table' }, el('tr', {}, ...head.map((h) => el('th', {}, h))));
    for (const r of rows) tb.append(el('tr', {}, ...r.map((c) => el('td', {}, String(c)))));
    return el('div', { class: 'table-wrap' }, tb);
  }
  function renderValue(v) {
    if (typeof v === 'number') return texEl(EW.tex(v), true);
    if (v instanceof Data) {
      if (v.freq) return dataTable(['value', ...v.freq.values.map(f)], [['count', ...v.freq.counts]]);
      return texEl(`${EW.T.list(v.vals, 14)}\\quad (n = ${v.n})`, true);
    }
    if (v instanceof RV) {
      const box = el('div');
      if (v.key === 'discrete') box.append(dataTable(['x', ...v.params.values.map(f)], [['p(x)', ...v.params.probs.map(f)]]));
      else box.append(texEl(`X \\sim ${v.d.tex(v.params)}`, true));
      const m = v.d.mean(v.params), s2 = v.d.var(v.params);
      box.append(texEl(`E[X] = ${EW.tex(m)},\\quad \\operatorname{Var}(X) = ${EW.tex(s2)}`, false));
      return box;
    }
    if (v instanceof Model) return texEl(valueText(v).replace('ŷ', '\\hat y').replace(/·/g, '\\,').replace(/−/g, '-'), true);
    return el('span');
  }

  let toastTimer;
  function toast(msg) {
    const tt = $('toast');
    tt.textContent = msg;
    tt.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => tt.classList.remove('show'), 1800);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied'); }
    catch (e) {
      const ta = el('textarea', {}); ta.value = text; document.body.append(ta); ta.select();
      try { document.execCommand('copy'); toast('Copied'); } catch (_) { toast('Copy failed'); }
      ta.remove();
    }
  }
  function suggestName(v) {
    const pool = typeof v === 'number' ? ['a', 'b', 'c', 'k', 'p', 'q'] : v instanceof Data ? ['x', 'y', 'z', 'w', 'v', 'u'] : v instanceof RV ? ['X', 'Y', 'Z', 'W'] : ['m', 'm2', 'm3'];
    for (const ch of pool) if (!(ch in ws)) return ch;
    for (let i = 1; ; i++) { const n = pool[0] + i; if (!(n in ws)) return n; }
  }

  // ---------- workspace ----------
  function setVar(name, v, quiet) {
    if (v instanceof Info) v = v.value;
    if (v == null) return;
    ws[name] = v;
    saveWs();
    renderWs();
    if (!quiet) toast(`Saved ${name}`);
  }
  function renderWs() {
    const list = $('wsList');
    list.innerHTML = '';
    const names = Object.keys(ws).filter((k) => k !== 'ans').sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'case', caseFirst: 'upper' }));
    $('wsCount').textContent = names.length ? `${names.length} saved` : '';
    if (!names.length) list.append(el('li', { class: 'ws-empty' }, 'Nothing saved yet. Press ', el('b', {}, 'Save'), ' in the data editor, or type ', el('code', {}, 'x = [1 2 3]'), ' below.'));
    for (const name of names) {
      const v = ws[name];
      const nameBtn = el('button', { type: 'button', class: 'ws-name', 'data-tip': 'Click to use this name in the command box', onclick: () => insertCmd(name) }, name, el('span', { class: 'ws-dims' }, badgeOf(v)));
      const actions = el('div', { class: 'ws-actions' });
      if (v instanceof Data) actions.append(el('button', { type: 'button', 'data-tip': 'Edit in the Data editor', 'aria-label': `Edit ${name}`, onclick: () => editInGrid(name, v) }, '✎'));
      actions.append(el('button', { type: 'button', 'data-tip': 'Copy as text', 'aria-label': `Copy ${name}`, onclick: () => copy(valueText(v)) }, '⧉'));
      actions.append(el('button', { type: 'button', 'data-tip': 'Delete', 'aria-label': `Delete ${name}`, onclick: () => { delete ws[name]; saveWs(); renderWs(); toast(`Deleted ${name}`); } }, '✕'));
      const prev = el('div', { class: 'ws-preview mono', onclick: () => insertCmd(name) }, valueText(v).slice(0, 90) + (valueText(v).length > 90 ? '…' : ''));
      list.append(el('li', { class: 'ws-item' }, nameBtn, actions, prev));
    }
  }

  // ---------- data editor & quick ops ----------
  const editor = new EW.DataEditor($('editor'), {
    onSave: (n, d, quiet) => setVar(n, d, quiet),
    onUse: (lit) => insertCmd(lit),
    onChange: () => renderQuickOps(),
    toast,
  });
  function editInGrid(name, v) {
    if (v.freq) { editor.mode = 'freq'; editor.freq = { name, values: v.freq.values.map(String), counts: v.freq.counts.map(String) }; }
    else { editor.mode = 'cols'; editor.cols = [{ name, vals: v.vals.map(String) }]; }
    editor.render([0, 0]);
    renderQuickOps();
    showTab('calc');
    editor.card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const UNARY = [
    ['summary', 'summary({x})'], ['mean', 'mean({x})'], ['s²', 'var({x})'], ['σ̂²', 'varp({x})'], ['sd', 'sd({x})'], ['SE', 'se({x})'], ['median', 'median({x})'], ['skew', 'skew({x})'],
    ['95% CI', 'ci({x})'], ['90% CI', 'ci({x}, 0.9)'], ['t-interval', 'tci({x})'], ['t-test μ = …', 'ttest({x}, |)'], ['histogram', 'hist({x})'],
    ['MLE…', 'mle({x}, |)'], ['MoM…', 'mom({x}, |)'],
  ];
  const BINARY = [['OLS {y} ~ {x}', 'ols({y}, {x})'], ['cor', 'cor({x}, {y})'], ['cov', 'cov({x}, {y})'], ['CI for μ₁ − μ₂', 'ci2({x}, {y})'], ['two-sample test', 'ttest2({x}, {y})']];
  // Plain-English tooltips for the quick-op buttons (keyed by the command's function name)
  const QO_TIPS = {
    summary: 'A quick overview: how many values, the average, the spread, the smallest and largest.',
    mean: 'The average: add up the values and divide by how many there are.',
    var: 'Sample variance s²: how spread out the values are (divides by n − 1).',
    varp: 'Plug-in variance σ̂²: the same idea but divides by n. Used in maximum likelihood.',
    sd: 'Standard deviation: how far a typical value is from the average (√s²).',
    se: 'Standard error: how much the average would change from sample to sample (s/√n).',
    median: 'The middle value once the data are sorted.',
    skew: 'Skewness: is the data lopsided? Positive means a long tail to the right.',
    ci: 'Confidence interval: a range of believable values for the true average.',
    tci: 'Confidence interval using the t distribution, which is safer for small samples.',
    ttest: 'Test whether the true average equals a number. You type the number next.',
    hist: 'A bar chart of how the values are spread out.',
    mle: 'Estimate a model\'s parameter by maximum likelihood. You choose the model next (e.g. poisson).',
    mom: 'Estimate a model\'s parameter by matching averages (method of moments). You choose the model next.',
    ols: 'Fit the best straight line predicting one column from the other.',
    cor: 'Correlation, from −1 to 1: how closely the two columns follow a straight line.',
    cov: 'Covariance: do the two columns tend to rise and fall together?',
    ci2: 'Confidence interval for the difference between the two averages.',
    ttest2: 'Test whether the two columns have the same true average.',
  };
  const qoTip = (src) => `${QO_TIPS[src.slice(0, src.indexOf('('))] || ''}\nRuns: ${src.replace('|', '…')}`.trim();
  let qoX = null, qoY = null;
  function renderQuickOps() {
    const names = editor.names();
    if (!names.includes(qoX)) qoX = names[0];
    if (!names.includes(qoY) || qoY === qoX) qoY = names.find((n) => n !== qoX) || null;
    const u = $('unaryOps');
    u.innerHTML = '';
    const selX = el('select', { class: 'mini-select', 'aria-label': 'Column for quick operations', onchange: (e) => { qoX = e.target.value; renderQuickOps(); } }, ...names.map((n) => el('option', { value: n }, n)));
    selX.value = qoX;
    u.append(el('span', { class: 'qo-label' }, 'On'), selX);
    const sub = (s) => s.replace(/\{x\}/g, qoX).replace(/\{y\}/g, qoY);
    for (const [l, tpl] of UNARY) u.append(el('button', { type: 'button', class: 'qo', 'data-tip': qoTip(sub(tpl)), onclick: () => quickOp(sub(tpl)) }, l));
    const bn = $('binaryOps');
    bn.hidden = !qoY;
    bn.innerHTML = '';
    if (qoY) {
      const selY = el('select', { class: 'mini-select', 'aria-label': 'Second column', onchange: (e) => { qoY = e.target.value; renderQuickOps(); } }, ...names.filter((n) => n !== qoX).map((n) => el('option', { value: n }, n)));
      selY.value = qoY;
      bn.append(el('span', { class: 'qo-label' }, `${qoX} &`), selY);
      for (const [l, tpl] of BINARY) bn.append(el('button', { type: 'button', class: 'qo', 'data-tip': qoTip(sub(tpl)), onclick: () => quickOp(sub(tpl)) }, sub(l)));
    }
  }
  function quickOp(src) {
    let overlay;
    try {
      for (const n of editor.names()) { const bad = E.validName(n); if (bad) throw new EW.MathError(`${n}: ${bad}`); }
      overlay = editor.getData();
    } catch (e) { addCard({ input: src, error: e.message }); return; }
    if (src.includes('|')) { // needs another argument: put it in the command line with the cursor there
      for (const [k, v] of Object.entries(overlay)) if (!(k in ws) || valueText(ws[k]) !== valueText(v)) setVar(k, v, true);
      insertTemplate(src, true);
      return;
    }
    const note = Object.keys(overlay).filter((k) => src.includes(k) && (!(k in ws) || valueText(ws[k]) !== valueText(overlay[k])));
    execute(src, { overlay, extraNote: note.length ? `Used the editor's ${note.join(' and ')} (not saved to the workspace).` : null });
  }

  // ---------- command line ----------
  const cmd = $('cmd');
  function insertCmd(text) {
    showTab('calc');
    const s = cmd.selectionStart ?? cmd.value.length, e = cmd.selectionEnd ?? cmd.value.length;
    const before = cmd.value.slice(0, s), after = cmd.value.slice(e);
    const pad = before && !/[\s(\[,]$/.test(before) ? ' ' : '';
    cmd.value = before + pad + text + after;
    const pos = (before + pad + text).length;
    cmd.focus();
    cmd.setSelectionRange(pos, pos);
    updatePreview();
  }
  function insertTemplate(tpl, replace) {
    showTab('calc');
    const i = tpl.indexOf('|');
    const text = tpl.replace('|', '');
    if (replace) { cmd.value = text; cmd.focus(); cmd.setSelectionRange(i, i); updatePreview(); return; }
    const s = cmd.selectionStart ?? cmd.value.length, e = cmd.selectionEnd ?? cmd.value.length;
    const sel = cmd.value.slice(s, e);
    const filled = sel ? text.slice(0, i) + sel + text.slice(i) : text;
    cmd.value = cmd.value.slice(0, s) + filled + cmd.value.slice(e);
    const pos = s + i + sel.length;
    cmd.focus();
    cmd.setSelectionRange(pos, pos);
    updatePreview();
  }
  const CHIPS = [
    ['mean', 'mean(|)'], ['var', 'var(|)'], ['sd', 'sd(|)'], ['se', 'se(|)'], ['ci', 'ci(|)'], ['tci', 'tci(|)'], ['propci', 'propci(|, )'], ['ztest', 'ztest(|, )'], ['ttest', 'ttest(|, )'], ['proptest', 'proptest(|, , )'],
    ['freq', 'freq([|], [])'], ['dist', 'dist([|], [])'], ['E', 'E(|)'], ['Var', 'Var(|)'], ['P', 'P(|, , )'], ['cdf', 'cdf(|, )'], ['quantile', 'quantile(|, )'],
    ['Normal', 'Normal(|, )'], ['Binom', 'Binom(|, )'], ['Pois', 'Pois(|)'], ['Unif', 'Unif(|, )'], ['Exp', 'Exp(|)'], ['pnorm', 'pnorm(|)'], ['qnorm', 'qnorm(|)'],
    ['clt', 'clt(|, , , , )'], ['bayes', 'bayes(|, , )'], ['choose', 'choose(|, )'], ['mle', 'mle(|, )'], ['mom', 'mom(|, )'], ['skew', 'skew(|)'], ['mse', 'mse(|, )'], ['ols', 'ols(|, )'], ['predict', 'predict(|, )'], ['sample', 'sample(|, )'],
  ];
  for (const [label, tpl] of CHIPS) {
    const fn = E.FUNCS[label];
    $('chips').append(el('button', { type: 'button', class: 'chip', 'data-tip': fn ? `${fn.doc}\n${fn.sig}` : label, onclick: () => insertTemplate(tpl) }, label));
  }
  const EXAMPLES = [
    ['ci(accts)', '95% confidence interval for the example data in the editor'], ['x = [2.1 3.4 1.9 5.2 4.4 3.0]', 'Save a list of numbers as x'],
    ['ttest(x, 3)', 'Test whether the true mean of x is 3 (save x first)'], ['X = Binom(10, 0.3)', 'Save a binomial: 10 tries, 30% success each'],
    ['P(X, <=, 2)', 'Chance of 2 or fewer successes (save X first)'], ['pnorm(1.96)', 'Area under the standard normal curve to the left of 1.96'],
    ['bayes(0.01, 0.9, 0.05)', 'Bayes\' rule: chance of being sick given a positive test'], ['clt(50, 10, 36, 52, Inf)', 'Central limit theorem: chance a sample mean exceeds 52'],
    ['mle(accts, poisson)', 'Maximum likelihood estimate for a Poisson model'], ['skew(accts)', 'How lopsided the example data are'],
    ['dist([0 1 2], [1/4 1/2 1/4])', 'A random variable from a list of values and probabilities'],
  ];
  for (const [ex, what] of EXAMPLES) $('examples').append(el('button', { type: 'button', class: 'chip', 'data-tip': what, onclick: () => { cmd.value = ex; run(); } }, ex));

  function envWithEditor() {
    let ov = {};
    try { ov = editor.getData(); } catch (e) { /* ignore */ }
    for (const k of Object.keys(ov)) if (k in ws || E.validName(k)) delete ov[k];
    return Object.assign(Object.create(null), ov, ws);
  }
  let previewTimer;
  function updatePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      const p = $('preview');
      const src = cmd.value.trim();
      p.className = 'preview';
      if (!src) { p.textContent = 'Enter to run · ↑/↓ recall · / focuses this box from anywhere · ? lists every function'; return; }
      if (/\b(sample|draw)\s*\(/.test(src)) { p.textContent = '→ press Enter to draw'; return; }
      try {
        const r = E.run(src, envWithEditor());
        let v = r.value;
        let desc;
        if (v instanceof Info) desc = typeof v.value === 'number' ? `${v.title}: ${f(v.value)}` : v.title;
        else desc = typeof v === 'number' ? `= ${f(v)}` : `${badgeOf(v)}`;
        p.textContent = r.assign ? `→ saves ${r.assign} (${badgeOf(v instanceof Info ? v.value : v)})` : `→ ${desc}`;
        p.classList.add('ok');
      } catch (e) {
        p.textContent = e.message;
        p.classList.add('err');
      }
    }, 140);
  }
  cmd.addEventListener('input', () => { recallIdx = -1; updatePreview(); });
  cmd.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); run(); }
    else if (e.key === 'ArrowUp' && recall.length) {
      e.preventDefault();
      recallIdx = Math.min(recall.length - 1, recallIdx + 1);
      cmd.value = recall[recall.length - 1 - recallIdx];
      updatePreview();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      recallIdx = Math.max(-1, recallIdx - 1);
      cmd.value = recallIdx < 0 ? '' : recall[recall.length - 1 - recallIdx];
      updatePreview();
    } else if (e.key === 'Escape') { cmd.value = ''; updatePreview(); }
  });
  $('runBtn').addEventListener('click', run);

  function run() {
    const src = cmd.value.trim();
    if (!src) return;
    if (recall[recall.length - 1] !== src) { recall.push(src); if (recall.length > 100) recall.shift(); store.set('ew-recall', recall); }
    recallIdx = -1;
    execute(src);
    cmd.value = '';
    updatePreview();
  }
  function execute(src, { overlay = null, extraNote = null } = {}) {
    let env, note = extraNote;
    if (overlay) env = Object.assign(Object.create(null), ws, overlay);
    else {
      env = envWithEditor();
      const used = Object.keys(env).filter((k) => !(k in ws) && new RegExp(`\\b${k}\\b`).test(src));
      if (used.length && !note) note = `Used the editor's ${used.join(' and ')} (not saved to the workspace).`;
    }
    let res;
    try { res = E.run(src, env); }
    catch (e) { addCard({ input: src, error: e.message, pos: e.pos }); return; }
    if (note) res.notes.unshift(note);
    if (res.assign && res.value != null) setVar(res.assign, res.value, true);
    const v = res.value instanceof Info ? res.value.value : res.value;
    if (v != null) { ws.ans = v; }
    addCard({ input: src, res, stepsOpen: settings.steps });
  }

  // ---------- history cards ----------
  const history = $('history');
  const cards = [];
  function addCard(rec) {
    rec.el = el('div', { class: 'card' + (rec.error ? ' error' : '') });
    renderCard(rec);
    history.prepend(rec.el);
    cards.unshift(rec);
    $('historyEmpty').hidden = true;
    if (cards.length > 60) cards.pop().el.remove();
  }
  function renderBlocks(body, blocks) {
    for (const blk of blocks) {
      const d = el('div', { class: 'info-block' });
      if (blk.tex) d.append(texEl(blk.tex, true));
      if (blk.text) d.append(el('div', { class: 'info-text' }, blk.text));
      if (blk.svg) { const g = el('div'); g.innerHTML = blk.svg; d.append(g); }
      if (blk.table) d.append(dataTable(blk.table.head, blk.table.rows));
      body.append(d);
    }
  }
  function renderSteps(c, steps, rec) {
    if (!steps || !steps.some((g) => g.items.length)) return;
    const total = steps.reduce((s, g) => s + g.items.length, 0);
    const det = el('details', { class: 'steps' }, el('summary', { 'data-tip': 'Every step from formula to answer, like a worked solution' }, `Show the working (${total} step${total === 1 ? '' : 's'})`));
    if (rec.stepsOpen) det.open = true;
    det.addEventListener('toggle', () => { rec.stepsOpen = det.open; });
    let num = 0;
    for (const g of steps) {
      if (!g.items.length) continue;
      const grp = el('div', { class: 'step-group' }, el('h4', {}, `${++num}. ${g.title}`));
      for (const it of g.items) {
        if (it.tex) grp.append(el('div', { class: 'step text' }, texEl(it.tex, true)));
        else grp.append(el('div', { class: 'step text note' }, it.text));
      }
      det.append(grp);
    }
    c.append(det);
  }
  function renderCard(rec) {
    const c = rec.el;
    c.innerHTML = '';
    const head = el('div', { class: 'card-head' });
    head.append(el('span', { class: 'card-input', 'data-tip': 'Click to edit and run again', onclick: () => { cmd.value = rec.input; showTab('calc'); cmd.focus(); updatePreview(); } }, rec.input));
    const actions = el('div', { class: 'card-actions' });
    const body = el('div', { class: 'card-body' });
    c.append(head, body);
    if (rec.error) {
      body.append(el('div', {}, rec.error));
      if (rec.pos != null) body.append(el('pre', { class: 'mono small', style: 'margin:6px 0 0;color:var(--muted)' }, rec.input + '\n' + ' '.repeat(rec.pos) + '^'));
      body.append(el('p', { class: 'small muted', style: 'margin:8px 0 0' }, 'Common fixes: put commas between inputs, put lists in square brackets [ ], and save a name before using it. ',
        el('button', { type: 'button', class: 'link-btn', onclick: () => EW.guide.open('commands') }, 'Help with commands')));
      actions.append(el('button', { type: 'button', 'data-tip': 'Remove this card', 'aria-label': 'Remove', onclick: () => removeCard(rec) }, '✕'));
      head.append(actions);
      return;
    }
    const { res } = rec;
    const v = res.value;
    const inner = v instanceof Info ? v.value : v;
    const b = badgeOf(inner);
    if (b) head.append(el('span', { class: 'badge' }, b));
    if (res.assign) head.append(el('span', { class: 'badge saved' }, `saved as ${res.assign}`));
    const term = EW.guide.termFor(rec.input);
    if (v instanceof Info) {
      body.append(el('div', { class: 'info-title' }, v.title));
      if (term) body.append(aboutBtn(term));
      renderBlocks(body, v.blocks);
      const extras = el('div', { class: 'parts' });
      if (v.parts) for (const [pn, pv] of Object.entries(v.parts)) extras.append(saveButton(pv, `Save ${pn}`, pn));
      if (v.derive) extras.append(el('button', { type: 'button', class: 'mini-btn', onclick: () => openDerivation(v.derive.model, v.derive.method) }, 'Full derivation →'));
      if (extras.childNodes.length) body.append(extras);
      if (inner != null && !res.assign) actions.append(saveButton(inner, 'Save as…'));
    } else {
      body.append(renderValue(v));
      if (term) body.append(aboutBtn(term));
      if (!res.assign) actions.append(saveButton(v, 'Save as…'));
      if (v instanceof Data) actions.append(el('button', { type: 'button', 'data-tip': 'Open in the Data editor to change the numbers', onclick: () => editInGrid(res.assign || suggestName(v), v) }, 'Edit'));
    }
    if (inner != null) actions.append(el('button', { type: 'button', 'data-tip': 'Copy the answer as text', onclick: () => copy(valueText(inner)) }, 'Copy'));
    actions.append(el('button', { type: 'button', 'data-tip': 'Remove this card', 'aria-label': 'Remove result', onclick: () => removeCard(rec) }, '✕'));
    head.append(actions);
    if (res.notes && res.notes.length) body.append(el('ul', { class: 'notes' }, ...res.notes.map((n) => el('li', {}, n))));
    renderSteps(c, res.steps, rec);
  }
  // "What is this?": hover for the one-line idea, click for the full explanation in the guide
  function aboutBtn(term) {
    return el('button', { type: 'button', class: 'g-about', 'data-tip': `${term.plain}\nClick for the formula and an example.`, onclick: () => EW.guide.openTerm(term.id) }, `ⓘ Explain: ${term.term}`);
  }
  function removeCard(rec) {
    rec.el.remove();
    if (!cards.includes(rec)) return;
    cards.splice(cards.indexOf(rec), 1);
    if (!cards.length) $('historyEmpty').hidden = false;
  }
  function saveButton(v, label, preset) {
    const btn = el('button', { type: 'button', class: 'mini-btn' }, label);
    btn.addEventListener('click', () => {
      const inp = el('input', { value: preset && !(preset in ws) && !E.validName(preset) ? preset : suggestName(v), 'aria-label': 'Variable name', spellcheck: 'false' });
      const form = el('span', { class: 'saveform' }, inp, el('button', { type: 'button', class: 'mini-btn', onclick: () => commit() }, 'Save'));
      const commit = () => {
        const name = inp.value.trim();
        const bad = E.validName(name);
        if (bad) { toast(bad); inp.focus(); return; }
        setVar(name, v);
        form.replaceWith(btn);
        btn.textContent = `✓ ${name}`;
      };
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') form.replaceWith(btn);
      });
      btn.replaceWith(form);
      inp.focus();
      inp.select();
    });
    return btn;
  }
  // A standalone result card (used by the distribution and practice tabs)
  function cardFor(src, env, open = true) {
    const rec = { input: src, stepsOpen: open };
    try { rec.res = E.run(src, env); } catch (e) { rec.error = e.message; }
    rec.el = el('div', { class: 'card' + (rec.error ? ' error' : '') });
    renderCard(rec);
    return rec;
  }
  function rerenderAll() {
    for (const rec of cards) renderCard(rec);
    renderWs();
    renderDerive();
    if (lastDist) runDist();
    if (lastProblem) { renderProblem(); if ($('prSolution').childNodes.length) showSolution(); }
  }

  // ---------- derive tab ----------
  const dvModel = $('dvModel');
  for (const m of Object.values(EW.derive.MODELS)) dvModel.append(el('option', { value: m.key }, m.plain + (m.pset ? `  (${m.pset})` : '')));
  dvModel.value = store.get('ew-dv-model', 'unift1');
  let dvMethod = store.get('ew-dv-method', 'mle');
  const dvBtns = $('dvMethod').querySelectorAll('button');
  function setMethod(m) { dvMethod = m; dvBtns.forEach((b) => b.classList.toggle('on', b.dataset.m === m)); store.set('ew-dv-method', m); renderDerive(); }
  dvBtns.forEach((b) => b.addEventListener('click', () => setMethod(b.dataset.m)));
  dvModel.addEventListener('change', () => { store.set('ew-dv-model', dvModel.value); renderDerive(); });
  function derivationPanel(key, method) {
    const M = EW.derive.MODELS[key], e = M[method];
    const panel = el('div', { class: 'panel' });
    panel.append(verdict('good', '✓', `${method === 'mle' ? 'Maximum likelihood' : 'Method of moments'} for X₁, …, Xₙ iid ${M.plain}${M.pset ? ` — ${M.pset}` : ''}`));
    panel.append(el('div', { class: 'subhead' }, 'Model'), texEl(M.density, true));
    for (const s of e.sections) {
      panel.append(el('div', { class: 'subhead' }, s.h));
      panel.append(proofTable(s.lines));
    }
    panel.append(el('div', { class: 'subhead' }, 'Result'), el('div', { class: 'result-box' }, texEl(e.result, true)));
    const chk = el('div');
    const btn = el('button', { type: 'button', class: 'mini-btn', onclick: () => {
      chk.innerHTML = '';
      const rows = EW.derive.numericCheck(key, method);
      chk.append(el('p', { class: 'small muted' }, `Simulated at the true values ${Object.entries(M.truth).map(([k, v]) => `${k.replace('sigma2', 'σ²').replace('theta', 'θ').replace('lambda', 'λ').replace('mu', 'μ')} = ${v}`).join(', ')}:`));
      chk.append(dataTable(['n', 'param', 'samples', 'mean of θ̂', 'bias', 'variance', 'MSE'], rows.map((r) => [r.n, r.param, r.reps, f(r.mean), f(r.bias), f(r.var), f(r.mse)])));
      const byP = {};
      for (const r of rows) (byP[r.param] = byP[r.param] || []).push(r.mse);
      const ok = Object.values(byP).every((ms) => ms[ms.length - 1] < ms[0]);
      chk.append(verdict(ok ? 'good' : 'warn', ok ? '✓' : '?', ok ? 'MSE falls as n grows — consistent with θ̂ₙ →p θ.' : 'MSE did not fall in this run; try again or set a seed.'));
    } }, 'Numeric check: simulate bias, variance & MSE');
    panel.append(el('div', { class: 'parts', style: 'margin-top:12px' }, btn, el('button', { type: 'button', class: 'mini-btn', onclick: () => { showTab('sim'); simUI.show('est'); } }, 'Sampling distribution in Simulate →')), chk);
    return panel;
  }
  function renderDerive() {
    const out = $('dvOut');
    out.innerHTML = '';
    out.append(derivationPanel(dvModel.value, dvMethod));
  }
  function openDerivation(key, method) {
    dvModel.value = key;
    store.set('ew-dv-model', key);
    setMethod(method);
    showTab('derive');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  const lib = $('proofLib');
  function showProof(id) {
    const p = EW.derive.PROOFS.find((q) => q.id === id);
    const out = $('proofOut');
    out.innerHTML = '';
    const panel = el('div', { class: 'panel' }, el('div', { class: 'info-title' }, p.title), el('p', { class: 'small muted', style: 'margin:0 0 8px' }, p.note), proofTable(p.lines, 'Start'));
    out.append(panel);
    return panel;
  }
  for (const p of EW.derive.PROOFS) {
    lib.append(el('li', {}, el('button', { type: 'button', onclick: () => { showProof(p.id).scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, el('code', {}, p.title), el('small', {}, p.note))));
  }

  // ---------- distributions tab ----------
  const dsPick = distPicker($('dsPick'), { initial: 'normal', onChange: () => buildDsArgs() });
  const dsArgs = $('dsArgs'), dsQuery = $('dsQuery');
  const dsVals = { a: '-1.96', b: '1.96', x: '1.645', p: '0.975' };
  function buildDsArgs() {
    dsArgs.innerHTML = '';
    const need = { between: ['a', 'b'], le: ['x'], ge: ['x'], q: ['p'] }[dsQuery.value];
    for (const k of need) {
      const inp = el('input', { type: 'text', class: 'dp-in mono', value: dsVals[k], 'aria-label': k, style: 'width:6em' });
      inp.addEventListener('input', () => { dsVals[k] = inp.value; });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') runDist(); });
      dsArgs.append(el('label', { class: 'dp-lab' }, `${k} = `, inp));
    }
  }
  dsQuery.addEventListener('change', buildDsArgs);
  buildDsArgs();
  let lastDist = false;
  function distSrc() {
    const D = dsPick.get();
    const ctor = `${D.d.ctor}(${D.d.params.map((p) => D.params[p.k]).join(', ')})`;
    return { D, ctor };
  }
  function runDist() {
    const out = $('dsOut');
    out.innerHTML = '';
    dsPick.err.textContent = '';
    let D, ctor;
    try { ({ D, ctor } = distSrc()); } catch (e) { dsPick.err.textContent = e.message; return; }
    lastDist = true;
    const q = dsQuery.value;
    const src = q === 'between' ? `P(${ctor}, ${dsVals.a}, ${dsVals.b})` : q === 'le' ? `P(${ctor}, <=, ${dsVals.x})` : q === 'ge' ? `P(${ctor}, >=, ${dsVals.x})` : `quantile(${ctor}, ${dsVals.p})`;
    const rec = cardFor(src, ws, true);
    out.append(rec.el);
    // moments & plots
    const m = D.d.mean(D.params), v = D.d.var(D.params), sk = D.d.skew(D.params);
    const mp = el('div', { class: 'card' }, el('div', { class: 'card-head' }, el('span', { class: 'card-input' }, ctor), el('span', { class: 'badge' }, D.d.discrete ? 'discrete' : 'continuous')));
    const body = el('div', { class: 'card-body' });
    body.append(texEl(`X \\sim ${D.d.tex(D.params)}:\\quad ${D.d.discrete ? 'p' : 'f'}(x) = ${D.d.pdfTex || ''}`, true));
    body.append(texEl(`E[X] = ${EW.tex(m)},\\quad \\operatorname{Var}(X) = ${EW.tex(v)},\\quad \\operatorname{sd}(X) = ${EW.tex(Math.sqrt(v))},\\quad \\operatorname{skew}(X) = ${isFinite(sk) ? EW.tex(sk) : '\\text{undefined}'}`, true));
    let shade = null;
    try {
      if (q === 'between') shade = [E.asNum(E.run(dsVals.a, ws).value), E.asNum(E.run(dsVals.b, ws).value)];
      else if (q === 'le') shade = [-Infinity, E.asNum(E.run(dsVals.x, ws).value)];
      else if (q === 'ge') shade = [E.asNum(E.run(dsVals.x, ws).value), Infinity];
      else { const qq = D.d.q(E.asNum(E.run(dsVals.p, ws).value), D.params); shade = [-Infinity, qq]; }
    } catch (e) { /* card shows the error */ }
    const pl = el('div', { class: 'sim-hists' });
    const a = el('div'), b = el('div');
    a.innerHTML = EW.plot.density(D.d, D.params, { shade, ycap: 8 });
    b.innerHTML = EW.plot.cdfPlot(D.d, D.params);
    pl.append(el('div', {}, el('div', { class: 'info-title' }, D.d.discrete ? 'pmf' : 'density'), a), el('div', {}, el('div', { class: 'info-title' }, 'cdf'), b));
    body.append(pl);
    mp.append(body);
    out.append(mp);
  }
  $('dsGo').addEventListener('click', runDist);
  $('dsSave').addEventListener('click', () => { try { const { D } = distSrc(); setVar('X', new RV(D.key, D.params)); } catch (e) { dsPick.err.textContent = e.message; } });
  (function zTable() {
    const box = $('zTable');
    box.append(el('p', { class: 'small muted' }, 'Table 1 of the problem set (the values ci, ztest and the other tests use):'));
    box.append(dataTable(['p', ...EW.dist.ZTABLE.map(([p]) => p)], [['Φ⁻¹(p)', ...EW.dist.ZTABLE.map(([, z]) => z.toFixed(3))]]));
    box.append(el('p', { class: 'small muted' }, 'Φ(z) = P(Z ≤ z): row gives z to one decimal, column the second decimal.'));
    const head = ['z', ...Array.from({ length: 10 }, (_, j) => `.0${j}`)];
    const rows = [];
    for (let i = 0; i <= 34; i++) rows.push([(i / 10).toFixed(1), ...Array.from({ length: 10 }, (_, j) => EW.sp.Phi(i / 10 + j / 100).toFixed(4))]);
    const tw = dataTable(head, rows);
    tw.classList.add('ztable');
    box.append(tw);
  })();

  // ---------- simulate tab ----------
  let simUI = null;
  function ensureSim() { if (!simUI) { simUI = EW.sim.build($('tab-sim')); EW.guide.decorate($('tab-sim')); } return simUI; }

  // ---------- practice ----------
  let lastProblem = null;
  const prType = $('prType');
  prType.append(el('option', { value: 'pset' }, 'PSET 6 topics'), el('option', { value: 'w13' }, 'Weeks 1–3 mix'), el('option', { value: 'w46' }, 'Weeks 4–6 mix'), el('option', { value: 'mix' }, 'Everything'));
  for (const [w, label] of Object.entries(EW.practice.WEEKS)) {
    const g = el('optgroup', { label });
    for (const [k, tp] of Object.entries(EW.practice.TYPES)) if (String(tp.week) === w) g.append(el('option', { value: k }, tp.label));
    prType.append(g);
  }
  prType.value = store.get('ew-pr-type', 'pset');
  prType.addEventListener('change', () => store.set('ew-pr-type', prType.value));
  function renderProblem() {
    const p = lastProblem;
    const box = $('prProblem');
    box.innerHTML = '';
    box.append(el('div', { class: 'tag' }, p.label), texEl(p.prompt, true));
    const ch = $('prChoices');
    ch.innerHTML = '';
    ch.hidden = !p.tf;
    if (p.tf) {
      for (const a of ['True', 'False', 'Uncertain']) {
        ch.append(el('button', { type: 'button', class: 'mini-btn', onclick: (e) => {
          ch.querySelectorAll('button').forEach((b) => b.classList.remove('on', 'right', 'wrong'));
          e.target.classList.add(a === p.tf.a ? 'right' : 'wrong');
          showSolution();
        } }, a));
      }
    }
  }
  function newProblem() {
    lastProblem = EW.practice.generate(prType.value);
    renderProblem();
    $('prActions').hidden = false;
    $('prLoad').hidden = !Object.keys(lastProblem.vars || {}).length;
    $('prHintOut').textContent = '';
    $('prSolution').innerHTML = '';
  }
  function showSolution() {
    const p = lastProblem;
    const out = $('prSolution');
    out.innerHTML = '';
    if (p.tf) out.append(el('div', { class: 'panel' }, verdict(p.tf.a === 'True' ? 'good' : p.tf.a === 'False' ? 'bad' : 'warn', p.tf.a === 'True' ? '✓' : p.tf.a === 'False' ? '✗' : '?', `${p.tf.a}. ${p.tf.why}`)));
    const env = Object.assign(Object.create(null), p.vars || {});
    for (const src of p.solve || []) out.append(cardFor(src, env, true).el);
    if (p.derive) out.append(derivationPanel(p.derive.model, p.derive.method));
    if (p.proof) {
      const pr = EW.derive.PROOFS.find((q) => q.id === p.proof);
      if (pr) out.append(el('div', { class: 'panel' }, el('div', { class: 'info-title' }, pr.title), el('p', { class: 'small muted', style: 'margin:0 0 8px' }, pr.note), proofTable(pr.lines, 'Start')));
    }
  }
  $('prNew').addEventListener('click', newProblem);
  $('prSolve').addEventListener('click', showSolution);
  $('prHint').addEventListener('click', () => { if (lastProblem) $('prHintOut').textContent = '💡 ' + lastProblem.hint; });
  $('prLoad').addEventListener('click', () => {
    if (!lastProblem) return;
    for (const [k, v] of Object.entries(lastProblem.vars)) setVar(k, v, true);
    toast(`Saved ${Object.keys(lastProblem.vars).join(', ')} to the workspace`);
  });

  // ---------- tabs ----------
  const TABS = ['calc', 'derive', 'dist', 'sim', 'practice'];
  function showTab(name) {
    if (!TABS.includes(name)) name = 'calc';
    document.querySelectorAll('.tab').forEach((tb) => { const on = tb.dataset.tab === name; tb.classList.toggle('on', on); tb.setAttribute('aria-selected', on); });
    for (const tb of TABS) $(`tab-${tb}`).hidden = name !== tb;
    if (name === 'sim') ensureSim();
    if (name === 'dist' && !lastDist) runDist();
    if (name === 'practice' && !lastProblem) newProblem();
    store.set('ew-tab', name);
  }
  document.querySelectorAll('.tab').forEach((tb) => tb.addEventListener('click', () => {
    showTab(tb.dataset.tab);
    if (tb.dataset.tab === 'calc') cmd.focus();
  }));

  // ---------- display mode / theme ----------
  function setMode(m) {
    settings.mode = m;
    document.querySelectorAll('.top-actions .seg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === m));
    saveSettings();
    rerenderAll();
  }
  document.querySelectorAll('.top-actions .seg button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  function applyTheme(th) { if (th) document.documentElement.dataset.theme = th; else delete document.documentElement.dataset.theme; }
  applyTheme(store.get('ew-theme', '', 'local'));
  $('themeBtn').addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const nxt = cur === 'dark' ? 'light' : 'dark';
    applyTheme(nxt);
    store.set('ew-theme', nxt, 'local');
  });

  // ---------- settings ----------
  const pop = $('settings');
  function syncSettingsUI() {
    $('setDiv').value = settings.divisor;
    $('setZ').checked = settings.zTable;
    $('setAlpha').value = settings.alpha;
    $('setDp').value = settings.dp;
    $('setRobust').checked = settings.robust;
    $('setSeed').value = settings.seed;
    $('setSteps').checked = settings.steps;
  }
  syncSettingsUI();
  const onSet = (id, key, parse) => $(id).addEventListener('change', (e) => { settings[key] = parse(e.target); saveSettings(); syncSettingsUI(); updatePreview(); if (key === 'dp') rerenderAll(); });
  onSet('setDiv', 'divisor', (t) => t.value);
  onSet('setZ', 'zTable', (t) => t.checked);
  onSet('setAlpha', 'alpha', (t) => { const v = parseFloat(t.value); return v > 0 && v < 1 ? v : 0.05; });
  onSet('setDp', 'dp', (t) => Math.max(2, Math.min(10, parseInt(t.value, 10) || 4)));
  onSet('setRobust', 'robust', (t) => t.checked);
  onSet('setSeed', 'seed', (t) => (/^\d+$/.test(t.value.trim()) ? t.value.trim() : ''));
  onSet('setSteps', 'steps', (t) => t.checked);
  const closePop = () => { pop.hidden = true; };
  $('settingsBtn').addEventListener('click', (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; });
  $('settingsDone').addEventListener('click', closePop);
  document.addEventListener('click', (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== $('settingsBtn')) closePop(); });

  // ---------- help ----------
  const HELP_ORDER = ['Data', 'Descriptive statistics', 'Confidence intervals & tests', 'Estimators', 'Distributions', 'Distribution functions', 'Probability', 'Regression', 'Lists & arithmetic'];
  const hb = $('helpBody');
  hb.append(el('p', { class: 'small muted' }, 'Every command, grouped by topic. New to this? ', el('button', { type: 'button', class: 'link-btn', id: 'refGuide' }, 'Open the guide'), ' instead.'));
  hb.append(el('h4', {}, 'Syntax'), el('table', {}, ...[
    ['x = [1 2 3]', 'save a list (spaces or commas); [1:10] is a range'],
    ['x(2)', 'the 2nd observation'],
    ['2*x + 1   x^2   log(x)', 'arithmetic works on whole lists'],
    ['X = Binom(10, 0.5)', 'save a distribution, then E(X), Var(X), P(X, 3, 5), cdf(X, 4)'],
    ['P(X, <, 3)  P(X, >=, 1.96)', 'one-sided probabilities'],
    ['ttest(x, 0, greater)', 'alternatives: two (default), greater, less (or >, <)'],
    ['mle(x, poisson)', 'models: normal, normal0, bernoulli, poisson, exponential, geometric, uniform0, uniform_t1, uniform'],
    ['ans', 'the previous result'],
  ].map(([a, b]) => el('tr', {}, el('td', {}, a), el('td', {}, b)))));
  const seen = new Set();
  for (const cat of HELP_ORDER) {
    const rows = Object.values(E.FUNCS).filter((fn) => fn.cat === cat && !seen.has(fn) && seen.add(fn));
    if (!rows.length) continue;
    hb.append(el('h4', {}, cat), el('table', {}, ...rows.map((fn) => el('tr', {}, el('td', {}, fn.sig), el('td', {}, fn.doc)))));
  }
  hb.append(el('h4', {}, 'Keyboard'), el('table', {}, ...[['/', 'focus the command line'], ['↑ ↓', 'recall previous commands'], ['?', 'this reference'], ['⌘/Ctrl + Enter', 'save the data editor']].map(([a, b]) => el('tr', {}, el('td', {}, a), el('td', {}, b)))));
  const openHelp = (on) => { $('help').hidden = !on; $('scrim').hidden = !on; };
  $('helpBtn').addEventListener('click', () => EW.guide.open());
  $('refGuide').addEventListener('click', () => { openHelp(false); EW.guide.open(); });
  $('emptyGuide').addEventListener('click', () => EW.guide.open());
  $('helpClose').addEventListener('click', () => openHelp(false));
  $('scrim').addEventListener('click', () => openHelp(false));

  // ---------- export / import ----------
  $('exportBtn').addEventListener('click', () => {
    const data = {};
    for (const [k, v] of Object.entries(ws)) if (k !== 'ans') { const s = serVal(v); if (s) data[k] = s; }
    const blob = new Blob([JSON.stringify({ econWorkbench: 1, vars: data }, null, 1)], { type: 'application/json' });
    const a = el('a', { href: URL.createObjectURL(blob), download: 'econ-workspace.json' });
    document.body.append(a); a.click(); a.remove();
  });
  $('importBtn').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      const vars = obj.vars || obj;
      let n = 0;
      for (const [k, v] of Object.entries(vars)) { if (!E.validName(k)) { try { ws[k] = deserVal(v); n++; } catch (_) { /* skip */ } } }
      saveWs(); renderWs();
      toast(`Imported ${n} variable${n === 1 ? '' : 's'}`);
    } catch (err) { toast('Could not read that file'); }
    e.target.value = '';
  });
  $('clearWsBtn').addEventListener('click', () => {
    const n = Object.keys(ws).filter((k) => k !== 'ans').length;
    if (!n || !confirm(`Delete all ${n} saved variables?`)) return;
    for (const k of Object.keys(ws)) delete ws[k];
    saveWs(); renderWs();
  });

  // ---------- global keys ----------
  document.addEventListener('keydown', (e) => {
    const tg = e.target;
    const typing = tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.tagName === 'SELECT';
    if (e.key === 'Escape') { closePop(); openHelp(false); }
    if (typing) return;
    if (e.key === '/') { e.preventDefault(); showTab('calc'); cmd.focus(); }
    else if (e.key === '?') { e.preventDefault(); openHelp(true); }
  });

  // ---------- init ----------
  document.querySelectorAll('.top-actions .seg button').forEach((b) => b.classList.toggle('on', b.dataset.mode === settings.mode));
  renderWs();
  renderQuickOps();
  renderDerive();
  updatePreview();
  showTab(store.get('ew-tab', 'calc'));
  EW.guide.init({
    run: (src) => { showTab('calc'); cmd.value = src; run(); history.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    tab: showTab,
    spotlight(id) {
      const t = $(id);
      if (!t) return;
      const box = t.closest('.panel') || t;
      box.scrollIntoView({ behavior: 'smooth', block: 'center' });
      box.classList.remove('spot'); void box.offsetWidth; box.classList.add('spot');
      setTimeout(() => box.classList.remove('spot'), 2600);
    },
    card: (src) => cardFor(src, Object.create(null), true).el,
    reference: () => openHelp(true),
    firstColumn: () => editor.names()[0],
  });
  if (/[?&]test\b/.test(location.search)) selfTest();
  else if (!store.get('ew-guide-seen', false, 'local')) { store.set('ew-guide-seen', true, 'local'); EW.guide.open(); }

  // ---------- self-test (?test) ----------
  function selfTest() {
    const saved = { ...settings };
    Object.assign(settings, { divisor: 'n-1', zTable: true, mode: 'dec', dp: 4 });
    const near = (a, b, tol = 1e-4) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
    const val = (src, env = {}) => { const v = E.run(src, env).value; return v instanceof Info ? v.value : v; };
    const q2 = 'freq([0 1 2 3 4], [10 30 120 70 20])';
    const cases = [
      [`mean(${q2})`, 2.24],
      [`var(${q2})`, 205.6 / 249],
      [`se(${q2})`, Math.sqrt(205.6 / 249 / 250)],
      [() => val(`ci(${q2})`).vals[0], 2.24 - 1.96 * Math.sqrt(205.6 / 249 / 250)],
      [() => val(`ci(${q2})`).vals[1], 2.24 + 1.96 * Math.sqrt(205.6 / 249 / 250)],
      ['qnorm(0.975)', 1.959964],
      ['pnorm(1.96)', 0.9750021],
      ['pt(2, 10)', 0.963306],
      ['qt(0.975, 10)', 2.228139],
      ['pchisq(3.84, 1)', 0.949996],
      ['pf(3, 2, 10)', 1 - 1.6 ** -5, 1e-9],
      ['pbinom(3, 10, 0.5)', 11 / 64, 1e-12],
      ['ppois(2, 3)', 0.4231901],
      ['E(dist([0 1 2], [1/4 1/2 1/4]))', 1, 1e-12],
      ['Var(dist([0 1 2], [1/4 1/2 1/4]))', 0.5, 1e-12],
      ['bayes(0.01, 0.9, 0.05)', 0.009 / 0.0585, 1e-12],
      ['P(Normal(100, 15), 85, 115)', 0.6826895],
      ['choose(10, 3)', 120, 0],
      ['5!', 120, 0],
      [() => val('ols([2 4 5 4 5], [1 2 3 4 5])').beta[1], 0.6, 1e-12],
      [() => val('ols([2 4 5 4 5], [1 2 3 4 5])').beta[0], 2.2, 1e-12],
      ['mle([0.2 -0.5 0.9 0.1], uniform_t1)', -0.5, 0],
      ['mom([0.2 -0.5 0.9 0.1], uniform_t1)', -0.65, 1e-12],
      ['mle([1 -1 2 -2], normal0)', 2.5, 1e-12],
      ['skew([1 2 3 10])', 45 / 12.5 ** 1.5, 1e-9],
      ['ztest(52, 50, 10, 100)', 2 * (1 - EW.sp.Phi(2)), 1e-9],
      ['mean([1:4])', 2.5, 0],
    ];
    let pass = 0;
    for (const [src, want, tol = 1e-4] of cases) {
      try {
        const got = typeof src === 'function' ? src() : val(src);
        if (near(got, want, tol) || got === want) pass++; else console.error('✗', String(src), 'got', got, 'want', want);
      } catch (e) { console.error('✗', String(src), e.message); }
    }
    // each derivation's estimator should be close to the truth on a big simulated sample
    let dpass = 0;
    const models = Object.values(EW.derive.MODELS);
    for (const M of models) {
      const g = EW.dist.makeRng(7);
      const v = Array.from({ length: 20000 }, () => M.sample(g, M.truth));
      const ok = ['mle', 'mom'].every((me) => Object.entries(M[me].est(v)).every(([k, x]) => Math.abs(x - M.truth[k]) < 0.05 * Math.max(1, Math.abs(M.truth[k]))));
      if (ok) dpass++; else console.error('✗ estimator', M.key);
    }
    Object.assign(settings, saved);
    const total = cases.length + models.length;
    console.log(`Self-test: ${pass + dpass}/${total} passed`);
    toast(`Self-test: ${pass + dpass}/${total} passed`);
    window.__selfTest = { pass: pass + dpass, total };
  }
})();
