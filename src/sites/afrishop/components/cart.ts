import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';
import { parsePrice } from '@core/helpers/money';
import { fr } from '../data/strings';

/**
 * One line in /cart. Its remove / decrease / increase controls and selection checkbox have no accessible
 * names (F-AS-05), so they are located by icon; the line itself is anchored on its product heading.
 */
export class CartLineItem extends BaseComponent {
  readonly root: Locator;
  readonly selectCheckbox: Locator;
  readonly removeButton: Locator;
  readonly decreaseButton: Locator;
  readonly increaseButton: Locator;
  readonly quantity: Locator;
  readonly lineTotal: Locator;

  constructor(page: Page, title: string) {
    super(page);
    this.root = page
      .getByRole('main')
      .locator('div')
      .filter({ has: page.getByRole('heading', { level: 3, name: title, exact: true }) })
      .filter({ has: page.getByRole('checkbox') })
      .last();
    this.selectCheckbox = this.root.getByRole('checkbox');
    this.removeButton = this.root.getByRole('button').filter({ has: page.locator('svg.lucide-trash2') });
    this.decreaseButton = this.root.getByRole('button').filter({ has: page.locator('svg.lucide-minus') });
    this.increaseButton = this.root.getByRole('button').filter({ has: page.locator('svg.lucide-plus') });
    this.quantity = this.root.getByText(/^\d+$/);
    this.lineTotal = this.root.getByText(/^\$[\d,]+\.\d{2}$/);
  }
}

export class OrderSummary extends BaseComponent {
  readonly root: Locator;
  readonly checkoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.root = page
      .getByRole('main')
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: fr.cart.summary }) })
      .filter({ hasText: 'Total' })
      .last();
    this.checkoutButton = page.getByRole('button', { name: /^Procéder au paiement/ });
  }

  async total(): Promise<number> {
    const text = await this.root.innerText();
    const match = /Total\s*(\$[\d,]+(?:\.\d+)?)/.exec(text);
    if (!match?.[1]) throw new Error(`No total in order summary: ${text}`);
    return parsePrice(match[1]);
  }
}
