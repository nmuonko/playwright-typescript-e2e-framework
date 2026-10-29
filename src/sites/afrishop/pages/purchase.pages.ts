import { expect, type Locator, type Page } from '@playwright/test';
import { parsePrice } from '@core/helpers/money';
import { CartLineItem, OrderSummary } from '../components/cart';
import { CheckoutForm } from '../components/checkout-form';
import { fr } from '../data/strings';
import { AfrishopPage } from './afrishop.page';

export class CartPage extends AfrishopPage {
  readonly path = '/cart';
  readonly heading: Locator;
  readonly emptyHeading: Locator;
  readonly itemCount: Locator;
  readonly clearButton: Locator;
  readonly summary: OrderSummary;

  constructor(page: Page) {
    super(page);
    const main = page.getByRole('main');
    this.heading = main.getByRole('heading', { level: 1, name: fr.cart.heading });
    this.emptyHeading = main.getByRole('heading', { name: fr.cart.empty });
    this.itemCount = main.getByText(/^\d+ articles?$/);
    this.clearButton = main.getByRole('button', { name: fr.cart.clear });
    this.summary = new OrderSummary(page);
  }

  /** "Vider le panier" asks for confirmation in an alert dialog. */
  async clearCart(): Promise<void> {
    await this.clearButton.click();
    const dialog = this.page.getByRole('alertdialog', { name: 'Vider votre panier ?' });
    await dialog.getByRole('button', { name: 'Oui, vider' }).click();
  }

  line(title: string): CartLineItem {
    return new CartLineItem(this.page, title);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }
}

export class CheckoutPage extends AfrishopPage {
  readonly path = '/checkout';
  readonly heading: Locator;
  readonly orderSummary: Locator;
  readonly form: CheckoutForm;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: fr.checkout.heading });
    this.orderSummary = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: fr.checkout.orderHeading }) })
      .filter({ hasText: 'Total' })
      .last();
    this.form = new CheckoutForm(page);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async orderTotal(): Promise<number> {
    const match = /Total\s*(\$[\d,]+(?:\.\d+)?)/.exec(await this.orderSummary.innerText());
    if (!match?.[1]) throw new Error('No total in checkout summary');
    return parsePrice(match[1]);
  }
}

export class TrackOrderPage extends AfrishopPage {
  readonly path = '/track-order';
  readonly confirmationInput: Locator;

  constructor(page: Page) {
    super(page);
    this.confirmationInput = page.getByRole('textbox', { name: fr.trackOrder.placeholder });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1, name: 'Suivi de commande' })).toBeVisible();
  }

  async lookup(confirmation: string): Promise<void> {
    await this.confirmationInput.fill(confirmation);
    await this.confirmationInput.press('Enter');
  }
}
