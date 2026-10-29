import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  FAITHFULNESS_BASE_URL: z.url().default('https://faithfulnesshomecare.com'),
  AFRISHOP_BASE_URL: z.url().default('https://afrishop-usa.com'),
  WORKERS: z.coerce.number().int().min(1).max(4).default(2),
  API_RESPONSE_BUDGET_MS: z.coerce.number().int().positive().default(2500),
  PERF_LCP_BUDGET_MS: z.coerce.number().int().positive().default(4000),
  PERF_LOAD_BUDGET_MS: z.coerce.number().int().positive().default(6000),
  LINK_CHECK_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(4),
  CI: z.stringbool().default(false),
});

export type Config = z.infer<typeof schema>;

function load(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Fail fast with a readable message instead of letting tests run against a bad target.
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  }
  return parsed.data;
}

export const config = load();
