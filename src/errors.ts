/**
 * Error ids a `SupportClient` call can fail with.
 *
 * - Service ids (SERVICE-API.md v1.1 "Errors"): `invalid-parameters`, `unauthorized`, `not-a-member`,
 *   `not-an-accepter`, `unknown-thread` (on `/notify`: nobody behind `userSlug` is joined any more), `not-found`,
 *   `already-sent`, `rate-limited`, `internal-error`, `upstream-error`, `not-configured` (no open link minted yet).
 * - Client-side ids:
 *   - `network-error`: the service could not be reached.
 *   - `invalid-response`: the service answered something the contract does not describe.
 *   - `not-joined`: the call needs an accepted relationship with the group.
 *   - `consent-required`: `notifyMe` without `{ consent: true }`.
 *   - `invalid-offer`: the published invite is not the chat-only, non-delegable offer of the configured
 *     group (wrong requester, `accessType: 'app'`, or a permission other than the placeholder stream).
 *   - `join-failed`: the accept failed on the user's core; `cause` holds the `CmcError` (its `id`).
 *   - `unknown-error`: a service error id this version does not know.
 */
export type SupportErrorId =
  | 'invalid-parameters'
  | 'unauthorized'
  | 'not-a-member'
  | 'not-an-accepter'
  | 'unknown-thread'
  | 'not-found'
  | 'already-sent'
  | 'rate-limited'
  | 'internal-error'
  | 'upstream-error'
  | 'not-configured'
  | 'network-error'
  | 'invalid-response'
  | 'not-joined'
  | 'consent-required'
  | 'invalid-offer'
  | 'join-failed'
  | 'unknown-error';

/** The ids the support service itself may answer (SERVICE-API.md v1.1). */
export const SERVICE_ERROR_IDS: readonly SupportErrorId[] = [
  'invalid-parameters',
  'unauthorized',
  'not-a-member',
  'not-an-accepter',
  'unknown-thread',
  'not-found',
  'already-sent',
  'rate-limited',
  'internal-error',
  'upstream-error',
  'not-configured'
];

export class SupportError extends Error {
  readonly id: SupportErrorId;
  /** HTTP status when the error came from the service. */
  readonly status: number | null;
  readonly cause?: unknown;

  constructor (id: SupportErrorId, message: string, opts: { status?: number | null; cause?: unknown } = {}) {
    super(message);
    this.name = 'SupportError';
    this.id = id;
    this.status = opts.status ?? null;
    if (opts.cause !== undefined) this.cause = opts.cause;
  }
}

export function isSupportError (e: unknown, id?: SupportErrorId): e is SupportError {
  return e instanceof SupportError && (id == null || e.id === id);
}

/** Map a non-2xx service answer to a `SupportError`. */
export function serviceError (status: number, body: unknown): SupportError {
  const err = (body as { error?: { id?: unknown; message?: unknown } } | null)?.error;
  const rawId = typeof err?.id === 'string' ? err.id : null;
  const message = typeof err?.message === 'string' ? err.message : `support service answered ${status}`;
  if (rawId != null && (SERVICE_ERROR_IDS as readonly string[]).includes(rawId)) {
    return new SupportError(rawId as SupportErrorId, message, { status });
  }
  return new SupportError(status >= 500 ? 'upstream-error' : 'unknown-error', message, { status });
}
