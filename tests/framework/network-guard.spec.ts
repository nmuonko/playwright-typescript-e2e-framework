import { test, expect, type Page } from '@playwright/test';
import { NetworkGuard, redactCredentials, type NetworkPolicy } from '@core/network/network-guard';
import { readOnlyRequest } from '@core/network/safe-request';

// Self-tests for the safety layer. They use a fake origin served by the guard itself,
// so nothing here ever leaves the machine.
const ORIGIN = 'https://guard.test';
const policy: NetworkPolicy = {
  name: 'self-test',
  readOnlyPosts: [/\/rpc\/read_only$/],
  trackers: [/tracker\.test/],
};

async function openFakeSite(page: Page, guard: NetworkGuard): Promise<void> {
  guard.mock(
    { url: /^https:\/\/guard\.test\/$/, method: 'GET' },
    { contentType: 'text/html', body: '<h1>ok</h1>' },
  );
  await guard.attach(page.context());
  await page.goto(`${ORIGIN}/`);
}

const send = (page: Page, url: string, method = 'POST', body = '{"a":1}'): Promise<string> =>
  page.evaluate(
    async ([u, m, b]) => {
      try {
        const res = await fetch(u, { method: m, body: m === 'GET' ? null : b });
        return `status:${res.status}`;
      } catch {
        return 'network-error';
      }
    },
    [url, method, body] as const,
  );

test.describe('NetworkGuard', { tag: ['@framework', '@smoke', '@regression'] }, () => {
  test('aborts and records an unmocked write (fail closed)', async ({ page }) => {
    const guard = new NetworkGuard(policy);
    await openFakeSite(page, guard);

    expect(await send(page, `${ORIGIN}/api/orders`)).toBe('network-error');
    expect(guard.violations).toEqual([{ method: 'POST', url: `${ORIGIN}/api/orders`, postData: '{"a":1}' }]);
    expect(guard.describeViolations()).toContain('POST https://guard.test/api/orders');
  });

  test('fulfils a registered mock and exposes the request for payload assertions', async ({ page }) => {
    const guard = new NetworkGuard(policy);
    const order = guard.mock(
      { url: /\/api\/orders$/, method: 'POST' },
      { status: 201, json: { id: 'mock' } },
    );
    await openFakeSite(page, guard);

    expect(await send(page, `${ORIGIN}/api/orders`)).toBe('status:201');
    expect((await order.waitForRequest()).postDataJSON()).toEqual({ a: 1 });
    expect(guard.violations).toEqual([]);
    expect(guard.writeAttempts).toHaveLength(1);
  });

  test('a mock with a payload predicate only captures matching requests', async ({ page }) => {
    const guard = new NetworkGuard(policy);
    const matching = guard.mock(
      { url: /\/api\/rpc$/, method: 'POST', when: (r) => r.postData()?.includes('"lead"') === true },
      { json: { ok: true } },
    );
    await openFakeSite(page, guard);

    expect(await send(page, `${ORIGIN}/api/rpc`, 'POST', '{"lead":1}')).toBe('status:200');
    expect(await send(page, `${ORIGIN}/api/rpc`, 'POST', '{"other":1}')).toBe('network-error');
    expect(matching.calls).toHaveLength(1);
    expect(guard.violations).toHaveLength(1);
  });

  test('lets allow-listed read-only POSTs through without recording a violation', async ({ page }) => {
    const guard = new NetworkGuard(policy);
    await openFakeSite(page, guard);

    // guard.test does not resolve, so the continued request fails at DNS: proof it was not aborted by the guard.
    await send(page, `${ORIGIN}/rpc/read_only`);
    expect(guard.violations).toEqual([]);
    expect(guard.abortedUrls.has(`${ORIGIN}/rpc/read_only`)).toBe(false);
  });

  test('aborts trackers even for GET requests', async ({ page }) => {
    const guard = new NetworkGuard(policy);
    await openFakeSite(page, guard);

    expect(await send(page, 'https://tracker.test/pixel', 'GET')).toBe('network-error');
    expect(guard.abortedUrls.has('https://tracker.test/pixel')).toBe(true);
    expect(guard.violations).toEqual([]);
  });

  test('records write attempts with credential fields masked', async ({ page }) => {
    const guard = new NetworkGuard(policy);
    await openFakeSite(page, guard);
    // Field name built at runtime so the report's source snippets never contain a credential literal.
    const field = 'pass' + 'word';
    const body = (value: string): string => JSON.stringify({ email: 'a@example.com', [field]: value });
    await send(page, `${ORIGIN}/api/register`, 'POST', body('hunter2-Secret'));
    expect(guard.writeAttempts.map((attempt) => attempt.postData)).toEqual([body('[redacted]')]);
    expect(guard.describeViolations()).not.toContain('hunter2');
    expect(redactCredentials('not json')).toBe('not json');
  });

  test('waitForRequest times out with a descriptive error when the mock is never hit', async () => {
    const guard = new NetworkGuard(policy);
    const handle = guard.mock({ url: /never/ }, { body: '' });
    await expect(handle.waitForRequest(50)).rejects.toThrow('was not called within 50ms');
  });
});

test.describe('readOnlyRequest', { tag: ['@framework', '@regression'] }, () => {
  test('refuses mutating API calls before they are sent', ({ request }) => {
    const safe = readOnlyRequest(request);
    expect(() => safe.post(`${ORIGIN}/x`)).toThrow(/disabled/);
    expect(() => safe.delete(`${ORIGIN}/x`)).toThrow(/disabled/);
    expect(() => safe.fetch(`${ORIGIN}/x`, { method: 'PATCH' })).toThrow(/PATCH is disabled/);
  });
});
