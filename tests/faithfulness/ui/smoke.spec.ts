import { annotateKnownIssue, expectFailureFrom } from '@core/known-issues';
import { test, expect } from '@faithfulness/fixtures';
import { issues } from '@faithfulness/data/known-issues';
import { contactInfo, home, keyPages, mainNav } from '@faithfulness/data/site';
import { ContentPage } from '@faithfulness/pages/content.page';

test.describe('Faithfulness smoke', { tag: ['@smoke', '@regression'] }, () => {
  test('home page renders the value proposition and consultation CTA', async ({ page, homePage }) => {
    await homePage.goto();
    await expect(page).toHaveTitle(home.title);
    await expect(homePage.heroCta).toHaveAttribute('href', '/contact');
    await expect(homePage.header.consultationCta).toHaveAttribute('href', '/contact');
  });

  for (const target of mainNav) {
    test(`main navigation "${target.label}" opens ${target.path}`, async ({ page, homePage }) => {
      await homePage.goto();
      await homePage.header.navLink(target.label).click();
      await expect(page).toHaveURL(target.path);
      await new ContentPage(page, target).expectLoaded();
    });

    test(`${target.path} keeps the shared header and footer`, async ({ page }, testInfo) => {
      if (target.path === '/refer') expectFailureFrom(testInfo, issues.referMissingMain);
      const content = new ContentPage(page, target);
      await content.goto();
      await content.expectSiteChrome();
    });
  }

  test('phone and email contact points are correct in header and footer', async ({ homePage }) => {
    await homePage.goto();
    await expect(homePage.header.phoneLink).toHaveAttribute('href', contactInfo.phoneHref);
    await expect(homePage.footer.phoneLink).toHaveAttribute('href', contactInfo.phoneHref);
    await expect(homePage.footer.emailLink).toHaveAttribute('href', `mailto:${contactInfo.email}`);
    await expect(homePage.footer.root).toContainText(contactInfo.address);
  });

  test('key pages log no unexpected console errors', async ({ page, consoleErrors }, testInfo) => {
    for (const path of keyPages) {
      await page.goto(path, { waitUntil: 'load' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
    const known = consoleErrors.filter((e) => issues.gtagBlockedByCsp.consolePattern.test(e.text));
    if (known.length) annotateKnownIssue(testInfo, issues.gtagBlockedByCsp, `${known.length} console errors`);
    expect(consoleErrors.filter((e) => !known.includes(e))).toEqual([]);
  });
});
