/**
 * Turns a merged Playwright JSON report into a per-application summary.
 *
 *   node scripts/report-summary.ts <results.json> <suite> <out/summary.json>
 *
 * Writes summary.json (read by the GitHub Pages landing page) and prints a Markdown table for
 * $GITHUB_STEP_SUMMARY. Counts come only from the report, never from hard-coded values.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

interface JsonAnnotation {
  type: string;
  description?: string;
}
interface JsonResult {
  status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
  annotations?: JsonAnnotation[];
}
interface JsonTest {
  projectName: string;
  expectedStatus: 'passed' | 'failed' | 'skipped';
  status: 'expected' | 'unexpected' | 'flaky' | 'skipped';
  annotations?: JsonAnnotation[];
  results: JsonResult[];
}
interface JsonSpec {
  title: string;
  file: string;
  tests: JsonTest[];
}
interface JsonSuite {
  title: string;
  specs?: JsonSpec[];
  suites?: JsonSuite[];
}
interface JsonReport {
  suites: JsonSuite[];
  stats: { startTime: string; duration: number };
}

type Outcome = 'passed' | 'failed' | 'flaky' | 'skipped' | 'knownDefects' | 'blocked';

export interface ApplicationSummary {
  name: string;
  verdict: 'passed' | 'failed';
  counts: Record<Outcome, number>;
  total: number;
  /** Failed tests the fixtures attributed to the environment (e.g. the backend was unreachable). */
  environmentRelated: number;
  browsers: string[];
  failures: string[];
}

export interface RunSummary {
  suite: string;
  startedAt: string;
  durationMs: number;
  commit: string;
  runUrl: string;
  applications: ApplicationSummary[];
}

const APPLICATIONS: Record<string, string> = {
  framework: 'Framework safety self-tests',
  faithfulness: 'Faithfulness Home Care',
  afrishop: 'AfriShop',
};

function outcomeOf(test: JsonTest): Outcome {
  const last = test.results.at(-1);
  if (test.status === 'skipped') return 'skipped';
  // Never started, or stopped by a timeout of the whole run / a crashed worker.
  if (!last || last.status === 'interrupted') return 'blocked';
  if (test.status === 'flaky') return 'flaky';
  if (test.status === 'unexpected') return 'failed';
  return test.expectedStatus === 'failed' ? 'knownDefects' : 'passed';
}

function environmentCause(test: JsonTest): string | undefined {
  const annotations = [...(test.annotations ?? []), ...test.results.flatMap((r) => r.annotations ?? [])];
  return annotations.find((a) => a.type === 'environment')?.description;
}

function* specsOf(suites: readonly JsonSuite[]): Generator<JsonSpec> {
  for (const suite of suites) {
    yield* suite.specs ?? [];
    yield* specsOf(suite.suites ?? []);
  }
}

export function summarize(report: JsonReport, suite: string): RunSummary {
  const apps = new Map<string, ApplicationSummary>();
  for (const spec of specsOf(report.suites)) {
    for (const test of spec.tests) {
      const [site = test.projectName, browser = 'chromium'] = test.projectName.split('-');
      const name = APPLICATIONS[site] ?? site;
      const app = apps.get(name) ?? {
        name,
        verdict: 'passed',
        counts: { passed: 0, failed: 0, flaky: 0, skipped: 0, knownDefects: 0, blocked: 0 },
        total: 0,
        environmentRelated: 0,
        browsers: [],
        failures: [],
      };
      const outcome = outcomeOf(test);
      app.counts[outcome] += 1;
      app.total += 1;
      if (outcome !== 'skipped' && !app.browsers.includes(browser)) app.browsers.push(browser);
      if (outcome === 'failed' || outcome === 'blocked') {
        const environment = environmentCause(test);
        if (environment) app.environmentRelated += 1;
        app.verdict = 'failed';
        app.failures.push(
          `[${test.projectName}] ${spec.file} › ${spec.title}${environment ? ` _(environment: ${environment})_` : ''}`,
        );
      }
      apps.set(name, app);
    }
  }
  const order = Object.values(APPLICATIONS);
  return {
    suite,
    startedAt: report.stats.startTime,
    durationMs: Math.round(report.stats.duration),
    commit: process.env['GITHUB_SHA'] ?? 'local',
    runUrl: process.env['GITHUB_RUN_ID']
      ? `${process.env['GITHUB_SERVER_URL'] ?? ''}/${process.env['GITHUB_REPOSITORY'] ?? ''}/actions/runs/${process.env['GITHUB_RUN_ID']}`
      : '',
    applications: [...apps.values()].sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name)),
  };
}

export function toMarkdown(summary: RunSummary): string {
  const minutes = (summary.durationMs / 60_000).toFixed(1);
  const rows = summary.applications.map(
    ({ name, verdict, counts: c, total, browsers, environmentRelated }) =>
      `| ${verdict === 'passed' ? '✅ Passed' : '❌ Failed'} | ${name} | ${c.passed} | ${c.failed}${environmentRelated ? ` (${environmentRelated} env.)` : ''} | ${c.flaky} | ${c.knownDefects} | ${c.skipped} | ${c.blocked} | ${total} | ${browsers.join(', ')} |`,
  );
  const failures = summary.applications.flatMap((app) => app.failures);
  return [
    `## ${summary.suite === 'smoke' ? 'Production smoke' : 'Full regression'} · ${summary.startedAt} · ${minutes} min`,
    '',
    '| Result | Application | Passed | Failed | Flaky | Known defects | Skipped | Blocked | Total | Browsers |',
    '| --- | --- | --: | --: | --: | --: | --: | --: | --: | --- |',
    ...rows,
    '',
    '_Known defects_ are tests asserting correct behaviour for a documented finding (expected to fail). ' +
      '_Flaky_ tests failed once and passed on retry. _Blocked_ tests did not run to completion. ' +
      '_env._ marks failures the fixtures attributed to the environment, such as an unreachable backend.',
    ...(failures.length ? ['', '### Failures', '', ...failures.map((f) => `- ${f}`)] : []),
    '',
  ].join('\n');
}

const [input, suite = 'smoke', output] = process.argv.slice(2);
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href && input && output) {
  const summary = summarize(JSON.parse(readFileSync(input, 'utf8')) as JsonReport, suite);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(toMarkdown(summary));
}
