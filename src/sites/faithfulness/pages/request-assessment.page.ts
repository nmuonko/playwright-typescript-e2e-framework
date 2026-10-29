import { expect, type Locator, type Page } from '@playwright/test';
import type { AssessmentRequest } from '../data/forms';
import { FaithfulnessPage } from './faithfulness.page';

export interface AssessmentStepTwo {
  readonly schedule: string;
  readonly start: string;
  readonly contactMethod: string;
  readonly payment: string;
}

export class RequestAssessmentPage extends FaithfulnessPage {
  readonly path = '/request-assessment';
  protected readonly h1 = 'Request a complimentary care assessment';
  readonly form: Locator;
  // Step 1
  readonly name: Locator;
  readonly email: Locator;
  readonly phone: Locator;
  readonly zip: Locator;
  readonly relationship: Locator;
  readonly careTypes: Locator;
  readonly continueButton: Locator;
  // Step 2
  readonly schedule: Locator;
  readonly start: Locator;
  readonly contactMethod: Locator;
  readonly payment: Locator;
  readonly notes: Locator;
  readonly backButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.form = page
      .locator('form')
      .filter({ has: page.getByRole('heading', { name: 'Assessment request form' }) });
    const f = page.getByRole('main');
    this.name = f.getByLabel('Your name *');
    this.email = f.getByLabel('Email (optional)');
    this.phone = f.getByLabel('Phone number *');
    this.zip = f.getByLabel('ZIP code *');
    this.relationship = f.getByLabel('Who needs care? *');
    this.careTypes = f.getByRole('group', { name: 'What kind of care are you considering? *' });
    this.continueButton = f.getByRole('button', { name: 'Continue' });
    this.schedule = f.getByLabel('What schedule are you looking for, or how many hours are needed? *');
    this.start = f.getByLabel('When should care start? *');
    this.contactMethod = f.getByLabel('Best way to reach you *');
    this.payment = f.getByLabel('Are you able to pay privately for home care services? *');
    this.notes = f.getByLabel('Anything else we should know? (optional)');
    this.backButton = f.getByRole('button', { name: 'Back' });
    this.submitButton = f.getByRole('button', { name: 'Request in-home assessment' });
  }

  async fillStepOne(request: AssessmentRequest): Promise<void> {
    await this.name.fill(request.person.fullName);
    await this.email.fill(request.person.email);
    await this.phone.fill(request.person.phone);
    await this.zip.fill(request.zip);
    await this.relationship.selectOption(request.relationship);
    for (const care of request.careTypes) {
      await this.careTypes.getByRole('checkbox', { name: care, exact: true }).check();
    }
  }

  async continueToStepTwo(): Promise<void> {
    await this.continueButton.click();
    await expect(this.submitButton).toBeVisible();
  }

  async fillStepTwo(values: AssessmentStepTwo, notes: string): Promise<void> {
    await this.schedule.selectOption(values.schedule);
    await this.start.selectOption(values.start);
    await this.contactMethod.selectOption(values.contactMethod);
    await this.payment.selectOption(values.payment);
    await this.notes.fill(notes);
  }

  error(message: string): Locator {
    return this.page.getByRole('main').getByText(message, { exact: true });
  }
}
