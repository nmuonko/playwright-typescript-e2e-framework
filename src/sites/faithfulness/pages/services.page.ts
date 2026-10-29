import type { Locator, Page } from '@playwright/test';
import { FaithfulnessPage } from './faithfulness.page';

export class ServicesPage extends FaithfulnessPage {
  readonly path = '/services';
  protected readonly h1 = '6 Clear Ways We Support Life at Home';
  readonly serviceHeadings: Locator;

  constructor(page: Page) {
    super(page);
    this.serviceHeadings = page.getByRole('main').getByRole('heading', { level: 3 });
  }
}

export class ServiceAreasPage extends FaithfulnessPage {
  readonly path = '/service-areas';
  protected readonly h1 = 'Home Care Across Worcester County';

  communityLink(town: string): Locator {
    return this.page.getByRole('main').getByRole('link', { name: `${town}, MA`, exact: true });
  }
}

export class PayingForCarePage extends FaithfulnessPage {
  readonly path = '/paying-for-care';
  protected readonly h1 = 'Clear Answers About Cost, Before You Commit';
  readonly pricingHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.pricingHeading = page.getByRole('heading', { level: 2, name: /starting at/ });
  }
}
