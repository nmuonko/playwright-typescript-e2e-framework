import type { Locator, Page } from '@playwright/test';
import { FaithfulnessPage } from './faithfulness.page';

export class AuthPage extends FaithfulnessPage {
  readonly path = '/auth';
  protected readonly h1 = 'Sign In';
  readonly email: Locator;
  readonly password: Locator;
  readonly signInButton: Locator;

  constructor(page: Page) {
    super(page);
    const main = page.getByRole('main');
    this.email = main.getByRole('textbox', { name: 'Email' });
    this.password = main.getByRole('textbox', { name: 'Password' });
    this.signInButton = main.getByRole('button', { name: 'Sign In', exact: true });
  }
}
