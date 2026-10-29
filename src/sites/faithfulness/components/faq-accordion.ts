import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';

export class FaqAccordion extends BaseComponent {
  readonly root: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Frequently asked questions' }) });
  }

  question(text: string): Locator {
    return this.root.getByRole('button', { name: text });
  }

  questions(): Locator {
    return this.root.getByRole('heading', { level: 3 }).getByRole('button');
  }
}
