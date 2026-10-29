import { test, expect } from '@faithfulness/fixtures';
import { createConsultationRequest } from '@faithfulness/data/forms';
import { mainNav } from '@faithfulness/data/site';
import { mockFormSubmit, submittedPayload } from '@faithfulness/mocks/forms.mock';
import { ContentPage } from '@faithfulness/pages/content.page';

test.describe('Faithfulness on mobile', { tag: ['@mobile', '@regression'] }, () => {
  test(
    'hamburger menu reveals the mobile navigation and navigates',
    { tag: '@smoke' },
    async ({ page, homePage }) => {
      await homePage.goto();
      await expect(homePage.header.mainNav).toBeHidden();
      await homePage.header.openMobileMenuButton.click();
      await expect(homePage.header.mobileNav).toBeVisible();

      const target = mainNav[0];
      if (!target) throw new Error('mainNav is empty');
      await homePage.header.mobileNav.getByRole('link', { name: target.label, exact: true }).click();
      await expect(page).toHaveURL(target.path);
      await new ContentPage(page, target).expectLoaded();
      await expect(homePage.header.mobileNav).toBeHidden();
    },
  );

  test('tap-to-call is available on the home page', async ({ homePage }) => {
    await homePage.goto();
    await expect(
      homePage.page.getByRole('main').getByRole('link', { name: 'Call Faithfulness' }),
    ).toHaveAttribute('href', 'tel:+19788685754');
  });

  test(
    'consultation form validates and submits on a phone (mocked)',
    { tag: '@mocked' },
    async ({ contactPage, networkGuard }) => {
      await contactPage.goto();
      await contactPage.form.submit();
      await expect(contactPage.form.error('Please enter a ZIP code')).toBeVisible();

      const lead = createConsultationRequest();
      const submit = mockFormSubmit(networkGuard, 'consultation', { kind: 'success' });
      await contactPage.form.fill(lead);
      await contactPage.form.submit();
      expect(await submittedPayload(submit)).toMatchObject({
        full_name: lead.person.fullName,
        zip: lead.zip,
      });
      await contactPage.form.expectSuccess();
    },
  );
});
