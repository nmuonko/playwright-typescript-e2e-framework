import { test, expect } from '@faithfulness/fixtures';
import { inAreaZips, outOfAreaZip, serviceAreas } from '@faithfulness/data/site';
import { ServiceAreaPage } from '@faithfulness/pages/content.page';

test.describe('Coverage: ZIP checker and service areas', { tag: '@regression' }, () => {
  for (const { zip, town, slug } of inAreaZips) {
    test(`in-area ZIP ${zip} routes to the ${town} page`, { tag: '@smoke' }, async ({ page, homePage }) => {
      await homePage.goto();
      await homePage.zipChecker.check(zip);
      await expect(page).toHaveURL(`/service-areas/${slug}`);
      const area = serviceAreas.find((a) => a.slug === slug);
      if (!area) throw new Error(`No service-area fixture for ${slug}`);
      await new ServiceAreaPage(page, area).expectLoaded();
    });
  }

  test('out-of-area ZIP stays on the page and explains coverage', async ({ page, homePage }) => {
    await homePage.goto();
    await homePage.zipChecker.check(outOfAreaZip.zip);
    await expect(homePage.zipChecker.outOfAreaMessage).toContainText(outOfAreaZip.message);
    await expect(
      homePage.zipChecker.outOfAreaMessage.getByRole('link', { name: 'Ask about your area' }),
    ).toHaveAttribute('href', '/contact');
    await expect(page).toHaveURL('/');
  });

  const sanitised = [
    { typed: 'abc', value: '' },
    { typed: '01a44-0', value: '01440' },
  ];
  for (const { typed, value } of sanitised) {
    test(`ZIP field keeps digits only ("${typed}" -> "${value}")`, async ({ homePage }) => {
      await homePage.goto();
      await homePage.zipChecker.enter(typed);
      await expect(homePage.zipChecker.zipInput).toHaveValue(value);
    });
  }

  test('service-areas hub links every highlighted community to its own page', async ({
    serviceAreasPage,
  }) => {
    await serviceAreasPage.goto();
    for (const area of serviceAreas) {
      await expect(serviceAreasPage.communityLink(area.town)).toHaveAttribute(
        'href',
        `/service-areas/${area.slug}`,
      );
    }
  });

  test('every community page renders its localised heading and a consultation form', async ({ page }) => {
    for (const area of serviceAreas) {
      await test.step(area.town, async () => {
        const town = new ServiceAreaPage(page, area);
        await town.goto();
        await expect(town.consultationForm.submitButton).toBeVisible();
      });
    }
  });
});
