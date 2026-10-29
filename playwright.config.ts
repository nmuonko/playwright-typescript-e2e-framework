import { defineConfig, devices, type PlaywrightTestProject } from '@playwright/test';
import { config } from './src/core/config';

interface Site {
  readonly name: 'faithfulness' | 'afrishop';
  readonly baseURL: string;
  readonly locale: string;
  readonly timezoneId: string;
}

const sites: readonly Site[] = [
  {
    name: 'faithfulness',
    baseURL: config.FAITHFULNESS_BASE_URL,
    locale: 'en-US',
    timezoneId: 'America/New_York',
  },
  { name: 'afrishop', baseURL: config.AFRISHOP_BASE_URL, locale: 'fr-FR', timezoneId: 'Africa/Lubumbashi' },
];

// Visual baselines are rendered on Linux and perf budgets are calibrated on Chromium,
// so those suites run only in the Chromium project.
const CHROMIUM_ONLY = ['**/visual/**', '**/perf/**'];
const NOT_BROWSER = ['**/api/**', '**/mobile/**'];
// Search ranking is server-side and AfriShop's search degrades under bursts (F-AS-12), so tests that hit live
// search run on Chromium and mobile only; Firefox/WebKit keep every other journey.
const LIVE_SEARCH = /@live-search/;

function projectsFor(site: Site): PlaywrightTestProject[] {
  const shared = { baseURL: site.baseURL, locale: site.locale, timezoneId: site.timezoneId };
  const testDir = `./tests/${site.name}`;
  return [
    {
      name: `${site.name}-chromium`,
      testDir,
      testIgnore: NOT_BROWSER,
      use: { ...devices['Desktop Chrome'], ...shared },
    },
    {
      name: `${site.name}-firefox`,
      testDir,
      testIgnore: [...NOT_BROWSER, ...CHROMIUM_ONLY],
      grepInvert: LIVE_SEARCH,
      use: { ...devices['Desktop Firefox'], ...shared },
    },
    {
      name: `${site.name}-webkit`,
      testDir,
      testIgnore: [...NOT_BROWSER, ...CHROMIUM_ONLY],
      grepInvert: LIVE_SEARCH,
      use: { ...devices['Desktop Safari'], ...shared },
    },
    {
      name: `${site.name}-mobile`,
      testDir: `${testDir}/mobile`,
      use: { ...devices['iPhone 13'], ...shared },
    },
    {
      name: `${site.name}-api`,
      testDir: `${testDir}/api`,
      use: { baseURL: site.baseURL, extraHTTPHeaders: { 'accept-language': site.locale } },
    },
  ];
}

export default defineConfig({
  fullyParallel: true,
  forbidOnly: config.CI,
  retries: config.CI ? 2 : 0,
  // These are live business sites: a small, fixed worker pool keeps load negligible.
  workers: config.WORKERS,
  timeout: 60_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  // CI must compare against committed baselines, never regenerate them.
  updateSnapshots: config.CI ? 'none' : 'missing',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  reporter: config.CI
    ? [['blob'], ['github'], ['list']]
    : [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: {
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Service workers can bypass page.route(); blocking them keeps the network guard authoritative.
    serviceWorkers: 'block',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    // Self-tests for the framework's own safety controls and helpers; never touch production.
    { name: 'framework', testDir: './tests/framework', use: { ...devices['Desktop Chrome'] } },
    ...sites.flatMap(projectsFor),
  ],
});
