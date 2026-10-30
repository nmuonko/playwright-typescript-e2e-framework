import { expectFailureFrom } from '@core/known-issues';
import { test, expect } from '@afrishop/fixtures';
import { cartTotal, createCart } from '@afrishop/data/cart';
import { createShippingDetails } from '@afrishop/data/checkout';
import { issues } from '@afrishop/data/known-issues';
import { fr } from '@afrishop/data/strings';
import { mockGuestRegistration, type RegisterPayload } from '@afrishop/mocks/checkout.mock';

// Checkout submissions carry credential fields. Traces record raw request bodies, so they are off for this
// file and published reports never contain credential-shaped data (the guard's attachment masks them too).
test.use({ trace: 'off' });

test.describe('Checkout', { tag: '@regression' }, () => {
  const cart = createCart([
    { quantity: 2, priceUsd: 246 },
    { quantity: 1, priceUsd: 381 },
  ]);

  test.beforeEach(async ({ seedCart, checkoutPage }) => {
    await seedCart(cart);
    await checkoutPage.goto();
  });

  test('order summary mirrors the cart', async ({ checkoutPage }) => {
    for (const line of cart) {
      await expect(checkoutPage.orderSummary).toContainText(`Quantité: ${line.quantity}`);
    }
    expect(await checkoutPage.orderTotal()).toBe(cartTotal(cart));
    await expect(checkoutPage.form.country).toHaveValue('DR Congo');
  });

  test('details are required before continuing to payment', async ({ checkoutPage, networkGuard }) => {
    const { form } = checkoutPage;
    await expect(form.submitButton).toBeDisabled();
    await form.fill(createShippingDetails());
    await expect(form.submitButton).toBeEnabled();
    await form.address.clear();
    await expect(form.submitButton).toBeDisabled();
    expect(networkGuard.writeAttempts).toEqual([]);
  });

  test('an invalid email is stopped by the browser before any request', async ({
    checkoutPage,
    networkGuard,
  }) => {
    const { form } = checkoutPage;
    await form.fill(createShippingDetails());
    await form.email.fill('not-an-email');
    await form.submitButton.click();
    expect(await form.email.evaluate((input: HTMLInputElement) => input.validity.typeMismatch)).toBe(true);
    expect(networkGuard.writeAttempts).toEqual([]);
  });

  test.describe('submission (auth-service mocked)', { tag: '@mocked' }, () => {
    test(
      'guest checkout sends the shipping details and confirms',
      { tag: '@smoke' },
      async ({ checkoutPage, networkGuard }) => {
        const details = createShippingDetails();
        const register = mockGuestRegistration(networkGuard, 'success');

        await checkoutPage.form.fill(details);
        await checkoutPage.form.submitButton.click();

        const payload = (await register.waitForRequest()).postDataJSON() as RegisterPayload;
        expect(payload).toMatchObject({
          action: 'register',
          email: details.person.email,
          fullName: details.person.fullName,
          phoneNumber: details.phone,
          addressLine1: details.address,
          city: details.city,
          country: 'DR Congo',
          signup_platform: 'web',
        });
        // Rendered twice (toast + live region); the visible toast is enough.
        await expect(checkoutPage.page.getByText('Account created successfully!').first()).toBeVisible();
      },
    );

    test('an existing account switches the form to sign-in', async ({ checkoutPage, networkGuard }) => {
      const details = createShippingDetails();
      mockGuestRegistration(networkGuard, 'user-exists');
      await checkoutPage.form.fill(details);
      await checkoutPage.form.submitButton.click();

      await expect(checkoutPage.page.getByText(fr.checkout.accountExists)).toBeVisible();
      await expect(checkoutPage.page.getByRole('textbox', { name: /mot de passe|password/i })).toBeVisible();
    });

    test('a rejection from the server is shown to the shopper', async ({ checkoutPage, networkGuard }) => {
      mockGuestRegistration(networkGuard, 'rejected');
      await checkoutPage.form.fill(createShippingDetails());
      await checkoutPage.form.submitButton.click();
      await expect(checkoutPage.page.getByText('Adresse refusée par le test').first()).toBeVisible();
    });

    test('an unreachable backend produces a shopper-friendly error', async ({
      checkoutPage,
      networkGuard,
    }, testInfo) => {
      expectFailureFrom(testInfo, issues.rawEdgeFunctionError);
      mockGuestRegistration(networkGuard, 'network-failure');
      await checkoutPage.form.fill(createShippingDetails());
      await checkoutPage.form.submitButton.click();

      const error = checkoutPage.page.getByText(/Failed to send a request|Erreur|réessayer/i).first();
      await expect(error).toBeVisible();
      await expect(error).not.toContainText('Edge Function');
    });
  });
});
