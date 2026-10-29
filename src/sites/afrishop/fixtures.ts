import { test as base } from '@core/fixtures';
import { annotateKnownIssue } from '@core/known-issues';
import { CART_STORAGE_KEY, type CartEntry } from './data/cart';
import { issues } from './data/known-issues';
import { afrishopPolicy } from './network-policy';
import { HomePage } from './pages/catalog.pages';
import { ProductPage } from './pages/product.page';
import { CartPage, CheckoutPage, TrackOrderPage } from './pages/purchase.pages';

interface CatalogResponse {
  readonly endpoint: string;
  readonly status: number;
  readonly items: number | null;
  readonly ms: number;
}

interface AfrishopFixtures {
  /** Records catalogue API responses and attaches them when a test fails (auto). */
  catalogDiagnostics: CatalogResponse[];
  homePage: HomePage;
  productPage: ProductPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  trackOrderPage: TrackOrderPage;
  /** Seeds localStorage before any page script runs; only once per test so in-test edits persist. */
  seedCart: (cart: readonly CartEntry[]) => Promise<void>;
}

export const test = base.extend<AfrishopFixtures>({
  networkPolicy: afrishopPolicy,
  catalogDiagnostics: [
    async ({ page }, use, testInfo) => {
      const responses: CatalogResponse[] = [];
      page.on('requestfinished', (request) => {
        const url = request.url();
        if (!/\/functions\/v1\/catalog-(search|home|category)/.test(url)) return;
        void request.response().then(async (response) => {
          if (!response) return;
          const body = await response.text().catch(() => '');
          responses.push({
            endpoint: url.replace(/^https:\/\/[^/]+/, '').slice(0, 160),
            status: response.status(),
            items: body ? (body.match(/"id":/g)?.length ?? 0) : null,
            ms: Math.round(request.timing().responseEnd),
          });
        });
      });
      await use(responses);
      if (testInfo.status !== testInfo.expectedStatus) {
        // Separate a known backend behaviour from a genuine regression in the report.
        const empty = responses.filter((r) => r.items === 0);
        if (empty.length) {
          annotateKnownIssue(testInfo, issues.searchFailsOpen, `${empty.length} empty catalog responses`);
        }
        await testInfo.attach('catalog-responses.json', {
          contentType: 'application/json',
          body: JSON.stringify(responses, null, 2),
        });
      }
    },
    { auto: true },
  ],
  homePage: async ({ page }, use) => use(new HomePage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  trackOrderPage: async ({ page }, use) => use(new TrackOrderPage(page)),
  seedCart: async ({ page }, use) => {
    await use(async (cart) => {
      await page.addInitScript(
        ([key, value]) => {
          if (sessionStorage.getItem('__cartSeeded')) return;
          localStorage.setItem(key, value);
          sessionStorage.setItem('__cartSeeded', '1');
        },
        [CART_STORAGE_KEY, JSON.stringify(cart)] as const,
      );
    });
  },
});

export { expect } from '@core/fixtures';
