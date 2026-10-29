import { expectNoSeriousA11yViolations } from '@core/helpers/a11y';
import { expectFailureFrom } from '@core/known-issues';
import { test, expect } from '@faithfulness/fixtures';
import { issues } from '@faithfulness/data/known-issues';
import { consultationRequiredErrors } from '@faithfulness/data/forms';
import { ContentPage } from '@faithfulness/pages/content.page';

// Rule ids already documented in docs/FINDINGS.md; anything else serious/critical fails the scan.
const sharedListIssue = { 'definition-list': issues.listMarkup.id };
const pages = [
  {
    path: '/',
    h1: /In-Home Care Across/,
    known: { ...sharedListIssue, list: issues.listMarkup.id, listitem: issues.listMarkup.id },
  },
  { path: '/contact', h1: 'Get a Free Care Consultation', known: sharedListIssue },
  { path: '/services', h1: '6 Clear Ways We Support Life at Home', known: sharedListIssue },
  { path: '/request-assessment', h1: 'Request a complimentary care assessment', known: sharedListIssue },
  { path: '/refer', h1: 'Refer a client', known: {} },
  { path: '/careers', h1: 'Caregiving Work That Respects You, Too', known: sharedListIssue },
  {
    path: '/paying-for-care',
    h1: 'Clear Answers About Cost, Before You Commit',
    known: { ...sharedListIssue, 'color-contrast': issues.pricingContrast.id },
  },
] as const;

test.describe('Faithfulness accessibility', { tag: ['@a11y', '@regression'] }, () => {
  for (const target of pages) {
    test(`${target.path} has no new serious or critical axe violations`, async ({ page }, testInfo) => {
      await new ContentPage(page, target).goto();
      await expectNoSeriousA11yViolations(page, testInfo, { knownIssues: target.known });
    });
  }

  test('skip link moves keyboard focus past the header into the main content', async ({
    page,
    homePage,
    browserName,
  }) => {
    // WebKit on macOS only tabs to links with Option+Tab (system "keyboard navigation" setting).
    const tab = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
    await homePage.goto();
    await page.keyboard.press(tab);
    await expect(homePage.skipLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
    await page.keyboard.press(tab);
    const focusedInMain = page.getByRole('main').locator(':focus');
    await expect(focusedInMain).toHaveCount(1);
  });

  test('header Services menu opens with the keyboard and keeps its links reachable', async ({
    page,
    homePage,
  }, testInfo) => {
    expectFailureFrom(testInfo, issues.servicesMenuKeyboard);
    await homePage.goto();
    const { servicesMenuButton, servicesMenu } = homePage.header;
    await servicesMenuButton.focus();
    await page.keyboard.press('Enter');
    await expect(servicesMenuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(servicesMenu.getByRole('link').first()).toBeVisible();
  });

  test('consultation form errors are announced as each field’s description', async ({ contactPage }) => {
    await contactPage.goto();
    const { form } = contactPage;
    await form.submit();
    const fields = [
      form.zip,
      form.relationship,
      form.urgency,
      form.schedule,
      form.payment,
      form.fullName,
      form.phone,
    ];
    const messages = consultationRequiredErrors.filter(
      (m) => m !== 'Please choose at least one type of care',
    );
    for (const [index, field] of fields.entries()) {
      await expect(field).toHaveAccessibleDescription(new RegExp(messages[index] ?? '^$'));
    }
  });

  test('/refer exposes a main landmark for assistive technology', async ({ page }, testInfo) => {
    expectFailureFrom(testInfo, issues.referMissingMain);
    await new ContentPage(page, { path: '/refer', h1: 'Refer a client' }).goto();
    await expect(page.getByRole('main')).toHaveCount(1);
  });
});
