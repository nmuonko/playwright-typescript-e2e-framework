import { config } from '@core/config';
import { checkUrl, parseRobots, parseSitemap } from '@core/helpers/http';
import { expectBaselineSecurityHeaders } from '@core/helpers/headers';
import { expectFailureFrom } from '@core/known-issues';
import { test, expect } from '@core/fixtures';
import { issues } from '@afrishop/data/known-issues';

const keyPages = ['/', '/cart', '/checkout', '/track-order', '/how-it-works'] as const;

test.describe('AfriShop HTTP contract', { tag: ['@api', '@regression'] }, () => {
  for (const path of keyPages) {
    test(`${path} returns the storefront shell within the response budget`, async ({ request }) => {
      const result = await checkUrl(request, path, { keepBody: true });
      expect(result.status).toBe(200);
      expect(result.contentType).toContain('text/html');
      expect(result.body).toContain('<div id="root">');
      expect(result.ms, `responded in ${result.ms}ms`).toBeLessThan(config.API_RESPONSE_BUDGET_MS);
    });
  }

  test('HTML responses meet the security-header baseline', { tag: '@smoke' }, async ({ request }) => {
    expectBaselineSecurityHeaders((await request.get('/')).headers());
  });


  test('fingerprinted assets are cached immutably for a year', async ({ request }) => {
    const asset = /\/assets\/[\w.-]+\.js/.exec(await (await request.get('/')).text())?.[0];
    expect(asset, 'storefront should reference a fingerprinted script').toBeTruthy();
    const cacheControl = (await request.get(asset ?? '')).headers()['cache-control'];
    expect(cacheControl).toMatch(/max-age=31536000/);
    expect(cacheControl).toMatch(/immutable/);
  });

  test('plain HTTP permanently redirects to HTTPS', async ({ request }) => {
    const http = config.AFRISHOP_BASE_URL.replace(/^https:/, 'http:');
    const response = await request.get(`${http}/`, { maxRedirects: 0, failOnStatusCode: false });
    expect([301, 308]).toContain(response.status());
    expect(response.headers()['location']).toBe(`${config.AFRISHOP_BASE_URL}/`);
  });

  test('unknown routes return HTTP 404', async ({ request }, testInfo) => {
    expectFailureFrom(testInfo, issues.soft404);
    expect((await checkUrl(request, '/this-page-does-not-exist-qa')).status).toBe(404);
  });

  test('robots.txt keeps private flows out of search engines', async ({ request }) => {
    const robots = parseRobots(await (await request.get('/robots.txt')).text()).get('*');
    for (const path of ['/checkout', '/shop-auth', '/admin', '/card-payment']) {
      expect(robots?.disallow).toContain(path);
    }
  });

  test('sitemap lists canonical storefront URLs', async ({ request }) => {
    const urls = parseSitemap(await (await request.get('/sitemap.xml')).text());
    expect(urls.length).toBeGreaterThan(5);
    expect(urls).toContain(`${config.AFRISHOP_BASE_URL}/`);
    for (const url of urls) expect(url.startsWith(config.AFRISHOP_BASE_URL)).toBe(true);
  });
});
