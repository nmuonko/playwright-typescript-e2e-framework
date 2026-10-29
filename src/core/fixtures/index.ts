import { test as base, expect, type ConsoleMessage } from '@playwright/test';
import { NetworkGuard, type NetworkPolicy } from '../network/network-guard';
import { readOnlyRequest } from '../network/safe-request';

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
}

const BLOCKED_BY_GUARD = /ERR_BLOCKED_BY_CLIENT|blocked by client|NS_ERROR_FAILURE|Load failed/i;

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
    const entries: ConsoleEntry[] = [];
    const onConsole = (message: ConsoleMessage): void => {
      if (message.type() !== 'error') return;
      const location = message.location().url;
      if (BLOCKED_BY_GUARD.test(message.text()) || networkGuard.abortedUrls.has(location)) return;
      entries.push({ type: 'console', text: message.text(), url: page.url() });
    };
    page.on('console', onConsole);
    page.on('pageerror', (error) =>
      entries.push({ type: 'pageerror', text: error.message, url: page.url() }),
    );
    await use(entries);
    page.off('console', onConsole);
  },

  // API tests talk to production directly; only GET/HEAD are allowed through.
  request: async ({ request }, use) => {
    await use(readOnlyRequest(request));
  },
});

export { expect };
