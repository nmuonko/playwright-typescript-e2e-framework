import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';

/** "What Kind of Help Does Your Loved One Need?" recommendation widget. */
export class HelpSelector extends BaseComponent {
  readonly group: Locator;
  readonly root: Locator;

  constructor(page: Page) {
    super(page);
    this.group = page.getByRole('group', { name: 'Type of help needed' });
    this.root = page.locator('section').filter({ has: this.group });
  }

  option(label: string): Locator {
    return this.group.getByRole('button', { name: label, exact: true });
  }
}
