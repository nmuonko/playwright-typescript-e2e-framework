import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';

/** Custom (Radix-style) select rendered as a combobox button with a popup listbox. */
export class SelectMenu extends BaseComponent {
  constructor(
    page: Page,
    readonly trigger: Locator,
  ) {
    super(page);
  }

  async choose(option: string): Promise<void> {
    await this.trigger.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  options(): Locator {
    return this.page.getByRole('option');
  }
}
