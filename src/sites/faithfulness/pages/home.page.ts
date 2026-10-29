import type { Locator, Page } from '@playwright/test';
import { home } from '../data/site';
import { ConsultationForm } from '../components/consultation-form';
import { FaqAccordion } from '../components/faq-accordion';
import { HelpSelector } from '../components/help-selector';
import { ZipChecker } from '../components/zip-checker';
import { FaithfulnessPage } from './faithfulness.page';

export class HomePage extends FaithfulnessPage {
  readonly path = '/';
  protected readonly h1 = home.h1;
  readonly zipChecker: ZipChecker;
  readonly helpSelector: HelpSelector;
  readonly faq: FaqAccordion;
  readonly consultationForm: ConsultationForm;
  readonly heroCta: Locator;
  readonly skipLink: Locator;

  constructor(page: Page) {
    super(page);
    this.zipChecker = new ZipChecker(page);
    this.helpSelector = new HelpSelector(page);
    this.faq = new FaqAccordion(page);
    this.consultationForm = new ConsultationForm(page);
    this.heroCta = page
      .getByRole('main')
      .getByRole('link', { name: 'Schedule a Free Care Consultation' })
      .first();
    this.skipLink = page.getByRole('link', { name: 'Skip to main content' });
  }
}
