// Tokenizer, parser and evaluator for the command line, plus the function registry that stats.js fills.
(function () {
  const EW = window.EW;
  const { Data, RV, Info, Model, MathError } = EW;

  class ParseError extends Error {
    constructor(msg, pos) { super(msg); this.pos = pos; }
  }
  EW.ParseError = ParseError;

  // An identifier that names nothing: fine as a function option (mle(x, normal), ttest(x, 0, greater)), an error anywhere else
  class Sym { constructor(name, fn = false) { this.name = name; this.fn = fn; } }
  EW.Sym = Sym;

  // ---------- tokenizer ----------
  function tokenize(src) {
    src = src
      .replace(/[−–]/g, '-').replace(/[×·⋅]/g, '*').replace(/÷/g, '/')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/≠/g, '!=').replace(/≥/g, '>=').replace(/≤/g, '<=')
      .replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    const toks = [];
    let i = 0, sp = false;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '\n' || ch === '\r') { toks.push({ t: 'op', v: ';', pos: i, sp: true }); i++; sp = true; continue; }
      if (/\s/.test(ch)) { sp = true; i++; continue; }
      const rest = src.slice(i);
      let m;
      if ((m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(rest))) {
        toks.push({ t: 'num', v: parseFloat(m[0]), pos: i, sp });
        i += m[0].length;
      } else if ((m = /^[A-Za-z_Ͱ-Ͽ][A-Za-z0-9_Ͱ-Ͽ]*/.exec(rest))) {
        toks.push({ t: 'id', v: m[0], pos: i, sp });
        i += m[0].length;
      } else if ((m = /^("([^"]*)"|'([^']*)')/.exec(rest))) {
        toks.push({ t: 'str', v: m[2] ?? m[3], pos: i, sp });
        i += m[0].length;
      } else if ((m = /^(!=|<>|>=|<=|<|>)/.exec(rest))) {
        toks.push({ t: 'str', v: m[0], pos: i, sp });
        i += m[0].length;
      } else if ('+-*/^()[],;:=!'.includes(ch)) {
        const tok = { t: 'op', v: ch, pos: i, sp };
        if (ch === '+' || ch === '-') tok.spAfter = i + 1 >= src.length || /\s/.test(src[i + 1]);
        toks.push(tok);
        i++;
      } else {
        throw new ParseError(`Unexpected character "${ch}"`, i);
      }
      sp = false;
    }
    return toks;
  }

  // ---------- parser ----------
  function parse(src) {
    const toks = tokenize(src);
    let i = 0;
    let inList = 0;
    const peek = (o = 0) => toks[i + o];
    const next = () => toks[i++];
    const isOp = (tok, v) => tok && tok.t === 'op' && tok.v === v;
    const fail = (msg, tok) => { throw new ParseError(msg, tok ? tok.pos : src.length); };
    const expect = (v) => { const tk = next(); if (!isOp(tk, v)) fail(`Expected "${v}"`, tk); return tk; };

    function parseExpr() { return parseAdd(); }
    function parseAdd() {
      let a = parseMul();
      for (;;) {
        const tk = peek();
        if (!tk || tk.t !== 'op' || (tk.v !== '+' && tk.v !== '-')) break;
        if (inList && tk.sp && !tk.spAfter) break; // [1 -2] is two entries
        next();
        a = { t: 'bin', op: tk.v, a, b: parseMul(), pos: tk.pos };
      }
      return a;
    }
    function parseMul() {
      let a = parseUnary();
      for (;;) {
        const tk = peek();
        if (tk && tk.t === 'op' && (tk.v === '*' || tk.v === '/')) { next(); a = { t: 'bin', op: tk.v, a, b: parseUnary(), pos: tk.pos }; continue; }
        // implicit multiplication right after a number: 2x, 3(x + 1)
        if (tk && !tk.sp && a.t === 'num' && (tk.t === 'id' || isOp(tk, '('))) { a = { t: 'bin', op: '*', a, b: parseUnary(), pos: tk.pos }; continue; }
        break;
      }
      return a;
    }
    function parseUnary() {
      const tk = peek();
      if (isOp(tk, '-')) { next(); return { t: 'neg', a: parseUnary(), pos: tk.pos }; }
      if (isOp(tk, '+')) { next(); return parseUnary(); }
      return parsePow();
    }
    function parsePow() {
      const a = parsePostfix();
      const tk = peek();
      if (isOp(tk, '^')) { next(); return { t: 'bin', op: '^', a, b: parseUnary(), pos: tk.pos }; }
      return a;
    }
    function parsePostfix() {
      let a = parsePrimary();
      for (;;) {
        const tk = peek();
        if (isOp(tk, '!')) { next(); a = { t: 'fact', a, pos: tk.pos }; continue; }
        if (isOp(tk, '(') && !tk.sp && a.t === 'id') { next(); a = { t: 'index', a, args: parseArgs(), pos: tk.pos }; continue; }
        break;
      }
      return a;
    }
    function parseArgs() {
      const saved = inList;
      inList = 0;
      const args = [];
      if (isOp(peek(), ')')) { next(); inList = saved; return args; }
      for (;;) {
        args.push(parseExpr());
        const tk = next();
        if (isOp(tk, ')')) break;
        if (!isOp(tk, ',')) fail('Expected "," or ")"', tk);
      }
      inList = saved;
      return args;
    }
    function parsePrimary() {
      const tk = next();
      if (!tk) fail('Unexpected end of input');
      if (tk.t === 'num') return { t: 'num', v: tk.v, pos: tk.pos };
      if (tk.t === 'str') return { t: 'str', v: tk.v, pos: tk.pos };
      if (tk.t === 'id') {
        if (isFunc(tk.v) && isOp(peek(), '(')) { next(); return { t: 'call', name: tk.v, args: parseArgs(), pos: tk.pos }; }
        return { t: 'id', name: tk.v, pos: tk.pos };
      }
      if (isOp(tk, '(')) {
        const saved = inList;
        inList = 0;
        const e = parseExpr();
        inList = saved;
        expect(')');
        return e;
      }
      if (isOp(tk, '[')) {
        inList++;
        const items = [];
        while (!isOp(peek(), ']')) {
          if (!peek()) fail('Missing "]"');
          if (isOp(peek(), ',') || isOp(peek(), ';')) { next(); continue; }
          let e = parseExpr();
          if (isOp(peek(), ':')) {
            next();
            let b = parseExpr(), step = null;
            if (isOp(peek(), ':')) { next(); step = b; b = parseExpr(); }
            e = { t: 'range', a: e, b, step };
          }
          items.push(e);
        }
        next();
        inList--;
        return { t: 'list', items, pos: tk.pos };
      }
      fail(`Unexpected "${tk.v}"`, tk);
    }

    let stmt;
    if (peek() && peek().t === 'id' && isOp(peek(1), '=')) {
      const name = next().v;
      next();
      stmt = { t: 'assign', name, expr: parseExpr() };
    } else stmt = parseExpr();
    if (i < toks.length) {
      const tk = peek();
      fail(tk.v === '=' ? 'Only a single name can go on the left of "=" (e.g. y = 2*x + 1)' : `Unexpected "${tk.v}"`, tk);
    }
    return stmt;
  }

  // ---------- function registry ----------
  const FUNCS = {};
  const isFunc = (name) => Object.prototype.hasOwnProperty.call(FUNCS, name);
  // def('mean avg', 'mean(x)', 1, 1, fn, 'doc', 'Category')
  function def(names, sig, min, max, fn, doc = '', cat = 'Other') {
    const f = { sig, min, max, fn, doc, cat, name: names.split(' ')[0] };
    for (const n of names.split(' ')) FUNCS[n] = f;
    return f;
  }
  const CONSTS = { pi: Math.PI, e: Math.E, Inf: Infinity, inf: Infinity };

  // ---------- coercions ----------
  const describe = (v) => (typeof v === 'number' ? 'a number' : v instanceof Data ? `a list of ${v.n} numbers` : v instanceof RV ? 'a distribution' : v instanceof Model ? 'a regression' : v instanceof Info ? 'a result' : v instanceof Sym ? `"${v.name}"` : typeof v === 'string' ? `"${v}"` : 'something else');
  const unwrap = (v) => (v instanceof Info && v.value != null ? v.value : v);
  function unknown(v) {
    if (!(v instanceof Sym)) return;
    if (v.fn) throw new MathError(`${v.name} is a function — call it like ${FUNCS[v.name].sig}`);
    throw new MathError(`Unknown name "${v.name}" — save it first (e.g. ${v.name} = [1 2 3])`);
  }
  function asNum(v, what = 'a number') {
    v = unwrap(v);
    unknown(v);
    if (typeof v === 'number') return v;
    if (v instanceof Data && v.n === 1) return v.vals[0];
    throw new MathError(`Expected ${what}, got ${describe(v)}`);
  }
  function asInt(v, what = 'a whole number') {
    const x = asNum(v, what);
    if (!Number.isInteger(x)) throw new MathError(`Expected ${what}, got ${EW.fmt(x)}`);
    return x;
  }
  function asProb(v, what = 'a probability') {
    const x = asNum(v, what);
    if (!(x >= 0 && x <= 1)) throw new MathError(`Expected ${what} between 0 and 1, got ${EW.fmt(x)}`);
    return x;
  }
  function asData(v, what = 'a list of numbers', minN = 1) {
    v = unwrap(v);
    unknown(v);
    if (typeof v === 'number') v = new Data([v]);
    if (!(v instanceof Data)) throw new MathError(`Expected ${what}, got ${describe(v)}`);
    if (v.n < minN) throw new MathError(`Need at least ${minN} observations, got ${v.n}`);
    return v;
  }
  function asRV(v) {
    v = unwrap(v);
    unknown(v);
    if (v instanceof RV) return v;
    throw new MathError(`Expected a distribution such as Binom(10, 0.5) or dist([0 1], [1/2 1/2]), got ${describe(v)}`);
  }
  function asStr(v) {
    if (v instanceof Sym) return v.name;
    if (typeof v === 'string') return v;
    return null;
  }
  // Alternative hypothesis from "two" / "greater" / ">" / "less" / "<" …
  function asAlt(v) {
    if (v === undefined) return 'two';
    const s = (asStr(v) || '').toLowerCase();
    if (['two', 'both', 'two.sided', 'twosided', '!=', '<>', 'ne', 'neq'].includes(s)) return 'two';
    if (['greater', 'right', 'upper', '>', '>=', 'gt'].includes(s)) return 'greater';
    if (['less', 'left', 'lower', '<', '<=', 'lt'].includes(s)) return 'less';
    throw new MathError('The alternative should be two (≠), greater (>) or less (<)');
  }

  // ---------- evaluator ----------
  function elementwise(a, b, f, opName) {
    a = unwrap(a); b = unwrap(b);
    unknown(a); unknown(b);
    const okA = typeof a === 'number' || a instanceof Data, okB = typeof b === 'number' || b instanceof Data;
    if (!okA || !okB) throw new MathError(`Can't apply "${opName}" to ${describe(okA ? b : a)}`);
    if (typeof a === 'number' && typeof b === 'number') return f(a, b);
    if (a instanceof Data && b instanceof Data) {
      if (a.n !== b.n) throw new MathError(`Lists have different lengths (${a.n} and ${b.n})`);
      return new Data(a.vals.map((x, i) => f(x, b.vals[i])));
    }
    if (a instanceof Data) return new Data(a.vals.map((x) => f(x, b)));
    return new Data(b.vals.map((y) => f(a, y)));
  }
  const OPS = {
    '+': (x, y) => x + y,
    '-': (x, y) => x - y,
    '*': (x, y) => x * y,
    '/': (x, y) => { if (y === 0) throw new MathError('Division by zero'); return x / y; },
    '^': (x, y) => { const r = Math.pow(x, y); if (Number.isNaN(r)) throw new MathError('Result is not a real number'); return r; },
  };
  function evaluate(node, ctx) {
    switch (node.t) {
      case 'num': return node.v;
      case 'str': return node.v;
      case 'id': {
        if (node.name in ctx.env) return ctx.env[node.name];
        if (node.name in CONSTS) return CONSTS[node.name];
        return new Sym(node.name, isFunc(node.name));
      }
      case 'neg': return elementwise(-1, evaluate(node.a, ctx), OPS['*'], '−');
      case 'bin': return cleanVal(elementwise(evaluate(node.a, ctx), evaluate(node.b, ctx), OPS[node.op], node.op));
      case 'fact': {
        const n = asInt(evaluate(node.a, ctx), 'a whole number for !');
        if (n < 0) throw new MathError('Factorial of a negative number');
        return EW.sp.factorial(n);
      }
      case 'index': {
        const v = unwrap(evaluate(node.a, ctx));
        unknown(v);
        if (!(v instanceof Data)) throw new MathError(`${node.a.name} is not a list, so it can't be indexed`);
        if (node.args.length !== 1) throw new MathError('Use one index, e.g. x(3)');
        const k = asInt(evaluate(node.args[0], ctx), 'an index');
        if (k < 1 || k > v.n) throw new MathError(`Index ${k} is out of range (1…${v.n})`);
        return v.vals[k - 1];
      }
      case 'list': {
        const out = [];
        for (const it of node.items) {
          if (it.t === 'range') {
            const a = asNum(evaluate(it.a, ctx)), b = asNum(evaluate(it.b, ctx));
            const st = it.step ? asNum(evaluate(it.step, ctx)) : 1;
            if (st === 0 || (b - a) / st > 100000) throw new MathError('That range is too long');
            const count = Math.floor((b - a) / st + 1e-9);
            for (let k = 0; k <= count; k++) out.push(EW.util.clean(a + k * st));
            continue;
          }
          const v = unwrap(evaluate(it, ctx));
          unknown(v);
          if (typeof v === 'number') out.push(v);
          else if (v instanceof Data) out.push(...v.vals);
          else throw new MathError(`A list can only hold numbers, not ${describe(v)}`);
        }
        return new Data(out);
      }
      case 'call': {
        const f = FUNCS[node.name];
        const n = node.args.length;
        if (n < f.min || n > f.max) {
          const want = f.min === f.max ? `${f.min}` : f.max === Infinity ? `at least ${f.min}` : `${f.min}–${f.max}`;
          throw new MathError(`${node.name} takes ${want} argument${f.max === 1 ? '' : 's'}: ${f.sig}`);
        }
        const args = node.args.map((a) => evaluate(a, ctx));
        return f.fn(args, ctx, node);
      }
      default: throw new MathError('Cannot evaluate that');
    }
  }
  const cleanVal = (v) => (typeof v === 'number' ? EW.util.clean(v) : v instanceof Data ? new Data(v.vals.map(EW.util.clean)) : v);

  // Steps are collected in groups: { title, items: [{ tex } | { text }] }
  function group(ctx, title) {
    const g = { title, items: [] };
    ctx.steps.push(g);
    return {
      tex(s) { g.items.push({ tex: s }); return this; },
      text(s) { g.items.push({ text: s }); return this; },
    };
  }

  function validName(name) {
    if (!/^[A-Za-z_Ͱ-Ͽ][A-Za-z0-9_Ͱ-Ͽ]*$/.test(name)) return 'Names start with a letter and use letters, digits and _';
    if (isFunc(name)) return `"${name}" is a function name`;
    if (name in CONSTS) return `"${name}" is a constant`;
    return null;
  }

  function run(src, env, opts = {}) {
    const ast = parse(src);
    const ctx = { env, steps: [], notes: [], opts };
    if (ast.t === 'assign') {
      const bad = validName(ast.name);
      if (bad) throw new MathError(bad);
      let v = evaluate(ast.expr, ctx);
      unknown(unwrap(v));
      if (typeof v === 'string') throw new MathError('Only numbers, lists, distributions and results can be saved');
      return { value: v, assign: ast.name, steps: ctx.steps, notes: ctx.notes };
    }
    const v = evaluate(ast, ctx);
    unknown(v);
    if (typeof v === 'string') throw new MathError(`"${v}" isn't a value on its own`);
    return { value: v, assign: null, steps: ctx.steps, notes: ctx.notes };
  }

  EW.expr = { parse, run, evaluate, def, FUNCS, CONSTS, isFunc, validName, group, asNum, asInt, asProb, asData, asRV, asStr, asAlt, unwrap, describe };
})();
