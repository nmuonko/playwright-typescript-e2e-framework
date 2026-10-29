import type { BrowserContext, Request, Route } from '@playwright/test';

/**
 * Per-site description of what may reach production.
 * Anything not covered here (and not mocked) is treated as a write and aborted.
 */
export interface NetworkPolicy {
  readonly name: string;
  /** POST endpoints verified to be side-effect free (search, pricing). Matched against the full URL. */
  readonly readOnlyPosts: readonly RegExp[];
  /** Analytics/ads endpoints. Always aborted so automated runs never skew business metrics. */
  readonly trackers: readonly RegExp[];
}

export interface RequestMatcher {
  readonly url: RegExp;
  readonly method?: string;
  /** Extra discrimination, e.g. by payload keys when several calls share one URL pattern. */
  readonly when?: (request: Request) => boolean;
}

export interface MockResponse {
  /** Fail the request at the network layer instead of answering it (simulates an unreachable backend). */
  readonly abort?: boolean;
  readonly status?: number;
  readonly json?: unknown;
  readonly body?: string;
  readonly contentType?: string;
  readonly headers?: Record<string, string>;
}

export interface BlockedRequest {
  readonly method: string;
  readonly url: string;
  readonly postData: string | null;
}

/** Handle returned by {@link NetworkGuard.mock}; lets a test await and inspect intercepted calls. */
export class MockHandle {
  readonly calls: Request[] = [];
  private waiters: Array<(request: Request) => void> = [];

  constructor(
    readonly matcher: RequestMatcher,
    readonly response: MockResponse | ((request: Request) => MockResponse),
  ) {}

  /** @internal */
  record(request: Request): void {
    this.calls.push(request);
    for (const resolve of this.waiters) resolve(request);
    this.waiters = [];
  }

  /** Resolves with the first intercepted request (immediately if it already happened). */
  waitForRequest(timeoutMs = 15_000): Promise<Request> {
    const first = this.calls[0];
    if (first) return Promise.resolve(first);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Mock ${String(this.matcher.url)} was not called within ${timeoutMs}ms`));
      }, timeoutMs);
      this.waiters.push((request) => {
        clearTimeout(timer);
        resolve(request);
      });
    });
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Fail-closed request firewall for testing against live production sites.
 *
 * Order of evaluation for every request issued by the browser context:
 *   1. tracker            -> abort (silently)
 *   2. registered mock    -> fulfil with the mock response
 *   3. GET/HEAD/OPTIONS   -> continue to production
 *   4. allow-listed POST  -> continue to production
 *   5. anything else      -> abort and record as a violation (fails the test at teardown)
 *
 * Mocks live in an in-memory list consulted by a single context-level route, so registering a
 * mock is synchronous and cannot race the action that triggers the request.
 */
export class NetworkGuard {
  private readonly mocks: MockHandle[] = [];
  readonly violations: BlockedRequest[] = [];
  readonly abortedUrls = new Set<string>();
  /** Every non-safe request the page attempted, whether mocked, allowed or blocked. */
  readonly writeAttempts: BlockedRequest[] = [];

  constructor(readonly policy: NetworkPolicy) {}

  async attach(context: BrowserContext): Promise<void> {
    await context.route('**/*', (route) => this.handle(route));
  }

  mock(matcher: RequestMatcher, response: MockResponse | ((request: Request) => MockResponse)): MockHandle {
    const handle = new MockHandle(matcher, response);
    // Newest first, so a test can override a default mock registered by a fixture.
    this.mocks.unshift(handle);
    return handle;
  }

  private async handle(route: Route): Promise<void> {
    const request = route.request();
    const method = request.method();
    const url = request.url();
    const summary: BlockedRequest = { method, url, postData: request.postData() };

    if (this.policy.trackers.some((pattern) => pattern.test(url))) {
      this.abortedUrls.add(url);
      return route.abort('blockedbyclient').catch(() => undefined);
    }

    const mock = this.mocks.find(
      ({ matcher }) =>
        matcher.url.test(url) &&
        (!matcher.method || matcher.method === method) &&
        (!matcher.when || matcher.when(request)),
    );
    if (!SAFE_METHODS.has(method)) this.writeAttempts.push(summary);

    if (mock) {
      mock.record(request);
      const response = typeof mock.response === 'function' ? mock.response(request) : mock.response;
      if (response.abort) return route.abort('failed').catch(() => undefined);
      return route
        .fulfill({
          status: response.status ?? 200,
          contentType:
            response.contentType ?? (response.json === undefined ? 'text/plain' : 'application/json'),
          body: response.json === undefined ? (response.body ?? '') : JSON.stringify(response.json),
          headers: { 'access-control-allow-origin': '*', ...response.headers },
        })
        .catch(() => undefined);
    }

    if (SAFE_METHODS.has(method)) return route.continue().catch(() => undefined);

    // Matched against the full URL so an allow-list entry can pin a specific query (e.g. ?action=tabs).
    if (method === 'POST' && this.policy.readOnlyPosts.some((pattern) => pattern.test(url))) {
      return route.continue().catch(() => undefined);
    }

    this.violations.push(summary);
    this.abortedUrls.add(url);
    return route.abort('blockedbyclient').catch(() => undefined);
  }

  describeViolations(): string {
    return this.violations
      .map((v) => `  ${v.method} ${v.url}${v.postData ? `\n    body: ${v.postData.slice(0, 300)}` : ''}`)
      .join('\n');
  }
}
