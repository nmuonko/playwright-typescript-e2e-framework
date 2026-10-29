import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';

export class Header extends BaseComponent {
  readonly root: Locator;
  readonly mainNav: Locator;
  readonly servicesMenuButton: Locator;
  readonly servicesMenu: Locator;
  readonly phoneLink: Locator;
  readonly consultationCta: Locator;
  readonly openMobileMenuButton: Locator;
  readonly mobileNav: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.getByRole('banner');
    this.mainNav = this.root.getByRole('navigation', { name: 'Main' });
    this.servicesMenuButton = this.mainNav.getByRole('button', { name: 'Services' });
    // The button's aria-controls points at this id.
    this.servicesMenu = page.locator('#services-menu');
    this.phoneLink = this.root.getByRole('link', { name: '(978) 868-5754' });
    this.consultationCta = this.root.getByRole('link', { name: 'Free Care Consultation' });
    this.openMobileMenuButton = this.root.getByRole('button', { name: 'Open menu' });
    this.mobileNav = page.getByRole('navigation', { name: 'Mobile' });
  }

  navLink(label: string): Locator {
    return this.mainNav.getByRole('link', { name: label, exact: true });
  }
}
