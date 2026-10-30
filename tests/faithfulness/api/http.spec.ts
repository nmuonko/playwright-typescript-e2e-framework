import { config } from '@core/config';
import { checkUrl, checkUrls, parseRobots, parseSitemap } from '@core/helpers/http';
import { cspAllows, expectBaselineSecurityHeaders, parseCsp } from '@core/helpers/headers';
import { test, expect } from '@core/fixtures';
import { keyPages } from '@faithfulness/data/site';

test.describe('Faithfulness HTTP contract', { tag: ['@api', '@regression'] }, () => {
  for (const path of keyPages) {
    test(`${path} returns HTML within the response budget`, async ({ request }) => {
      const result = await checkUrl(request, path);
      expect(result.status).toBe(200);
      expect(result.contentType).toContain('text/html');
      expect(result.ms, `responded in ${result.ms}ms`).toBeLessThan(config.API_RESPONSE_BUDGET_MS);
    });
  }

  test('HTML responses carry hardened security headers', { tag: '@smoke' }, async ({ request }) => {
    const headers = (await request.get('/')).headers();
    expectBaselineSecurityHeaders(headers);
    const csp = parseCsp(headers['content-security-policy'] ?? '');
    expect(csp.get('frame-ancestors')).toEqual(["'none'"]);
    expect(csp.get('object-src')).toEqual(["'none'"]);
    expect(csp.get('base-uri')).toEqual(["'self'"]);
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['permissions-policy']).toMatch(/camera=\(\)/);
  });

  test('HTML is revalidated while fingerprinted assets are cached for a year', async ({ request }) => {
    const page = await request.get('/');
    expect(page.headers()['cache-control']).toMatch(/no-cache/);
    const asset = /\/assets\/[\w.-]+\.js/.exec(await page.text())?.[0];
    expect(asset, 'home page should reference a fingerprinted script').toBeTruthy();
    const cacheControl = (await request.get(asset ?? '')).headers()['cache-control'];
    expect(cacheControl).toMatch(/max-age=31536000/);
    expect(cacheControl).toMatch(/immutable/);
  });

  test('plain HTTP permanently redirects to HTTPS', async ({ request }) => {
    const http = config.FAITHFULNESS_BASE_URL.replace(/^https:/, 'http:');
    const response = await request.get(`${http}/`, { maxRedirects: 0, failOnStatusCode: false });
    expect([301, 308]).toContain(response.status());
    expect(response.headers()['location']).toBe(`${config.FAITHFULNESS_BASE_URL}/`);
  });

  test('unknown routes return a real 404', { tag: '@smoke' }, async ({ request }) => {
    const result = await checkUrl(request, '/this-page-does-not-exist-qa', { keepBody: true });
    expect(result.status).toBe(404);
    expect(result.body).toContain('Page not found');
  });

  test('robots.txt allows crawling and advertises the sitemap', async ({ request }) => {
    const text = await (await request.get('/robots.txt')).text();
    expect(parseRobots(text).get('*')).toEqual({ allow: ['/'], disallow: [] });
    expect(text).toContain(`Sitemap: ${config.FAITHFULNESS_BASE_URL}/sitemap.xml`);
  });

  test('every sitemap URL is live and on the canonical origin', { tag: '@smoke' }, async ({ request }) => {
    const urls = parseSitemap(await (await request.get('/sitemap.xml')).text());
    expect(urls.length).toBeGreaterThanOrEqual(50);
    for (const url of urls) expect(url.startsWith(config.FAITHFULNESS_BASE_URL)).toBe(true);
    const broken = (await checkUrls(request, urls, config.LINK_CHECK_CONCURRENCY)).filter(
      (r) => r.status !== 200,
    );
    expect(broken).toEqual([]);
  });

  test('internal links on key pages resolve', { tag: '@smoke' }, async ({ request }) => {
    const links = new Set<string>();
    for (const path of ['/', '/services', '/contact']) {
      const html = await (await request.get(path)).text();
      for (const [, href = ''] of html.matchAll(/href="(\/[^"#?]*)"/g)) {
        if (!href.startsWith('/assets/')) links.add(href);
      }
    }
    expect(links.size).toBeGreaterThan(20);
    const broken = (await checkUrls(request, [...links], config.LINK_CHECK_CONCURRENCY)).filter(
      (r) => r.status >= 400,
    );
    expect(broken).toEqual([]);
  });

  test('Google Ads script and conversion endpoints are permitted by production CSP', async ({ request }) => {
    const response = await request.get('/');
    const csp = parseCsp(response.headers()['content-security-policy'] ?? '');
    const urls: ReadonlyArray<readonly [string, string]> = [
      ['script-src', 'https://www.googletagmanager.com/gtag/js?id=AW-18484917918'],
      ['script-src', 'https://www.googleadservices.com/pagead/conversion_async.js'],
      ['script-src', 'https://www.gstatic.com/wcm/loader.js'],
      ['connect-src', 'https://www.google.com/ccm/collect'],
      ['connect-src', 'https://googleads.g.doubleclick.net/pagead/viewthroughconversion/18484917918/'],
      ['connect-src', 'https://pagead2.googlesyndication.com/pagead/conversion/18484917918/'],
      ['connect-src', 'https://ad.doubleclick.net/ccm/s/collect'],
      ['frame-src', 'https://www.googletagmanager.com/ns.html'],
    ];
    for (const [directive, url] of urls) {
      const sources = csp.get(directive) ?? csp.get('default-src') ?? [];
      expect(
        cspAllows(sources, url, config.FAITHFULNESS_BASE_URL),
        `${directive} must permit ${url}`,
      ).toBe(true);
    }
  });
});
