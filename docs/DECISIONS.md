# Architecture Decision Records

Short records of the decisions that shape this framework: the context, what was decided, and what it costs.

---

## ADR-001 · Playwright Test with strict TypeScript

**Context.** Two very different targets: a server-rendered marketing site and a client-rendered storefront. The suite
needs cross-browser coverage, network interception, API calls and visual comparison.

**Decision.** Playwright Test with TypeScript in `strict` mode, plus `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. Type-aware ESLint (`typescript-eslint` strict, `no-floating-promises`,
`eslint-plugin-playwright`) runs in a pre-commit hook and in CI.

**Consequences.** One runner covers UI, API, accessibility and visual testing. The strict flags catch unawaited
assertions and unchecked array access at compile time. The cost is some verbosity, for example `lineAt(cart, 0)`
instead of `cart[0]!`.

---

## ADR-002 · One repository, a site × browser project matrix

**Decision.** Both sites live in one repo with shared `src/core`. Each site has five Playwright projects:
`{site}-chromium`, `{site}-firefox`, `{site}-webkit`, `{site}-mobile` (iPhone 13) and a browser-less `{site}-api`.
A `framework` project self-tests the safety layer.

- API tests run once, not once per browser.
- Visual and performance suites run only in the Chromium project (see ADR-009).
- Mobile runs a dedicated `mobile/` suite of key journeys, not the whole desktop suite.

**Consequences.** `--project='afrishop-*'` or `--project='*-chromium'` slice the suite naturally. Adding a third site
means adding a folder and one entry in `playwright.config.ts`.

---

## ADR-003 · Page Object Model: inheritance for pages, composition for widgets

**Decision.**

- `BasePage` (abstract: `path`, `goto()`, `expectLoaded()`) → `FaithfulnessPage` / `AfrishopPage` (shared header and
  footer, site-specific "loaded" rules, hydration waits) → concrete pages.
- Reusable widgets (`Header`, `Footer`, `ConsultationForm`, `ZipChecker`, `ProductGrid`, `CartLineItem`,
  `OrderSummary`, `CheckoutForm`, `SelectMenu`) are composed into pages rather than inherited.
- Page objects expose locators and intent-level actions. Assertions stay in tests, except `expect*` helpers that
  define what a component's correct state is.
- Fixtures (`test.extend`) hand tests ready page objects: `async ({ contactPage }) => …`.

**Consequences.** The consultation form is one component reused on `/contact`, the home page and all 15 town pages.
Data-driven `ContentPage` / `ServiceAreaPage` cover dozens of similar pages without a class each.

---

## ADR-004 · A fail-closed network guard for testing production

**Context.** Both targets are live production sites. Tests must never create leads, accounts, referrals,
applications or orders, and should not pollute the businesses' analytics.

**Decision.** Every browser test routes through `NetworkGuard`, a single context-level `route('**/*')` attached
before the page can navigate. For each request, in order:

1. **Tracker** (Google Ads/GTM, TikTok, Facebook, Stripe telemetry, Lovable events): abort silently.
2. **Registered mock:** fulfil it (or abort it to simulate an outage).
3. **GET / HEAD / OPTIONS:** continue to production.
4. **Allow-listed read-only POST:** continue.
5. **Anything else:** abort and record a violation. The fixture fails the test at teardown and attaches the
   request.

Supporting controls:

- `serviceWorkers: 'block'`, so a service worker cannot bypass routing.
- Mocks live in an in-memory list read by the one route handler. Registering a mock is synchronous, so it cannot race
  the click that triggers the request.
- API tests get a `request` fixture wrapped in a proxy that throws on `post/put/patch/delete` and on non-GET `fetch`.
- Recorded write attempts mask credential-shaped JSON fields (`password`, `secret`, `token`, `otp`), so report
  attachments and failure messages never carry them.
- The guard has its own self-tests (`tests/framework/network-guard.spec.ts`) on a fake origin. In CI they run
  first, and no production test starts unless they pass.

**Read-only POST allow-list (AfriShop only).** Each entry was verified from captured request and response bodies.
Entries are matched against the full URL, so a single query can be pinned.

| Endpoint                                   | Request             | Response                     |
| ------------------------------------------ | ------------------- | ---------------------------- |
| `rpc/compute_display_prices_titled`        | list of base prices | list of display prices       |
| `rpc/get_active_providers`                 | `{}`                | provider → item counts       |
| `functions/v1/search-intent`               | `{"q": "<query>"}`  | category / provider priority |
| `functions/v1/catalog-service?action=tabs` | empty               | category navigation config   |

None accepts user or account data. Faithfulness has an empty allow-list: every POST there is a lead submission.

**Consequences.** A forgotten mock produces a red test with the blocked request attached, never a real submission.
The guard has already caught three real cases: Stripe.js posting CSP reports from its iframe, product-view analytics
inserted into `hot_product_clicks`, and the checkout submission call. The cost is maintaining the tracker and allow-lists as the sites evolve.

---

## ADR-005 · Mocks speak the real contracts

**Context.** A mock that returns `{}` only proves that the UI survives a mock.

**Decision.** Response contracts were taken from the sites' own public JavaScript bundles and captured read
responses:

- **Faithfulness** forms call hashed TanStack Start server functions. The bodies use the _seroval_ wire format, and
  responses must carry `x-tss-serialized: true` with `{ ok, error? }`. `mocks/seroval.ts` encodes responses and
  decodes request payloads, so tests assert the exact fields sent (`full_name`, `service_interests`, `hp_field`, …).
  Mocks match `**/_serverFn/**` plus the form's payload keys, because the hash changes on every deploy.
- **AfriShop** checkout submits to the `auth-service` edge function. Its contract is
  `{ ok, userId?, token?, message?, code? }`, including `USER_EXISTS`. Mocks never return a token, so no session is
  created.

**Consequences.** Success, rejection, server-error and network-failure paths each render the application's real
UI. That is how F-AS-02 was found. If a site changes its contract, the payload assertions fail loudly.

---

## ADR-006 · User-facing locators, with documented exceptions

**Decision.** `getByRole` / `getByLabel` / `getByText`, scoped to landmarks or components where names repeat. For
example, the home page contains both "ZIP Code" and "ZIP code where care is needed *".

Exceptions, each commented in code:

- AfriShop icon-only buttons have no accessible name (F-AS-05), so they are located by their icon class. The comment
  says to switch once the site labels them.
- The careers resume input is a hidden `input[type=file]` behind a styled button.
- The honeypot field is located by `name`, because the test asserts it is _not_ in the accessibility tree.

**Consequences.** Locators double as accessibility checks. A missing label shows up as a test that can't find its
element.

---

## ADR-007 · Known defects stay visible: observations first

**Decision.** Application defects never make the suite red forever, and they are never hidden.

- A test that asserts the **correct** behaviour for a documented defect calls `expectFailureFrom(testInfo, issue)`.
  Playwright reports it as "expected to fail". When the site is fixed it becomes an "unexpected pass", which tells us
  to close the finding.
- Broad scans (axe, console sweeps) take a `knownIssues` map. Documented rule ids become `known-issue` annotations,
  while **any new** serious or critical violation or console error still fails. A known issue that disappears is
  annotated `known-issue-not-reproduced`.
- Observations that aren't clearly bugs get a passing characterisation test plus an annotation.
- Failures caused by the environment rather than the application (for example the AfriShop backend becoming
  unreachable) get an `environment` annotation from the site fixture and are counted separately in the run summary.
  They still fail the run.
- Every finding is recorded in `docs/FINDINGS.md` as an observation with evidence. Root causes are not claimed.

---

## ADR-008 · Waiting: real signals only

**Decision.** No `waitForTimeout` and no `networkidle`. Both are banned by ESLint (`no-restricted-syntax`).

- AfriShop never reaches `networkidle` (continuous polling and trackers).
- The Faithfulness H1 is server-rendered, so it is visible before React hydrates. `FaithfulnessPage.expectLoaded()`
  waits for TanStack Start to delete `window.$_TSR`. For controls whose island hydrates later (the ZIP widget on
  WebKit), `waitForReactHydration(locator)` polls for React's props on that element.
- AfriShop search shows "0 produits affichés" while loading, so "loaded" means result cards **or** the explicit empty
  state are visible.
- Catalogue calls take 2–6 s and depend on third-party catalogues. They use `CATALOG_TIMEOUT_MS = 30s` explicitly.
  The global timeout is not inflated.
- Console sweeps open each page in its own tab, so a cancelled fetch from the previous page is not blamed on the next
  one.

Every new test was run with `--repeat-each=3` (four for the WebKit hydration fix). The flakes found were all traced
to a cause: hydration, loading states, parsing, or backend behaviour (F-AS-12). None was papered over with a retry.

---

## ADR-009 · Visual baselines rendered in the CI image and only compared in CI

**Decision.**

- Baselines are generated with `npm run visual:update`, which runs `docker compose` with
  `mcr.microsoft.com/playwright:v1.64.1-noble` on `linux/amd64`. CI runs in exactly that image.
- `updateSnapshots: 'none'` in CI: CI can only compare. A missing or changed baseline fails.
- The snapshot path has no platform suffix, and baselines are committed.
- On macOS or Windows the visual tests are skipped with an explicit reason pointing to `npm run test:visual:docker`.
  Comparing a macOS render against a Linux baseline would only measure font antialiasing.
- Screenshots target stable components (footer, form in its error state, pricing section, empty cart, order
  tracking, seeded checkout). Third-party images and the copyright year are masked, sticky headers are un-stuck while
  capturing, and animations and carets are disabled.

**Consequences.** Deterministic in CI (verified with three repeated runs in the container). An intentional redesign
requires a deliberate baseline update committed in review.

---

## ADR-010 · Tags: smoke is a subset of regression

**Decision.** Every test carries `@regression`; P1 journeys also carry `@smoke`. `npm run test:regression` runs
everything, so it genuinely includes smoke. Secondary tags select suites: `@a11y`, `@api`, `@visual`, `@mobile`,
`@perf`, `@framework`, and `@mocked` (the backend is intercepted).

**Live vs mocked.** Untagged UI tests are read-only against production. `@mocked` tests load production pages, but
the action under test is answered by a mock. `npx playwright test --grep @mocked` lists them.

---

## ADR-011 · Being a good citizen on production

- Two workers by default (`WORKERS`), and link sweeps with bounded concurrency (`LINK_CHECK_CONCURRENCY=4`).
- One retry, in CI only. Traces and video on first retry, screenshots on failure.
- Nightly, only the smoke subset runs (Chromium + API, 06:00 UTC). The full cross-browser regression, including
  sitemap sweeps, visual comparison and performance checks, runs once a week (Sundays 07:00 UTC). Both are outside
  the businesses' hours.
- Job-level concurrency allows one job per site at a time across all workflows, so PR, nightly and weekly runs
  queue instead of stacking up on production.
- Performance checks are a single cold load per page on Chromium: a lab signal, not a load test.
- Trackers are blocked, so automated traffic never shows up in ad or analytics reports.
- AfriShop's search appears to degrade under bursts (F-AS-12). Tests that hit live search are tagged `@live-search`
  and run on Chromium and mobile only. Search ranking is server-side, so extra engines add load, not coverage. The
  diagnostics fixture labels any failure caused by empty catalogue responses.

---

## ADR-012 · Test data

- `@faker-js/faker` for names. Emails use `example.com` (RFC 2606), so they can never reach a real inbox. US phone
  numbers use the reserved 555-01xx range. Free-text fields are prefixed `[automated test]`.
- Stable business facts live in typed data files: navigation targets and their H1s, the six core services, 15
  service areas, verified ZIP → town routes, the published rate, and contact details. A content regression such as a
  wrong phone number fails a test.
- The AfriShop cart is seeded through `localStorage` with prices that include cents, so totals arithmetic is
  genuinely exercised and independent of the live catalogue.

---

## ADR-013 · Reporting and publication

**Context.** The reports are public (GitHub Pages) and must show real results, not a curated picture, without
leaking anything a visitor's browser would not see.

**Decision.**

- Each site runs in its own CI job, so the Actions UI shows pass/fail per application. Blob reports from all jobs
  are merged into one Playwright HTML report plus JSON and JUnit, and `allure-playwright` results into one Allure 3
  report. An automatic fixture labels every test with application, suite type and browser.
- `scripts/report-summary.ts` derives the per-application counts (passed, failed, flaky, known defects, skipped,
  blocked) from the merged JSON report. They go to the job summary and to the Pages landing page. Nothing is
  hand-written.
- The Pages site holds the latest smoke and the latest regression report side by side. Each run uploads its
  report section as an artifact; the publishing job fetches the other suite's latest section, and Allure history
  is carried forward the same way, so trends build up without committing reports to the repository.
- `scripts/scan-report.ts` is a publication gate. It scans every file, including files inside zipped traces and
  the HTML report's embedded data, for private keys, tokens, privileged JWTs and unmasked credential fields.
  Failure evidence is only uploaded, and Pages only published, if the scan passes. The gate has its own
  self-tests.
- Checkout specs run without traces, because traces record raw request bodies, and those bodies contain
  credential fields.

**Consequences.** A failing run publishes a red report. That is intended: the Pages site is evidence of what the
suite actually found.
