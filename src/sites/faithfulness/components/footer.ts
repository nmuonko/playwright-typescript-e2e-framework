import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';

export class Footer extends BaseComponent {
  readonly root: Locator;
  readonly servicesNav: Locator;
  readonly companyNav: Locator;
  readonly phoneLink: Locator;
  readonly emailLink: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.getByRole('contentinfo');
    this.servicesNav = this.root.getByRole('navigation', { name: 'Services' });
    this.companyNav = this.root.getByRole('navigation', { name: 'Company' });
    this.phoneLink = this.root.getByRole('link', { name: '(978) 868-5754' });
    this.emailLink = this.root.getByRole('link', { name: 'care@faithfulnesshomecare.com' });
  }
}
