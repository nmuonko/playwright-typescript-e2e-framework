import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';

/** "Where do you need care?" availability widget on the home and service-area pages. */
export class ZipChecker extends BaseComponent {
  readonly root: Locator;
  readonly zipInput: Locator;
  readonly checkButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page
      .locator('section, form')
      .filter({ has: page.getByRole('button', { name: 'Check Availability' }) })
      .last();
    this.zipInput = this.root.getByRole('textbox', { name: 'ZIP Code', exact: true });
    this.checkButton = this.root.getByRole('button', { name: 'Check Availability' });
  }

  async check(zip: string): Promise<void> {
    await this.zipInput.fill(zip);
    await this.checkButton.click();
  }
}
