import { requireBaselineEnvironment, stabilize } from '@core/helpers/visual';
import { test, expect } from '@afrishop/fixtures';
import { createCart } from '@afrishop/data/cart';

test.describe('AfriShop visual regression', { tag: ['@visual', '@regression'] }, () => {
  test.beforeEach(() => {
    requireBaselineEnvironment();
  });

  test('empty cart', async ({ page, cartPage }) => {
    await cartPage.goto();
    await expect(cartPage.emptyHeading).toBeVisible();
    await stabilize(page);
    await expect(page.getByRole('main')).toHaveScreenshot('empty-cart.png');
  });

  test('order tracking', async ({ page, trackOrderPage }) => {
    await trackOrderPage.goto();
    await stabilize(page);
    await expect(page).toHaveScreenshot('track-order.png', { mask: [page.getByRole('banner')] });
  });

  test('checkout form with a seeded order', async ({ page, seedCart, checkoutPage }) => {
    // Fixed price so the summary is stable; the product image comes from a third-party CDN and is masked.
    await seedCart(createCart([{ quantity: 1, priceUsd: 246 }]));
    await checkoutPage.goto();
    await stabilize(page);
    await expect(page).toHaveScreenshot('checkout.png', {
      mask: [page.getByRole('img'), page.getByRole('banner')],
      fullPage: true,
    });
  });
});
