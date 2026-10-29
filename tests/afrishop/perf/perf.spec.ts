import { expectPageLoadWithinBudget } from '@core/helpers/perf-test';
import { test } from '@afrishop/fixtures';

test.describe('AfriShop page-load performance', { tag: ['@perf', '@regression'] }, () => {
  for (const path of ['/', '/product/amazon/B088NHSZV6', '/cart']) {
    test(`${path} loads within budget`, async ({ page }, testInfo) => {
      await expectPageLoadWithinBudget(page, testInfo, path);
    });
  }
});
