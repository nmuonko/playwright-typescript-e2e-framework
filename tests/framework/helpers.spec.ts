import { test, expect } from '@playwright/test';
import { expectSorted, parsePrice, roundCents } from '@core/helpers/money';
import { parseRobots, parseSitemap } from '@core/helpers/http';
import { cspAllows, hasFramingProtection, parseCsp } from '@core/helpers/headers';
import { decode, decodeServerFnPayload, encode, encodeServerFnResult } from '@faithfulness/mocks/seroval';

test.describe('framework helpers', { tag: ['@framework', '@regression'] }, () => {
  test('parsePrice handles the formats rendered by both sites', () => {
    expect(parsePrice('$1,210')).toBe(1210);
    expect(parsePrice('Total $246.00')).toBe(246);
    expect(parsePrice('450 $')).toBe(450);
    expect(parsePrice('$13,109.84')).toBe(13109.84);
    // Regression: ungrouped four-digit prices were once truncated to their first three digits.
    expect(parsePrice('$1239')).toBe(1239);
    expect(parsePrice('118\u202f360 produits')).toBe(118360);
    expect(() => parsePrice('Inclus')).toThrow('No price found');
    expect(roundCents(0.1 + 0.2)).toBe(0.3);
  });

  test('expectSorted fails on out-of-order prices', () => {
    expect(() => {
      expectSorted([1, 2, 3], 'asc');
    }).not.toThrow();
    expect(() => {
      expectSorted([3, 1, 2], 'asc');
    }).toThrow();
    expect(() => {
      expectSorted([9, 4, 4, 1], 'desc');
    }).not.toThrow();
  });

  test('seroval codec round-trips server-function values', () => {
    const value = { ok: true, error: undefined, n: 4, list: ['a', 'b'], nested: { flag: false, none: null } };
    expect(decode(encode(value))).toEqual(value);
    expect(
      decodeServerFnPayload(JSON.stringify({ t: encode({ data: { full_name: 'A' } }), f: 1, m: [] })),
    ).toEqual({
      full_name: 'A',
    });
    expect(decode(JSON.parse(encodeServerFnResult({ ok: true })))).toEqual({
      result: { ok: true },
      error: undefined,
      context: {},
    });
  });

  test('sitemap and robots parsers extract the directives tests rely on', () => {
    expect(
      parseSitemap(
        '<urlset><url><loc> https://a.test/ </loc></url><url><loc>https://a.test/b</loc></url></urlset>',
      ),
    ).toEqual(['https://a.test/', 'https://a.test/b']);
    const robots = parseRobots(
      'User-agent: Googlebot\nAllow: /\n\nUser-agent: *\nAllow: /\nDisallow: /checkout # private\n',
    );
    expect(robots.get('*')).toEqual({ allow: ['/'], disallow: ['/checkout'] });
    expect(robots.get('Googlebot')?.disallow).toEqual([]);
  });

  test('CSP helpers evaluate sources and framing the way browsers do', () => {
    const csp = parseCsp(
      "default-src 'self'; script-src 'self' https://js.stripe.com; frame-ancestors 'none'",
    );
    const scripts = csp.get('script-src') ?? [];
    expect(cspAllows(scripts, '/assets/app.js', 'https://site.test')).toBe(true);
    expect(cspAllows(scripts, 'https://js.stripe.com/v3', 'https://site.test')).toBe(true);
    expect(cspAllows(scripts, 'https://www.googletagmanager.com/gtag/js', 'https://site.test')).toBe(false);
    expect(cspAllows(['https://*.supabase.co'], 'https://abc.supabase.co/x', 'https://site.test')).toBe(true);
    expect(hasFramingProtection({ 'x-frame-options': 'DENY' })).toBe(true);
    expect(hasFramingProtection({ 'content-security-policy': "frame-ancestors 'none'" })).toBe(true);
    expect(hasFramingProtection({})).toBe(false);
  });
});
