import type { NetworkPolicy } from '@core/network/network-guard';

const SUPABASE = String.raw`https://[a-z0-9]+\.supabase\.co`;

export const afrishopPolicy: NetworkPolicy = {
  name: 'afrishop',
  // Verified read-only (see docs/DECISIONS.md, ADR-004): pure price computation, provider counts,
  // category config and query classification. None accepts user or account data.
  readOnlyPosts: [
    new RegExp(`^${SUPABASE}/rest/v1/rpc/compute_display_prices_titled$`),
    new RegExp(`^${SUPABASE}/rest/v1/rpc/get_active_providers$`),
    new RegExp(`^${SUPABASE}/functions/v1/search-intent$`),
    new RegExp(`^${SUPABASE}/functions/v1/catalog-service\\?action=tabs$`),
  ],
  trackers: [
    /analytics\.tiktok\.com|tiktokw\.us/,
    new RegExp(`^${SUPABASE}/functions/v1/tiktok-events`),
    /connect\.facebook\.net|facebook\.com\/tr/,
    /googletagmanager\.com|google-analytics\.com|doubleclick\.net/,
    /[mr]\.stripe\.com/,
    /\/__l5e\/trackevents/,
  ],
};
