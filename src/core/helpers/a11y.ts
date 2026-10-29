import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';

type AxeResults = Awaited<ReturnType<AxeBuilder['analyze']>>;
type Violation = AxeResults['violations'][number];

export interface A11yScanOptions {
  /** CSS selectors to exclude, e.g. third-party widgets the site does not control. */
  readonly exclude?: readonly string[];
  /**
   * Rule ids already documented in docs/FINDINGS.md for this page. They are reported as
   * annotations instead of failing the run, so a *new* serious violation still fails.
   */
  readonly knownIssues?: Readonly<Record<string, string>>;
}

const GATED_IMPACTS = new Set(['serious', 'critical']);

function summarize(violations: readonly Violation[]): string {
  return violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})\n` +
        v.nodes
          .slice(0, 5)
          .map((n) => `    ${n.target.join(' ')}`)
          .join('\n'),
    )
    .join('\n');
}

/**
 * Runs axe (WCAG 2.0/2.1/2.2 A + AA) and fails on serious/critical violations that are not known issues.
 * The full result is attached to the report either way.
 */
export async function expectNoSeriousA11yViolations(
  page: Page,
  testInfo: TestInfo,
  options: A11yScanOptions = {},
): Promise<AxeResults> {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
  for (const selector of options.exclude ?? []) builder = builder.exclude(selector);
  const results = await builder.analyze();

  await testInfo.attach('axe-results.json', {
    contentType: 'application/json',
    body: JSON.stringify(results.violations, null, 2),
  });

  const gated = results.violations.filter((v) => GATED_IMPACTS.has(v.impact ?? ''));
  const known = options.knownIssues ?? {};
  for (const violation of gated.filter((v) => v.id in known)) {
    testInfo.annotations.push({
      type: 'known-issue',
      description: `${known[violation.id]}: axe "${violation.id}" on ${violation.nodes.length} node(s)`,
    });
  }
  for (const id of Object.keys(known).filter((id) => !gated.some((v) => v.id === id))) {
    testInfo.annotations.push({
      type: 'known-issue-not-reproduced',
      description: `${known[id]} (${id}) was not detected; update docs/FINDINGS.md if it is fixed.`,
    });
  }

  const unexpected = gated.filter((v) => !(v.id in known));
  expect(unexpected, `Serious/critical accessibility violations:\n${summarize(unexpected)}`).toEqual([]);
  return results;
}
