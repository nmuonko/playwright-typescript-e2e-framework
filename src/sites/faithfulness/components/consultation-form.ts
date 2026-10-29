import { expect, type Locator, type Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';
import type { ConsultationRequest } from '../data/forms';

/** Lead form used on /contact and embedded on the home and town pages. */
export class ConsultationForm extends BaseComponent {
  readonly root: Locator;
  readonly zip: Locator;
  readonly relationship: Locator;
  readonly urgency: Locator;
  readonly careTypes: Locator;
  readonly schedule: Locator;
  readonly payment: Locator;
  readonly fullName: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly preferredContact: Locator;
  readonly message: Locator;
  readonly submitButton: Locator;
  readonly alert: Locator;
  readonly successHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.submitButton = page.getByRole('button', { name: 'Request my free consultation' });
    // After a successful submit the form is replaced, so the success card is located page-wide.
    this.root = page.locator('form').filter({ has: this.submitButton });
    this.zip = this.root.getByLabel('ZIP code where care is needed *');
    this.relationship = this.root.getByLabel('Who needs care? *');
    this.urgency = this.root.getByLabel('When is care needed? *');
    this.careTypes = this.root.getByRole('group', { name: 'What kind of help is needed? *' });
    this.schedule = this.root.getByLabel('Expected care schedule *');
    this.payment = this.root.getByLabel('Are you able to pay privately for home care services? *');
    this.fullName = this.root.getByLabel('Full name *');
    this.phone = this.root.getByLabel('Phone number *');
    this.email = this.root.getByLabel('Email (optional)');
    this.preferredContact = this.root.getByLabel('Preferred contact method *');
    this.message = this.root.getByLabel('Anything else we should know? (optional)');
    this.alert = this.root.getByRole('alert');
    this.successHeading = page.getByRole('heading', { name: 'Thank you.' });
  }

  async fill(request: ConsultationRequest): Promise<void> {
    await this.zip.fill(request.zip);
    await this.relationship.selectOption(request.relationship);
    await this.urgency.selectOption(request.urgency);
    for (const care of request.careTypes) {
      await this.careTypes.getByRole('checkbox', { name: care, exact: true }).check();
    }
    await this.schedule.selectOption(request.schedule);
    await this.payment.selectOption(request.payment);
    await this.fullName.fill(request.person.fullName);
    await this.phone.fill(request.person.phone);
    await this.email.fill(request.person.email);
    await this.preferredContact.selectOption(request.preferredContact);
    await this.message.fill(request.message);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  error(message: string): Locator {
    return this.root.getByText(message, { exact: true });
  }

  async expectSuccess(): Promise<void> {
    await expect(this.successHeading).toBeVisible();
    await expect(
      this.page.getByText('A member of the Faithfulness Home Care team will follow up with you.'),
    ).toBeVisible();
  }
}
