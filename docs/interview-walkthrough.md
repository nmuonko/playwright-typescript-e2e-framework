# Interview walkthrough (5–10 minutes)

A live demonstration script. Every command below was run against this repository; the outputs quoted are real.
Have the repo open in VS Code with a terminal, and the
[GitHub Pages reports](https://nmuonko.github.io/playwright-typescript-e2e-framework/) in a browser tab.

## 1. The problem (1 min)

> "These are two live production sites I don't control the backend of: a home-care agency whose revenue is lead
> forms, and an e-commerce store whose revenue is search → cart → checkout. I wanted continuous evidence that both
> work, but testing production is dangerous: one careless test creates a fake lead or a real account. So the
> framework is designed around one rule: nothing is ever written to production."

Show the README's at-a-glance table and coverage matrix. The key numbers:

- 160 test scenarios and 346 executions across 11 projects;
- Chromium, Firefox, WebKit, iPhone 13 and a browser-less API project;
- a nightly smoke run and a weekly full regression.

## 2. Architecture tour (2 min)

Open these files in order.

1. **[`src/core/network/network-guard.ts`](../src/core/network/network-guard.ts).** Explain the five-step order:
   tracker → mock → safe method → verified read-only POST → anything else is blocked _and fails the test_.
   - "Fail closed" means a forgotten mock produces a red test, never a real submission.
   - Service workers are blocked, so they can't bypass routing.
2. **[`src/core/fixtures/index.ts`](../src/core/fixtures/index.ts).** `page` depends on `networkGuard`, so there is
   no way to get a page without the guard. API tests get a `request` that throws on anything but GET/HEAD.
3. **[`src/sites/faithfulness/`](../src/sites/faithfulness/).** One layer per application: pages, components,
   data, mocks, network policy and fixtures.
   - Point at `ConsultationForm`: a single component reused on `/contact`, the home page and 15 town pages.
4. **[`tests/faithfulness/ui/consultation-form.spec.ts`](../tests/faithfulness/ui/consultation-form.spec.ts).**
   Specs contain intent and assertions only.
   - The mocked test asserts the exact payload the browser sent, decoded from TanStack's wire format.
   - It then checks the site's real confirmation UI.

## 3. Run it (1–2 min)

```bash
npx playwright test --project=framework                       # safety layer self-tests, no network, ~3 s
npx playwright test --grep @smoke --project=faithfulness-chromium --project=faithfulness-api
npm run report                                                # Playwright HTML report
npm run report:allure                                         # Allure report from the same run
```

Talking points while it runs:

- Two workers, no hard-coded waits (lint bans `waitForTimeout` and `networkidle`).
- Waits use real signals, such as TanStack hydration finishing.
- In the report, `/refer keeps the shared header and footer` appears as **expected to fail** (F-FH-03): a known
  defect that stays visible. When the site fixes
  it, the test becomes an unexpected pass and tells us to close the finding.

## 4. Debugging a real failure (3 min)

This is a genuine failure mode: a test author registers the mock for the wrong form. Reproduce it by changing
`'consultation'` to `'assessment'` on the `mockFormSubmit(...)` line of the test
`sends the entered lead details and shows the confirmation`, then run it with tracing on:

```bash
npx playwright test -g "sends the entered lead details" --project=faithfulness-chromium --trace on
```

The output (abridged from a real run):

```
✘ [faithfulness-chromium] › consultation-form.spec.ts:70:5 › … › sends the entered lead details and shows the confirmation
  Error: Mock /\/_serverFn\// was not called within 15000ms
  Error: Unmocked write requests were blocked by the network guard:
    POST https://faithfulnesshomecare.com/_serverFn/e211e8c2…
      body: {"t":{"t":10,"i":0,"p":{"k":["data"],"v":[{"t":10,"i":1,"p":{"k":["full_name","relationship","email",…
  attachment: screenshot   test-results/…/test-failed-1.png
  attachment: trace        test-results/…/trace.zip
```

How to read it:

1. **The safety net held.** The real lead submission was blocked, and the test failed instead of creating a lead.
   That is the fail-closed design working.
2. **The error names the cause.** The mock that was registered never matched. The blocked request's body starts
   with `full_name, relationship, email …`, which is the _consultation_ payload, not the assessment one. The mock
   matcher keys on payload fields because the server-function hash changes on every deploy.
3. **Open the trace** to confirm:

   ```bash
   npx playwright show-trace test-results/<test-folder>/trace.zip
   ```

   - **Actions:** step through the form fill and the click on "Request my free consultation".
   - **Network:** the `POST /_serverFn/…` shows as failed (blocked by the client).
   - **Snapshots (before/after):** the page shows the site's error state, because the request never got an answer.
   - **Attachments:** `network-guard.json` lists every write attempt, with credential fields masked.

4. **Fix it.** Restore `'consultation'` (`git checkout tests/faithfulness/ui/consultation-form.spec.ts`) and rerun.
   The test passes and the guard records zero violations.

In CI the same failure would show:

- a red job for that site, with the failing test listed in the job summary;
- the screenshot and trace in a `failure-evidence-*` artifact, uploaded only after the publication gate scanned
  it;
- the failure on the published Pages report.

A second, real example to mention: **environment vs regression.** On 2026-10-30, AfriShop's backend API hostname
stopped resolving (NXDOMAIN). Product grids, search and cart pricing failed for every visitor. The AfriShop fixture
saw `net::ERR_NAME_NOT_RESOLVED` on API requests and annotated each failure "AfriShop backend unreachable", and the
run summary counts these failures as _env._ The run stays red, because shoppers are affected, but nobody wastes
time debugging selectors.

## 5. CI/CD and reporting (1 min)

Open [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml):

- **Safety first:** the guard self-tests run before any production job, and those jobs only start if they pass.
- **One job per site,** so the Actions UI shows pass/fail per application, with job-level concurrency so runs never
  stack up on production.
- **Merged reports:** Playwright HTML, JSON and JUnit, plus Allure, and a per-application summary computed from the
  JSON report.
- **Publication gate** (`scripts/scan-report.ts`): scans for keys, tokens and unmasked credentials, including inside
  zipped traces, before anything reaches Pages.
- **Schedules:** smoke nightly at 06:00 UTC and full regression on Sundays at 07:00 UTC. Actions are pinned to
  commit SHAs, and only the publishing job has Pages permissions.

## 6. Close: what I'd say I'm proudest of (30 s)

- **Production testing made safe** by construction, not by discipline.
- **Findings, not just tests:** 18 public findings, each classified as a verified defect or an observation, with
  evidence. They include a price sort that doesn't sort, and a CSP that blocks the site's own ads tag.
- **Honest reporting:** known defects stay visible, environment failures are labelled, and the published report is
  whatever actually happened.

## Likely questions

- **Why not just use a staging environment?** There isn't one for these sites. Even where there is, production
  smoke catches configuration, CDN and third-party failures that staging can't.
- **How do you stop flakiness?**
  - Waits use real signals, and every new test was run with `--repeat-each=3`.
  - Flakes are traced to a cause: a price-parser bug, a WebKit hydration race and a loading-state counter were all
    found this way.
  - CI allows one retry, to capture a trace, not to hide failures.
- **What would you add next?**
  - Contract tests pinned to a versioned schema, if the store exposes one.
  - A synthetic-monitoring alert on the nightly result.
  - Payment-flow coverage against Stripe's test mode in a non-production environment.
