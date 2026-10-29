import type { Page } from '@playwright/test';
import { ConsultationForm } from '../components/consultation-form';
import { FaithfulnessPage } from './faithfulness.page';

export class ContactPage extends FaithfulnessPage {
  readonly path = '/contact';
  protected readonly h1 = 'Get a Free Care Consultation';
  readonly form: ConsultationForm;

  constructor(page: Page) {
    super(page);
    this.form = new ConsultationForm(page);
  }
}
