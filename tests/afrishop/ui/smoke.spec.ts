import { expectNoUnexpectedConsoleErrors } from '@core/helpers/console';
import { test, expect } from '@afrishop/fixtures';
import { issues } from '@afrishop/data/known-issues';
import { SearchResultsPage } from '@afrishop/pages/catalog.pages';
import { ProductPage } from '@afrishop/pages/product.page';

test.describe('AfriShop smoke', { tag: ['@smoke', '@regression'] }, () => {
  test('home page lists priced products', async ({ page, homePage }) => {
    await homePage.goto();
    await expect(page).toHaveTitle(/AfriShop/);
    const prices = await homePage.grid.prices();
    expect(prices.length).toBeGreaterThan(0);
    for (const price of prices) expect(price).toBeGreaterThan(0);
  });

  test('search returns products matching the query', async ({ page, homePage }) => {
    await homePage.goto();
    await homePage.header.search('iphone');
    const results = new SearchResultsPage(page, 'iphone');
    await results.expectLoaded();
    await expect(page).toHaveURL(/\/search\?q=iphone/);
    await expect(results.grid.cards.first()).toBeVisible();
    await expect.poll(() => results.count()).toBeGreaterThan(0);
  });

  test('a product can be opened from the grid and added to the cart', async ({
    page,
    homePage,
    cartPage,
  }) => {
    await homePage.goto();
    const card = homePage.grid.card(0);
    const title = (await card.title.innerText()).trim();
    await card.root.click();

    const product = new ProductPage(page);
    await product.expectLoaded();
    await expect(product.title).toHaveText(title);
    await product.addToCartButton.click();
    await expect(product.header.cartButton).toHaveText('1');

    await cartPage.goto();
    await expect(cartPage.line(title).quantity).toHaveText('1');
  });

  test('key pages log no unexpected console errors', async ({ context, networkGuard }, testInfo) => {
    await expectNoUnexpectedConsoleErrors(
      {
        context,
        guard: networkGuard,
        paths: ['/', '/search?q=samsung', '/cart', '/checkout', '/track-order'],
        waitUntilLoaded: async (page) => {
          await expect(page.getByRole('heading').first()).toBeVisible();
        },
        knownIssues: [
          issues.settings406,
          issues.resourcesBlockedByCsp,
          issues.metaCspDirectiveIgnored,
          issues.trackingCookiesRejected,
        ],
      },
      testInfo,
    );
  });
});
