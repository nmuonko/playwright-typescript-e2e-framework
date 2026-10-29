import type { Page } from '@playwright/test';
import { BasePage } from '@core/base.page';
import { Header } from '../components/header';

/** Site-level base: every storefront page shares the search header. */
export abstract class AfrishopPage extends BasePage {
  readonly header: Header;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);
  }
}
