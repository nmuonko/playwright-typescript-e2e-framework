import type { Locator, Page } from '@playwright/test';
import { BaseComponent, waitForReactHydration } from '@core/base.page';

/** "Where do you need care?" availability widget on the home and service-area pages. */
export class ZipChecker extends BaseComponent {
  readonly root: Locator;
  readonly zipInput: Locator;
  readonly checkButton: Locator;
  /** Rendered outside the widget's form wrapper, so it is located within <main> instead of the root. */
  readonly outOfAreaMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: 'Check Availability' }) });
    this.zipInput = this.root.getByRole('textbox', { name: 'ZIP Code', exact: true });
    this.checkButton = this.root.getByRole('button', { name: 'Check Availability' });
    this.outOfAreaMessage = page.getByRole('main').getByText(/outside our current core coverage map/);
  }

  /** Types into the field once it is interactive (see waitForReactHydration). */
  async enter(zip: string): Promise<void> {
    await waitForReactHydration(this.zipInput);
    await this.zipInput.fill(zip);
  }

  async check(zip: string): Promise<void> {
    await this.enter(zip);
    await this.checkButton.click();
  }
}
