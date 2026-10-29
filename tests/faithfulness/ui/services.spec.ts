import { test, expect } from '@faithfulness/fixtures';
import { coreServices, pricing } from '@faithfulness/data/site';
import { ConsultationForm } from '@faithfulness/components/consultation-form';
import { ContentPage } from '@faithfulness/pages/content.page';

test.describe('Services and content', { tag: '@regression' }, () => {
  test('services hub presents the six core services', async ({ servicesPage }) => {
    await servicesPage.goto();
    await expect(servicesPage.serviceHeadings).toHaveText(coreServices.map((s) => s.label));
  });

  for (const service of coreServices) {
    test(`footer link "${service.label}" opens the service page`, async ({ page, servicesPage }) => {
      await servicesPage.goto();
      await servicesPage.footer.servicesNav.getByRole('link', { name: service.label, exact: true }).click();
      await expect(page).toHaveURL(service.path);
      const detail = new ContentPage(page, service);
      await detail.expectLoaded();
      // Each service page converts through the embedded consultation form.
      await expect(new ConsultationForm(page).submitButton).toBeVisible();
    });
  }

  test('help selector recommends services for the chosen need', async ({ homePage }) => {
    await homePage.goto();
    const need = homePage.helpSelector.option('Help bathing or dressing');
    await expect(need).toHaveAttribute('aria-pressed', 'false');
    await need.click();
    await expect(need).toHaveAttribute('aria-pressed', 'true');
    await expect(homePage.helpSelector.root.getByText('Recommended', { exact: true })).toBeVisible();
    await expect(homePage.helpSelector.root.getByText('Also helpful', { exact: true })).toBeVisible();
    await expect(homePage.helpSelector.root).toContainText('Toileting & Continence Assistance');
  });

  test('FAQ answers expand and collapse accessibly', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.faq.questions()).toHaveCount(7);
    const question = homePage.faq.question('How much does home care cost?');
    await expect(question).toHaveAttribute('aria-expanded', 'false');

    await question.click();
    await expect(question).toHaveAttribute('aria-expanded', 'true');
    const answer = homePage.faq.answer('How much does home care cost?');
    await expect(answer).toBeVisible();
    await expect(answer).toContainText('$39');

    await question.click();
    await expect(question).toHaveAttribute('aria-expanded', 'false');
    await expect(answer).toBeHidden();
  });

  test('paying-for-care states the published starting rate', async ({ payingForCarePage }) => {
    await payingForCarePage.goto();
    await expect(payingForCarePage.pricingHeading).toHaveText(pricing.heading);
  });
});
