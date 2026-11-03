// Practice problems, grouped by syllabus week. Numbers are chosen so hand computation stays clean;
// solutions run the same calculator functions (and derivations/proofs) that the rest of the app uses.
(function () {
  const EW = window.EW;
  const { Data, RV } = EW;
  const t = (x) => EW.tex(x);
  const ri = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const pick = (a) => a[ri(0, a.length - 1)];
  const r2 = (x) => Math.round(x * 100) / 100;
  const TX = (s) => `\\text{${s.replace(/(?<!\\)([%#&$])/g, '\\$1')}}`;

  // A random split of N into k positive parts, roughly hump-shaped when hump = true
  function counts(N, k, hump = true) {
    const w = Array.from({ length: k }, (_, i) => (hump ? 1 + Math.random() * 2 + (k - Math.abs(i - (k - 1) / 2 - ri(-1, 1))) : 1 + Math.random() * 4));
    const s = w.reduce((a, b) => a + b, 0);
    const c = w.map((x) => Math.max(1, Math.round((x / s) * N)));
    c[ri(0, k - 1)] += N - c.reduce((a, b) => a + b, 0);
    return c.some((x) => x < 0) ? counts(N, k, hump) : c;
  }

  const TF = [
    { s: 'All unbiased estimators are consistent.', a: 'False', why: 'θ̂ₙ = X₁ is unbiased for μ but its distribution never concentrates, so it is not consistent.', proof: 'unbiasednotconsistent', pset: true },
    { s: 'Maximum likelihood requires specifying a full model for the distribution of the data.', a: 'True', why: 'The likelihood is the product of the densities f(Xᵢ; θ), so the whole density must be specified. Method of moments only needs a few moment equations.', proof: 'mlefull', pset: true },
    { s: 'If I generated 1000 independent samples with a large sample size and plotted the asymptotic 95% confidence interval for the mean from each, I would expect the true parameter to belong to 900 of the intervals.', a: 'False', why: 'Each interval covers with probability ≈ 0.95, so the count is Bin(1000, 0.95): expect about 950 (sd ≈ 6.9). 900 is what a 90% interval would give.', proof: 'coverage', pset: true },
    { s: 'Let X₁, …, Xₙ be i.i.d. Bernoulli(p). The standard error of X̄ₙ is p(1 − p)/n.', a: 'False', why: 'p(1 − p)/n is the variance of X̄ₙ. The standard error is its square root, √(p(1 − p)/n).', proof: 'sebern', pset: true },
    { s: 'A consistent estimator must be unbiased.', a: 'False', why: 'σ̂² = (1/n)Σ(Xᵢ − X̄)² has bias −σ²/n but is consistent: the bias vanishes as n → ∞.', proof: 'mseconsistent' },
    { s: 'If Bias(θ̂ₙ) → 0 and Var(θ̂ₙ) → 0, then θ̂ₙ is consistent.', a: 'True', why: 'MSE = Bias² + Var → 0, and Markov’s inequality gives P(|θ̂ₙ − θ| > ε) ≤ MSE/ε² → 0.', proof: 'mseconsistent' },
    { s: 'Once computed, a 95% confidence interval [2.1, 2.4] contains μ with probability 0.95.', a: 'False', why: 'μ is fixed and the interval is now fixed, so it either contains μ or not. The 95% describes the procedure: across repeated samples, 95% of intervals built this way cover μ.' },
    { s: 'The central limit theorem requires the data to be normally distributed.', a: 'False', why: 'The CLT holds for any i.i.d. data with finite variance; that is what makes asymptotic intervals and tests work for non-normal data.', proof: 'cideriv' },
    { s: 'The law of large numbers says that X̄ₙ is approximately normal for large n.', a: 'False', why: 'The LLN says X̄ₙ →p μ (it concentrates at the mean). The statement about the normal shape is the CLT.', proof: 'wlln' },
    { s: 'If A and B are disjoint events with P(A) > 0 and P(B) > 0, then A and B are independent.', a: 'False', why: 'Disjoint means P(A ∩ B) = 0, but independence needs P(A ∩ B) = P(A)P(B) > 0. Disjoint events are very dependent: if A happens, B cannot.' },
    { s: 'For independent X and Y, Var(X − Y) = Var(X) − Var(Y).', a: 'False', why: 'Var(X − Y) = Var(X) + (−1)²Var(Y) − 2Cov(X, Y) = Var(X) + Var(Y). Variances add even when you subtract.', proof: 'varsum' },
    { s: 'Doubling the sample size cuts the width of a confidence interval for the mean in half.', a: 'False', why: 'The width is 2zσ̂/√n, so doubling n shrinks it by a factor of 1/√2 ≈ 0.71. You need 4× the data to halve it.', proof: 'varmean' },
    { s: 'The p-value is the probability that the null hypothesis is true.', a: 'False', why: 'The p-value is P(a test statistic at least this extreme | H₀ true). It is computed assuming H₀; it is not a probability about H₀.' },
    { s: 'A method-of-moments estimate always lies inside the parameter space allowed by the data.', a: 'False', why: 'For U(0, θ), θ̃ = 2X̄ can be smaller than max Xᵢ, which the data rule out. The MLE X₍ₙ₎ never does this.' },
    { s: 'The OLS slope from regressing wages on years of schooling estimates the causal effect of schooling on wages.', a: 'Uncertain', why: 'Only if schooling is uncorrelated with the error (no omitted variables such as ability). Otherwise OLS picks up correlation, not causation.' },
    { s: 'Lowering the significance level α from 0.05 to 0.01 makes it harder to reject H₀.', a: 'True', why: 'The critical value moves out (1.960 → 2.576 for a two-sided z-test), so stronger evidence is needed. That lowers Type I error but raises Type II error.' },
    { s: 's² = (1/(n − 1))Σ(Xᵢ − X̄)² is an unbiased estimator of σ².', a: 'True', why: 'E[Σ(Xᵢ − X̄)²] = (n − 1)σ², because estimating μ by X̄ uses up one degree of freedom.' },
    { s: 'For X₁, …, Xₙ i.i.d. U(θ, 1), the MLE of θ is found by setting the derivative of the log-likelihood to zero.', a: 'False', why: 'ℓ(θ) = −n log(1 − θ) is strictly increasing wherever it is finite, so its derivative n/(1 − θ) is never 0. The maximum is at the boundary: θ̂ = min Xᵢ.' },
  ];

  const MODELS_FOR_DATA = ['normal', 'bern', 'pois', 'exp', 'unif0', 'unift1', 'geom'];
  function modelData(key) {
    switch (key) {
      case 'normal': return Array.from({ length: 8 }, () => ri(2, 12));
      case 'bern': return Array.from({ length: 10 }, () => (Math.random() < 0.4 ? 1 : 0));
      case 'pois': return Array.from({ length: 8 }, () => ri(0, 6));
      case 'exp': return Array.from({ length: 6 }, () => r2(0.1 + Math.random() * 2.4));
      case 'unif0': return Array.from({ length: 6 }, () => r2(Math.random() * 5));
      case 'unift1': return Array.from({ length: 6 }, () => r2(-2 + Math.random() * 3));
      case 'geom': return Array.from({ length: 8 }, () => ri(1, 6));
      default: return [1, 2, 3];
    }
  }

  const TYPES = {
    // ----- week 1: probability -----
    bayes: {
      week: 1, label: "Bayes' rule (diagnostic test)",
      make() {
        const prev = pick([0.01, 0.02, 0.05, 0.1]), sens = pick([0.9, 0.95, 0.99]), fp = pick([0.02, 0.05, 0.1]);
        return {
          prompt: `${TX(`A condition affects ${prev * 100}\\% of a population. A test is positive ${sens * 100}\\% of the time for people with it and ${fp * 100}\\% for people without it.`)}\\\\ ${TX('Given a positive test, what is the probability the person has the condition?')}`,
          solve: [`bayes(${prev}, ${sens}, ${fp})`],
          hint: "P(D | +) = P(+ | D)P(D) / P(+), and P(+) = P(+ | D)P(D) + P(+ | Dᶜ)P(Dᶜ) by the law of total probability.",
        };
      },
    },
    indep: {
      week: 1, label: 'Independence & conditional probability',
      make() {
        const pA = ri(2, 7) / 10, pB = ri(2, 7) / 10;
        const pAB = Math.random() < 0.5 ? r2(pA * pB) : r2(Math.min(pA, pB) * pick([0.5, 0.25, 0.75]));
        return {
          prompt: `P(A) = ${t(pA)},\\ P(B) = ${t(pB)},\\ P(A \\cap B) = ${t(pAB)}.\\quad ${TX('Find')}\\ P(A \\mid B),\\ P(A \\cup B)${TX(', and decide whether A and B are independent.')}`,
          solve: [`indep(${pA}, ${pB}, ${pAB})`],
          hint: 'Independent ⇔ P(A ∩ B) = P(A)P(B) ⇔ P(A | B) = P(A).',
        };
      },
    },
    counting: {
      week: 1, label: 'Counting (combinations)',
      make() {
        const a = ri(4, 7), b = ri(3, 6), k = ri(3, 4), j = ri(1, k - 1);
        return {
          prompt: `${TX(`A committee of ${k} is chosen at random from ${a} economics majors and ${b} math majors.`)}\\\\ ${TX(`What is the probability that exactly ${j} are economics majors?`)}`,
          solve: [`choose(${a}, ${j}) * choose(${b}, ${k - j}) / choose(${a + b}, ${k})`],
          hint: 'Equally likely outcomes: (ways to pick j econ) × (ways to pick the rest from math) / (all ways to pick k).',
        };
      },
    },
    // ----- week 2: random variables -----
    discrete: {
      week: 2, label: 'Discrete random variable: E, Var, P',
      make() {
        const vals = pick([[0, 1, 2, 3], [1, 2, 3, 4], [0, 1, 2], [-1, 0, 1, 2]]);
        const w = counts(10, vals.length, true);
        const probs = w.map((x) => x / 10);
        const c = vals[ri(1, vals.length - 1)];
        return {
          vars: { X: new RV('discrete', { values: vals, probs }) },
          prompt: `${TX('X has pmf')}\\quad \\begin{array}{c|${'c'.repeat(vals.length)}} x & ${vals.join(' & ')} \\\\ \\hline p(x) & ${probs.map(t).join(' & ')} \\end{array}\\qquad ${TX('Find')}\\ E[X],\\ \\operatorname{Var}(X),\\ P(X \\ge ${c}).`,
          solve: ['E(X)', 'Var(X)', `P(X, >=, ${c})`],
          hint: 'E[X] = Σ x p(x); Var(X) = E[X²] − (E[X])².',
        };
      },
    },
    normal: {
      week: 2, label: 'Normal probabilities & quantiles',
      make() {
        const mu = pick([50, 70, 100, 500]), sd = pick([5, 10, 15, 100].filter((s) => s < mu));
        const a = mu - sd * pick([1, 1.5, 2]), b = mu + sd * pick([0.5, 1, 2]);
        const q = pick([0.9, 0.95, 0.975]);
        return {
          prompt: `X \\sim N(${mu},\\ ${sd}^2).\\quad ${TX('Find')}\\ P(${t(a)} \\le X \\le ${t(b)})\\ ${TX('and the')}\\ ${q * 100}${TX('th percentile of X.')}`,
          solve: [`normprob(${a}, ${b}, ${mu}, ${sd})`, `qnorm(${q}, ${mu}, ${sd})`],
          hint: 'Standardize: Z = (X − μ)/σ ~ N(0, 1), then use Φ. For a percentile, x = μ + σ Φ⁻¹(p).',
        };
      },
    },
    binom: {
      week: 2, label: 'Binomial probabilities',
      make() {
        const n = ri(5, 12), p = pick([0.1, 0.2, 0.25, 0.3, 0.5]), k = ri(1, Math.min(4, n - 1));
        return {
          prompt: `${TX(`Each of ${n} independent customers buys with probability ${p}. Let X be the number who buy.`)}\\\\ ${TX('Find')}\\ P(X = ${k}),\\ P(X \\le ${k}),\\ E[X],\\ \\operatorname{Var}(X).`,
          vars: { X: new RV('binom', { n, p }) },
          solve: [`dbinom(${k}, ${n}, ${p})`, `pbinom(${k}, ${n}, ${p})`, 'E(X)', 'Var(X)'],
          hint: 'P(X = k) = C(n, k)pᵏ(1 − p)ⁿ⁻ᵏ; E[X] = np; Var(X) = np(1 − p).',
        };
      },
    },
    // ----- weeks 3–4: asymptotics & estimators -----
    clt: {
      week: 3, label: 'CLT approximation for X̄ₙ',
      make() {
        const mu = pick([20, 50, 3.2, 100]), sd = mu > 10 ? pick([4, 6, 8, 10]) : 1.5, n = pick([36, 49, 64, 100]);
        const c = r2(mu + (sd / Math.sqrt(n)) * pick([1, 1.5, 2]));
        return {
          prompt: `${TX(`Spending per visit has mean ${mu} and standard deviation ${sd} (not normal). For a random sample of n = ${n} visits,`)}\\\\ ${TX('approximate')}\\ P(\\bar X_n > ${t(c)}).`,
          solve: [`clt(${mu}, ${sd}, ${n}, ${c}, Inf)`],
          hint: 'By the CLT, X̄ₙ ≈ N(μ, σ²/n). Standardize with sd(X̄ₙ) = σ/√n.',
        };
      },
    },
    mse: {
      week: 4, label: 'Bias, variance & MSE',
      make() {
        const v1 = pick([0.5, 0.8, 1.2]), b = pick([0.2, 0.3, 0.5]), v2 = r2(v1 * pick([0.3, 0.5, 0.7]));
        return {
          prompt: `${TX('Two estimators of θ:')}\\ \\hat\\theta_A ${TX(' is unbiased with variance ')} ${t(v1)};\\ \\hat\\theta_B ${TX(' has bias ')} ${t(b)} ${TX(' and variance ')} ${t(v2)}.\\\\ ${TX('Which has the lower mean squared error? Show MSE = Bias² + Var.')}`,
          solve: [`mse(0, ${v1})`, `mse(${b}, ${v2})`],
          proof: 'mse',
          hint: 'MSE(θ̂) = Bias(θ̂)² + Var(θ̂). A little bias can be worth a big drop in variance.',
        };
      },
    },
    tf: {
      week: 4, pset: true, label: 'True / false / uncertain',
      make() {
        const it = pick(TF);
        return { prompt: `${TX('True, false, or uncertain? Explain.')}\\\\[4pt] \\textit{${it.s.replace(/([#$%&_{}])/g, '\\$1')}}`, tf: it, proof: it.proof, hint: 'Look for a counterexample, or go back to the definition.' };
      },
    },
    // ----- week 5: inference & estimation -----
    ciFreq: {
      week: 5, pset: true, label: 'CI for a mean from a frequency table',
      make() {
        const N = pick([100, 150, 200, 250, 400]), vals = [0, 1, 2, 3, 4];
        const c = counts(N, 5, true);
        const level = pick([0.9, 0.95, 0.95, 0.99]);
        const what = pick(['social media accounts', 'coffees per day', 'courses dropped', 'siblings']);
        return {
          vars: { x: new Data(vals.flatMap((v, i) => Array(c[i]).fill(v)), { values: vals, counts: c }) },
          prompt: `${TX(`We ask ${N} randomly sampled students how many ${what} they have:`)}\\\\[6pt] \\begin{array}{c|ccccc} ${TX('answer')} & 0 & 1 & 2 & 3 & 4 \\\\ \\hline ${TX('students')} & ${c.join(' & ')} \\end{array}\\\\ ${TX(`Report a ${level * 100}% confidence interval for the mean and interpret it.`)}`,
          solve: [`ci(x, ${level})`],
          hint: 'X̄ₙ = Σ value × count / n. Then σ̂, SE = σ̂/√n, and X̄ₙ ± Φ⁻¹(1 − α/2)·SE using Table 1.',
        };
      },
    },
    ciProp: {
      week: 5, label: 'CI for a proportion',
      make() {
        const n = pick([200, 400, 500, 1000]), k = Math.round(n * pick([0.3, 0.42, 0.55, 0.61]));
        return {
          prompt: `${TX(`In a poll of ${n} voters, ${k} support a policy. Give a 95% confidence interval for the share p who support it.`)}`,
          solve: [`propci(${k}, ${n}, 0.95)`],
          hint: 'p̂ ± 1.960·√(p̂(1 − p̂)/n).',
        };
      },
    },
    htest: {
      week: 5, label: 'Hypothesis test for a mean',
      make() {
        const mu0 = pick([10, 50, 100]), s = pick([4, 8, 12]), n = pick([36, 64, 100]);
        const xb = r2(mu0 + (s / Math.sqrt(n)) * pick([-2.4, -1.2, 0.8, 1.7, 2.3, 2.9]));
        const alt = pick(['two', 'greater', 'less']);
        const sym = { two: '\\ne', greater: '>', less: '<' }[alt];
        return {
          prompt: `${TX(`A sample of n = ${n} has mean ${xb} and standard deviation ${s}. At α = 0.05, test`)}\\ H_0: \\mu = ${mu0}\\ ${TX('vs')}\\ H_1: \\mu ${sym} ${mu0}.`,
          solve: [`ztest(${xb}, ${mu0}, ${s}, ${n}, ${alt})`],
          hint: 'Z = (X̄ − μ₀)/(σ̂/√n). Two-sided: reject if |Z| > 1.960; one-sided: compare with 1.645.',
        };
      },
    },
    mom: {
      week: 5, label: 'Method of moments on data',
      make() {
        const key = pick(MODELS_FOR_DATA), M = EW.derive.MODELS[key];
        const v = modelData(key);
        return {
          vars: { x: new Data(v) },
          prompt: `X_1, \\ldots, X_n \\overset{iid}{\\sim} ${M.name}.\\ ${TX('Find the method-of-moments estimator and compute it for')}\\ x = ${EW.T.list(v, 12)}.`,
          solve: [`mom(x, ${M.cli})`], derive: { model: key, method: 'mom' },
          hint: 'Write E[X] (and E[X²] if there are two parameters) in terms of the parameters, set them equal to the sample moments, and solve.',
        };
      },
    },
    mle: {
      week: 5, pset: true, label: 'Derive an MLE',
      make() {
        const key = pick(['normal0', 'unift1', 'bern', 'pois', 'exp', 'unif0', 'geom', 'normal']), M = EW.derive.MODELS[key];
        const v = modelData(key === 'normal0' ? 'normal' : key).map((x) => (key === 'normal0' ? x - 7 : x));
        return {
          vars: { x: new Data(v) },
          prompt: `X_1, \\ldots, X_n \\overset{iid}{\\sim} ${M.name}${M.pset ? `\\ (${TX(M.pset)})` : ''}:\\quad ${M.density}.\\\\ ${TX('Write the likelihood and log-likelihood, derive the MLE, show it is consistent, and compute it for')}\\ x = ${EW.T.list(v, 12)}.`,
          solve: [`mle(x, ${M.cli})`], derive: { model: key, method: 'mle' },
          hint: key === 'unift1' || key === 'unif0' ? 'Write the likelihood with an indicator of the support. Calculus won’t work: check where the likelihood is increasing and push θ to the boundary.' : 'Take logs, differentiate, set to zero, solve, and check the second derivative is negative.',
        };
      },
    },
    // ----- week 6: regression -----
    ols: {
      week: 6, label: 'Simple linear regression',
      make() {
        const n = ri(5, 6), b0 = ri(1, 5), b1 = pick([1, 2, 3, -1, 0.5]);
        const x = Array.from({ length: n }, (_, i) => i + ri(0, 1) * (i ? 1 : 0)).map((v, i) => v + i);
        const y = x.map((xi) => r2(b0 + b1 * xi + ri(-2, 2)));
        const names = pick([['educ', 'wage'], ['hours', 'score'], ['price', 'sales'], ['x', 'y']]);
        return {
          vars: { [names[0]]: new Data(x), [names[1]]: new Data(y) },
          prompt: `${TX('Estimate')}\\ ${names[1]}_i = \\beta_0 + \\beta_1 ${names[0]}_i + u_i\\ ${TX('by OLS and interpret the slope:')}\\\\[6pt] \\begin{array}{c|${'c'.repeat(n)}} ${names[0]} & ${x.join(' & ')} \\\\ \\hline ${names[1]} & ${y.map(t).join(' & ')} \\end{array}`,
          solve: [`ols(${names[1]}, ${names[0]})`], proof: 'ols',
          hint: 'β̂₁ = Σ(xᵢ − x̄)(yᵢ − ȳ)/Σ(xᵢ − x̄)², β̂₀ = ȳ − β̂₁x̄.',
        };
      },
    },
  };

  const WEEKS = { 1: 'Week 1 — Probability', 2: 'Week 2 — Random variables', 3: 'Week 3 — Asymptotics', 4: 'Week 4 — Estimators', 5: 'Week 5 — Testing & estimation', 6: 'Week 6 — Regression' };

  // type: a TYPES key, 'mix' (everything), 'pset' (PSET 6 topics), 'w13' or 'w46' (syllabus weeks)
  function generate(type) {
    let keys = Object.keys(TYPES);
    if (type === 'pset') keys = keys.filter((k) => TYPES[k].pset || ['mse', 'mom'].includes(k));
    else if (type === 'w13') keys = keys.filter((k) => TYPES[k].week <= 3);
    else if (type === 'w46') keys = keys.filter((k) => TYPES[k].week >= 4);
    const k = TYPES[type] ? type : pick(keys);
    return { type: k, label: TYPES[k].label, vars: {}, ...TYPES[k].make() };
  }

  EW.practice = { TYPES, WEEKS, TF, generate };
})();
