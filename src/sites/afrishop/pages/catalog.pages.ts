import { expect, type Locator, type Page } from '@playwright/test';
import { parsePrice } from '@core/helpers/money';
import { ProductGrid } from '../components/product-grid';
import { SelectMenu } from '../components/select-menu';
import { CATALOG_TIMEOUT_MS, fr } from '../data/strings';
import { AfrishopPage } from './afrishop.page';

export class HomePage extends AfrishopPage {
  readonly path = '/';
  readonly grid: ProductGrid;
  readonly sort: SelectMenu;
  readonly pagination: Locator;
  readonly previousPage: Locator;
  readonly nextPage: Locator;

  constructor(page: Page) {
    super(page);
    this.grid = new ProductGrid(page);
    this.sort = new SelectMenu(page, page.getByRole('main').getByRole('combobox').first());
    this.pagination = page.getByRole('navigation', { name: 'Pagination' });
    this.previousPage = this.pagination.getByRole('button', { name: 'Previous page' });
    this.nextPage = this.pagination.getByRole('button', { name: 'Next page' });
  }

  countryButton(label: string): Locator {
    return this.page.getByRole('region', { name: 'Acheter par pays' }).getByRole('button', { name: label });
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(this.grid.cards.first()).toBeVisible({ timeout: CATALOG_TIMEOUT_MS });
  }
}

export class SearchResultsPage extends AfrishopPage {
  readonly path: string;
  readonly heading: Locator;
  readonly resultCount: Locator;
  readonly grid: ProductGrid;
  readonly sort: SelectMenu;
  readonly emptyState: Locator;
  readonly clearSearchButton: Locator;

  constructor(
    page: Page,
    readonly query: string,
  ) {
    super(page);
    this.path = `/search?q=${encodeURIComponent(query)}`;
    const main = page.getByRole('main');
    this.heading = page.getByRole('heading', { level: 1, name: fr.searchHeading(query) });
    this.resultCount = main.getByText(fr.resultsCount);
    this.grid = new ProductGrid(page);
    this.sort = new SelectMenu(page, main.getByRole('combobox').nth(1));
    this.emptyState = main.getByText(fr.noResults);
    this.clearSearchButton = main.getByRole('button', { name: fr.clearSearch });
  }

  /**
   * The counter reads "0 produits affichés" while results are still loading, so "loaded" means
   * either result cards or the explicit empty state are on screen.
   */
  async expectLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible();
    await expect(this.grid.cards.first().or(this.emptyState)).toBeVisible({ timeout: CATALOG_TIMEOUT_MS });
  }

  async count(): Promise<number> {
    const text = await this.resultCount.innerText();
    return Number((fr.resultsCount.exec(text)?.[1] ?? 'NaN').replace(/[,\s]/g, ''));
  }
}

export class CategoryPage extends AfrishopPage {
  readonly path: string;
  readonly grid: ProductGrid;
  readonly counter: Locator;

  constructor(
    page: Page,
    slug: string,
    readonly title: string,
  ) {
    super(page);
    this.path = `/category/${slug}`;
    this.grid = new ProductGrid(page);
    this.counter = page.getByRole('main').getByText(/^\d[\d\s,]* \/ \d[\d\s,]* produits$/);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { level: 1 })).toHaveText(this.title);
    await expect(this.counter).toBeVisible({ timeout: CATALOG_TIMEOUT_MS });
  }

  async shownCount(): Promise<number> {
    return parsePrice((await this.counter.innerText()).split('/')[0] ?? '');
  }
}
