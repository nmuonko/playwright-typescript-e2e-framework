import type { Locator, Page } from '@playwright/test';
import { BaseComponent } from '@core/base.page';
import { parsePrice } from '@core/helpers/money';

export class ProductCard extends BaseComponent {
  readonly title: Locator;
  readonly price: Locator;

  constructor(
    page: Page,
    readonly root: Locator,
  ) {
    super(page);
    this.title = root.getByRole('heading', { level: 3 });
    this.price = root.getByText(/^\$\s?[\d,]+(\.\d+)?$/).first();
  }
}

/** Any product listing: home grid, search results, category pages. */
export class ProductGrid extends BaseComponent {
  readonly cards: Locator;

  constructor(page: Page, scope: Locator = page.getByRole('main')) {
    super(page);
    this.cards = scope.getByRole('link').filter({ has: page.getByRole('heading', { level: 3 }) });
  }

  card(index: number): ProductCard {
    return new ProductCard(this.page, this.cards.nth(index));
  }

  async titles(): Promise<string[]> {
    return this.cards.getByRole('heading', { level: 3 }).allInnerTexts();
  }

  /**
   * Displayed price of each card, in on-screen order. Uses textContent (off-screen cards have empty
   * innerText) and the *last* amount, because some titles contain prices ("+ $100 Gift Card").
   */
  async prices(): Promise<number[]> {
    const texts = await this.cards.evaluateAll((cards) => cards.map((card) => card.textContent ?? ''));
    return texts.map((text) => {
      const amount = text.match(/\$\s?[\d,]+(?:\.\d+)?/g)?.at(-1);
      if (!amount) throw new Error(`Product card without a price: "${text.slice(0, 80)}"`);
      return parsePrice(amount);
    });
  }
}
