import { lookup } from 'node:dns/promises';
import { test as base } from '@core/fixtures';
import { annotateKnownIssue } from '@core/known-issues';
import { CART_STORAGE_KEY, type CartEntry } from './data/cart';
import { issues } from './data/known-issues';
import { afrishopPolicy } from './network-policy';
import { HomePage } from './pages/catalog.pages';
import { ProductPage } from './pages/product.page';
import { CartPage, CheckoutPage, TrackOrderPage } from './pages/purchase.pages';

/** Engine wordings for "the host could not be reached" (Firefox reports DNS failures as a generic error). */
const BACKEND_UNREACHABLE =
  /ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_ADDRESS_UNREACHABLE|NS_ERROR_UNKNOWN_HOST|NS_ERROR_CONNECTION_REFUSED|hostname could not be found|Could not connect/i;
const BLOCKED_BY_GUARD = /BLOCKED_BY_CLIENT|blocked by client/i;

/**
 * Decides whether failed backend requests point at the environment rather than the application: the API host
 * does not resolve (checked from Node, so it is engine-independent), or the engine reported a connection failure.
 */
async function environmentCause(failed: ReadonlyMap<string, string>): Promise<string | undefined> {
  for (const host of failed.keys()) {
    const resolves = await lookup(host).then(
      () => true,
      (error: unknown) => !['ENOTFOUND', 'EAI_AGAIN'].includes((error as { code?: string }).code ?? ''),
    );
    if (!resolves) return 'AfriShop backend unreachable: its API host does not resolve in DNS';
  }
  const error = [...failed.values()].find((text) => BACKEND_UNREACHABLE.test(text));
  return error ? `AfriShop backend unreachable: API requests failed before a response (${error})` : undefined;
}

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
    async ({ page, context }, use, testInfo) => {
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
      // Backend calls that never got a response, as opposed to guard aborts (which say "blocked").
      const failed = new Map<string, string>();
      // Context-wide, so tabs opened by sweeps are covered too.
      context.on('requestfailed', (request) => {
        const error = request.failure()?.errorText ?? '';
        if (/\/(functions|rest)\/v1\//.test(request.url()) && !BLOCKED_BY_GUARD.test(error)) {
          failed.set(new URL(request.url()).host, error);
        }
      });
      await use(responses);
      if (testInfo.status !== testInfo.expectedStatus && failed.size) {
        const cause = await environmentCause(failed);
        if (cause) testInfo.annotations.push({ type: 'environment', description: cause });
      }
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
