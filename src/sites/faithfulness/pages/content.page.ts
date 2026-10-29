import type { Page } from '@playwright/test';
import type { NavTarget, ServiceArea } from '../data/site';
import { ConsultationForm } from '../components/consultation-form';
import { FaithfulnessPage } from './faithfulness.page';

/** Data-driven page object for the many informational pages that differ only by route and heading. */
export class ContentPage extends FaithfulnessPage {
  readonly path: string;
  protected readonly h1: string | RegExp;

  constructor(page: Page, target: Pick<NavTarget, 'path' | 'h1'>) {
    super(page);
    this.path = target.path;
    this.h1 = target.h1;
  }
}

export class ServiceAreaPage extends FaithfulnessPage {
  readonly path: string;
  protected readonly h1: string;
  readonly consultationForm: ConsultationForm;

  constructor(page: Page, area: ServiceArea) {
    super(page);
    this.path = `/service-areas/${area.slug}`;
    this.h1 = area.h1;
    this.consultationForm = new ConsultationForm(page);
  }
}
