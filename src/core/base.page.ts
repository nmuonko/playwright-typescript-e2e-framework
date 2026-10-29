import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Root of the page-object hierarchy.
 * Concrete pages declare their route and what "loaded" means; navigation is shared.
 */
export abstract class BasePage {
  /** Path relative to the project's baseURL. */
  abstract readonly path: string;

  constructor(readonly page: Page) {}

  async goto(): Promise<this> {
    await this.page.goto(this.path);
    await this.expectLoaded();
    return this;
  }

  /** Web-first assertion(s) proving the page rendered its primary content. */
  abstract expectLoaded(): Promise<void>;
}

/** Base for reusable widgets composed into pages (header, product card, forms...). */
export abstract class BaseComponent {
  constructor(readonly page: Page) {}
}

/**
 * Resolves once React has attached its event props to the element. Server-rendered controls exist
 * before their island hydrates; typing into them earlier gets reset when React takes over.
 */
export async function waitForReactHydration(locator: Locator): Promise<void> {
  await expect
    .poll(() => locator.evaluate((el) => Object.keys(el).some((key) => key.startsWith('__reactProps$'))), {
      message: 'element was never hydrated by React',
    })
    .toBe(true);
}
