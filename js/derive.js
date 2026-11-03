// Estimator derivations (MLE / method of moments) and a proof library — the "Explain" side of the workbench.
// Each line is { tex, why, whyTex }: the expression and the rule that justifies getting there.
(function () {
  const EW = window.EW;
  const { mean, varP, rawMoment } = EW.stats;
  const t = (x) => EW.tex(x);
  const L = (tex, why = '', whyTex = '') => ({ tex, why, whyTex });
  const sec = (h, lines) => ({ h, lines });
  const SX = '\\sum_{i=1}^{n}';
  const IND = 'Independence: the joint density is the product of the marginals';
  const LOGP = 'Log of a product is the sum of the logs';
  const WLLN = 'Weak law of large numbers';
  const CMT = 'Continuous mapping theorem';

  const MODELS = {
    normal0: {
      name: 'N(0, \\sigma^2)', plain: 'N(0, σ²)', cli: 'normal0', aliases: ['normal0', 'norm0', 'n0', 'normalmean0', 'normalzero'],
      paramTex: { sigma2: '\\sigma^2' }, truth: { sigma2: 4 }, pset: 'PSET 6 Q4',
      density: 'f(x; \\sigma^2) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} \\exp\\!\\left(-\\frac{x^2}{2\\sigma^2}\\right),\\quad 0 < \\sigma^2 < \\infty',
      sample: (g, p) => Math.sqrt(p.sigma2) * g.normal(),
      mle: {
        est: (v) => ({ sigma2: rawMoment(v, 2) }),
        plug: () => '\\frac{1}{n}\\sum X_i^2 = ',
        result: `\\hat\\sigma^2_n = \\frac{1}{n}${SX} X_i^2`,
        sections: [
          sec('Likelihood', [
            L(`L_n(\\sigma^2) = \\prod_{i=1}^{n} f(X_i; \\sigma^2)`, IND),
            L(`= \\prod_{i=1}^{n} (2\\pi\\sigma^2)^{-1/2} \\exp\\!\\left(-\\frac{X_i^2}{2\\sigma^2}\\right)`, 'Plug in the density'),
            L(`= (2\\pi\\sigma^2)^{-n/2} \\exp\\!\\left(-\\frac{1}{2\\sigma^2}${SX} X_i^2\\right)`, 'A product of exponentials is the exponential of the sum', '\\prod e^{a_i} = e^{\\sum a_i}'),
          ]),
          sec('Log-likelihood', [
            L(`\\ell_n(\\sigma^2) = \\log L_n(\\sigma^2) = -\\frac{n}{2}\\log(2\\pi) - \\frac{n}{2}\\log\\sigma^2 - \\frac{1}{2\\sigma^2}${SX} X_i^2`, LOGP),
          ]),
          sec('First-order condition', [
            L(`\\frac{\\partial \\ell_n}{\\partial \\sigma^2} = -\\frac{n}{2\\sigma^2} + \\frac{1}{2(\\sigma^2)^2}${SX} X_i^2 = 0`, 'Differentiate in v = σ² (treat σ² as the parameter)', '\\tfrac{d}{dv}\\log v = \\tfrac1v,\\ \\tfrac{d}{dv}\\tfrac1v = -\\tfrac1{v^2}'),
            L(`\\iff n\\sigma^2 = ${SX} X_i^2 \\iff \\hat\\sigma^2_n = \\frac{1}{n}${SX} X_i^2`, 'Multiply through by 2σ⁴ and solve'),
          ]),
          sec('Second-order check', [
            L(`\\frac{\\partial^2 \\ell_n}{\\partial (\\sigma^2)^2} = \\frac{n}{2\\sigma^4} - \\frac{1}{\\sigma^6}${SX} X_i^2`, 'Differentiate again'),
            L(`\\text{at } \\hat\\sigma^2_n:\\quad \\frac{n}{2\\hat\\sigma^4} - \\frac{n\\hat\\sigma^2}{\\hat\\sigma^6} = -\\frac{n}{2\\hat\\sigma^4} < 0`, 'Use Σ Xᵢ² = n σ̂²: negative, so it is a maximum'),
          ]),
          sec('Bias', [
            L(`E[\\hat\\sigma^2_n] = \\frac{1}{n}${SX} E[X_i^2] = E[X_1^2]`, 'Linearity of expectation; identically distributed'),
            L(`= \\operatorname{Var}(X_1) + (E[X_1])^2 = \\sigma^2 + 0 = \\sigma^2`, 'Var X = E[X²] − (E X)²'),
            L('\\Rightarrow\\ \\hat\\sigma^2_n \\text{ is unbiased.}'),
          ]),
          sec('Consistency', [
            L(`X_1^2, \\ldots, X_n^2 \\text{ are i.i.d. with } E[X_1^2] = \\sigma^2 < \\infty`, 'Functions of i.i.d. variables are i.i.d.'),
            L(`\\hat\\sigma^2_n = \\frac{1}{n}${SX} X_i^2 \\xrightarrow{p} E[X_1^2] = \\sigma^2`, WLLN),
            L(`\\text{(Or: } \\operatorname{MSE} = \\operatorname{Var}(\\hat\\sigma^2_n) = \\tfrac{\\operatorname{Var}(X_1^2)}{n} = \\tfrac{2\\sigma^4}{n} \\to 0\\text{)}`, 'Unbiased with variance → 0 also gives consistency (Chebyshev)'),
          ]),
        ],
      },
      mom: {
        est: (v) => ({ sigma2: rawMoment(v, 2) }),
        plug: () => '\\frac{1}{n}\\sum X_i^2 = ',
        result: `\\tilde\\sigma^2_n = \\frac{1}{n}${SX} X_i^2`,
        sections: [
          sec('Match moments', [
            L('E[X] = 0', 'The first moment does not involve σ², so it can’t identify it'),
            L('E[X^2] = \\operatorname{Var}(X) + (E X)^2 = \\sigma^2', 'Use the second moment instead'),
            L(`\\frac{1}{n}${SX} X_i^2 = \\tilde\\sigma^2 \\ \\Rightarrow\\ \\tilde\\sigma^2_n = \\frac{1}{n}${SX} X_i^2`, 'Replace E[X²] with the sample moment θ̂₂'),
            L('\\text{Same as the MLE here.}'),
          ]),
          sec('Consistency', [L(`\\tilde\\sigma^2_n \\xrightarrow{p} E[X^2] = \\sigma^2`, WLLN)]),
        ],
      },
    },

    normal: {
      name: 'N(\\mu, \\sigma^2)', plain: 'N(μ, σ²)', cli: 'normal', aliases: ['normal', 'norm', 'gaussian', 'n'],
      paramTex: { mu: '\\mu', sigma2: '\\sigma^2' }, truth: { mu: 1, sigma2: 4 },
      density: 'f(x; \\mu, \\sigma^2) = \\frac{1}{\\sqrt{2\\pi\\sigma^2}} \\exp\\!\\left(-\\frac{(x-\\mu)^2}{2\\sigma^2}\\right)',
      sample: (g, p) => p.mu + Math.sqrt(p.sigma2) * g.normal(),
      mle: {
        est: (v) => ({ mu: mean(v), sigma2: varP(v) }),
        plug: (v, k) => (k === 'mu' ? '\\bar X_n = ' : '\\frac{1}{n}\\sum (X_i - \\bar X_n)^2 = '),
        result: `\\hat\\mu_n = \\bar X_n,\\qquad \\hat\\sigma^2_n = \\frac{1}{n}${SX} (X_i - \\bar X_n)^2`,
        sections: [
          sec('Likelihood', [
            L(`L_n(\\mu, \\sigma^2) = \\prod_{i=1}^{n} \\frac{1}{\\sqrt{2\\pi\\sigma^2}} e^{-(X_i - \\mu)^2/(2\\sigma^2)}`, IND),
            L(`= (2\\pi\\sigma^2)^{-n/2} \\exp\\!\\left(-\\frac{1}{2\\sigma^2}${SX}(X_i-\\mu)^2\\right)`, 'A product of exponentials is the exponential of the sum'),
          ]),
          sec('Log-likelihood', [
            L(`\\ell_n(\\mu, \\sigma^2) = -\\frac{n}{2}\\log(2\\pi) - \\frac{n}{2}\\log\\sigma^2 - \\frac{1}{2\\sigma^2}${SX}(X_i-\\mu)^2`, LOGP),
          ]),
          sec('First-order conditions', [
            L(`\\frac{\\partial \\ell_n}{\\partial \\mu} = \\frac{1}{\\sigma^2}${SX}(X_i - \\mu) = 0 \\iff \\hat\\mu_n = \\bar X_n`, 'Chain rule; Σ(Xᵢ − μ) = nX̄ − nμ'),
            L(`\\frac{\\partial \\ell_n}{\\partial \\sigma^2} = -\\frac{n}{2\\sigma^2} + \\frac{1}{2\\sigma^4}${SX}(X_i-\\mu)^2 = 0 \\iff \\hat\\sigma^2_n = \\frac{1}{n}${SX}(X_i - \\bar X_n)^2`, 'Solve, plugging in μ̂ = X̄'),
          ]),
          sec('Bias', [
            L('E[\\hat\\mu_n] = \\mu', 'E[X̄] = μ: unbiased'),
            L(`E[\\hat\\sigma^2_n] = \\frac{n-1}{n}\\sigma^2 = \\sigma^2 - \\frac{\\sigma^2}{n}`, 'Using X̄ instead of μ loses one degree of freedom'),
            L(`\\Rightarrow\\ \\text{biased, but the bias } -\\sigma^2/n \\to 0;\\quad s^2 = \\tfrac{n}{n-1}\\hat\\sigma^2_n \\text{ is unbiased}`),
          ]),
          sec('Consistency', [
            L('\\bar X_n \\xrightarrow{p} \\mu', WLLN),
            L(`\\hat\\sigma^2_n = \\frac{1}{n}${SX} X_i^2 - \\bar X_n^2 \\xrightarrow{p} (\\sigma^2 + \\mu^2) - \\mu^2 = \\sigma^2`, `${WLLN} on both averages, then the ${CMT.toLowerCase()} for g(a, b) = a − b²`),
          ]),
        ],
      },
      mom: {
        est: (v) => ({ mu: mean(v), sigma2: varP(v) }),
        plug: (v, k) => (k === 'mu' ? '\\hat\\theta_1 = ' : '\\hat\\theta_2 - \\hat\\theta_1^2 = '),
        result: '\\tilde\\mu_n = \\hat\\theta_1 = \\bar X_n,\\qquad \\tilde\\sigma^2_n = \\hat\\theta_2 - \\hat\\theta_1^2',
        sections: [
          sec('Match moments', [
            L('E[X] = \\mu,\\qquad E[X^2] = \\sigma^2 + \\mu^2', 'Two unknowns → two moment equations'),
            L('\\hat\\theta_1 = \\tilde\\mu,\\qquad \\hat\\theta_2 = \\tilde\\sigma^2 + \\tilde\\mu^2', 'Replace population moments by sample moments θ̂ₖ = (1/n)Σ Xᵢᵏ'),
            L(`\\Rightarrow\\ \\tilde\\mu_n = \\bar X_n,\\quad \\tilde\\sigma^2_n = \\frac{1}{n}${SX} X_i^2 - \\bar X_n^2 = \\frac{1}{n}${SX}(X_i - \\bar X_n)^2`, 'Solve; same as the MLE'),
          ]),
          sec('Consistency', [L('(\\hat\\theta_1, \\hat\\theta_2) \\xrightarrow{p} (\\theta_1, \\theta_2),\\ g(a, b) = (a,\\ b - a^2) \\text{ continuous} \\Rightarrow \\text{consistent}', `${WLLN} + ${CMT}`)]),
        ],
      },
    },

    bern: {
      name: '\\operatorname{Bernoulli}(p)', plain: 'Bernoulli(p)', cli: 'bernoulli', aliases: ['bernoulli', 'bern', 'binary'],
      paramTex: { p: 'p' }, truth: { p: 0.3 },
      density: 'f(x; p) = p^x (1-p)^{1-x},\\quad x \\in \\{0, 1\\}',
      sample: (g, p) => (g.u() < p.p ? 1 : 0),
      check: (v) => (v.every((x) => x === 0 || x === 1) ? null : 'Bernoulli data should be 0s and 1s.'),
      mle: {
        est: (v) => ({ p: mean(v) }), plug: () => '\\bar X_n = ',
        result: '\\hat p_n = \\bar X_n',
        sections: [
          sec('Likelihood', [
            L(`L_n(p) = \\prod_{i=1}^{n} p^{X_i}(1-p)^{1-X_i} = p^{\\sum X_i}(1-p)^{n - \\sum X_i}`, `${IND}; add exponents`),
          ]),
          sec('Log-likelihood', [L(`\\ell_n(p) = \\Big(${SX} X_i\\Big)\\log p + \\Big(n - ${SX} X_i\\Big)\\log(1-p)`, LOGP)]),
          sec('First-order condition', [
            L(`\\ell_n'(p) = \\frac{\\sum X_i}{p} - \\frac{n - \\sum X_i}{1-p} = 0`, 'Differentiate'),
            L('\\iff (1-p)\\sum X_i = p\\Big(n - \\sum X_i\\Big) \\iff \\sum X_i = np \\iff \\hat p_n = \\bar X_n', 'Cross-multiply; the p·ΣXᵢ terms cancel'),
          ]),
          sec('Second-order check', [L(`\\ell_n''(p) = -\\frac{\\sum X_i}{p^2} - \\frac{n - \\sum X_i}{(1-p)^2} < 0`, 'Concave everywhere, so the critical point is the maximum')]),
          sec('Bias, variance, standard error', [
            L('E[\\hat p_n] = E[X_1] = p', 'Unbiased'),
            L('\\operatorname{Var}(\\hat p_n) = \\frac{\\operatorname{Var}(X_1)}{n} = \\frac{p(1-p)}{n}', 'Var of a mean; Var(X) = p(1 − p) for Bernoulli'),
            L('\\operatorname{SE}(\\hat p_n) = \\sqrt{\\frac{p(1-p)}{n}} \\approx \\sqrt{\\frac{\\hat p_n(1-\\hat p_n)}{n}}', 'The SE is a standard deviation — take the square root (PSET 6 Q6.4)'),
          ]),
          sec('Consistency', [L('\\hat p_n = \\bar X_n \\xrightarrow{p} E[X_1] = p', WLLN)]),
        ],
      },
      mom: {
        est: (v) => ({ p: mean(v) }), plug: () => '\\bar X_n = ', result: '\\tilde p_n = \\bar X_n',
        sections: [sec('Match moments', [L('E[X] = p \\ \\Rightarrow\\ \\tilde p_n = \\hat\\theta_1 = \\bar X_n', 'Set the sample mean equal to the population mean')]), sec('Consistency', [L('\\bar X_n \\xrightarrow{p} p', WLLN)])],
      },
    },

    pois: {
      name: '\\operatorname{Poisson}(\\lambda)', plain: 'Poisson(λ)', cli: 'poisson', aliases: ['poisson', 'pois'],
      paramTex: { lambda: '\\lambda' }, truth: { lambda: 3 },
      density: 'f(x; \\lambda) = \\frac{e^{-\\lambda}\\lambda^x}{x!},\\quad x = 0, 1, 2, \\ldots',
      sample: (g, p) => g.poisson(p.lambda),
      check: (v) => (v.every((x) => Number.isInteger(x) && x >= 0) ? null : 'Poisson data should be whole numbers ≥ 0.'),
      mle: {
        est: (v) => ({ lambda: mean(v) }), plug: () => '\\bar X_n = ', result: '\\hat\\lambda_n = \\bar X_n',
        sections: [
          sec('Likelihood', [L(`L_n(\\lambda) = \\prod_{i=1}^{n} \\frac{e^{-\\lambda}\\lambda^{X_i}}{X_i!} = \\frac{e^{-n\\lambda}\\lambda^{\\sum X_i}}{\\prod X_i!}`, IND)]),
          sec('Log-likelihood', [L(`\\ell_n(\\lambda) = -n\\lambda + \\Big(${SX} X_i\\Big)\\log\\lambda - ${SX}\\log(X_i!)`, LOGP)]),
          sec('First-order condition', [L(`\\ell_n'(\\lambda) = -n + \\frac{\\sum X_i}{\\lambda} = 0 \\iff \\hat\\lambda_n = \\bar X_n`, 'The last term does not depend on λ')]),
          sec('Second-order check', [L(`\\ell_n''(\\lambda) = -\\frac{\\sum X_i}{\\lambda^2} < 0`, 'Concave: a maximum')]),
          sec('Bias', [L('E[\\hat\\lambda_n] = \\lambda,\\quad \\operatorname{Var}(\\hat\\lambda_n) = \\frac{\\lambda}{n}', 'Unbiased; Var(X) = λ for Poisson')]),
          sec('Consistency', [L('\\bar X_n \\xrightarrow{p} \\lambda', WLLN)]),
        ],
      },
      mom: {
        est: (v) => ({ lambda: mean(v) }), plug: () => '\\bar X_n = ', result: '\\tilde\\lambda_n = \\bar X_n',
        sections: [sec('Match moments', [
          L('E[X] = \\lambda \\ \\Rightarrow\\ \\tilde\\lambda_n = \\bar X_n', 'First moment'),
          L('\\text{Also } \\operatorname{Var}(X) = \\lambda \\text{, so } \\hat\\sigma^2_n \\text{ is another MoM estimator — MoM need not be unique.}'),
        ]), sec('Consistency', [L('\\bar X_n \\xrightarrow{p} \\lambda', WLLN)])],
      },
    },

    exp: {
      name: '\\operatorname{Exp}(\\lambda)', plain: 'Exponential(λ)', cli: 'exponential', aliases: ['exponential', 'exp', 'expo'],
      paramTex: { lambda: '\\lambda' }, truth: { lambda: 2 },
      density: 'f(x; \\lambda) = \\lambda e^{-\\lambda x},\\quad x \\ge 0',
      sample: (g, p) => -Math.log(1 - g.u()) / p.lambda,
      check: (v) => (v.every((x) => x >= 0) ? null : 'Exponential data must be ≥ 0.'),
      mle: {
        est: (v) => ({ lambda: 1 / mean(v) }), plug: () => '\\frac{1}{\\bar X_n} = ', result: '\\hat\\lambda_n = \\frac{1}{\\bar X_n}',
        sections: [
          sec('Likelihood', [L(`L_n(\\lambda) = \\prod_{i=1}^{n} \\lambda e^{-\\lambda X_i} = \\lambda^n e^{-\\lambda \\sum X_i}`, IND)]),
          sec('Log-likelihood', [L(`\\ell_n(\\lambda) = n\\log\\lambda - \\lambda${SX} X_i`, LOGP)]),
          sec('First-order condition', [L(`\\ell_n'(\\lambda) = \\frac{n}{\\lambda} - ${SX} X_i = 0 \\iff \\hat\\lambda_n = \\frac{n}{\\sum X_i} = \\frac{1}{\\bar X_n}`, 'Solve')]),
          sec('Second-order check', [L(`\\ell_n''(\\lambda) = -\\frac{n}{\\lambda^2} < 0`, 'A maximum')]),
          sec('Bias', [
            L('E\\!\\left[\\frac{1}{\\bar X_n}\\right] > \\frac{1}{E[\\bar X_n]} = \\lambda', "Jensen's inequality: 1/x is strictly convex"),
            L('E[\\hat\\lambda_n] = \\frac{n}{n-1}\\lambda \\ \\Rightarrow\\ \\operatorname{Bias} = \\frac{\\lambda}{n-1} \\to 0', 'ΣXᵢ ~ Gamma(n, λ), so E[1/ΣXᵢ] = λ/(n − 1)'),
          ]),
          sec('Consistency', [
            L('\\bar X_n \\xrightarrow{p} E[X_1] = \\frac{1}{\\lambda}', WLLN),
            L('g(u) = 1/u \\text{ is continuous at } 1/\\lambda > 0 \\ \\Rightarrow\\ \\hat\\lambda_n = g(\\bar X_n) \\xrightarrow{p} g(1/\\lambda) = \\lambda', CMT),
          ]),
        ],
      },
      mom: {
        est: (v) => ({ lambda: 1 / mean(v) }), plug: () => '\\frac{1}{\\bar X_n} = ', result: '\\tilde\\lambda_n = 1/\\bar X_n',
        sections: [sec('Match moments', [L('E[X] = \\frac{1}{\\lambda} \\ \\Rightarrow\\ \\bar X_n = \\frac{1}{\\tilde\\lambda} \\ \\Rightarrow\\ \\tilde\\lambda_n = \\frac{1}{\\bar X_n}', 'Same as the MLE')]), sec('Consistency', [L('\\tilde\\lambda_n \\xrightarrow{p} \\lambda', `${WLLN} + ${CMT}`)])],
      },
    },

    geom: {
      name: '\\operatorname{Geom}(p)', plain: 'Geometric(p)', cli: 'geometric', aliases: ['geometric', 'geom'],
      paramTex: { p: 'p' }, truth: { p: 0.25 },
      density: 'f(x; p) = (1-p)^{x-1}p,\\quad x = 1, 2, \\ldots',
      sample: (g, p) => Math.max(1, Math.ceil(Math.log(1 - g.u()) / Math.log(1 - p.p))),
      check: (v) => (v.every((x) => Number.isInteger(x) && x >= 1) ? null : 'Geometric data (trials until first success) are whole numbers ≥ 1.'),
      mle: {
        est: (v) => ({ p: 1 / mean(v) }), plug: () => '\\frac{1}{\\bar X_n} = ', result: '\\hat p_n = \\frac{1}{\\bar X_n}',
        sections: [
          sec('Likelihood', [L(`L_n(p) = \\prod_{i=1}^{n} (1-p)^{X_i - 1}p = p^n (1-p)^{\\sum X_i - n}`, IND)]),
          sec('Log-likelihood', [L(`\\ell_n(p) = n\\log p + \\Big(${SX} X_i - n\\Big)\\log(1-p)`, LOGP)]),
          sec('First-order condition', [L(`\\frac{n}{p} - \\frac{\\sum X_i - n}{1-p} = 0 \\iff n(1-p) = p\\Big(\\sum X_i - n\\Big) \\iff \\hat p_n = \\frac{n}{\\sum X_i} = \\frac{1}{\\bar X_n}`, 'Cross-multiply; the np terms cancel')]),
          sec('Consistency', [L('\\bar X_n \\xrightarrow{p} \\frac1p,\\ \\ g(u) = \\frac1u \\text{ continuous} \\Rightarrow \\hat p_n \\xrightarrow{p} p', `${WLLN} + ${CMT}`), L('\\text{Biased upward in finite samples (Jensen), bias} \\to 0')]),
        ],
      },
      mom: {
        est: (v) => ({ p: 1 / mean(v) }), plug: () => '\\frac{1}{\\bar X_n} = ', result: '\\tilde p_n = 1/\\bar X_n',
        sections: [sec('Match moments', [L('E[X] = \\frac1p \\ \\Rightarrow\\ \\tilde p_n = \\frac{1}{\\bar X_n}', 'Same as the MLE')])],
      },
    },

    unif0: {
      name: 'U(0, \\theta)', plain: 'U(0, θ)', cli: 'uniform0', aliases: ['uniform0', 'unif0', 'u0', 'uniform0theta', 'u0theta'],
      paramTex: { theta: '\\theta' }, truth: { theta: 2 },
      density: 'f(x; \\theta) = \\frac{1}{\\theta}\\mathbf 1\\{x \\in [0, \\theta]\\},\\quad \\theta > 0',
      sample: (g, p) => p.theta * g.u(),
      check: (v) => (v.every((x) => x >= 0) ? null : 'U(0, θ) data must be ≥ 0.'),
      mle: {
        est: (v) => ({ theta: Math.max(...v) }), plug: () => 'X_{(n)} = \\max_i X_i = ', result: '\\hat\\theta_n = X_{(n)} = \\max_i X_i',
        sections: [
          sec('Likelihood', [
            L(`L_n(\\theta) = \\prod_{i=1}^{n} \\frac{1}{\\theta}\\mathbf 1\\{0 \\le X_i \\le \\theta\\}`, IND),
            L(`= \\theta^{-n}\\prod_{i=1}^{n}\\mathbf 1\\{X_i \\le \\theta\\}`, 'Pull out the constant; Xᵢ ≥ 0 always holds'),
            L('= \\theta^{-n}\\,\\mathbf 1\\{\\theta \\ge X_{(n)}\\}', 'Every Xᵢ ≤ θ exactly when the largest one is', '\\textstyle\\prod_i \\mathbf 1\\{X_i \\le \\theta\\} = \\mathbf 1\\{\\max_i X_i \\le \\theta\\}'),
          ]),
          sec('Log-likelihood', [L('\\ell_n(\\theta) = \\begin{cases} -n\\log\\theta & \\theta \\ge X_{(n)} \\\\ -\\infty & \\theta < X_{(n)} \\end{cases}', 'log 0 = −∞: those θ are impossible given the data')]),
          sec('Maximize (no calculus)', [
            L(`\\ell_n'(\\theta) = -\\frac{n}{\\theta} \\ne 0`, 'The first-order condition has no solution — the maximum is at the edge of the support'),
            L('-n\\log\\theta \\text{ is strictly decreasing, so take the smallest allowed } \\theta', 'Monotone on [X₍ₙ₎, ∞), and the likelihood is 0 to the left'),
            L('\\hat\\theta_n = X_{(n)} = \\max_i X_i'),
          ]),
          sec('Bias', [
            L('P(X_{(n)} \\le s) = \\prod_i P(X_i \\le s) = (s/\\theta)^n,\\quad 0 \\le s \\le \\theta', 'cdf of the maximum'),
            L('E[X_{(n)}] = \\int_0^\\theta s\\cdot \\frac{n s^{n-1}}{\\theta^n}\\,ds = \\frac{n}{n+1}\\theta', 'Differentiate the cdf for the density'),
            L('\\operatorname{Bias} = -\\frac{\\theta}{n+1} \\to 0;\\quad \\tfrac{n+1}{n}X_{(n)} \\text{ is unbiased}', 'Always underestimates: X₍ₙ₎ ≤ θ'),
          ]),
          sec('Consistency', [
            L('\\text{The max is not a sample average, so the LLN doesn’t apply — compute the probability directly.}'),
            L('\\text{For } 0 < \\varepsilon < \\theta:\\ P(|\\hat\\theta_n - \\theta| > \\varepsilon) = P(X_{(n)} < \\theta - \\varepsilon)', 'θ̂ₙ ≤ θ, so only the lower side matters'),
            L('= \\prod_{i=1}^n P(X_i < \\theta - \\varepsilon) = \\left(\\frac{\\theta - \\varepsilon}{\\theta}\\right)^n \\xrightarrow[n\\to\\infty]{} 0', 'Independence; 0 ≤ (θ − ε)/θ < 1'),
            L('\\Rightarrow\\ \\hat\\theta_n \\xrightarrow{p} \\theta', 'Definition of convergence in probability'),
          ]),
        ],
      },
      mom: {
        est: (v) => ({ theta: 2 * mean(v) }), plug: () => '2\\bar X_n = ', result: '\\tilde\\theta_n = 2\\bar X_n',
        sections: [
          sec('Match moments', [L('E[X] = \\frac{\\theta}{2} \\ \\Rightarrow\\ \\bar X_n = \\frac{\\tilde\\theta}{2} \\ \\Rightarrow\\ \\tilde\\theta_n = 2\\bar X_n', 'First moment')]),
          sec('Properties', [L('E[\\tilde\\theta_n] = \\theta \\text{ (unbiased)},\\quad \\tilde\\theta_n \\xrightarrow{p} \\theta', WLLN), L('\\text{But } \\tilde\\theta_n \\text{ can be smaller than } \\max X_i \\text{ — a value the data rule out.}')]),
        ],
      },
    },

    unift1: {
      name: 'U(\\theta, 1)', plain: 'U(θ, 1)', cli: 'uniform_t1', aliases: ['uniformt1', 'uniformtheta1', 'unift1', 'ut1', 'utheta1', 'uniform1'],
      paramTex: { theta: '\\theta' }, truth: { theta: -1 }, pset: 'PSET 6 Q5',
      density: 'f(x; \\theta) = \\frac{1}{1-\\theta}\\mathbf 1\\{x \\in [\\theta, 1]\\},\\quad -\\infty < \\theta < 1',
      sample: (g, p) => p.theta + (1 - p.theta) * g.u(),
      check: (v) => (v.every((x) => x <= 1) ? null : 'U(θ, 1) data must be ≤ 1.'),
      mle: {
        est: (v) => ({ theta: Math.min(...v) }), plug: () => 'X_{(1)} = \\min_i X_i = ', result: '\\hat\\theta_n = X_{(1)} = \\min_i X_i',
        sections: [
          sec('Likelihood', [
            L(`L_n(\\theta) = \\prod_{i=1}^{n} \\frac{1}{1-\\theta}\\mathbf 1\\{\\theta \\le X_i \\le 1\\}`, IND),
            L(`= (1-\\theta)^{-n}\\prod_{i=1}^{n}\\mathbf 1\\{X_i \\ge \\theta\\}`, 'Pull out the constant; Xᵢ ≤ 1 always holds'),
            L('= (1-\\theta)^{-n}\\,\\mathbf 1\\{\\theta \\le X_{(1)}\\}', 'Every Xᵢ ≥ θ exactly when the smallest one is', '\\textstyle\\prod_i \\mathbf 1\\{X_i \\ge \\theta\\} = \\mathbf 1\\{\\min_i X_i \\ge \\theta\\}'),
          ]),
          sec('Log-likelihood', [L('\\ell_n(\\theta) = \\begin{cases} -n\\log(1-\\theta) & \\theta \\le X_{(1)} \\\\ -\\infty & \\theta > X_{(1)} \\end{cases}', 'log 0 = −∞: θ above the smallest observation is impossible')]),
          sec('Maximize (no calculus)', [
            L(`\\frac{d}{d\\theta}\\big[-n\\log(1-\\theta)\\big] = \\frac{n}{1-\\theta} > 0 \\text{ for } \\theta < 1`, 'Never zero, so the first-order condition fails — check monotonicity instead'),
            L('L_n \\text{ is strictly increasing on } (-\\infty, X_{(1)}] \\text{ and } 0 \\text{ beyond it}', 'A smaller interval [θ, 1] puts more density on each observation'),
            L('\\hat\\theta_n = X_{(1)} = \\min_i X_i', 'Push θ as high as the data allow'),
          ]),
          sec('Bias', [
            L('P(X_{(1)} > s) = \\prod_i P(X_i > s) = \\left(\\frac{1 - s}{1 - \\theta}\\right)^n,\\quad \\theta \\le s \\le 1', 'Independence'),
            L('E[X_{(1)}] = \\theta + \\frac{1 - \\theta}{n+1} \\ \\Rightarrow\\ \\operatorname{Bias} = \\frac{1-\\theta}{n+1} \\to 0', 'Always overestimates: X₍₁₎ ≥ θ'),
          ]),
          sec('Consistency', [
            L('\\text{The min is not a sample average, so the LLN doesn’t apply — compute the probability directly.}'),
            L('\\hat\\theta_n \\ge \\theta \\ \\Rightarrow\\ P(|\\hat\\theta_n - \\theta| > \\varepsilon) = P(X_{(1)} > \\theta + \\varepsilon)', 'Only the upper side matters'),
            L('= \\prod_{i=1}^n P(X_i > \\theta + \\varepsilon) = \\left(\\frac{1 - \\theta - \\varepsilon}{1 - \\theta}\\right)^n = \\left(1 - \\frac{\\varepsilon}{1 - \\theta}\\right)^n', 'Independence; uniform tail probability (for ε < 1 − θ; it is 0 if ε ≥ 1 − θ)'),
            L('\\xrightarrow[n\\to\\infty]{} 0 \\quad\\text{since } 0 \\le 1 - \\tfrac{\\varepsilon}{1-\\theta} < 1 \\ \\Rightarrow\\ \\hat\\theta_n \\xrightarrow{p} \\theta', 'Definition of convergence in probability'),
          ]),
        ],
      },
      mom: {
        est: (v) => ({ theta: 2 * mean(v) - 1 }), plug: () => '2\\bar X_n - 1 = ', result: '\\tilde\\theta_n = 2\\bar X_n - 1',
        sections: [
          sec('Match moments', [L('E[X] = \\frac{\\theta + 1}{2} \\ \\Rightarrow\\ \\bar X_n = \\frac{\\tilde\\theta + 1}{2} \\ \\Rightarrow\\ \\tilde\\theta_n = 2\\bar X_n - 1', 'First moment')]),
          sec('Properties', [L('E[\\tilde\\theta_n] = \\theta,\\quad \\tilde\\theta_n \\xrightarrow{p} \\theta', `Unbiased; ${WLLN} + ${CMT}`), L('\\text{Its variance } \\tfrac{(1-\\theta)^2}{3n} \\text{ shrinks like } 1/n\\text{; the MLE’s MSE shrinks like } 1/n^2 \\text{ — much faster.}')]),
        ],
      },
    },

    unif: {
      name: 'U(a, b)', plain: 'U(a, b)', cli: 'uniform', aliases: ['uniform', 'unif', 'u', 'uniformab'],
      paramTex: { a: 'a', b: 'b' }, truth: { a: 1, b: 4 },
      density: 'f(x; a, b) = \\frac{1}{b - a}\\mathbf 1\\{x \\in [a, b]\\}',
      sample: (g, p) => p.a + (p.b - p.a) * g.u(),
      mle: {
        est: (v) => ({ a: Math.min(...v), b: Math.max(...v) }), plug: (v, k) => (k === 'a' ? 'X_{(1)} = ' : 'X_{(n)} = '),
        result: '\\hat a_n = X_{(1)},\\qquad \\hat b_n = X_{(n)}',
        sections: [
          sec('Likelihood', [
            L('L_n(a, b) = (b - a)^{-n}\\,\\mathbf 1\\{a \\le X_{(1)}\\}\\,\\mathbf 1\\{X_{(n)} \\le b\\}', 'All observations must lie in [a, b]'),
          ]),
          sec('Maximize (no calculus)', [
            L('(b-a)^{-n} \\text{ grows as the interval shrinks}', 'Decreasing in the length b − a'),
            L('\\text{Shrink } [a, b] \\text{ to the data: } \\hat a_n = X_{(1)},\\ \\hat b_n = X_{(n)}', 'The tightest interval that still contains every observation'),
          ]),
          sec('Consistency', [L('P(X_{(1)} > a + \\varepsilon) = \\left(1 - \\tfrac{\\varepsilon}{b-a}\\right)^n \\to 0', 'Same argument as U(θ, 1); symmetric for the max')]),
        ],
      },
      mom: {
        est: (v) => { const m = mean(v), s = Math.sqrt(varP(v)); return { a: m - Math.sqrt(3) * s, b: m + Math.sqrt(3) * s }; },
        plug: (v, k) => (k === 'a' ? '\\bar X_n - \\sqrt3\\,\\hat\\sigma_n = ' : '\\bar X_n + \\sqrt3\\,\\hat\\sigma_n = '),
        result: '\\tilde a_n = \\bar X_n - \\sqrt{3}\\,\\hat\\sigma_n,\\qquad \\tilde b_n = \\bar X_n + \\sqrt{3}\\,\\hat\\sigma_n',
        sections: [sec('Match moments', [
          L('E[X] = \\frac{a+b}{2},\\qquad \\operatorname{Var}(X) = \\frac{(b-a)^2}{12}', 'Mean and variance of a uniform'),
          L('\\bar X_n = \\frac{\\tilde a + \\tilde b}{2},\\quad \\hat\\sigma^2_n = \\frac{(\\tilde b - \\tilde a)^2}{12} \\ \\Rightarrow\\ \\tilde b - \\tilde a = 2\\sqrt3\\,\\hat\\sigma_n', 'Equivalent to matching θ̂₁ and θ̂₂'),
          L('\\tilde a_n = \\bar X_n - \\sqrt3\\,\\hat\\sigma_n,\\quad \\tilde b_n = \\bar X_n + \\sqrt3\\,\\hat\\sigma_n', 'Solve'),
        ])],
      },
    },
  };
  for (const [k, m] of Object.entries(MODELS)) m.key = k;
  const ALIAS = {};
  for (const m of Object.values(MODELS)) for (const a of m.aliases) ALIAS[a] = m.key;
  const alias = (s) => ALIAS[s] || (MODELS[s] ? s : null);

  // ---------- numeric check by simulation ----------
  function numericCheck(key, method, opts = {}) {
    const M = MODELS[key], e = M[method];
    const truth = opts.truth || M.truth;
    const ns = opts.ns || [10, 100, 1000];
    const g = EW.dist.makeRng(EW.settings.seed === '' ? null : EW.settings.seed);
    const out = [];
    for (const n of ns) {
      const reps = n >= 1000 ? 600 : 2000;
      const acc = {};
      for (let r = 0; r < reps; r++) {
        const v = Array.from({ length: n }, () => M.sample(g, truth));
        const est = e.est(v);
        for (const [k, x] of Object.entries(est)) (acc[k] = acc[k] || []).push(x);
      }
      for (const [k, xs] of Object.entries(acc)) {
        const m = mean(xs), vr = varP(xs), bias = m - truth[k];
        out.push({ n, reps, param: k, truth: truth[k], mean: m, bias, var: vr, mse: bias * bias + vr, sample: n === ns[ns.length - 1] ? null : null, all: n === 100 ? xs : null });
      }
    }
    return out;
  }

  // ---------- proof library ----------
  const PROOFS = [
    {
      id: 'mse', title: 'MSE = Bias² + Var', note: 'PSET 6 Q1 — the bias–variance decomposition',
      lines: [
        L('\\operatorname{MSE}(\\hat\\theta_n) = E\\big[(\\hat\\theta_n - \\theta)^2\\big]', 'Definition of mean squared error'),
        L('= E\\big[\\big((\\hat\\theta_n - E[\\hat\\theta_n]) + (E[\\hat\\theta_n] - \\theta)\\big)^2\\big]', 'Add and subtract E[θ̂ₙ]'),
        L('= E\\big[(\\hat\\theta_n - E\\hat\\theta_n)^2\\big] + 2E\\big[(\\hat\\theta_n - E\\hat\\theta_n)(E\\hat\\theta_n - \\theta)\\big] + E\\big[(E\\hat\\theta_n - \\theta)^2\\big]', 'Expand the square; linearity of expectation', '(u + c)^2 = u^2 + 2uc + c^2'),
        L('= \\operatorname{Var}(\\hat\\theta_n) + 2(E\\hat\\theta_n - \\theta)\\,E\\big[\\hat\\theta_n - E\\hat\\theta_n\\big] + (E\\hat\\theta_n - \\theta)^2', 'E[θ̂ₙ] − θ is a constant: pull it out of the expectation', 'E[cY] = cE[Y],\\ E[c] = c'),
        L('= \\operatorname{Var}(\\hat\\theta_n) + 2(E\\hat\\theta_n - \\theta)\\cdot 0 + \\operatorname{Bias}(\\hat\\theta_n)^2', 'The cross term vanishes', 'E[\\hat\\theta_n - E\\hat\\theta_n] = E\\hat\\theta_n - E\\hat\\theta_n = 0'),
        L('= \\operatorname{Bias}(\\hat\\theta_n)^2 + \\operatorname{Var}(\\hat\\theta_n)\\qquad\\blacksquare', 'Definition of bias', '\\operatorname{Bias}(\\hat\\theta_n) = E[\\hat\\theta_n] - \\theta'),
      ],
    },
    {
      id: 'varshort', title: 'Var(X) = E[X²] − (E X)²', note: 'the computational formula for variance',
      lines: [
        L('\\operatorname{Var}(X) = E\\big[(X - \\mu)^2\\big],\\quad \\mu = E[X]', 'Definition'),
        L('= E\\big[X^2 - 2\\mu X + \\mu^2\\big]', 'Expand the square'),
        L('= E[X^2] - 2\\mu E[X] + \\mu^2', 'Linearity of expectation (μ is a constant)'),
        L('= E[X^2] - 2\\mu^2 + \\mu^2 = E[X^2] - (E[X])^2\\qquad\\blacksquare', 'E[X] = μ'),
      ],
    },
    {
      id: 'emean', title: 'E[X̄ₙ] = μ', note: 'the sample mean is unbiased',
      lines: [
        L(`E[\\bar X_n] = E\\!\\left[\\frac1n${SX} X_i\\right]`, 'Definition of the sample mean'),
        L(`= \\frac1n${SX} E[X_i]`, 'Linearity of expectation'),
        L('= \\frac1n\\cdot n\\mu = \\mu\\qquad\\blacksquare', 'Identically distributed: E[Xᵢ] = μ for every i'),
      ],
    },
    {
      id: 'varmean', title: 'Var(X̄ₙ) = σ²/n', note: 'why the standard error is σ/√n',
      lines: [
        L(`\\operatorname{Var}(\\bar X_n) = \\operatorname{Var}\\!\\left(\\frac1n${SX} X_i\\right)`, 'Definition'),
        L(`= \\frac{1}{n^2}\\operatorname{Var}\\!\\left(${SX} X_i\\right)`, 'Constants come out squared', '\\operatorname{Var}(cY) = c^2\\operatorname{Var}(Y)'),
        L(`= \\frac{1}{n^2}${SX}\\operatorname{Var}(X_i)`, 'Independence: all covariances are 0'),
        L('= \\frac{1}{n^2}\\cdot n\\sigma^2 = \\frac{\\sigma^2}{n},\\qquad \\operatorname{sd}(\\bar X_n) = \\frac{\\sigma}{\\sqrt n}\\qquad\\blacksquare', 'Identically distributed'),
      ],
    },
    {
      id: 'varaffine', title: 'Var(aX + b) = a² Var(X)', note: 'shifts don’t change spread; scaling does',
      lines: [
        L('\\operatorname{Var}(aX + b) = E\\big[(aX + b - E[aX + b])^2\\big]', 'Definition'),
        L('= E\\big[(aX + b - a\\mu - b)^2\\big] = E\\big[a^2(X - \\mu)^2\\big]', 'E[aX + b] = aμ + b; the b cancels'),
        L('= a^2\\operatorname{Var}(X)\\qquad\\blacksquare', 'Linearity'),
      ],
    },
    {
      id: 'varsum', title: 'Var(X + Y) = Var X + Var Y + 2 Cov(X, Y)', note: 'and = Var X + Var Y when independent',
      lines: [
        L('\\operatorname{Var}(X+Y) = E\\big[\\big((X - \\mu_X) + (Y - \\mu_Y)\\big)^2\\big]', 'Definition; E[X + Y] = μ_X + μ_Y'),
        L('= E[(X-\\mu_X)^2] + E[(Y-\\mu_Y)^2] + 2E[(X-\\mu_X)(Y-\\mu_Y)]', 'Expand; linearity'),
        L('= \\operatorname{Var}X + \\operatorname{Var}Y + 2\\operatorname{Cov}(X, Y)\\qquad\\blacksquare', 'Definition of covariance'),
        L('X \\perp Y \\Rightarrow \\operatorname{Cov}(X, Y) = E[X-\\mu_X]\\,E[Y-\\mu_Y] = 0', 'Independence: E[g(X)h(Y)] = E[g(X)]E[h(Y)]'),
      ],
    },
    {
      id: 'skew', title: 'skew(X) as a function of θ₁, θ₂, θ₃', note: 'PSET 6 Q3.1 — raw moments θₖ = E[Xᵏ]',
      lines: [
        L('\\operatorname{skew}(X) = \\frac{E[(X - \\theta_1)^3]}{\\operatorname{Var}(X)^{3/2}}', 'Definition (θ₁ = E[X])'),
        L('E[(X - \\theta_1)^3] = E\\big[X^3 - 3\\theta_1X^2 + 3\\theta_1^2X - \\theta_1^3\\big]', 'Binomial expansion', '(u - c)^3 = u^3 - 3cu^2 + 3c^2u - c^3'),
        L('= \\theta_3 - 3\\theta_1\\theta_2 + 3\\theta_1^3 - \\theta_1^3 = \\theta_3 - 3\\theta_1\\theta_2 + 2\\theta_1^3', 'Linearity; E[X^k] = θₖ'),
        L('\\operatorname{Var}(X) = \\theta_2 - \\theta_1^2', 'Var X = E[X²] − (E X)²'),
        L('\\Rightarrow\\ f(\\theta_1, \\theta_2, \\theta_3) = \\frac{\\theta_3 - 3\\theta_1\\theta_2 + 2\\theta_1^3}{(\\theta_2 - \\theta_1^2)^{3/2}}\\qquad\\blacksquare'),
      ],
    },
    {
      id: 'skewmom', title: 'Method-of-moments skewness is consistent', note: 'PSET 6 Q3.2–3.3',
      lines: [
        L(`\\hat\\theta_{n,k} = \\frac1n${SX} X_i^k,\\quad k = 1, 2, 3`, 'Method of moments: replace E[Xᵏ] by the sample average of Xᵢᵏ'),
        L('\\hat\\theta_{n,k} \\xrightarrow{p} E[X^k] = \\theta_k', `${WLLN} applied to the i.i.d. Xᵢᵏ (needs E|X|³ < ∞)`),
        L('(\\hat\\theta_{n,1}, \\hat\\theta_{n,2}, \\hat\\theta_{n,3}) \\xrightarrow{p} (\\theta_1, \\theta_2, \\theta_3)', 'Each coordinate converges, so the vector does'),
        L('f \\text{ is continuous wherever } \\theta_2 - \\theta_1^2 = \\operatorname{Var}(X) > 0', 'A ratio of polynomials with a positive denominator'),
        L('\\Rightarrow\\ f(\\hat\\theta_{n,1}, \\hat\\theta_{n,2}, \\hat\\theta_{n,3}) \\xrightarrow{p} f(\\theta_1, \\theta_2, \\theta_3) = \\operatorname{skew}(X)\\qquad\\blacksquare', CMT),
      ],
    },
    {
      id: 'wlln', title: 'Chebyshev ⇒ weak law of large numbers', note: 'why X̄ₙ →p μ',
      lines: [
        L('P(|Y - E Y| \\ge \\varepsilon) \\le \\frac{\\operatorname{Var}(Y)}{\\varepsilon^2}', "Chebyshev's inequality"),
        L('P(|\\bar X_n - \\mu| \\ge \\varepsilon) \\le \\frac{\\operatorname{Var}(\\bar X_n)}{\\varepsilon^2} = \\frac{\\sigma^2}{n\\varepsilon^2}', 'Apply with Y = X̄ₙ; E[X̄ₙ] = μ, Var(X̄ₙ) = σ²/n'),
        L('\\xrightarrow[n\\to\\infty]{} 0 \\text{ for every } \\varepsilon > 0 \\ \\Rightarrow\\ \\bar X_n \\xrightarrow{p} \\mu\\qquad\\blacksquare', 'Definition of convergence in probability'),
      ],
    },
    {
      id: 'mseconsistent', title: 'MSE → 0 ⇒ consistent', note: 'bias → 0 and variance → 0 is enough',
      lines: [
        L('P(|\\hat\\theta_n - \\theta| > \\varepsilon) = P\\big((\\hat\\theta_n - \\theta)^2 > \\varepsilon^2\\big)', 'Square both sides'),
        L('\\le \\frac{E[(\\hat\\theta_n - \\theta)^2]}{\\varepsilon^2} = \\frac{\\operatorname{Bias}(\\hat\\theta_n)^2 + \\operatorname{Var}(\\hat\\theta_n)}{\\varepsilon^2}', "Markov's inequality; MSE decomposition"),
        L('\\to 0 \\text{ if } \\operatorname{Bias} \\to 0 \\text{ and } \\operatorname{Var} \\to 0\\qquad\\blacksquare'),
      ],
    },
    {
      id: 'unbiasednotconsistent', title: 'Unbiased does not imply consistent', note: 'PSET 6 Q6.1 — FALSE, with a counterexample',
      lines: [
        L('\\hat\\theta_n = X_1 \\text{ (ignore all but the first observation)}', 'A silly but valid estimator of μ'),
        L('E[\\hat\\theta_n] = E[X_1] = \\mu', 'Unbiased for every n'),
        L('P(|\\hat\\theta_n - \\mu| > \\varepsilon) = P(|X_1 - \\mu| > \\varepsilon)', 'Does not depend on n …'),
        L('\\not\\to 0 \\text{ (unless } X \\text{ is constant)} \\ \\Rightarrow\\ \\text{not consistent}', '… so it never shrinks'),
        L('\\text{Conversely } \\hat\\sigma^2_n = \\tfrac1n\\sum(X_i - \\bar X_n)^2 \\text{ is biased but consistent.}', 'Bias and consistency are different properties'),
      ],
    },
    {
      id: 'cideriv', title: 'Where the asymptotic CI comes from', note: 'CLT + Slutsky ⇒ X̄ₙ ± z σ̂/√n',
      lines: [
        L('\\sqrt n\\,\\frac{\\bar X_n - \\mu}{\\sigma} \\xrightarrow{d} N(0, 1)', 'Central limit theorem'),
        L('\\sqrt n\\,\\frac{\\bar X_n - \\mu}{\\hat\\sigma_n} \\xrightarrow{d} N(0, 1)', 'σ̂ₙ →p σ, so replacing σ changes nothing in the limit (Slutsky)'),
        L('P\\!\\left(-z \\le \\sqrt n\\,\\tfrac{\\bar X_n - \\mu}{\\hat\\sigma_n} \\le z\\right) \\to \\Phi(z) - \\Phi(-z) = 1 - \\alpha', 'Take z = Φ⁻¹(1 − α/2)'),
        L('P\\!\\left(\\bar X_n - z\\tfrac{\\hat\\sigma_n}{\\sqrt n} \\le \\mu \\le \\bar X_n + z\\tfrac{\\hat\\sigma_n}{\\sqrt n}\\right) \\to 1 - \\alpha\\qquad\\blacksquare', 'Rearrange the inequalities to isolate μ'),
      ],
    },
    {
      id: 'coverage', title: '1000 intervals at 95%: how many cover?', note: 'PSET 6 Q6.3 — about 950, not 900',
      lines: [
        L('C_j = \\mathbf 1\\{\\mu \\in \\mathrm{CI}_j\\},\\quad P(C_j = 1) \\approx 0.95', 'Each independent sample gives an independent interval'),
        L('\\sum_{j=1}^{1000} C_j \\sim \\operatorname{Bin}(1000,\\ 0.95)', 'Sum of independent Bernoullis'),
        L('E\\Big[\\sum C_j\\Big] = 1000 \\times 0.95 = 950,\\quad \\operatorname{sd} = \\sqrt{1000 \\cdot 0.95 \\cdot 0.05} \\approx 6.9', 'Binomial mean and sd'),
        L('900 \\text{ is } \\tfrac{950 - 900}{6.9} \\approx 7.3 \\text{ sd below } 950 \\Rightarrow \\text{the statement is false}', '900 would match a 90% interval'),
      ],
    },
    {
      id: 'sebern', title: 'SE of X̄ₙ for Bernoulli(p)', note: 'PSET 6 Q6.4 — it is √(p(1 − p)/n), not p(1 − p)/n',
      lines: [
        L('\\operatorname{Var}(X_i) = E[X_i^2] - p^2 = p - p^2 = p(1-p)', 'X² = X for 0/1 variables'),
        L('\\operatorname{Var}(\\bar X_n) = \\frac{p(1-p)}{n}', 'Var(X̄ₙ) = σ²/n'),
        L('\\operatorname{SE}(\\bar X_n) = \\sqrt{\\operatorname{Var}(\\bar X_n)} = \\sqrt{\\frac{p(1-p)}{n}}', 'A standard error is a standard deviation'),
        L('\\Rightarrow\\ \\text{“the SE is } p(1-p)/n\\text{” is false (that is the variance).}'),
      ],
    },
    {
      id: 'mlefull', title: 'MLE requires a full model', note: 'PSET 6 Q6.2 — TRUE',
      lines: [
        L(`L_n(\\theta) = \\prod_{i=1}^{n} f(X_i; \\theta)`, 'The likelihood needs the entire density f(x; θ), not just a few moments'),
        L('\\text{MoM only needs } E[X^k] = g_k(\\theta) \\text{ for a few } k', 'Method of moments is “semi-parametric”'),
        L('\\text{If } f \\text{ is wrong, the MLE can be inconsistent; MoM stays consistent as long as the moment equations hold.}'),
      ],
    },
    {
      id: 'bayes', title: "Bayes' rule", note: 'with the law of total probability in the denominator',
      lines: [
        L('P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}', 'Definition of conditional probability'),
        L('= \\frac{P(B \\mid A)\\,P(A)}{P(B)}', 'Multiplication rule: P(A ∩ B) = P(B | A)P(A)'),
        L('= \\frac{P(B \\mid A)\\,P(A)}{P(B \\mid A)P(A) + P(B \\mid A^c)P(A^c)}\\qquad\\blacksquare', 'Law of total probability: B = (B ∩ A) ∪ (B ∩ Aᶜ), disjoint'),
      ],
    },
    {
      id: 'ols', title: 'OLS normal equations (simple regression)', note: 'deriving β̂₀ and β̂₁',
      lines: [
        L(`\\min_{b_0, b_1}\\ ${SX} (Y_i - b_0 - b_1 X_i)^2`, 'Least squares: minimize the sum of squared residuals'),
        L(`\\frac{\\partial}{\\partial b_0}:\\ -2${SX}(Y_i - b_0 - b_1X_i) = 0 \\iff \\hat\\beta_0 = \\bar Y - \\hat\\beta_1\\bar X`, 'First-order condition for the intercept'),
        L(`\\frac{\\partial}{\\partial b_1}:\\ -2${SX}X_i(Y_i - b_0 - b_1X_i) = 0`, 'First-order condition for the slope'),
        L(`\\Rightarrow\\ ${SX}X_i\\big((Y_i - \\bar Y) - \\hat\\beta_1(X_i - \\bar X)\\big) = 0`, 'Substitute β̂₀'),
        L(`\\hat\\beta_1 = \\frac{${SX}(X_i - \\bar X)(Y_i - \\bar Y)}{${SX}(X_i - \\bar X)^2} = \\frac{s_{XY}}{s_X^2}\\qquad\\blacksquare`, 'Σ Xᵢ(Yᵢ − Ȳ) = Σ(Xᵢ − X̄)(Yᵢ − Ȳ)'),
      ],
    },
  ];

  EW.derive = { MODELS, PROOFS, alias, numericCheck };
})();
