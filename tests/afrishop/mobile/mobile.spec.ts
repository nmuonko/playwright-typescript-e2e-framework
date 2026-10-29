import { test, expect } from '@afrishop/fixtures';
import { createShippingDetails } from '@afrishop/data/checkout';
import { fr } from '@afrishop/data/strings';
import { mockGuestRegistration } from '@afrishop/mocks/checkout.mock';
import { SearchResultsPage } from '@afrishop/pages/catalog.pages';
import { ProductPage } from '@afrishop/pages/product.page';

test.describe('AfriShop on mobile', { tag: ['@mobile', '@regression'] }, () => {
  test('bottom tab bar reaches every primary destination', { tag: '@smoke' }, async ({ page, homePage }) => {
    await homePage.goto();
    const tabBar = page.getByRole('navigation').filter({ has: page.getByRole('link', { name: 'Panier' }) });
    await expect(tabBar).toBeVisible();
    for (const item of fr.nav) {
      await expect(tabBar.getByRole('link', { name: item.label })).toHaveAttribute('href', item.path);
    }
    await tabBar.getByRole('link', { name: 'Panier' }).click();
    await expect(page).toHaveURL('/cart');
  });

  test('search from the header on a phone', async ({ page, homePage }) => {
    await homePage.goto();
    await homePage.header.search('samsung');
    const results = new SearchResultsPage(page, 'samsung');
    await results.expectLoaded();
    await expect(page).toHaveURL(/q=samsung/);
  });

  test(
    'product to cart to mocked guest checkout',
    { tag: '@mocked' },
    async ({ page, homePage, cartPage, checkoutPage, networkGuard }) => {
      await homePage.goto();
      const title = (await homePage.grid.card(0).title.innerText()).trim();
      await homePage.grid.card(0).root.click();
      const product = new ProductPage(page);
      await product.expectLoaded();
      await product.addToCartButton.click();

      await cartPage.goto();
      await expect(cartPage.line(title).quantity).toHaveText('1');
      await cartPage.summary.checkoutButton.click();
      await checkoutPage.expectLoaded();

      const register = mockGuestRegistration(networkGuard, 'success');
      const details = createShippingDetails();
      await checkoutPage.form.fill(details);
      await checkoutPage.form.submitButton.click();
      expect((await register.waitForRequest()).postDataJSON()).toMatchObject({
        email: details.person.email,
        country: 'DR Congo',
      });
    },
  );
});
