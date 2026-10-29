import type { APIRequestContext } from '@playwright/test';

export interface UrlCheck {
  readonly url: string;
  readonly status: number;
  readonly ms: number;
  readonly contentType: string;
  readonly body?: string;
}

/** GETs a URL and records status, timing and content type. Never throws on HTTP errors. */
export async function checkUrl(
  request: APIRequestContext,
  url: string,
  options: { keepBody?: boolean; maxRedirects?: number } = {},
): Promise<UrlCheck> {
  const started = performance.now();
  const response = await request.get(url, {
    failOnStatusCode: false,
    maxRedirects: options.maxRedirects ?? 5,
    timeout: 30_000,
  });
  const ms = Math.round(performance.now() - started);
  const base = { url, status: response.status(), ms, contentType: response.headers()['content-type'] ?? '' };
  return options.keepBody ? { ...base, body: await response.text() } : base;
}

/** Checks many URLs with bounded concurrency, so link sweeps stay polite to production. */
export async function checkUrls(
  request: APIRequestContext,
  urls: readonly string[],
  concurrency: number,
  options: { keepBody?: boolean } = {},
): Promise<UrlCheck[]> {
  const results: UrlCheck[] = [];
  const queue = [...new Set(urls)];
  const workers = Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
    for (let url = queue.shift(); url !== undefined; url = queue.shift()) {
      results.push(await checkUrl(request, url, options));
    }
  });
  await Promise.all(workers);
  return results.sort((a, b) => a.url.localeCompare(b.url));
}

export function parseSitemap(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1] ?? '').filter(Boolean);
}

/** Parses a robots.txt into user-agent groups of directives. */
export function parseRobots(text: string): Map<string, { allow: string[]; disallow: string[] }> {
  const groups = new Map<string, { allow: string[]; disallow: string[] }>();
  let current: string[] = [];
  let lastWasAgent = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const [key = '', ...rest] = line.split(':');
    const value = rest.join(':').trim();
    const field = key.trim().toLowerCase();
    if (field === 'user-agent') {
      current = lastWasAgent ? [...current, value] : [value];
      if (!groups.has(value)) groups.set(value, { allow: [], disallow: [] });
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (field === 'allow' || field === 'disallow') {
      for (const agent of current) groups.get(agent)?.[field].push(value);
    }
  }
  return groups;
}
