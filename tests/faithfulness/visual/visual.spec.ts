import { requireBaselineEnvironment, stabilize } from '@core/helpers/visual';
import { test, expect } from '@faithfulness/fixtures';

test.describe('Faithfulness visual regression', { tag: ['@visual', '@regression'] }, () => {
  test.beforeEach(() => {
    requireBaselineEnvironment();
  });

  test('footer', async ({ page, homePage }) => {
    await homePage.goto();
    await stabilize(page);
    // The copyright year changes annually and is not a design regression.
    await expect(homePage.footer.root).toHaveScreenshot('footer.png', {
      mask: [homePage.footer.root.getByText(/© \d{4}/)],
    });
  });

  test('consultation form in its validation-error state', async ({ page, contactPage }) => {
    await contactPage.goto();
    await contactPage.form.submit();
    await expect(contactPage.form.error('Please enter a ZIP code')).toBeVisible();
    await stabilize(page);
    await expect(contactPage.form.root).toHaveScreenshot('consultation-form-errors.png');
  });

  test('pricing section on paying-for-care', async ({ page, payingForCarePage }) => {
    await payingForCarePage.goto();
    await stabilize(page);
    const section = page.locator('section').filter({ has: payingForCarePage.pricingHeading });
    await expect(section).toHaveScreenshot('pricing-section.png');
  });
});
