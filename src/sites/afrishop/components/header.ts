import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';
import { fr } from '../data/strings';

export class Header extends BaseComponent {
  readonly root: Locator;
  readonly logo: Locator;
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  /**
   * The cart and menu buttons are icon-only with no accessible name (finding F-AS-05), so they can
   * only be located by their icon. Switch to getByRole(..., { name }) once the site labels them.
   */
  readonly cartButton: Locator;
  readonly menuButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page.getByRole('banner');
    this.logo = this.root.getByRole('button', { name: 'AfriShop' });
    this.searchInput = this.root.getByRole('textbox', { name: fr.searchPlaceholder });
    this.searchButton = this.root.getByRole('button', { name: fr.searchButton });
    this.cartButton = this.root.getByRole('button').filter({ has: page.locator('svg.lucide-shopping-cart') });
    this.menuButton = this.root.getByRole('button').filter({ has: page.locator('svg.lucide-menu') });
  }

  /** Submits with Enter: on phones the search button is icon-only and unnamed (F-AS-05). */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }
}
