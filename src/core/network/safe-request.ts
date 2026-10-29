import type { APIRequestContext } from '@playwright/test';

const MUTATING = new Set(['post', 'put', 'patch', 'delete']);

/**
 * Wraps Playwright's APIRequestContext so API tests can only issue GET/HEAD against production.
 * Any attempt to mutate throws before a request leaves the machine.
 */
export function readOnlyRequest(request: APIRequestContext): APIRequestContext {
  return new Proxy(request, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && MUTATING.has(prop)) {
        return () => {
          throw new Error(`request.${prop}() is disabled: tests run against production and are read-only.`);
        };
      }
      if (prop === 'fetch') {
        return (urlOrRequest: Parameters<APIRequestContext['fetch']>[0], options?: { method?: string }) => {
          const method = (options?.method ?? 'GET').toUpperCase();
          if (method !== 'GET' && method !== 'HEAD') {
            throw new Error(`request.fetch() with method ${method} is disabled: tests are read-only.`);
          }
          return target.fetch(urlOrRequest, options);
        };
      }
      const value: unknown = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(target) : value;
    },
  });
}
