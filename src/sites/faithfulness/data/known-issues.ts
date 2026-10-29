import type { KnownIssue } from '@core/known-issues';

export const issues = {
  gtagBlockedByCsp: {
    id: 'F-FH-01',
    title: 'Google Ads gtag.js is referenced in every page but blocked by the site’s own CSP',
    consolePattern: /googletagmanager\.com\/gtag\/js.*Content Security Policy/s,
  },
  servicesMenuKeyboard: {
    id: 'F-FH-02',
    title: 'Header "Services" menu cannot be opened with Enter/Space; activating it closes the menu',
  },
  referMissingMain: {
    id: 'F-FH-03',
    title: '/refer renders without the site header, footer and <main> landmark (skip link has no target)',
  },
  listMarkup: {
    id: 'F-FH-04',
    title:
      'Invalid list markup: <dl>/<ul>/<ol> contain elements other than dt/dd/li (axe definition-list, list, listitem)',
  },
  pricingContrast: {
    id: 'F-FH-05',
    title: 'Step numerals on /paying-for-care fail WCAG AA colour contrast',
  },
} as const satisfies Record<string, KnownIssue>;
