import type { MockHandle, NetworkGuard } from '@core/network/network-guard';

const AUTH_SERVICE = /\/functions\/v1\/auth-service$/;

export interface RegisterPayload {
  readonly action: 'register';
  readonly email: string;
  readonly fullName: string;
  readonly phoneNumber: string;
  readonly addressLine1: string;
  readonly city: string;
  readonly country: string;
  readonly signup_platform: string;
}

export type RegisterOutcome = 'success' | 'user-exists' | 'rejected' | 'network-failure';

/**
 * Guest checkout begins with an auth-service "register" call (contract read from the public bundle:
 * `{ ok, userId?, token?, message?, code? }`). The mock never returns a token, so no session is created.
 */
export function mockGuestRegistration(guard: NetworkGuard, outcome: RegisterOutcome): MockHandle {
  return guard.mock(
    {
      url: AUTH_SERVICE,
      method: 'POST',
      when: (request) => request.postData()?.includes('"register"') === true,
    },
    () => {
      switch (outcome) {
        case 'success':
          return { json: { ok: true, userId: '00000000-0000-4000-8000-000000000000' } };
        case 'user-exists':
          return { json: { ok: false, code: 'USER_EXISTS', message: 'User already registered' } };
        case 'rejected':
          return { json: { ok: false, message: 'Adresse refusée par le test' } };
        case 'network-failure':
          // The edge function is unreachable (timeout, DNS, CORS): the fetch itself rejects.
          return { abort: true };
      }
    },
  );
}
