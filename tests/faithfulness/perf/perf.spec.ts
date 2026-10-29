import { expectPageLoadWithinBudget } from '@core/helpers/perf-test';
import { test } from '@faithfulness/fixtures';

// One cold load per page: a lab signal for regressions, not a load test.
test.describe('Faithfulness page-load performance', { tag: ['@perf', '@regression'] }, () => {
  for (const path of ['/', '/contact', '/services']) {
    test(`${path} loads within budget`, async ({ page }, testInfo) => {
      await expectPageLoadWithinBudget(page, testInfo, path);
    });
  }
});
