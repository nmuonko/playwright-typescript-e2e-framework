import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';
import type { ShippingDetails } from '../data/checkout';
import { fr } from '../data/strings';

export class CheckoutForm extends BaseComponent {
  readonly fullName: Locator;
  readonly email: Locator;
  readonly phone: Locator;
  readonly address: Locator;
  readonly city: Locator;
  readonly country: Locator;
  readonly submitButton: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    super(page);
    this.fullName = page.getByLabel(fr.checkout.fullName);
    this.email = page.getByLabel(fr.checkout.email);
    this.phone = page.getByLabel(fr.checkout.phone);
    this.address = page.getByLabel(fr.checkout.address);
    this.city = page.getByLabel(fr.checkout.city);
    this.country = page.getByLabel(fr.checkout.country, { exact: true });
    this.submitButton = page.getByRole('button', { name: fr.checkout.submit });
    this.signInButton = page.getByRole('button', { name: 'Se connecter' });
  }

  async fill(details: ShippingDetails): Promise<void> {
    await this.fullName.fill(details.person.fullName);
    await this.email.fill(details.person.email);
    await this.phone.fill(details.phone);
    await this.address.fill(details.address);
    await this.city.fill(details.city);
  }
}
