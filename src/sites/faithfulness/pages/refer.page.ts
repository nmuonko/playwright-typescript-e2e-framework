import type { Locator, Page } from '@playwright/test';
import type { Referral } from '../data/forms';
import { FaithfulnessPage } from './faithfulness.page';

export class ReferPage extends FaithfulnessPage {
  readonly path = '/refer';
  protected readonly h1 = 'Refer a client';
  readonly form: Locator;
  readonly referrerName: Locator;
  readonly organisation: Locator;
  readonly referrerPhone: Locator;
  readonly referrerEmail: Locator;
  readonly clientName: Locator;
  readonly familyPhone: Locator;
  readonly town: Locator;
  readonly zip: Locator;
  readonly urgency: Locator;
  readonly permission: Locator;
  readonly submitButton: Locator;
  readonly successHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.submitButton = page.getByRole('button', { name: 'Send referral' });
    this.form = page.locator('form').filter({ has: this.submitButton });
    const about = this.form.getByRole('group', { name: 'About you' });
    const client = this.form.getByRole('group', { name: 'About the client' });
    this.referrerName = about.getByLabel('Your name *');
    this.organisation = about.getByLabel('Organisation *');
    this.referrerPhone = about.getByLabel('Your phone');
    this.referrerEmail = about.getByLabel('Your email');
    this.clientName = client.getByLabel('Client name *');
    this.familyPhone = client.getByLabel('Best phone for the family *');
    this.town = client.getByLabel('Town');
    this.zip = client.getByLabel('ZIP code *');
    this.urgency = this.form.getByLabel('How soon is care needed?');
    this.permission = this.form.getByRole('checkbox', { name: /permission to share this referral/ });
    this.successHeading = page.getByRole('heading', { name: 'Referral received.' });
  }

  async fill(referral: Referral): Promise<void> {
    await this.referrerName.fill(referral.referrer.fullName);
    await this.organisation.fill(referral.organisation);
    await this.referrerPhone.fill(referral.referrer.phone);
    await this.referrerEmail.fill(referral.referrer.email);
    await this.clientName.fill(referral.client.fullName);
    await this.familyPhone.fill(referral.client.phone);
    await this.town.fill(referral.town);
    await this.zip.fill(referral.zip);
    await this.urgency.selectOption('Within 48 hours');
    await this.permission.check();
  }

  error(message: string): Locator {
    return this.form.getByText(message, { exact: true });
  }
}
