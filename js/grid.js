// Spreadsheet-style data editor: named columns, or a frequency table (value | count).
(function () {
  const EW = window.EW;
  const el = EW.el;
  const MAXR = 500, MAXC = 8;

  const EXAMPLES = {
    pset: { label: 'PSET 6 Q2: social media accounts', mode: 'freq', name: 'accts', values: [0, 1, 2, 3, 4], counts: [10, 30, 120, 70, 20] },
    wage: { label: 'Wages & schooling', mode: 'cols', cols: [['educ', [12, 16, 12, 14, 18, 16, 12, 20, 14, 16, 11, 13]], ['wage', [15.5, 28, 18.2, 22, 35.5, 25, 14, 41, 20.5, 30, 12.8, 19]], ['exper', [10, 5, 20, 8, 3, 12, 25, 2, 15, 7, 30, 18]]] },
    coin: { label: 'Coin flips (0/1)', mode: 'cols', cols: [['flip', [1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1]]] },
    unif: { label: 'Sample from U(θ, 1) (PSET Q5)', mode: 'cols', cols: [['u', [0.12, -0.41, 0.77, -0.08, 0.55, 0.31, -0.29, 0.93]]] },
    twogroups: { label: 'Two groups (treatment vs control)', mode: 'cols', cols: [['treat', [23, 27, 31, 25, 29, 33, 26, 30]], ['control', [21, 24, 22, 26, 20, 23, 25, 22]]] },
  };

  const numOf = (s) => {
    s = String(s).trim().replace(/[−–]/g, '-');
    if (s === '') return null;
    const v = Number(s);
    if (isFinite(v)) return v;
    try { return EW.expr.asNum(EW.expr.run(s, {}).value); } catch (e) { return NaN; }
  };

  class DataEditor {
    constructor(root, opts) {
      this.root = root;
      this.opts = opts;
      this.mode = 'freq';
      this.cols = [{ name: 'x', vals: Array(6).fill('') }, { name: 'y', vals: Array(6).fill('') }];
      this.freq = { name: 'x', values: ['', '', ''], counts: ['', '', ''] };
      this.build();
      this.loadExample('pset', true);
    }

    build() {
      this.segBtns = ['cols', 'freq'].map((m) => el('button', { type: 'button', 'data-m': m, 'data-tip': m === 'cols' ? 'Each column is a list of numbers, one observation per row' : 'Each row is a value and how many times it occurred, e.g. 30 people have 1 account', onclick: () => this.setMode(m) }, m === 'cols' ? 'Columns' : 'Frequency table'));
      const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Data layout' }, ...this.segBtns);
      const ex = el('select', { class: 'mini-select', 'aria-label': 'Load example data', 'data-tip': 'Load some sample data to play with, or clear the table', onchange: (e) => { if (e.target.value) this.loadExample(e.target.value); e.target.value = ''; } },
        el('option', { value: '' }, 'Examples…'), ...Object.entries(EXAMPLES).map(([k, v]) => el('option', { value: k }, v.label)), el('option', { value: 'clear' }, 'Clear'));
      const step = (label, fn, title) => el('button', { type: 'button', class: 'stepper', 'data-tip': title, 'aria-label': title, onclick: fn, tabindex: -1 }, label);
      this.rowsLab = el('span', { class: 'dims' });
      this.colCtl = el('span', { class: 'dims' }, step('−', () => this.resizeCols(-1), 'Remove column'), el('span', {}, ' columns '), step('+', () => this.resizeCols(1), 'Add column'));
      const rowCtl = el('span', { class: 'dims' }, step('−', () => this.resizeRows(-1), 'Remove row'), this.rowsLab, step('+', () => this.resizeRows(1), 'Add row'));
      const head = el('div', { class: 'grid-head' }, seg, rowCtl, this.colCtl, ex);
      this.table = el('table', { class: 'dgrid' });
      this.scroll = el('div', { class: 'dgrid-scroll' }, this.table);
      this.saveBtn = el('button', { type: 'button', class: 'primary', 'data-tip': 'Save under the column name so commands can use it, e.g. mean(x)', onclick: () => this.save() });
      this.useBtn = el('button', { type: 'button', class: 'mini-btn', 'data-tip': 'Put the numbers themselves into the command box, without saving them', onclick: () => this.insertLiteral() }, 'Insert as literal');
      this.err = el('span', { class: 'grid-err' });
      this.card = el('div', { class: 'grid-card' }, head, this.scroll, el('div', { class: 'grid-foot' }, this.saveBtn, this.useBtn, this.err));
      this.root.append(this.card);
    }

    get rows() { return this.mode === 'freq' ? this.freq.values.length : Math.max(...this.cols.map((c) => c.vals.length)); }
    setMode(m) { this.mode = m; this.render(); this.opts.onChange && this.opts.onChange(); }
    names() { return this.mode === 'freq' ? [this.freq.name] : this.cols.map((c) => c.name); }

    loadExample(k, silent) {
      if (k === 'clear') {
        if (this.mode === 'freq') this.freq = { name: this.freq.name, values: ['', '', ''], counts: ['', '', ''] };
        else this.cols = this.cols.map((c) => ({ name: c.name, vals: Array(6).fill('') }));
      } else {
        const e = EXAMPLES[k];
        this.mode = e.mode;
        if (e.mode === 'freq') this.freq = { name: e.name, values: e.values.map(String), counts: e.counts.map(String) };
        else this.cols = e.cols.map(([name, v]) => ({ name, vals: v.map(String) }));
      }
      this.render();
      if (!silent && this.opts.onChange) this.opts.onChange();
    }

    resizeRows(d) {
      const n = Math.max(1, Math.min(MAXR, this.rows + d));
      if (this.mode === 'freq') {
        for (const key of ['values', 'counts']) { const a = this.freq[key]; while (a.length < n) a.push(''); a.length = n; }
      } else for (const c of this.cols) { while (c.vals.length < n) c.vals.push(''); c.vals.length = n; }
      this.render();
    }
    resizeCols(d) {
      if (this.mode !== 'cols') return;
      if (d > 0 && this.cols.length < MAXC) {
        const used = new Set(this.cols.map((c) => c.name));
        const name = ['x', 'y', 'z', 'w', 'v', 'u', 'a', 'b'].find((s) => !used.has(s)) || `c${this.cols.length + 1}`;
        this.cols.push({ name, vals: Array(this.rows).fill('') });
      } else if (d < 0 && this.cols.length > 1) this.cols.pop();
      this.render();
      this.opts.onChange && this.opts.onChange();
    }

    render(focus) {
      this.segBtns.forEach((b) => b.classList.toggle('on', b.dataset.m === this.mode));
      this.colCtl.hidden = this.mode !== 'cols';
      this.rowsLab.textContent = ` ${this.rows} rows `;
      this.saveBtn.textContent = this.mode === 'freq' ? `Save as ${this.freq.name}` : this.cols.length === 1 ? `Save as ${this.cols[0].name}` : 'Save columns';
      const tb = this.table;
      tb.innerHTML = '';
      const nameIn = (get, set, label) => {
        const i = el('input', { class: 'col-name', value: get(), 'aria-label': label, spellcheck: 'false', maxlength: 16 });
        i.addEventListener('input', () => { set(i.value.trim() || 'x'); this.saveBtn.textContent = this.mode === 'freq' ? `Save as ${this.freq.name}` : this.cols.length === 1 ? `Save as ${this.cols[0].name}` : 'Save columns'; this.opts.onChange && this.opts.onChange(); });
        return i;
      };
      const hr = el('tr', {}, el('th', { class: 'idx' }, '#'));
      let colsArr;
      if (this.mode === 'freq') {
        hr.append(el('th', { colspan: 2 }, nameIn(() => this.freq.name, (v) => { this.freq.name = v; }, 'Variable name')));
        tb.append(hr, el('tr', { class: 'sub' }, el('th'), el('th', {}, 'value'), el('th', {}, 'count')));
        colsArr = [this.freq.values, this.freq.counts];
      } else {
        this.cols.forEach((c, j) => hr.append(el('th', {}, nameIn(() => c.name, (v) => { c.name = v; }, `Column ${j + 1} name`))));
        tb.append(hr);
        colsArr = this.cols.map((c) => c.vals);
      }
      this.inputs = [];
      for (let i = 0; i < this.rows; i++) {
        const tr = el('tr', {}, el('td', { class: 'idx' }, String(i + 1)));
        const row = [];
        colsArr.forEach((arr, j) => {
          const inp = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false', 'aria-label': `Row ${i + 1}, column ${j + 1}` });
          inp.value = arr[i] ?? '';
          inp.addEventListener('input', () => { arr[i] = inp.value; this.validate(inp); });
          inp.addEventListener('keydown', (e) => this.onKey(e, i, j));
          inp.addEventListener('paste', (e) => this.onPaste(e, i, j));
          inp.addEventListener('focus', () => inp.select());
          this.validate(inp);
          row.push(inp);
          tr.append(el('td', {}, inp));
        });
        this.inputs.push(row);
        tb.append(tr);
      }
      if (focus) { const r = this.inputs[focus[0]]; if (r && r[focus[1]]) r[focus[1]].focus(); }
    }
    validate(inp) { const v = numOf(inp.value); inp.classList.toggle('bad', v !== null && !isFinite(v)); }
    colArrays() { return this.mode === 'freq' ? [this.freq.values, this.freq.counts] : this.cols.map((c) => c.vals); }

    onKey(e, i, j) {
      const nc = this.colArrays().length;
      const go = (r, c) => { if (r >= this.rows) { this.resizeRows(1); } this.render([r, c]); };
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); this.save(); return; }
      if (e.key === 'Enter' || (e.key === 'ArrowDown')) { e.preventDefault(); if (i + 1 < this.rows) this.inputs[i + 1][j].focus(); else go(i + 1, j); }
      else if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); this.inputs[i - 1][j].focus(); }
      else if (e.key === 'ArrowRight' && e.target.selectionStart === e.target.value.length && j + 1 < nc) { e.preventDefault(); this.inputs[i][j + 1].focus(); }
      else if (e.key === 'ArrowLeft' && e.target.selectionStart === 0 && j > 0) { e.preventDefault(); this.inputs[i][j - 1].focus(); }
      else if ((e.key === ' ' || e.key === ',') && nc === 1) { e.preventDefault(); if (i + 1 < this.rows) this.inputs[i + 1][j].focus(); else go(i + 1, j); }
    }
    onPaste(e, i, j) {
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[\s,;\t]/.test(text.trim())) return;
      e.preventDefault();
      let lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim() !== '');
      let cells = lines.map((l) => l.split(/\t|,|;|\s+/).filter((c) => c !== ''));
      // one long row of numbers into a single column → go down instead
      if (cells.length === 1 && cells[0].length > 1 && (this.mode === 'freq' ? false : this.cols.length === 1)) cells = cells[0].map((c) => [c]);
      if (this.mode === 'cols' && cells.length > 1 && cells[0].some((c) => numOf(c) === null || Number.isNaN(numOf(c)))) {
        const hdr = cells.shift();
        while (this.cols.length < Math.min(MAXC, j + hdr.length)) this.cols.push({ name: `c${this.cols.length + 1}`, vals: Array(this.rows).fill('') });
        hdr.forEach((h, k) => { if (this.cols[j + k] && EW.expr.validName(h) === null) this.cols[j + k].name = h; });
      }
      if (this.mode === 'cols') { const need = Math.max(...cells.map((r) => r.length)); while (this.cols.length < Math.min(MAXC, j + need)) this.cols.push({ name: `c${this.cols.length + 1}`, vals: Array(this.rows).fill('') }); }
      const arrs = this.colArrays();
      const needRows = Math.min(MAXR, i + cells.length);
      for (const a of arrs) while (a.length < needRows) a.push('');
      cells.forEach((r, di) => r.forEach((c, dj) => { if (arrs[j + dj] && i + di < MAXR) arrs[j + dj][i + di] = c; }));
      this.render([i, j]);
      this.opts.onChange && this.opts.onChange();
    }

    // → { name: Data } ; throws on bad cells
    getData() {
      this.err.textContent = '';
      const parseCol = (arr, what) => {
        const out = [];
        arr.forEach((s, i) => {
          const v = numOf(s);
          if (v === null) return;
          if (!isFinite(v)) throw new EW.MathError(`${what}, row ${i + 1}: “${s}” is not a number`);
          out.push(v);
        });
        return out;
      };
      if (this.mode === 'freq') {
        const vals = [], cnts = [];
        this.freq.values.forEach((s, i) => {
          const v = numOf(s), c = numOf(this.freq.counts[i]);
          if (v === null && c === null) return;
          if (v === null || !isFinite(v)) throw new EW.MathError(`Row ${i + 1}: value “${s}” is not a number`);
          if (c === null || !Number.isInteger(c) || c < 0) throw new EW.MathError(`Row ${i + 1}: count must be a whole number ≥ 0`);
          vals.push(v); cnts.push(c);
        });
        if (!vals.length) throw new EW.MathError('The table is empty');
        const flat = vals.flatMap((v, i) => Array(cnts[i]).fill(v));
        if (!flat.length) throw new EW.MathError('All counts are 0');
        return { [this.freq.name]: new EW.Data(flat, { values: vals, counts: cnts }) };
      }
      const out = {};
      for (const c of this.cols) {
        const v = parseCol(c.vals, c.name);
        if (v.length) out[c.name] = new EW.Data(v);
      }
      if (!Object.keys(out).length) throw new EW.MathError('The table is empty');
      return out;
    }
    save() {
      let d;
      try {
        for (const n of this.names()) { const bad = EW.expr.validName(n); if (bad) throw new EW.MathError(`${n}: ${bad}`); }
        d = this.getData();
      } catch (e) { this.err.textContent = e.message; return; }
      for (const [k, v] of Object.entries(d)) this.opts.onSave(k, v, true);
      this.opts.toast(`Saved ${Object.keys(d).join(', ')}`);
    }
    insertLiteral() {
      let d;
      try { d = this.getData(); } catch (e) { this.err.textContent = e.message; return; }
      if (this.mode === 'freq') { const v = Object.values(d)[0]; this.opts.onUse(`freq([${v.freq.values.join(' ')}], [${v.freq.counts.join(' ')}])`); return; }
      const first = Object.values(d)[0];
      this.opts.onUse(`[${first.vals.join(' ')}]`);
    }
  }

  EW.DataEditor = DataEditor;
  EW.EXAMPLES = EXAMPLES;
})();
