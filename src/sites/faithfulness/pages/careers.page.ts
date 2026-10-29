import type { Locator, Page } from '@playwright/test';
import type { CareerApplication } from '../data/forms';
import { FaithfulnessPage } from './faithfulness.page';

export class CareersPage extends FaithfulnessPage {
  readonly path = '/careers';
  protected readonly h1 = 'Caregiving Work That Respects You, Too';
  readonly form: Locator;
  readonly fullName: Locator;
  readonly phone: Locator;
  readonly email: Locator;
  readonly zip: Locator;
  readonly position: Locator;
  readonly availability: Locator;
  readonly experience: Locator;
  readonly resumeInput: Locator;
  readonly submitButton: Locator;
  readonly successHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.submitButton = page.getByRole('button', { name: 'Submit My Application' });
    this.form = page.locator('form').filter({ has: this.submitButton });
    this.fullName = this.form.getByLabel('Full name *');
    this.phone = this.form.getByLabel('Phone *');
    this.email = this.form.getByLabel('Email *');
    this.zip = this.form.getByLabel('Your ZIP code');
    this.position = this.form.getByLabel('Position of interest');
    this.availability = this.form.getByLabel('Availability');
    this.experience = this.form.getByLabel('Caregiving experience');
    // The visible control is a styled button; the file input behind it is what receives files.
    this.resumeInput = this.form.locator('input[type="file"]');
    this.successHeading = page.getByRole('heading', { name: 'Application received.' });
  }

  async fill(application: CareerApplication): Promise<void> {
    await this.fullName.fill(application.person.fullName);
    await this.phone.fill(application.person.phone);
    await this.email.fill(application.person.email);
    await this.zip.fill(application.zip);
    await this.position.selectOption(application.position);
    await this.availability.fill(application.availability);
    await this.experience.fill(application.experience);
  }

  error(message: string): Locator {
    return this.form.getByText(message, { exact: true });
  }
}
