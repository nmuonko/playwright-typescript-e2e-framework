import type { KnownIssue } from '@core/known-issues';

export const issues = {
  rawEdgeFunctionError: {
    id: 'F-AS-02',
    title: 'Checkout shows the raw "Failed to send a request to the Edge Function" error to shoppers',
  },
  soft404: {
    id: 'F-AS-04',
    title: 'Unknown routes and missing products return HTTP 200 (soft 404)',
  },
  unnamedButtons: {
    id: 'F-AS-05',
    title: 'Icon-only buttons and the cart item checkbox have no accessible name',
  },
  searchSortIgnoresPrice: {
    id: 'F-AS-11',
    title:
      'Search results labelled "Prix: croissant" are not in ascending price order (provider lists interleaved)',
  },
  searchFailsOpen: {
    id: 'F-AS-12',
    title:
      'Under sustained traffic, catalog endpoints return fast empty HTTP 200 responses instead of an error',
  },
  settings406: {
    id: 'F-AS-07',
    title: 'GET rest/v1/settings?select=shipping_rate_per_kg returns 406 on page load',
    consolePattern: /status of 406/,
  },
  resourcesBlockedByCsp: {
    id: 'F-AS-08',
    title: 'The meta CSP blocks resources the page itself requests (Google Fonts, TikTok IPv6 endpoint)',
    consolePattern:
      /(?=[\s\S]*(fonts\.googleapis\.com|tiktokw\.us))(?=[\s\S]*(Content[- ]Security[- ]Policy|style-src|connect-src))/,
  },
  metaCspDirectiveIgnored: {
    id: 'F-AS-08',
    title: 'The meta CSP also triggers a browser console notice on every page',
    consolePattern: /is ignored when delivered via (a <meta>|an HTML meta) element/,
  },
  trackingCookiesRejected: {
    id: 'F-AS-15',
    title: 'Firefox rejects the _fbp / _tt_enable_cookie tracking cookies for an invalid domain',
    consolePattern: /Cookie “(_fbp|_tt_enable_cookie)” has been rejected for invalid domain/,
  },
  colorContrast: {
    id: 'F-AS-13',
    title: 'Prices, footer and helper text fail WCAG AA colour contrast',
  },
  targetSizeAndLabels: {
    id: 'F-AS-14',
    title: 'Touch targets below 24px and visible labels that differ from accessible names',
  },
} as const satisfies Record<string, KnownIssue>;
