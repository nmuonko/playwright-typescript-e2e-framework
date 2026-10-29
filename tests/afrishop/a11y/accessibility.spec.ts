import { expectNoSeriousA11yViolations } from '@core/helpers/a11y';
import { expectFailureFrom } from '@core/known-issues';
import { test, expect } from '@afrishop/fixtures';
import { createCart } from '@afrishop/data/cart';
import { issues } from '@afrishop/data/known-issues';
import { fr } from '@afrishop/data/strings';
import { SearchResultsPage } from '@afrishop/pages/catalog.pages';
import { ProductPage } from '@afrishop/pages/product.page';

const known = {
  'button-name': issues.unnamedButtons.id,
  'color-contrast': issues.colorContrast.id,
  'target-size': issues.targetSizeAndLabels.id,
  'label-content-name-mismatch': issues.targetSizeAndLabels.id,
};

test.describe('AfriShop accessibility', { tag: ['@a11y', '@regression'] }, () => {
  test('home page has no new serious or critical axe violations', async ({ page, homePage }, testInfo) => {
    await homePage.goto();
    await expectNoSeriousA11yViolations(page, testInfo, { knownIssues: known });
  });

  test('search results have no new serious or critical axe violations', async ({ page }, testInfo) => {
    await new SearchResultsPage(page, 'iphone').goto();
    await expectNoSeriousA11yViolations(page, testInfo, { knownIssues: known });
  });

  test('product page has no new serious or critical axe violations', async ({ page }, testInfo) => {
    await new ProductPage(page, '/product/amazon/B088NHSZV6').goto();
    await expectNoSeriousA11yViolations(page, testInfo, { knownIssues: known });
  });

  for (const path of ['/cart', '/checkout'] as const) {
    test(`${path} has no new serious or critical axe violations`, async ({ page, seedCart }, testInfo) => {
      await seedCart(createCart([{ quantity: 1 }]));
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: path === '/cart' ? fr.cart.summary : fr.checkout.heading }),
      ).toBeVisible();
      await expectNoSeriousA11yViolations(page, testInfo, { knownIssues: known });
    });
  }

  test('track-order page has no new serious or critical axe violations', async ({
    page,
    trackOrderPage,
  }, testInfo) => {
    await trackOrderPage.goto();
    await expectNoSeriousA11yViolations(page, testInfo, { knownIssues: known });
  });

  test('header icon buttons have accessible names', async ({ homePage }, testInfo) => {
    expectFailureFrom(testInfo, issues.unnamedButtons);
    await homePage.goto();
    await expect(homePage.header.cartButton).toHaveAccessibleName(/panier|cart/i);
    await expect(homePage.header.menuButton).toHaveAccessibleName(/menu/i);
  });

  test('search can be performed with the keyboard alone', async ({ page, homePage }) => {
    await homePage.goto();
    await homePage.header.searchInput.focus();
    await page.keyboard.type('samsung');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=samsung/);
    await expect(new SearchResultsPage(page, 'samsung').heading).toBeVisible();
  });

  test('home sort menu is operable with the keyboard', async ({ page, homePage }) => {
    await homePage.goto();
    await homePage.sort.trigger.focus();
    await page.keyboard.press('Enter');
    // The listbox focuses the current option once its open animation settles.
    await expect(page.getByRole('option', { name: fr.sort.cheapest })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('option', { name: fr.sort.newest })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(homePage.sort.trigger).toHaveText(fr.sort.newest);
    await expect(homePage.sort.trigger).toBeFocused();
  });

  test('every checkout field has an accessible name and is reachable by Tab', async ({
    page,
    seedCart,
    checkoutPage,
  }) => {
    await seedCart(createCart([{ quantity: 1 }]));
    await checkoutPage.goto();
    const { form } = checkoutPage;
    const fields = [form.fullName, form.email, form.phone, form.address, form.city];
    await form.fullName.focus();
    for (const [index, field] of fields.entries()) {
      await expect(field).toBeFocused();
      await expect(field).toHaveAccessibleName(/\S/);
      if (index < fields.length - 1) await page.keyboard.press('Tab');
    }
  });
});
