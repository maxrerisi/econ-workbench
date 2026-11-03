// Beginner's guide (opens on first visit), plain-English glossary, and hover / tap tooltips.
(function () {
  const EW = window.EW;
  const el = EW.el;
  const { texEl } = EW.ui;

  // Hooks supplied by app.js: run(src), tab(name), spotlight(id), card(src) → element, reference(), firstColumn()
  let H = {};

  // ---------- glossary ----------
  // plain: one or two sentences, no jargon · formula: optional TeX · cmd: a command that demonstrates it · go: a tab to open
  const TERMS = [
    { group: 'Describing data', id: 'mean', term: 'Mean (average)', plain: 'Add up the values and divide by how many there are (n). Written X̄ₙ ("x-bar"). It is our best single guess for the true population average μ.', formula: '\\bar X_n = \\frac{1}{n}\\sum_{i=1}^{n} X_i', cmd: 'mean([2 4 9])' },
    { group: 'Describing data', id: 'variance', term: 'Variance (s² and σ̂²)', plain: 'How spread out the values are: roughly the average squared distance from the mean. s² divides by n − 1 (the usual choice, and unbiased); σ̂² divides by n. With lots of data they are almost identical.', formula: 's^2 = \\frac{1}{n-1}\\sum_{i=1}^{n} (X_i-\\bar X_n)^2 \\qquad \\hat\\sigma^2 = \\frac{1}{n}\\sum_{i=1}^{n} (X_i-\\bar X_n)^2', cmd: 'var([2 4 9])' },
    { group: 'Describing data', id: 'sd', term: 'Standard deviation', plain: 'The square root of the variance, which puts it back in the data\'s own units. Think of it as how far a typical value sits from the mean.', formula: 's = \\sqrt{s^2}', cmd: 'sd([2 4 9])' },
    { group: 'Describing data', id: 'se', term: 'Standard error (SE)', plain: 'How much the sample mean would wobble if you repeated the study with a fresh sample. It shrinks as n grows: four times the data halves the SE. The standard deviation describes single values; the SE describes the average.', formula: '\\text{SE}(\\bar X_n) = \\frac{s}{\\sqrt n}', cmd: 'se([2 4 9 5 7])' },
    { group: 'Describing data', id: 'median', term: 'Median and quantiles', plain: 'The median is the middle value once the data are sorted: half are below it. A quantile generalizes this: the 0.9 quantile has 90% of the values below it.', cmd: 'median([7 1 9 4 3])' },
    { group: 'Describing data', id: 'skew', term: 'Skewness', plain: 'Measures lopsidedness. 0 means symmetric; positive means a long tail to the right (like incomes); negative means a long tail to the left.', formula: '\\text{skew}(X) = \\frac{E[(X-\\mu)^3]}{\\sigma^3}', cmd: 'skew([1 2 3 10])' },
    { group: 'Describing data', id: 'cor', term: 'Covariance and correlation', plain: 'Do two variables move together? Correlation is on a −1 to 1 scale: near 1 is a strong upward straight-line pattern, near 0 is no straight-line pattern, near −1 is a strong downward one.', cmd: 'cor([1 2 3 4 5], [2 4 5 4 6])' },

    { group: 'Probability', id: 'rv', term: 'Random variable and distribution', plain: 'A random variable X is a number decided by chance, like a die roll. Its distribution lists the values it can take and how likely each one is.', cmd: 'dist([0 1 2], [1/4 1/2 1/4])' },
    { group: 'Probability', id: 'expect', term: 'Expected value E[X] and Var(X)', plain: 'E[X] is the long-run average of X if the experiment were repeated forever: each value times its probability, added up. Var(X) is the long-run average squared distance from E[X].', formula: 'E[X] = \\sum_x x\\,p(x) \\qquad \\operatorname{Var}(X) = E[X^2] - (E[X])^2', cmd: 'E(dist([0 1 2], [1/4 1/2 1/4]))' },
    { group: 'Probability', id: 'normal', term: 'Normal distribution and z-scores', plain: 'The bell curve. N(μ, σ²) is centred at μ with spread σ. A z-score counts how many standard deviations a value is from the mean; converting to z lets you use the standard normal table Φ. In this app, Normal(μ, σ) takes the standard deviation σ, not the variance.', formula: 'Z = \\frac{X-\\mu}{\\sigma} \\sim N(0,1)', cmd: 'normprob(85, 115, 100, 15)' },
    { group: 'Probability', id: 'binom', term: 'Binomial distribution', plain: 'Counts the successes in n independent tries that each succeed with probability p, such as heads in 10 coin flips.', formula: 'P(X=k) = \\binom{n}{k} p^k (1-p)^{n-k}', cmd: 'P(Binom(10, 0.5), <=, 3)' },
    { group: 'Probability', id: 'cdf', term: 'CDF and quantile', plain: 'The CDF F(x) = P(X ≤ x) is the chance of landing at or below x. A quantile runs it backwards: which x has probability p below it? For the standard normal, the 0.975 quantile is 1.96.', cmd: 'qnorm(0.975)' },
    { group: 'Probability', id: 'bayes', term: 'Conditional probability and Bayes\' rule', plain: 'P(A | B) is the chance of A once you know B happened. Bayes\' rule flips the condition, e.g. from P(positive test | sick) to P(sick | positive test). The example: 1% are sick, the test catches 90%, and 5% of healthy people test positive.', formula: 'P(A\\mid B) = \\frac{P(B\\mid A)\\,P(A)}{P(B)}', cmd: 'bayes(0.01, 0.9, 0.05)' },
    { group: 'Probability', id: 'indep', term: 'Independence', plain: 'A and B are independent if knowing one tells you nothing about the other. Test: does P(A and B) equal P(A) × P(B)?', cmd: 'indep(0.5, 0.4, 0.2)' },

    { group: 'Confidence intervals and tests', id: 'ci', term: 'Confidence interval', plain: 'A range of believable values for the unknown true mean μ: estimate ± (critical value × SE). "95% confidence" describes the method: if you repeated the study many times, about 95% of the intervals built this way would contain μ.', formula: '\\bar X_n \\pm z_{1-\\alpha/2}\\cdot \\frac{s}{\\sqrt n}', cmd: 'ci([2.1 3.4 1.9 5.2 4.4 3.0])' },
    { group: 'Confidence intervals and tests', id: 'test', term: 'Hypothesis test', plain: 'Start from a claim (the null hypothesis H₀, e.g. μ = 3) and ask: if it were true, would data like ours be surprising? The test statistic counts how many standard errors the estimate is from the claimed value.', formula: 't = \\frac{\\bar X_n - \\mu_0}{s/\\sqrt n}', cmd: 'ttest([2.1 3.4 1.9 5.2 4.4 3.0], 3)' },
    { group: 'Confidence intervals and tests', id: 'pvalue', term: 'p-value and significance level α', plain: 'The p-value is the chance, if H₀ were true, of a result at least as extreme as yours. If it is below α (usually 0.05), reject H₀. It is not the probability that H₀ is true.' },
    { group: 'Confidence intervals and tests', id: 'tz', term: 'z versus t', plain: 'Both critical values come from bell-shaped curves. t has fatter tails to allow for estimating σ from a small sample; for large n they are nearly the same (1.96 for 95%).', cmd: 'qt(0.975, 5)' },

    { group: 'Estimators', id: 'estimator', term: 'Estimator (θ̂)', plain: 'A recipe that turns data into a guess for an unknown number θ. The sample mean is an estimator of μ. A hat (^) on a symbol means "estimated from data".' },
    { group: 'Estimators', id: 'mse', term: 'Bias, variance and MSE', plain: 'Bias: does the estimator miss on average? Variance: how much it jumps around from sample to sample. Mean squared error (MSE) combines both, so lower MSE means more accurate overall.', formula: '\\text{MSE}(\\hat\\theta) = E[(\\hat\\theta-\\theta)^2] = \\text{Bias}^2 + \\operatorname{Var}(\\hat\\theta)', cmd: 'mse(0.1, 0.04)' },
    { group: 'Estimators', id: 'consistent', term: 'Consistency', plain: 'An estimator is consistent if it gets as close to the truth as you like once the sample is big enough. Unbiased is a different property: X₁ (just the first observation) is unbiased for μ but never improves with more data.', go: ['sim', 'See it in Simulate'] },
    { group: 'Estimators', id: 'mle', term: 'Maximum likelihood (MLE)', plain: 'Choose the parameter value that makes the data you actually saw most probable. Recipe: write the likelihood, take its log, set the derivative to zero, solve.', cmd: 'mle([2 0 3 1 1 4], poisson)', go: ['derive', 'Step-by-step derivations'] },
    { group: 'Estimators', id: 'mom', term: 'Method of moments (MoM)', plain: 'Set the model\'s theoretical average (and higher moments if needed) equal to the sample\'s, then solve for the parameter.', cmd: 'mom([2 0 3 1 1 4], poisson)', go: ['derive', 'Step-by-step derivations'] },

    { group: 'The big theorems', id: 'lln', term: 'Law of large numbers', plain: 'As the sample grows, the sample mean settles down at the true mean μ.', go: ['sim', 'Watch it happen'] },
    { group: 'The big theorems', id: 'clt', term: 'Central limit theorem', plain: 'Whatever shape the data have, the sample mean is approximately normal for large n, centred at μ with SE σ/√n. That is why z-intervals and z-tests work. The example: μ = 50, σ = 10, n = 36, chance the mean is above 52.', formula: '\\frac{\\bar X_n-\\mu}{\\sigma/\\sqrt n} \\approx N(0,1)', cmd: 'clt(50, 10, 36, 52, Inf)' },

    { group: 'Regression', id: 'ols', term: 'Regression (OLS)', plain: 'Fits the straight line ŷ = β̂₀ + β̂₁x that makes the squared vertical misses (residuals) as small as possible. β̂₁ is the predicted change in y when x goes up by one.', cmd: 'ols([2 4 5 4 5], [1 2 3 4 5])' },
    { group: 'Regression', id: 'r2', term: 'R²', plain: 'The share of the variation in y that the line explains: 0 means none, 1 means all of it.' },
  ];
  const TERM = Object.fromEntries(TERMS.map((t) => [t.id, t]));

  // Which glossary entry explains a command's result
  const FN_TERM = {
    mean: 'mean', avg: 'mean', summary: 'mean', describe: 'mean', var: 'variance', varp: 'variance', sd: 'sd', sdp: 'sd', std: 'sd', se: 'se',
    median: 'median', quantile: 'median', skew: 'skew', skewmom: 'skew', cov: 'cor', cor: 'cor', dist: 'rv', E: 'expect', Var: 'expect',
    Normal: 'normal', Norm: 'normal', pnorm: 'normal', qnorm: 'cdf', Phi: 'normal', invPhi: 'cdf', normprob: 'normal', dnorm: 'normal', zscore: 'normal',
    Binom: 'binom', Bin: 'binom', Binomial: 'binom', dbinom: 'binom', pbinom: 'binom', cdf: 'cdf', bayes: 'bayes', cond: 'bayes', indep: 'indep',
    ci: 'ci', tci: 'ci', propci: 'ci', ci2: 'ci', samplesize: 'ci', ztest: 'test', ttest: 'test', proptest: 'test', ttest2: 'test', ztest2: 'test',
    qt: 'tz', pt: 'tz', mse: 'mse', mle: 'mle', mom: 'mom', clt: 'clt', ols: 'ols', reg: 'ols', lm: 'ols', predict: 'ols',
  };
  function termFor(src) {
    const m = /^\s*(?:[A-Za-z_]\w*\s*=(?!=)\s*)?([A-Za-z_]\w*)\s*\(/.exec(src || '');
    return m && FN_TERM[m[1]] ? TERM[FN_TERM[m[1]]] : null;
  }

  // ---------- small builders ----------
  const p = (...k) => el('p', {}, ...k);
  const b = (t) => el('b', {}, t);
  const code = (t) => el('code', {}, t);
  const tryBtn = (src, label) => el('button', { type: 'button', class: 'g-try', 'data-tip': `Runs ${src}`, onclick: () => { close(); H.run(src); } }, label || 'Try it');
  const goBtn = (tab, label, spot) => el('button', { type: 'button', class: 'g-go', onclick: () => { close(); H.tab(tab); if (spot) H.spotlight(spot); } }, label, ' →');
  const more = (summary, ...kids) => el('details', { class: 'g-more' }, el('summary', {}, summary), el('div', { class: 'g-more-body' }, ...kids));

  // ---------- sections ----------
  const SECTIONS = [
    {
      id: 'welcome', nav: 'Welcome', title: 'Welcome to Econometrics Workbench',
      body: () => [
        p('This is a statistics calculator that ', b('shows its work'), '. Every answer comes with the formula, the numbers plugged in, and the result, like a worked example in your notes.'),
        p('You don\'t need to learn any commands: most things are one click away. Pick what you came to do:'),
        el('div', { class: 'g-tiles' },
          tile('📊', 'Analyze some numbers', 'Average, spread, confidence interval', () => { close(); H.tab('calc'); H.spotlight('editor'); }),
          tile('🎲', 'Find a probability', 'Normal, binomial and more', () => { close(); H.tab('dist'); H.spotlight('dsPick'); }),
          tile('✏️', 'Practice for the exam', 'Fresh problems with full solutions', () => { close(); H.tab('practice'); }),
          tile('💡', 'Understand the ideas', 'Plain-English explanations', () => show('glossary'))),
        p(el('span', { class: 'muted' },'New here? The next three pages take about two minutes. You can reopen this guide any time with the ', b('Help'), ' button at the top.')),
      ],
    },
    {
      id: 'first', nav: 'Your first calculation', title: 'Your first calculation',
      body: () => [
        el('ol', { class: 'g-steps' },
          el('li', {}, b('Enter your numbers'), ' in the Data editor. Type them in, or copy a column from Excel or Google Sheets and paste it. If your data come as "value and how many times", switch to ', b('Frequency table'), '.'),
          el('li', {}, b('Click a button'), ' under the table, like ', b('mean'), ' or ', b('95% CI'), '. Hover over any button to see what it does.'),
          el('li', {}, b('Read the result'), ' that appears below. The answer is at the top; click ', b('Show the working'), ' to see every step.'),
          el('li', {}, b('Save it if you want'), ' (optional). ', b('Save'), ' keeps your data under a name like ', code('x'), ' so you can reuse it.')),
        el('div', { class: 'g-row' },
          el('button', { type: 'button', class: 'g-try', onclick: () => { close(); H.tab('calc'); const c = H.firstColumn(); if (c) H.run(`ci(${c})`); } }, 'Try it: 95% CI on the example data'),
          goBtn('calc', 'Show me the Data editor', 'editor')),
        more('What\'s already in the editor?',
          p('The example is from Problem Set 6: 250 people and how many bank accounts each has (10 have 0, 30 have 1, …). The ', b('Examples…'), ' menu has a few others. Choose ', b('Clear'), ' to start fresh.')),
      ],
    },
    {
      id: 'tabs', nav: 'Which tab do I need?', title: 'Which tab do I need?',
      body: () => [
        p('Find what you want to do, then click to go there.'),
        el('table', { class: 'g-table' }, ...[
          ['Get an average, spread, or confidence interval from my data', 'calc', 'Calculator'],
          ['Test a claim, e.g. "is the true mean 3?"', 'calc', 'Calculator'],
          ['Find the chance a normal or binomial value falls in a range', 'dist', 'Distributions'],
          ['See how a formula like the MLE is derived, step by step', 'derive', 'Derive'],
          ['See why a theorem (LLN, CLT, "95% coverage") is true', 'sim', 'Simulate'],
          ['Quiz myself on problems like the homework', 'practice', 'Practice'],
        ].map(([want, tab, name]) => el('tr', {}, el('td', {}, want), el('td', {}, goBtn(tab, name))))),
      ],
    },
    {
      id: 'results', nav: 'Reading a result', title: 'Reading a result',
      body: () => {
        const demo = el('div', { class: 'g-demo', inert: true }, H.card('mean([2 4 9])'));
        return [
          p('Every calculation makes a card like this one:'),
          demo,
          el('ul', { class: 'g-list' },
            el('li', {}, b('Top line'), ': what was calculated. Click it to change it and run it again.'),
            el('li', {}, b('Badge'), ' (like ', code('number'), ' or ', code('interval'), '): what kind of answer it is.'),
            el('li', {}, b('Middle'), ': the answer, in the same notation as class.'),
            el('li', {}, b('Show the working'), ': numbered steps, in the order you would write them on paper.'),
            el('li', {}, b('ⓘ Explain'), ': a plain-English explanation of the idea, with the formula.'),
            el('li', {}, b('Save as… / Copy / ✕'), ': keep the answer under a name, copy it, or remove the card.')),
          more('What if a card is red?',
            p('Something couldn\'t be calculated, and the message says why. The most common causes: a missing comma between inputs, a list without square brackets, or a name that hasn\'t been saved yet.'),
            p('The grey line under the command box checks what you type ', b('before'), ' you press Enter, so problems show up early.')),
        ];
      },
    },
    {
      id: 'commands', nav: 'Typing commands', title: 'Typing commands (optional)',
      body: () => [
        p('The box under the Data editor accepts short commands, like a calculator keypad but in words. You never have to use it, but it is quicker and can do more. Try these in order:'),
        el('table', { class: 'g-table g-cmds' }, ...[
          ['x = [3 5 8 6]', 'Save a list of numbers as x'],
          ['mean(x)', 'Use it in a calculation'],
          ['ci(x, 0.90)', 'A 90% confidence interval'],
          ['ttest(x, 4)', 'Test whether the true mean is 4'],
          ['X = Normal(100, 15)', 'A normal with mean 100, SD 15'],
          ['P(X, 85, 115)', 'Chance X lands between 85 and 115'],
        ].map(([src, what]) => el('tr', {}, el('td', {}, code(src)), el('td', {}, what), el('td', {}, tryBtn(src))))),
        el('ul', { class: 'g-list' },
          el('li', {}, b('Commas'), ' separate inputs; ', b('square brackets'), ' make a list.'),
          el('li', {}, 'The ', b('grey line'), ' under the box previews the answer (or the problem) as you type.'),
          el('li', {}, 'Click a ', b('word chip'), ' (mean, ci, P, …) to drop in a template, then fill in the blanks.'),
          el('li', {}, b('↑'), ' brings back earlier commands.')),
        el('div', { class: 'g-row' }, el('button', { type: 'button', class: 'g-go', onclick: () => { close(); H.reference(); } }, 'See every command →')),
      ],
    },
    {
      id: 'glossary', nav: 'Stats explained', title: 'Stats, explained simply',
      body: () => {
        const search = el('input', { type: 'search', class: 'g-search', placeholder: 'Search, e.g. "standard error" or "p-value"', 'aria-label': 'Search the explanations' });
        const list = el('div', { class: 'g-gloss' });
        let group = null;
        for (const t of TERMS) {
          if (t.group !== group) { group = t.group; list.append(el('h4', { class: 'g-group' }, group)); }
          const det = el('details', { class: 'g-term', id: `g-${t.id}`, 'data-q': `${t.term} ${t.plain}`.toLowerCase() }, el('summary', {}, t.term));
          const body = el('div', { class: 'g-more-body' }, p(t.plain));
          if (t.formula) body.append(el('div', { class: 'g-formula' }, texEl(t.formula, true)));
          const acts = el('div', { class: 'g-row' });
          if (t.cmd) acts.append(tryBtn(t.cmd, `Try ${t.cmd}`));
          if (t.go) acts.append(goBtn(t.go[0], t.go[1]));
          if (acts.childNodes.length) body.append(acts);
          det.append(body);
          list.append(det);
        }
        search.addEventListener('input', () => {
          const q = search.value.trim().toLowerCase();
          list.querySelectorAll('.g-term').forEach((d) => { d.hidden = !!q && !d.dataset.q.includes(q); if (q && !d.hidden) d.open = true; });
          list.querySelectorAll('.g-group').forEach((h) => {
            let n = h.nextElementSibling, any = false;
            while (n && !n.classList.contains('g-group')) { if (!n.hidden) any = true; n = n.nextElementSibling; }
            h.hidden = !any;
          });
        });
        return [p('Click a term to open it. Each one has a short explanation, the formula, and an example you can run.'), search, list];
      },
    },
    {
      id: 'mixups', nav: 'Common mix-ups', title: 'Common mix-ups',
      body: () => [
        more('My answer is a little different from the book\'s',
          p('Usually rounding. Three other things to check: the book may divide by n instead of n − 1 for the variance; it may use the table value 1.960 instead of the exact 1.95996; and it may round in the middle of the calculation. You can change the first two in ⚙ Settings.')),
        more('Is the 15 in Normal(100, 15) the variance?',
          p('No. Here it is the ', b('standard deviation'), ' σ, as in R and most calculators. Class notes write N(μ, σ²) with the variance, so N(100, 225) in the notes is ', code('Normal(100, 15)'), ' here.')),
        more('s² or σ̂²: which variance?',
          p('s² divides by n − 1 and is the usual default (it is unbiased). σ̂² divides by n and appears in maximum likelihood. For large n the difference is tiny. The steps in each card show which one was used.')),
        more('P(X < 3) or P(X ≤ 3)?',
          p('For counts (binomial, Poisson, …) they differ: P(X ≤ 3) includes 3 itself. For continuous variables like the normal, they are the same. Use ', code('<'), ' or ', code('<='), ' in ', code('P(X, <=, 3)'), ' to say which you mean.')),
        more('What does "95% confident" really mean?',
          p('It describes the method, not this one interval. If you repeated the study many times, about 95% of the intervals would contain the true mean. Once you have one interval, it either contains μ or it doesn\'t.'),
          el('div', { class: 'g-row' }, goBtn('sim', 'See 1000 intervals in Simulate'))),
        more('Is the p-value the chance H₀ is true?',
          p('No. It is the chance of data at least as extreme as yours ', b('if'), ' H₀ were true. A small p-value says the data would be surprising under H₀.')),
        more('Standard deviation or standard error?',
          p('The standard deviation describes how spread out individual values are. The standard error describes how precise the average is: SE = s/√n.')),
        more('Where did my saved data go?',
          p('Saved values last until you close the browser tab. To keep them, click ', b('Export'), ' at the bottom of the Workspace panel, and ', b('Import'), ' the file later.')),
      ],
    },
    {
      id: 'settings', nav: 'Settings and shortcuts', title: 'Settings and shortcuts',
      body: () => [
        el('table', { class: 'g-table' }, ...[
          ['0.25 | a/b', 'Show answers as decimals, or as exact fractions when they are simple (like 11/64).'],
          ['⚙ Settings', 'Variance formula (n − 1 or n), table z-values vs exact, the α cutoff for tests, decimal places, and a random seed so simulations repeat exactly.'],
          ['◐', 'Light or dark mode.'],
          ['Help', 'This guide.'],
        ].map(([k, v]) => el('tr', {}, el('td', {}, b(k)), el('td', {}, v)))),
        el('h4', { class: 'g-group' }, 'Keyboard'),
        el('table', { class: 'g-table' }, ...[
          ['/', 'Jump to the command box'],
          ['↑ ↓', 'Earlier commands'],
          ['Esc', 'Close this guide or a menu'],
          ['?', 'List of every command'],
        ].map(([k, v]) => el('tr', {}, el('td', {}, el('kbd', {}, k)), el('td', {}, v)))),
        more('Hover for help, or tap ⓘ',
          p('Most buttons explain themselves when you hold the mouse over them. On a phone or tablet, tap the small ⓘ icons instead.')),
      ],
    },
  ];
  function tile(icon, title, sub, onclick) {
    return el('button', { type: 'button', class: 'g-tile', onclick }, el('span', { class: 'g-tile-ic', 'aria-hidden': 'true' }, icon), el('span', { class: 'g-tile-t' }, title), el('span', { class: 'g-tile-s' }, sub));
  }

  // ---------- the modal ----------
  let root, nav, content, counter, backBtn, nextBtn, cur = 0, lastFocus = null;
  function build() {
    nav = el('nav', { class: 'g-nav', 'aria-label': 'Guide sections' });
    SECTIONS.forEach((s, i) => nav.append(el('button', { type: 'button', 'data-i': i, onclick: () => show(i) }, s.nav)));
    content = el('div', { class: 'g-content', tabindex: '-1' });
    counter = el('span', { class: 'g-count' });
    backBtn = el('button', { type: 'button', class: 'mini-btn', onclick: () => show(cur - 1) }, '← Back');
    nextBtn = el('button', { type: 'button', class: 'primary', onclick: () => (cur === SECTIONS.length - 1 ? close() : show(cur + 1)) });
    const box = el('div', { class: 'g-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Guide' },
      el('div', { class: 'g-head' }, el('h2', {}, 'Guide'), el('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close guide', 'data-tip': 'Close (Esc)', onclick: close }, '✕')),
      el('div', { class: 'g-main' }, nav, content),
      el('div', { class: 'g-foot' }, backBtn, counter, nextBtn));
    root = el('div', { class: 'g-wrap', hidden: true, onclick: (e) => { if (e.target === root) close(); } }, box);
    document.body.append(root);
  }
  function show(i, termId) {
    if (typeof i === 'string') i = Math.max(0, SECTIONS.findIndex((s) => s.id === i));
    cur = Math.max(0, Math.min(SECTIONS.length - 1, i));
    const s = SECTIONS[cur];
    content.innerHTML = '';
    content.append(el('h3', { class: 'g-title' }, s.title), ...s.body());
    content.scrollTop = 0;
    nav.querySelectorAll('button').forEach((bt) => { const on = +bt.dataset.i === cur; bt.classList.toggle('on', on); bt.setAttribute('aria-current', on ? 'step' : 'false'); if (on) bt.scrollIntoView({ block: 'nearest', inline: 'nearest' }); });
    counter.textContent = `${cur + 1} of ${SECTIONS.length}`;
    backBtn.disabled = cur === 0;
    nextBtn.textContent = cur === SECTIONS.length - 1 ? 'Start using it' : cur === 0 ? 'Take the tour →' : 'Next →';
    if (termId) {
      const d = content.querySelector(`#g-${termId}`);
      if (d) { d.open = true; requestAnimationFrame(() => d.scrollIntoView({ block: 'start' })); d.classList.add('g-hl'); }
    }
  }
  function open(section = 0, termId) {
    if (!root) build();
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add('g-lock');
    show(section, termId);
    content.focus({ preventScroll: true });
  }
  function close() {
    if (!root || root.hidden) return;
    root.hidden = true;
    document.body.classList.remove('g-lock');
    hideTip();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }
  const isOpen = () => !!root && !root.hidden;
  const openTerm = (id) => open('glossary', id);

  // ---------- tooltips ----------
  // Any element with data-tip shows it on mouse hover or keyboard focus; .tip-i buttons show it on tap.
  const tip = el('div', { class: 'tip', role: 'tooltip', hidden: true });
  let tipTimer, tipFor = null;
  function placeTip(t) {
    tip.textContent = t.dataset.tip;
    tip.hidden = false;
    tipFor = t;
    const r = t.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    const x = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
    let y = r.bottom + 8;
    if (y + h > innerHeight - 8) y = Math.max(8, r.top - h - 8);
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  }
  function showTip(t, delay = 380) { clearTimeout(tipTimer); tipTimer = setTimeout(() => { if (document.contains(t)) placeTip(t); }, delay); }
  function hideTip() { clearTimeout(tipTimer); tip.hidden = true; tipFor = null; }
  function initTips() {
    document.body.append(tip);
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse') return;
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (t === tipFor) return;
      if (t) showTip(t); else hideTip();
    });
    document.addEventListener('focusin', (e) => {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (t && t.matches(':focus-visible')) showTip(t, 0); else hideTip();
    });
    document.addEventListener('click', (e) => {
      const i = e.target.closest && e.target.closest('.tip-i');
      if (i) { e.preventDefault(); e.stopPropagation(); if (tipFor === i && !tip.hidden) hideTip(); else showTip(i, 0); return; }
      hideTip();
    }, true);
    addEventListener('scroll', hideTip, true);
    addEventListener('resize', hideTip);
  }
  // A small ⓘ that explains something on tap or hover
  const info = (text, cls = '') => el('button', { type: 'button', class: `tip-i ${cls}`.trim(), 'data-tip': text, 'aria-label': text }, 'ⓘ');
  // Panel hints are hidden on narrow screens: give each a tap-able ⓘ there instead
  function decorate(scope = document) {
    scope.querySelectorAll('.panel-title').forEach((pt) => {
      const h = pt.querySelector('.hint');
      if (!h || pt.querySelector('.tip-i.mob')) return;
      pt.querySelector('h3').after(info(h.textContent, 'mob'));
    });
  }

  function init(hooks) {
    H = hooks;
    initTips();
    decorate();
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideTip();
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.stopPropagation(); close(); }
      else if (e.key === 'Tab') { // keep focus inside the guide
        const f = [...root.querySelectorAll('button, input, summary, [tabindex="0"]')].filter((x) => x.offsetParent !== null && !x.disabled);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }, true);
  }

  EW.guide = { init, open, close, isOpen, openTerm, termFor, info, decorate, TERMS };
})();
