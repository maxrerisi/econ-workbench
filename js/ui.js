// Shared UI pieces: KaTeX rendering, distribution picker, proof tables.
(function () {
  const EW = window.EW;
  const el = EW.el;

  function tex(target, s, display = true) {
    if (window.katex) {
      try { window.katex.render(s, target, { displayMode: display, throwOnError: false, strict: 'ignore' }); return target; }
      catch (e) { /* fall through */ }
    }
    target.textContent = s;
    target.classList.add('fallback-tex');
    return target;
  }
  const texEl = (s, display = true, tag = 'div') => tex(el(tag), s, display);

  // <select> of distributions + one numeric input per parameter
  function distPicker(root, { keys, initial = 'normal', onChange, values = {} } = {}) {
    const REG = EW.dist.REG;
    keys = keys || Object.keys(REG).filter((k) => k !== 'discrete');
    const sel = el('select', { class: 'mini-select', 'aria-label': 'Distribution' }, ...keys.map((k) => el('option', { value: k }, REG[k].name)));
    sel.value = initial;
    const params = el('span', { class: 'dp-params' });
    const err = el('span', { class: 'grid-err' });
    const wrap = el('span', { class: 'dist-picker' }, sel, params, err);
    root.append(wrap);
    const inputs = {};
    function build() {
      params.innerHTML = '';
      const d = REG[sel.value];
      for (const p of d.params) {
        const inp = el('input', { type: 'text', inputmode: 'decimal', class: 'dp-in mono', value: values[sel.value + '.' + p.k] ?? p.def, 'aria-label': p.label, 'data-tip': p.label, spellcheck: 'false' });
        inp.addEventListener('input', () => { values[sel.value + '.' + p.k] = inp.value; onChange && onChange(); });
        inputs[p.k] = inp;
        params.append(el('label', { class: 'dp-lab' }, texEl(p.tex, false, 'span'), ' = ', inp));
      }
    }
    sel.addEventListener('change', () => { build(); onChange && onChange(); });
    build();
    return {
      el: wrap,
      // → { key, params } or throws with a readable message
      get() {
        const d = REG[sel.value];
        const p = {};
        for (const pr of d.params) {
          const s = inputs[pr.k].value.trim();
          let v;
          try { v = EW.expr.asNum(EW.expr.run(s, {}).value); } catch (e) { throw new EW.MathError(`${pr.label}: ${s ? `“${s}” is not a number` : 'missing'}`); }
          p[pr.k] = v;
        }
        EW.dist.checkParams(sel.value, p);
        return { key: sel.value, params: p, d };
      },
      set(key) { sel.value = key; build(); },
      err,
    };
  }

  // Derivation / proof as a two-column table: expression | rule
  function proofTable(lines, firstLabel) {
    const tb = el('table', { class: 'proof' });
    lines.forEach((l, i) => {
      const why = el('td', { class: 'why' });
      if (l.why) why.append(el('b', {}, l.why));
      else if (i === 0 && firstLabel) why.append(el('b', {}, firstLabel));
      if (l.whyTex) why.append(texEl(l.whyTex, false, 'span'));
      tb.append(el('tr', {}, el('td', { class: 'expr' }, texEl(l.tex, true)), why));
    });
    return tb;
  }

  const verdict = (cls, icon, msg) => el('div', { class: `verdict ${cls}` }, el('span', { class: 'icon' }, icon), el('span', {}, msg));

  EW.ui = { tex, texEl, distPicker, proofTable, verdict };
})();
