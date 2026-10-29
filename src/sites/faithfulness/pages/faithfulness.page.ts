import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '@core/base.page';
import { Footer } from '../components/footer';
import { Header } from '../components/header';

/** Site-level base: every Faithfulness page shares the header, footer and an H1. */
export abstract class FaithfulnessPage extends BasePage {
  readonly header: Header;
  readonly footer: Footer;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);
    this.footer = new Footer(page);
    this.heading = page.getByRole('heading', { level: 1 });
  }

  /** Accessible name or pattern of the page's H1. */
  protected abstract readonly h1: string | RegExp;

  async expectLoaded(): Promise<void> {
    await expect(this.heading).toHaveText(this.h1);
    await this.waitForHydration();
  }

  /**
   * The H1 is server-rendered, so it is visible before React attaches event handlers; clicking too early
   * hits an inert form. TanStack Start deletes its SSR buffer (window.$_TSR) once hydration completes.
   */
  async waitForHydration(): Promise<void> {
    await this.page.waitForFunction(() => '__TSR_ROUTER__' in window && !('$_TSR' in window));
  }

  /** Shared site chrome: banner with main navigation, and the footer contact block. */
  async expectSiteChrome(): Promise<void> {
    await expect(this.header.mainNav).toBeVisible();
    await expect(this.footer.phoneLink).toBeVisible();
  }
}
