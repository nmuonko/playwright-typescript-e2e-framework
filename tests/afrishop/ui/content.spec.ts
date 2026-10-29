import type { Page } from '@playwright/test';
import { z } from 'zod';
import { config } from '@core/config';
import { parseSitemap } from '@core/helpers/http';
import { test, expect } from '@afrishop/fixtures';
import { CATALOG_TIMEOUT_MS } from '@afrishop/data/strings';

// The SPA answers every route with HTTP 200, so the only reliable broken-link signal is the
// client-side "404 / Page not found" view.
const notFoundView = (page: Page) => page.getByRole('heading', { level: 1, name: '404' });

test.describe('AfriShop content and contracts', { tag: '@regression' }, () => {
  test(
    'every sitemap URL renders real content, not the 404 view',
    { tag: '@smoke' },
    async ({ page, request }) => {
      const urls = parseSitemap(await (await request.get('/sitemap.xml')).text());
      expect(urls.length).toBeGreaterThan(5);
      const broken: string[] = [];
      for (const url of urls) {
        await test.step(url.replace(config.AFRISHOP_BASE_URL, '') || '/', async () => {
          await page.goto(url);
          await expect(page.locator('#root')).not.toBeEmpty();
          // Wait for the router to settle on either real content or the 404 view before judging.
          await expect(page.getByRole('heading').first()).toBeVisible();
          if (await notFoundView(page).isVisible()) broken.push(url);
        });
      }
      expect(broken, 'sitemap URLs that render the 404 view').toEqual([]);
    },
  );

  test(
    'catalog-home responses honour the product contract the UI relies on',
    { tag: '@api' },
    async ({ page }) => {
      const item = z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        currency: z.literal('USD').optional(),
      });
      const body = z.object({
        ok: z.literal(true),
        sections: z.array(z.object({ key: z.string(), items: z.array(item) })).min(1),
      });

      const response = page.waitForResponse(
        (r) => r.url().includes('/functions/v1/catalog-home') && r.status() === 200,
        { timeout: CATALOG_TIMEOUT_MS },
      );
      const started = Date.now();
      await page.goto('/');
      const parsed = body.safeParse(await (await response).json());
      expect(parsed.success, parsed.success ? '' : z.prettifyError(parsed.error)).toBe(true);
      expect(parsed.data?.sections.flatMap((s) => s.items).length).toBeGreaterThan(0);
      expect(Date.now() - started).toBeLessThan(CATALOG_TIMEOUT_MS);
    },
  );
});
