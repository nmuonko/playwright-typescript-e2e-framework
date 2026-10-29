import { roundCents } from '@core/helpers/money';
import { test, expect } from '@afrishop/fixtures';
import { cartTotal, createCart, lineAt } from '@afrishop/data/cart';
import { fr } from '@afrishop/data/strings';

// The cart renders line totals without thousands separators, e.g. "$1254.42".
const money = (value: number): string => `$${value.toFixed(2)}`;

test.describe('Cart', { tag: '@regression' }, () => {
  test('line totals and order total add up', { tag: '@smoke' }, async ({ cartPage, seedCart }) => {
    const cart = createCart([{ quantity: 2 }, { quantity: 1 }, { quantity: 3 }]);
    await seedCart(cart);
    await cartPage.goto();

    for (const line of cart) {
      const row = cartPage.line(line.title);
      await expect(row.quantity).toHaveText(String(line.quantity));
      await expect(row.lineTotal).toHaveText(money(roundCents(line.priceUsd * line.quantity)));
    }
    // The header counts units, the checkout button counts lines.
    await expect(cartPage.itemCount).toHaveText('6 articles');
    expect(await cartPage.summary.total()).toBe(cartTotal(cart));
    await expect(cartPage.summary.checkoutButton).toHaveText(fr.cart.checkout(3));
  });

  test('changing quantity recalculates the line and order totals', async ({ cartPage, seedCart }) => {
    const cart = createCart([
      { quantity: 1, priceUsd: 246.5 },
      { quantity: 1, priceUsd: 99.99 },
    ]);
    await seedCart(cart);
    await cartPage.goto();
    const first = cartPage.line(lineAt(cart, 0).title);

    await first.increaseButton.click();
    await expect(first.quantity).toHaveText('2');
    await expect(first.lineTotal).toHaveText('$493.00');
    await expect.poll(() => cartPage.summary.total()).toBe(592.99);

    await first.decreaseButton.click();
    await expect(first.quantity).toHaveText('1');
    await expect.poll(() => cartPage.summary.total()).toBe(346.49);
  });

  test('deselected items are excluded from the total and the checkout count', async ({
    cartPage,
    seedCart,
  }) => {
    const cart = createCart([
      { quantity: 1, priceUsd: 120 },
      { quantity: 2, priceUsd: 35.25 },
    ]);
    await seedCart(cart);
    await cartPage.goto();

    await cartPage.line(lineAt(cart, 0).title).selectCheckbox.click();
    await expect(cartPage.line(lineAt(cart, 0).title).selectCheckbox).not.toBeChecked();
    await expect.poll(() => cartPage.summary.total()).toBe(70.5);
    await expect(cartPage.summary.checkoutButton).toHaveText(fr.cart.checkout(1));
  });

  test('removing lines and emptying the cart reach the empty state', async ({ cartPage, seedCart }) => {
    const cart = createCart([{ quantity: 1 }, { quantity: 1 }]);
    await seedCart(cart);
    await cartPage.goto();

    await cartPage.line(lineAt(cart, 0).title).removeButton.click();
    await expect(cartPage.line(lineAt(cart, 0).title).root).toHaveCount(0);
    await expect(cartPage.itemCount).toHaveText('1 article');

    await cartPage.clearCart();
    await expect(cartPage.emptyHeading).toBeVisible();
  });

  test('cart contents survive a page reload', async ({ page, cartPage, seedCart }) => {
    const cart = createCart([{ quantity: 1 }]);
    await seedCart(cart);
    await cartPage.goto();
    await cartPage.line(lineAt(cart, 0).title).increaseButton.click();
    await expect(cartPage.line(lineAt(cart, 0).title).quantity).toHaveText('2');

    await page.reload();
    await expect(cartPage.line(lineAt(cart, 0).title).quantity).toHaveText('2');
  });

  test('an empty cart invites the shopper back to the store', async ({ cartPage }) => {
    await cartPage.goto();
    await expect(cartPage.emptyHeading).toBeVisible();
    await expect(cartPage.page.getByRole('link', { name: 'Commencer les achats' })).toBeVisible();
  });
});
