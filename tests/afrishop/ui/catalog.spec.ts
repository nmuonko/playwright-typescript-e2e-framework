import { expectFailureFrom } from '@core/known-issues';
import { expectSorted } from '@core/helpers/money';
import { test, expect } from '@afrishop/fixtures';
import { issues } from '@afrishop/data/known-issues';
import { CATALOG_TIMEOUT_MS, fr } from '@afrishop/data/strings';
import { CategoryPage, SearchResultsPage } from '@afrishop/pages/catalog.pages';
import { ProductPage } from '@afrishop/pages/product.page';
import { ProductGrid } from '@afrishop/components/product-grid';

test.describe('Catalogue browsing', { tag: '@regression' }, () => {
  test('home grid sorts by price in both directions', { tag: '@smoke' }, async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.sort.trigger).toHaveText(fr.sort.cheapest);
    expectSorted(await homePage.grid.prices(), 'asc');

    await homePage.sort.choose(fr.sort.priciest);
    await expect(homePage.sort.trigger).toHaveText(fr.sort.priciest);
    await expect.poll(async () => isSorted(await homePage.grid.prices(), 'desc')).toBe(true);
  });

  test('pagination moves to a different page of products', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.previousPage).toBeDisabled();
    const firstPage = await homePage.grid.titles();

    await homePage.nextPage.click();
    await expect(homePage.previousPage).toBeEnabled();
    await expect.poll(() => homePage.grid.titles()).not.toEqual(firstPage);
  });

  test('country store button opens that store with products', async ({ page, homePage }) => {
    const [store] = fr.countries;
    await homePage.goto();
    await homePage.countryButton(store.button).click();
    await expect(page).toHaveURL(store.path);
    await expect(page.getByText(/^\$\s?[\d,]+|[\d,]+ \$$/).first()).toBeVisible();
  });

  test('category page shows a product count that matches the listing', async ({ page }) => {
    const category = new CategoryPage(page, 'phones', 'Téléphones');
    await category.goto();
    await expect(category.grid.cards).toHaveCount(await category.shownCount());
  });

  test.describe('search', { tag: '@live-search' }, () => {
    test('results are relevant to the query', async ({ page }) => {
      const search = new SearchResultsPage(page, 'iphone');
      await search.goto();
      const titles = (await search.grid.titles()).slice(0, 10);
      expect(titles.length).toBeGreaterThan(0);
      for (const title of titles) expect(title.toLowerCase()).toContain('iphone');
    });

    test('results honour the selected price sort', async ({ page }, testInfo) => {
      expectFailureFrom(testInfo, issues.searchSortIgnoresPrice);
      const search = new SearchResultsPage(page, 'samsung');
      await search.goto();
      await expect(search.sort.trigger).toHaveText('Prix: croissant');
      expectSorted(await search.grid.prices(), 'asc');
    });

    test('an unmatched query shows the empty state and can be cleared', async ({ page }) => {
      const search = new SearchResultsPage(page, 'zzzxqv123');
      await search.goto();
      await expect(search.emptyState).toBeVisible();
      await expect(search.grid.cards).toHaveCount(0);
      await expect(search.resultCount).toHaveText(/^0 produits? affichés?$/);

      await search.clearSearchButton.click();
      await expect(page).not.toHaveURL(/q=zzzxqv123/);
    });
  });

  test.describe('product detail', () => {
    test(
      'quantity drives the price breakdown and cannot drop below one',
      { tag: '@smoke' },
      async ({ page, homePage }) => {
        await homePage.goto();
        await homePage.grid.card(0).root.click();
        const product = new ProductPage(page);
        await product.expectLoaded();

        const single = await product.breakdown();
        expect(single.quantity).toBe(1);
        expect(single.total).toBe(single.article);

        await product.increaseButton.click();
        await expect.poll(async () => (await product.breakdown()).quantity).toBe(2);
        expect((await product.breakdown()).total).toBeCloseTo(single.total * 2, 2);

        await product.decreaseButton.click();
        await product.decreaseButton.click();
        await expect.poll(async () => (await product.breakdown()).quantity).toBe(1);
        expect((await product.breakdown()).total).toBe(single.total);
      },
    );

    test(
      'similar products are offered on the detail page',
      { tag: '@live-search' },
      async ({ page, homePage }) => {
        await homePage.goto();
        await homePage.grid.card(0).root.click();
        const similar = page
          .getByRole('main')
          .locator('section, div')
          .filter({
            has: page.getByRole('heading', { level: 2, name: 'Produits similaires' }),
          });
        await expect(new ProductGrid(page, similar.last()).cards.first()).toBeVisible({
          timeout: CATALOG_TIMEOUT_MS,
        });
      },
    );

    test('an unknown product shows a clear not-found message', async ({ page }, testInfo) => {
      expectFailureFrom(testInfo, issues.soft404);
      await page.goto('/product/amazon/B000000000');
      await expect(page.getByText(/introuvable|n'existe pas|not found/i).first()).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test('order history requires sign-in and remembers where to return', async ({ page }) => {
    await page.goto('/my-orders');
    await expect(page).toHaveURL('/shop-auth?redirect=%2Fmy-orders');
    await expect(page.getByRole('heading', { level: 1, name: 'Bienvenue sur AfriShop' })).toBeVisible();
  });

  test('tracking an unknown confirmation number reports it was not found', async ({ trackOrderPage }) => {
    await trackOrderPage.goto();
    await trackOrderPage.lookup('AFS-0000-0000');
    await expect(trackOrderPage.page.getByText(fr.trackOrder.notFound)).toBeVisible();
  });
});

function isSorted(values: readonly number[], direction: 'asc' | 'desc'): boolean {
  return (
    values.length > 1 &&
    values.slice(1).every((v, i) => {
      const previous = values[i] ?? v;
      return direction === 'asc' ? previous <= v : previous >= v;
    })
  );
}
