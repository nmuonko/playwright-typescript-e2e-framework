/**
 * Builds the GitHub Pages landing page from the report sections present in <site>:
 *
 *   <site>/smoke/summary.json, <site>/regression/summary.json  (written by report-summary.ts)
 *
 *   node scripts/build-pages-index.ts site
 *
 * Every number on the page comes from those files; a section that has never run is shown as such.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ApplicationSummary, RunSummary } from './report-summary.ts';

const SUITES = [
  { id: 'smoke', title: 'Nightly production smoke', schedule: 'Daily 06:00 UTC · Chromium + API' },
  {
    id: 'regression',
    title: 'Weekly full regression',
    schedule: 'Sundays 07:00 UTC · Chromium, Firefox, WebKit, iPhone 13, API',
  },
] as const;

const escape = (text: string): string => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function applicationRow(app: ApplicationSummary): string {
  const c = app.counts;
  const env = app.environmentRelated ? ` <span class="muted">(${app.environmentRelated} env.)</span>` : '';
  return `<tr>
      <td><span class="badge ${app.verdict}">${app.verdict === 'passed' ? 'Passed' : 'Failed'}</span></td>
      <th scope="row">${escape(app.name)}</th>
      <td>${c.passed}</td><td>${c.failed}${env}</td><td>${c.flaky}</td><td>${c.knownDefects}</td>
      <td>${c.skipped}</td><td>${c.blocked}</td><td>${app.total}</td>
      <td class="browsers">${escape(app.browsers.join(', '))}</td>
    </tr>`;
}

function section(site: string, suite: (typeof SUITES)[number]): string {
  const file = join(site, suite.id, 'summary.json');
  if (!existsSync(file)) {
    return `<section><h2>${suite.title}</h2><p class="muted">${suite.schedule}</p>
      <p>No published run yet.</p></section>`;
  }
  const run = JSON.parse(readFileSync(file, 'utf8')) as RunSummary;
  const failures = run.applications.flatMap((app) => app.failures);
  const verdict = run.applications.every((app) => app.verdict === 'passed') ? 'passed' : 'failed';
  return `<section>
    <div class="head">
      <h2>${suite.title} <span class="badge ${verdict}">${verdict === 'passed' ? 'All passed' : 'Failures'}</span></h2>
      <p class="muted">${suite.schedule}</p>
    </div>
    <p class="meta">Started <time datetime="${escape(run.startedAt)}">${escape(run.startedAt.replace('T', ' ').slice(0, 16))} UTC</time>
      · ${(run.durationMs / 60_000).toFixed(1)} min · commit <code>${escape(run.commit.slice(0, 7))}</code>
      ${run.runUrl ? `· <a href="${escape(run.runUrl)}">workflow run</a>` : ''}</p>
    <div class="table"><table>
      <thead><tr><th>Result</th><th>Application</th><th>Passed</th><th>Failed</th><th>Flaky</th>
        <th>Known defects</th><th>Skipped</th><th>Blocked</th><th>Total</th><th>Browsers</th></tr></thead>
      <tbody>${run.applications.map(applicationRow).join('')}</tbody>
    </table></div>
    ${failures.length ? `<details><summary>${failures.length} failing test(s)</summary><ul>${failures.map((f) => `<li>${escape(f).replace(/_\((.*)\)_/, '<em>($1)</em>')}</li>`).join('')}</ul></details>` : ''}
    <p class="links"><a class="button" href="${suite.id}/allure/index.html">Allure report</a>
      <a class="button" href="${suite.id}/playwright/index.html">Playwright HTML report</a>
      <a href="${suite.id}/junit.xml">JUnit XML</a></p>
  </section>`;
}

export function buildIndex(site: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>E2E Test Reports</title>
<style>
  :root { --bg:#f7f8fa; --card:#fff; --text:#1c2330; --muted:#5d6878; --line:#dde2e9; --accent:#2457c5;
    --pass:#1c7c43; --pass-bg:#e3f4ea; --fail:#b42318; --fail-bg:#fdecea; }
  @media (prefers-color-scheme: dark) { :root { --bg:#11151c; --card:#1a2029; --text:#e6eaf0; --muted:#9aa5b5;
    --line:#2c3440; --accent:#7aa2ff; --pass:#5fd08d; --pass-bg:#173525; --fail:#ff8a7a; --fail-bg:#3b1d1a; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 1040px; margin: 0 auto; padding: 32px 16px 48px; }
  h1 { font-size: 1.6rem; margin: 0 0 4px; } h2 { font-size: 1.15rem; margin: 0; display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .muted, .meta { color: var(--muted); } .meta { margin: 8px 0 12px; font-size: .9rem; }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 20px; margin-top: 20px; }
  .head p { margin: 2px 0 0; font-size: .9rem; }
  .table { overflow-x: auto; } table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line); white-space: nowrap; }
  thead th { font-size: .78rem; text-transform: uppercase; letter-spacing: .03em; color: var(--muted); font-weight: 600; }
  td.browsers { white-space: normal; color: var(--muted); }
  .badge { display:inline-block; font-size:.75rem; font-weight:600; padding:2px 8px; border-radius:999px; }
  .badge.passed { color: var(--pass); background: var(--pass-bg); } .badge.failed { color: var(--fail); background: var(--fail-bg); }
  a { color: var(--accent); } .links { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin: 16px 0 0; }
  .button { border:1px solid var(--accent); border-radius:6px; padding:6px 12px; text-decoration:none; font-weight:600; }
  details { margin-top: 12px; } li { margin: 4px 0; word-break: break-word; } code { font-size: .85em; }
  footer { margin-top: 24px; color: var(--muted); font-size: .85rem; }
</style>
</head>
<body>
<main>
  <h1>Playwright E2E test reports</h1>
  <p class="muted">Latest automated runs against the live <a href="https://faithfulnesshomecare.com">Faithfulness Home Care</a>
    and <a href="https://afrishop-usa.com">AfriShop</a> sites. Every submission is intercepted and mocked; nothing is written to production.</p>
  ${SUITES.map((suite) => section(site, suite)).join('\n')}
  <footer><strong>Known defects</strong> are tests asserting correct behaviour for a documented finding, expected to fail until it is fixed.
    <strong>Flaky</strong> tests failed once and passed on retry. <strong>Blocked</strong> tests did not run to completion.
    <strong>env.</strong> marks failures attributed to the environment, such as an unreachable backend.
    Source: <a href="https://github.com/nmuonko/playwright-typescript-e2e-framework">nmuonko/playwright-typescript-e2e-framework</a>.</footer>
</main>
</body>
</html>
`;
}

const [site] = process.argv.slice(2);
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href && site) {
  writeFileSync(join(site, 'index.html'), buildIndex(site));
  process.stdout.write(`Wrote ${join(site, 'index.html')}\n`);
}
