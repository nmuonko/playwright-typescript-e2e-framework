import { expect } from '@playwright/test';

export type Headers = Record<string, string>;

/** Parses a CSP string into directive -> sources. */
export function parseCsp(policy: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const part of policy.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) directives.set(name.toLowerCase(), sources);
  }
  return directives;
}

export function hstsMaxAge(headers: Headers): number {
  return Number(/max-age=(\d+)/i.exec(headers['strict-transport-security'] ?? '')?.[1] ?? 0);
}

/** Baseline every production HTML response should meet, regardless of stack. */
export function expectBaselineSecurityHeaders(headers: Headers): void {
  expect
    .soft(hstsMaxAge(headers), 'HSTS max-age should be at least one year')
    .toBeGreaterThanOrEqual(31_536_000);
  expect
    .soft(headers['strict-transport-security'], 'HSTS should cover subdomains')
    .toMatch(/includeSubDomains/i);
  expect.soft(headers['x-content-type-options'], 'MIME sniffing should be disabled').toBe('nosniff');
  expect
    .soft(headers['referrer-policy'], 'Referrer-Policy should not leak full URLs')
    .toMatch(/^(no-referrer|same-origin|strict-origin|strict-origin-when-cross-origin)$/);
}

/** True when the response itself (not a <meta> tag) prevents third-party framing. */
export function hasFramingProtection(headers: Headers): boolean {
  const xfo = (headers['x-frame-options'] ?? '').toUpperCase();
  const frameAncestors = parseCsp(headers['content-security-policy'] ?? '').get('frame-ancestors');
  return (
    xfo === 'DENY' || xfo === 'SAMEORIGIN' || (frameAncestors !== undefined && !frameAncestors.includes('*'))
  );
}

/** Whether a CSP source list permits loading a resource from `url`. Covers the forms used on these sites. */
export function cspAllows(sources: readonly string[], url: string, selfOrigin: string): boolean {
  const target = new URL(url, selfOrigin);
  return sources.some((source) => {
    if (source === "'self'") return target.origin === selfOrigin;
    if (source === '*') return true;
    if (source.endsWith(':') && !source.startsWith("'")) return target.protocol === source;
    if (source.startsWith("'")) return false;
    const pattern = source.replace(/\/$/, '');
    const [scheme, host] = pattern.includes('://') ? pattern.split('://') : ['https', pattern];
    if (target.protocol !== `${scheme ?? 'https'}:`) return false;
    if (host?.startsWith('*.')) return target.host.endsWith(host.slice(1));
    return target.host === host;
  });
}
