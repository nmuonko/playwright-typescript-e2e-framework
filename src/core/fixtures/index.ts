import { test as base, expect, type ConsoleMessage, type Page } from '@playwright/test';
import { NetworkGuard, type NetworkPolicy } from '../network/network-guard';
import { readOnlyRequest } from '../network/safe-request';
import { labelForReports } from '../reporting';

export interface ConsoleEntry {
  readonly type: 'console' | 'pageerror';
  readonly text: string;
  readonly url: string;
}

export interface CoreFixtures {
  /** Overridden by each site's fixtures. */
  networkPolicy: NetworkPolicy;
  networkGuard: NetworkGuard;
  /** Console errors and uncaught exceptions, excluding noise caused by the guard's own aborts. */
  consoleErrors: ConsoleEntry[];
  /** Automatic: labels every test with its application, suite type and browser for the Allure report. */
  reportLabels: undefined;
}

const BLOCKED_BY_GUARD = /ERR_BLOCKED_BY_CLIENT|blocked by client|NS_ERROR_FAILURE|Load failed/i;

/**
 * Collects console errors and uncaught exceptions for one page, ignoring messages that only exist
 * because the network guard aborted a request (each engine words those differently).
 */
export function watchConsoleErrors(page: Page, guard: NetworkGuard): ConsoleEntry[] {
  const entries: ConsoleEntry[] = [];
  const causedByGuard = (text: string, location: string): boolean =>
    BLOCKED_BY_GUARD.test(text) ||
    guard.abortedUrls.has(location) ||
    [...guard.abortedUrls].some((url) => text.includes(url.split('?')[0] ?? url));
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error' || causedByGuard(message.text(), message.location().url)) return;
    entries.push({ type: 'console', text: message.text(), url: page.url() });
  });
  page.on('pageerror', (error) => entries.push({ type: 'pageerror', text: error.message, url: page.url() }));
  return entries;
}

export const test = base.extend<CoreFixtures>({
  networkPolicy: [{ name: 'default', readOnlyPosts: [], trackers: [] }, { option: true }],

  networkGuard: async ({ context, networkPolicy }, use, testInfo) => {
    const guard = new NetworkGuard(networkPolicy);
    await guard.attach(context);
    await use(guard);

    if (guard.writeAttempts.length > 0) {
      await testInfo.attach('network-guard.json', {
        contentType: 'application/json',
        body: JSON.stringify({ writeAttempts: guard.writeAttempts, violations: guard.violations }, null, 2),
      });
    }
    // Fail closed: an unmocked write means the test would have mutated production.
    expect(
      guard.violations,
      `Unmocked write requests were blocked by the network guard:\n${guard.describeViolations()}`,
    ).toEqual([]);
  },

  // Every browser test gets the guard: it is attached before the page can navigate anywhere.
  page: async ({ page, networkGuard: _guard }, use) => {
    await use(page);
  },

  consoleErrors: async ({ page, networkGuard }, use) => {
    await use(watchConsoleErrors(page, networkGuard));
  },

  reportLabels: [
    // eslint-disable-next-line no-empty-pattern -- Playwright requires a destructured first argument.
    async ({}, use, testInfo) => {
      await labelForReports(testInfo);
      await use(undefined);
    },
    { auto: true },
  ],

  // API tests talk to production directly; only GET/HEAD are allowed through.
  request: async ({ request }, use) => {
    await use(readOnlyRequest(request));
  },
});

export { expect };
