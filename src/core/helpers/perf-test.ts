import { expect, type Page, type TestInfo } from '@playwright/test';
import { config } from '../config';
import { installVitalsObserver, readTimings, type PageTimings } from './perf';

/** Loads `path` once, records navigation timing + Core Web Vitals, attaches them, and checks budgets. */
export async function expectPageLoadWithinBudget(
  page: Page,
  testInfo: TestInfo,
  path: string,
): Promise<PageTimings> {
  await installVitalsObserver(page);
  await page.goto(path, { waitUntil: 'load' });
  // LCP is finalised on first input or hide; reading after load is the standard lab approximation.
  const timings = await readTimings(page);
  await testInfo.attach(`timings${path.replace(/\W+/g, '-')}.json`, {
    contentType: 'application/json',
    body: JSON.stringify(timings, null, 2),
  });
  testInfo.annotations.push({
    type: 'perf',
    description: `${path}: TTFB ${timings.ttfb}ms, DCL ${timings.domContentLoaded}ms, load ${timings.load}ms, LCP ${timings.lcp ?? 'n/a'}ms, CLS ${timings.cls}, ${timings.transferKb}KB`,
  });

  expect.soft(timings.load, 'load event within budget').toBeLessThan(config.PERF_LOAD_BUDGET_MS);
  expect.soft(timings.lcp ?? 0, 'LCP within budget').toBeLessThan(config.PERF_LCP_BUDGET_MS);
  expect.soft(timings.cls, 'CLS below the "good" threshold').toBeLessThan(0.1);
  return timings;
}
