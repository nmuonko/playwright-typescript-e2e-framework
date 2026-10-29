import type { NetworkPolicy } from '@core/network/network-guard';

export const faithfulnessPolicy: NetworkPolicy = {
  name: 'faithfulness',
  // Every read on this site is a GET; all POSTs are lead submissions and must be mocked.
  readOnlyPosts: [],
  trackers: [
    /googletagmanager\.com/,
    /google-analytics\.com/,
    /googleadservices\.com/,
    /doubleclick\.net/,
    /connect\.facebook\.net|facebook\.com\/tr/,
    /\/__l5e\/trackevents/,
    /\/cdn-cgi\/rum/,
    // Stripe.js telemetry and its CSP violation reports (not payment calls).
    /[mqr]\.stripe\.(com|network)/,
  ],
};
