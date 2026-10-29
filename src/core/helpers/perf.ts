import type { Page } from '@playwright/test';

export interface PageTimings {
  readonly ttfb: number;
  readonly domContentLoaded: number;
  readonly load: number;
  readonly lcp: number | null;
  readonly cls: number;
  readonly transferKb: number;
}

/** Must run before navigation: buffers LCP/CLS entries so they can be read after load. */
export async function installVitalsObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const vitals = { lcp: null as number | null, cls: 0 };
    (window as unknown as { __vitals: typeof vitals }).__vitals = vitals;
    try {
      new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) vitals.lcp = last.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<
          PerformanceEntry & { value: number; hadRecentInput: boolean }
        >) {
          if (!entry.hadRecentInput) vitals.cls += entry.value;
        }
      }).observe({ type: 'layout-shift', buffered: true });
    } catch {
      // LCP/CLS are Chromium-only APIs; other engines report lcp as null.
    }
  });
}

export async function readTimings(page: Page): Promise<PageTimings> {
  return page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    const vitals = (window as unknown as { __vitals?: { lcp: number | null; cls: number } }).__vitals;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const transfer = resources.reduce((sum, r) => sum + (r.transferSize || 0), nav?.transferSize ?? 0);
    return {
      ttfb: Math.round(nav?.responseStart ?? 0),
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      load: Math.round(nav?.loadEventEnd ?? 0),
      lcp: vitals?.lcp == null ? null : Math.round(vitals.lcp),
      cls: Math.round((vitals?.cls ?? 0) * 1000) / 1000,
      transferKb: Math.round(transfer / 1024),
    };
  });
}
