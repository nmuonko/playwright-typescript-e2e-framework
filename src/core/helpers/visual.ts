import { test, type Page } from '@playwright/test';

/**
 * Baselines are rendered in the pinned Linux Playwright image (same as CI). Rendering on another OS
 * would produce font/antialiasing noise rather than a meaningful diff, so outside that environment the
 * visual suite is skipped with an explicit reason instead of silently passing or failing.
 */
export function requireBaselineEnvironment(): void {
  test.skip(
    process.platform !== 'linux',
    'Visual baselines are Linux-rendered; run `npm run test:visual:docker` (or rely on CI).',
  );
}

/** Waits for web fonts and removes motion so screenshots are deterministic. */
export async function stabilize(page: Page): Promise<void> {
  await page.addStyleTag({
    // Sticky headers get stitched into the middle of tall element screenshots; pin them to the top.
    content: [
      '*, *::before, *::after { scroll-behavior: auto !important; }',
      '::-webkit-scrollbar { display: none; }',
      'header { position: relative !important; top: auto !important; }',
    ].join('\n'),
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}
