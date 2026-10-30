import { expect, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { watchConsoleErrors, type ConsoleEntry } from '../fixtures';
import { annotateKnownIssue, type KnownIssue } from '../known-issues';
import type { NetworkGuard } from '../network/network-guard';

export interface ConsoleSweep {
  readonly context: BrowserContext;
  readonly guard: NetworkGuard;
  readonly paths: readonly string[];
  /** Page-specific "settled" signal. */
  readonly waitUntilLoaded: (page: Page) => Promise<void>;
  readonly knownIssues: readonly KnownIssue[];
}

/**
 * Loads each path in its own tab and keeps only errors raised before that tab is closed. Reusing one tab
 * would attribute the previous page's cancelled fetches ("access control checks", AbortError) to the next.
 */
export async function expectNoUnexpectedConsoleErrors(
  sweep: ConsoleSweep,
  testInfo: TestInfo,
): Promise<void> {
  const collected: ConsoleEntry[] = [];
  for (const path of sweep.paths) {
    const page = await sweep.context.newPage();
    const errors = watchConsoleErrors(page, sweep.guard);
    await page.goto(path, { waitUntil: 'load' });
    await sweep.waitUntilLoaded(page);
    collected.push(...errors);
    await page.close();
  }

  const isKnown = (entry: ConsoleEntry): KnownIssue | undefined =>
    sweep.knownIssues.find((issue) => issue.consolePattern?.test(entry.text));
  const knownIssueCounts: Record<string, number> = {};
  for (const issue of sweep.knownIssues) {
    const hits = collected.filter((entry) => isKnown(entry) === issue).length;
    if (hits) {
      knownIssueCounts[issue.id] = (knownIssueCounts[issue.id] ?? 0) + hits;
      annotateKnownIssue(testInfo, issue, `${hits} console errors`);
    }
  }
  const unexpected = collected.filter((entry) => !isKnown(entry));
  // Only what needs investigating is attached in full; documented issues are summarised by ID.
  await testInfo.attach('console-errors.json', {
    contentType: 'application/json',
    body: JSON.stringify({ unexpected, knownIssueCounts }, null, 2),
  });
  expect(unexpected, 'console errors not explained by a documented finding').toEqual([]);
}
