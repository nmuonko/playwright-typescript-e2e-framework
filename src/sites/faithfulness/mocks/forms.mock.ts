import type { MockHandle, NetworkGuard } from '@core/network/network-guard';
import { decodeServerFnPayload, encodeServerFnResult, type Plain } from './seroval';

/** Lead-capture forms post to a hashed TanStack server function; identify each by its payload keys. */
export const formSignatures = {
  consultation: ['full_name', 'urgency', 'payment_method', 'preferred_contact'],
  assessment: ['full_name', 'start_timeframe', 'payment_method'],
  referral: ['referrer_org', 'referrer_name'],
  application: ['full_name', 'position', 'availability'],
} as const;

export type FormName = keyof typeof formSignatures;

export type SubmitOutcome =
  { kind: 'success' } | { kind: 'rejected'; error: string } | { kind: 'server-error' };

const SERVER_FN = /\/_serverFn\//;

function hasKeys(body: string | null, keys: readonly string[]): boolean {
  return !!body && keys.every((key) => body.includes(`"${key}"`));
}

/**
 * Intercepts a form's submit call and answers it the way the real server would.
 * The response contract ({ ok, error? } + x-tss-serialized header) was read from the site's public bundle.
 */
export function mockFormSubmit(guard: NetworkGuard, form: FormName, outcome: SubmitOutcome): MockHandle {
  return guard.mock(
    { url: SERVER_FN, method: 'POST', when: (request) => hasKeys(request.postData(), formSignatures[form]) },
    () => {
      if (outcome.kind === 'server-error') return { status: 500, body: 'Internal Server Error' };
      const result: Plain = outcome.kind === 'success' ? { ok: true } : { ok: false, error: outcome.error };
      return {
        status: 200,
        contentType: 'application/json',
        headers: { 'x-tss-serialized': 'true' },
        body: encodeServerFnResult(result),
      };
    },
  );
}

export async function submittedPayload(handle: MockHandle): Promise<Record<string, Plain>> {
  const request = await handle.waitForRequest();
  return decodeServerFnPayload(request.postData());
}
