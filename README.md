# Econometrics Workbench

A lightweight, dependency-free web app for Duke **Econ 104 — Statistical Foundations of Econometrics**, built as a sibling of LinAlg Workbench. Every result comes with its working: formula → numbers plugged in → answer, in the class's notation (X̄ₙ, θ̂ₙ, σ̂, Φ⁻¹(p), Bias, MSE, ℓₙ(θ)…).

Course alignment: Problem Set 6 (Walker) first, then the syllabus (Wu, summer 2022) for everything else: probability, random variables, LLN/CLT, estimators, testing, MoM/MLE and regression.

## Help for newcomers

- **Guide**: opens on the first visit and again from the **Help** button. It has eight short pages: a welcome with one-click starting points, a first calculation, which tab to use, reading a result card, typing commands, a searchable plain-English glossary (each entry has a formula and a runnable example), common mix-ups, and settings.
- **Tooltips**: every button explains itself on hover. On phones, small ⓘ icons show the same help on tap. Each result card has an **ⓘ Explain** link to the matching glossary entry.

## Tabs

- **Calculator**
  - Data editor with columns or a frequency table (value | count). Paste from Excel/CSV, header rows included.
  - Command line with a session workspace and history cards that show their steps.
  - Quick-op buttons act on an editor column.
- **Derive**
  - Step-by-step MLE and method-of-moments derivations for N(0, σ²) (PSET Q4), N(μ, σ²), Bernoulli, Poisson, Exponential, Geometric, U(0, θ), U(θ, 1) (PSET Q5) and U(a, b).
  - Each derivation covers likelihood, log-likelihood, first-order condition (or the boundary argument when calculus fails), bias and consistency.
  - Every line names the rule that justifies it, and a simulation checks that the MSE shrinks as n grows.
  - Proof library: MSE = Bias² + Var (Q1), skewness from raw moments and its consistency (Q3), Var X̄ = σ²/n, Chebyshev ⇒ WLLN, unbiased ≠ consistent, CI coverage (Q6.3), Bernoulli SE (Q6.4), Bayes, OLS normal equations, and more.
- **Distributions**: P(a ≤ X ≤ b), P(X ≤ x), P(X ≥ x) and quantiles for 10 families.
  - Shows the standardization step for the normal, a pdf/pmf with the area shaded, the cdf, and moments.
  - Includes Table 1 from the PSET and a full Φ(z) table.
- **Simulate**:
  - LLN running means.
  - CLT histograms against N(0, 1).
  - CI coverage: draw 1000 intervals and count how many cover.
  - Sampling distributions of MLE vs MoM, with bias, variance and MSE as n grows.
- **Practice**: generated problems by syllabus week. Topics:
  - Bayes, independence and counting.
  - pmf moments, normal and binomial probabilities.
  - CLT approximations and MSE.
  - Q2-style frequency-table CIs, proportion CIs and z-tests.
  - MoM/MLE on data and derive-an-MLE.
  - Regression.
  - A true/false/uncertain bank in the style of Q6, with explanations and proofs.

## Command line (a sample — press `?` in the app for all of it)

```
x = [2.1 3.4 1.9 5.2 4.4 3.0]       accts = freq([0 1 2 3 4], [10 30 120 70 20])
mean(x)  var(x)  varp(x)  se(x)  skew(x)  summary(x)
ci(accts)  ci(x, 0.9)  tci(x)  propci(120, 400)  ci2(x, y)
ztest(x, 3)  ttest(x, 3, greater)  proptest(120, 400, 0.25)  ttest2(x, y)
X = Binom(10, 0.3)   E(X)  Var(X)  P(X, <=, 2)  P(X, 2, 4)  cdf(X, 3)  quantile(X, 0.9)
dist([0 1 2], [1/4 1/2 1/4])   Normal(μ, σ)  Pois  Exp  Unif  Geom  Bern  T  Chisq  Fdist
pnorm  qnorm  pt  qt  pchisq  pbinom  dpois …    normprob(85, 115, 100, 15)   clt(50, 10, 36, 52, Inf)
bayes(0.01, 0.9, 0.05)  indep(.5, .4, .2)  choose(10, 3)  5!
mle(x, poisson)  mom(x, uniform_t1)  mse(bias, var)
m = ols(wage, educ, exper)   predict(m, 16, 5)
```

### Defaults

- **Variance in SEs and CIs:** s² (divide by n − 1); the steps also show σ̂² (divide by n). You can switch to σ̂² in ⚙.
- **Critical values:** the PSET's Table 1 values (1.282, 1.645, 1.960, 2.326, 2.576) whenever they apply, and exact quantiles otherwise. You can switch to always exact in ⚙.
- **Normal parameters:** the normal is written N(μ, σ²), but `Normal(μ, σ)`, `pnorm` and `qnorm` take the **standard deviation**, as in R.
- **Exact fractions:** the a/b toggle shows simple fractions exactly (11/64, 2/13).

Plain HTML/CSS/JS, no build step. KaTeX is loaded from a CDN.

## Run locally

```bash
python3 -m http.server 8000
```

Append `?test` to the URL to run the built-in self-test. It checks PSET Q2's interval, distribution functions against reference values, OLS, the estimators, and every derivation's estimator on a large simulated sample. Results go to the console.

## Deploy with Coolify

Same setup as LinAlg Workbench: **Dockerfile** build pack, port **80**. The image is `nginx:alpine` serving the static files, with content-hash cache busting and a `/healthz` endpoint.

```bash
docker build -t econ-workbench . && docker run --rm -p 8080:80 econ-workbench
```
