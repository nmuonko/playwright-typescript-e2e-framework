import { expect, type Locator, type Page } from '@playwright/test';
import { parsePrice } from '@core/helpers/money';
import { fr } from '../data/strings';
import { AfrishopPage } from './afrishop.page';

export interface PriceBreakdown {
  readonly article: number;
  readonly quantity: number;
  readonly total: number;
}

export class ProductPage extends AfrishopPage {
  readonly path: string;
  readonly title: Locator;
  readonly decreaseButton: Locator;
  readonly increaseButton: Locator;
  readonly addToCartButton: Locator;
  readonly priceBlock: Locator;

  constructor(page: Page, path = '/') {
    super(page);
    this.path = path;
    const main = page.getByRole('main');
    this.title = main.getByRole('heading', { level: 1 });
    this.decreaseButton = main.getByRole('button', { name: '-', exact: true });
    this.increaseButton = main.getByRole('button', { name: '+', exact: true });
    this.addToCartButton = main.getByRole('button', { name: fr.addToCart });
    this.priceBlock = main
      .locator('div')
      .filter({ hasText: /^Article/ })
      .filter({ hasText: 'Total' })
      .last();
  }

  async expectLoaded(): Promise<void> {
    await expect(this.title).toBeVisible();
    await expect(this.addToCartButton).toBeEnabled();
  }

  /** Reads "Article (×n) $X … Total $Y" from the price breakdown. */
  async breakdown(): Promise<PriceBreakdown> {
    const text = (await this.priceBlock.innerText()).replace(/\s+/g, ' ');
    const article = /Article(?: \(×(\d+)\))? (\$[\d,]+(?:\.\d+)?)/.exec(text);
    const total = /Total (\$[\d,]+(?:\.\d+)?)/.exec(text);
    if (!article?.[2] || !total?.[1]) throw new Error(`Unexpected price breakdown: ${text}`);
    return {
      quantity: Number(article[1] ?? 1),
      article: parsePrice(article[2]),
      total: parsePrice(total[1]),
    };
  }
}
