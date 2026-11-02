import { vi } from 'vitest';

export const GROUP = { username: 'hds-support', host: 'datasafe.dev' };
export const GROUP_SLUG = 'hds-support--datasafe-dev';
export const USER_SLUG = 'alice--datasafe-dev';
export const TEAM = ':_cmc:apps:hds-support:team';
export const LOCAL_CHAT = `${TEAM}:chats:${GROUP_SLUG}`;
export const REMOTE_CHAT = `${TEAM}:chats:${USER_SLUG}`;
export const HOST_SCOPE = ':_cmc:apps:hds-patient';
export const SERVICE = 'https://support-api.datasafe.dev';
export const LINK_V3 = 'https://cap-token-3@datasafe.dev/hds-support/';
export const LINK_V4 = 'https://cap-token-4@datasafe.dev/hds-support/';

export function config (overrides: Record<string, unknown> = {}) {
  return {
    appCode: 'hds-support',
    displayName: 'Health Data Safe team',
    group: GROUP,
    teamStreamId: TEAM,
    placeholderStreamId: 'hds-support',
    openLinkUrl: LINK_V3,
    configVersion: 3,
    ...overrides
  };
}

export function offer (overrides: Record<string, unknown> = {}) {
  return {
    requester: { username: 'hds-support', host: 'datasafe.dev', displayName: 'Health Data Safe team' },
    capabilityState: 'open',
    consent: { en: 'DPO notice EN', fr: 'Avis DPO FR' },
    requestedPermissions: [{ streamId: 'hds-support', level: 'read' }],
    allowUserChoice: false,
    accessType: 'shared',
    membership: false,
    mode: 'open-link',
    features: { chat: true, systemMessaging: true },
    ...overrides
  };
}

export function relationship (overrides: Record<string, unknown> = {}) {
  return {
    acceptEventId: 'accept-1',
    counterparty: { username: 'hds-support', host: 'datasafe.dev' },
    dataGrantAccessId: 'grant-1',
    appCode: 'hds-support',
    scopeStreamId: HOST_SCOPE,
    acceptedAt: 1793000000,
    features: { chat: true, systemMessaging: true },
    withdrawal: null,
    ...overrides
  };
}

export function grantAccess (overrides: Record<string, any> = {}) {
  return {
    id: 'grant-1',
    name: 'hds-support-abcd1234',
    type: 'shared',
    permissions: [
      { streamId: 'hds-support', level: 'read' },
      { streamId: LOCAL_CHAT, level: 'contribute' }
    ],
    clientData: {
      cmc: {
        role: 'counterparty',
        counterparty: { username: 'hds-support', host: 'datasafe.dev', remoteChatStreamId: REMOTE_CHAT }
      }
    },
    ...overrides
  };
}

export function cmcError (id: string): Error {
  return Object.assign(new Error('CMC ' + id), { id, name: 'CmcError' });
}

type Handler = (params: any) => any;

/** A Pryv connection stand-in: one handler per API method; every call is recorded. */
export function fakeConnection (handlers: Record<string, Handler> = {}, username = 'alice') {
  const calls: Array<{ method: string; params: any }> = [];
  const all: Record<string, Handler> = {
    'streams.create': () => ({ id: 'hds-support' }),
    'accesses.get': () => [grantAccess()],
    'events.get': () => [],
    ...handlers
  };
  const conn = {
    calls,
    handlers: all,
    apiOne: vi.fn(async (method: string, params: any) => {
      calls.push({ method, params });
      const h = all[method];
      if (h == null) throw new Error('unexpected API call ' + method);
      return h(params);
    }),
    username: async () => username
  };
  return conn;
}

type Route = { status: number; body?: unknown } | ((init: any) => { status: number; body?: unknown });

/** A fetch stand-in routed on `"<METHOD> <path>"`; every request is recorded. */
export function fakeFetch (routes: Record<string, Route | Route[]>) {
  const requests: Array<{ method: string; path: string; body: any }> = [];
  const queues: Record<string, Route[]> = {};
  for (const [k, v] of Object.entries(routes)) queues[k] = Array.isArray(v) ? [...v] : [v];
  const f = vi.fn(async (url: string, init: any = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace(SERVICE, '');
    const body = init.body != null ? JSON.parse(init.body) : undefined;
    requests.push({ method, path, body });
    const q = queues[`${method} ${path}`];
    if (q == null || q.length === 0) throw new Error('no route for ' + method + ' ' + path);
    const r0 = q.length > 1 ? q.shift()! : q[0];
    const r = typeof r0 === 'function' ? r0(init) : r0;
    const text = r.body === undefined ? '' : JSON.stringify(r.body);
    return new Response(r.status === 204 ? null : text, { status: r.status, headers: { 'Content-Type': 'application/json' } });
  });
  return { fetch: f as unknown as typeof fetch, requests };
}

export function chatEvent (id: string, time: number, content: string, from?: { username: string; host: string }, extra: Record<string, unknown> = {}) {
  return {
    id,
    time,
    type: 'message/chat-cmc',
    streamIds: [LOCAL_CHAT],
    content: from != null ? { content, from } : { content },
    ...extra
  };
}

export const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
