import { describe, it, expect, vi } from 'vitest';
import { SupportClient } from '../src/SupportClient';
import { SupportError, SERVICE_ERROR_IDS } from '../src/errors';
import type { SupportMonitor } from '../src/types';
import {
  GROUP, GROUP_SLUG, USER_SLUG, TEAM, LOCAL_CHAT, REMOTE_CHAT, HOST_SCOPE, SERVICE, LINK_V3, LINK_V4,
  config, offer, relationship, grantAccess, cmcError, fakeConnection, fakeFetch, chatEvent, tick
} from './helpers';

const TEAM_FROM = { username: 'hds-support', host: 'datasafe.dev' };

function setup (opts: {
  routes?: Parameters<typeof fakeFetch>[0];
  handlers?: Parameters<typeof fakeConnection>[0];
  rels?: any[][];
  monitorFactory?: any;
} = {}) {
  const conn = fakeConnection(opts.handlers);
  const net = fakeFetch(opts.routes ?? { 'GET /public/config': { status: 200, body: config() } });
  const relQueue = opts.rels ?? [[relationship()]];
  const cmc = {
    readOffer: vi.fn(async (_url: string) => offer()),
    acceptInvite: vi.fn(async () => ({ acceptEventId: 'accept-1', dataGrantAccessId: 'grant-1', counterparty: GROUP, features: {} })),
    listAcceptedRelationships: vi.fn(async () => (relQueue.length > 1 ? relQueue.shift()! : relQueue[0]))
  };
  const client = new SupportClient({
    connection: conn,
    serviceUrl: SERVICE + '/',
    scopeStreamId: HOST_SCOPE,
    fetch: net.fetch,
    cmc: cmc as any,
    monitorFactory: opts.monitorFactory,
    monitorSettleMs: 5
  });
  return { client, conn, net, cmc };
}

async function rejection (p: Promise<unknown>): Promise<SupportError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(SupportError);
    return e as SupportError;
  }
  throw new Error('expected a rejection');
}

describe('[SC-C] construction + config', () => {
  it('[SC-C1] refuses a scope that is not an app scope', () => {
    expect(() => new SupportClient({ connection: fakeConnection(), serviceUrl: SERVICE, scopeStreamId: ':_cmc:inbox', fetch: fakeFetch({}).fetch })).toThrow(/scopeStreamId/);
  });

  it('[SC-C2] loads /public/config once, re-fetches on force', async () => {
    const { client, net } = setup({ routes: { 'GET /public/config': [{ status: 200, body: config() }, { status: 200, body: config({ configVersion: 4, openLinkUrl: LINK_V4 }) }] } });
    const c = await client.loadConfig();
    expect(c.group).toEqual(GROUP);
    expect(c.openLinkUrl).toBe(LINK_V3);
    await client.loadConfig();
    expect(net.requests).toHaveLength(1);
    const c2 = await client.loadConfig(true);
    expect(c2.configVersion).toBe(4);
    expect(net.requests).toHaveLength(2);
  });

  it('[SC-C3] an incomplete config is invalid-response', async () => {
    const { client } = setup({ routes: { 'GET /public/config': { status: 200, body: { appCode: 'hds-support' } } } });
    expect((await rejection(client.loadConfig())).id).toBe('invalid-response');
  });
});

describe('[SC-S] status, prepareJoin, join', () => {
  it('[SC-S1] not-joined when no relationship with the group (others ignored)', async () => {
    const other = relationship({ acceptEventId: 'a-dr', counterparty: { username: 'dr-who', host: 'datasafe.dev' } });
    const sameNameOtherPlatform = relationship({ acceptEventId: 'a-x', counterparty: { username: 'hds-support', host: 'other.example' } });
    const { client } = setup({ rels: [[other, sameNameOtherPlatform]] });
    expect(await client.status()).toBe('not-joined');
  });

  it('[SC-S2] joined when an accepted relationship with the group exists (host compared as a slug)', async () => {
    const { client } = setup({ rels: [[relationship({ counterparty: { username: 'HDS-Support', host: 'datasafe.dev:443' } })]] });
    expect(await client.status()).toBe('joined');
  });

  it('[SC-S3] prepareJoin creates the placeholder stream and returns the checked offer', async () => {
    const { client, conn, cmc } = setup({ rels: [[]] });
    const o = await client.prepareJoin();
    expect(conn.calls[0]).toEqual({ method: 'streams.create', params: { id: 'hds-support', name: 'HDS support' } });
    expect(cmc.readOffer).toHaveBeenCalledWith(LINK_V3, expect.anything());
    expect(o.permissions).toEqual([{ streamId: 'hds-support', level: 'read', defaultName: 'HDS support' }]);
    expect(o.consent).toEqual({ en: 'DPO notice EN', fr: 'Avis DPO FR' });
    expect(o.accessType).toBe('shared');
    expect(o.displayName).toBe('Health Data Safe team');
  });

  it('[SC-S4] prepareJoin tolerates an existing placeholder stream', async () => {
    const { client } = setup({
      rels: [[]],
      handlers: { 'streams.create': () => { throw Object.assign(new Error('exists'), { innerObject: { id: 'item-already-exists' } }); } }
    });
    await expect(client.prepareJoin()).resolves.toBeTruthy();
  });

  it.each([
    ['a delegable access', { accessType: 'app' }],
    ['another stream', { requestedPermissions: [{ streamId: 'hds-support', level: 'read' }, { streamId: 'body', level: 'read' }] }],
    ['a write level', { requestedPermissions: [{ streamId: 'hds-support', level: 'contribute' }] }],
    ['another requester', { requester: { username: 'mallory', host: 'datasafe.dev' } }],
    ['a membership', { membership: true }]
  ])('[SC-S5] prepareJoin refuses an offer with %s (invalid-offer)', async (_label, over) => {
    const { client, cmc } = setup({ rels: [[]] });
    cmc.readOffer.mockResolvedValue(offer(over) as any);
    expect((await rejection(client.prepareJoin())).id).toBe('invalid-offer');
  });

  it('[SC-S6] prepareJoin on a withdrawn link re-fetches the config once and reads the new link', async () => {
    const { client, cmc, net } = setup({
      rels: [[]],
      routes: { 'GET /public/config': [{ status: 200, body: config() }, { status: 200, body: config({ configVersion: 4, openLinkUrl: LINK_V4 }) }] }
    });
    cmc.readOffer.mockImplementation(async (url: string) => (url === LINK_V3 ? offer({ capabilityState: 'invalidated' }) : offer()) as any);
    const o = await client.prepareJoin();
    expect(o.permissions).toHaveLength(1);
    expect(cmc.readOffer.mock.calls.map((c) => c[0])).toEqual([LINK_V3, LINK_V4]);
    expect(net.requests.filter((r) => r.path === '/public/config')).toHaveLength(2);
  });

  it('[SC-S7] not-joined → join → joined, accepting with the host scope', async () => {
    const { client, cmc } = setup({ rels: [[], [relationship()]] });
    expect(await client.status()).toBe('not-joined');
    await client.prepareJoin();
    expect(await client.join()).toBe('joined');
    expect(cmc.acceptInvite).toHaveBeenCalledTimes(1);
    const [, url, opts] = cmc.acceptInvite.mock.calls[0] as unknown as [unknown, string, any];
    expect(url).toBe(LINK_V3);
    expect(opts.scopeStreamId).toBe(HOST_SCOPE);
    expect(opts.waitForCompletion).toBe(true);
    expect(opts.accessName).toMatch(/^hds-support-[0-9a-z-]{8}$/);
  });

  it('[SC-S8] a cmc-capability-* error re-fetches the config once and accepts the rotated link', async () => {
    const { client, cmc, net } = setup({
      rels: [[relationship()]],
      routes: { 'GET /public/config': [{ status: 200, body: config() }, { status: 200, body: config({ configVersion: 4, openLinkUrl: LINK_V4 }) }] }
    });
    cmc.acceptInvite.mockRejectedValueOnce(cmcError('cmc-capability-invalidated'));
    expect(await client.join()).toBe('joined');
    expect(cmc.acceptInvite.mock.calls.map((c) => (c as unknown[])[1])).toEqual([LINK_V3, LINK_V4]);
    expect(cmc.readOffer).toHaveBeenLastCalledWith(LINK_V4, expect.anything());
    expect(net.requests.filter((r) => r.path === '/public/config')).toHaveLength(2);
  });

  it('[SC-S9] re-fetches only once: a second capability error is join-failed', async () => {
    const { client, cmc } = setup({
      rels: [[]],
      routes: { 'GET /public/config': [{ status: 200, body: config() }, { status: 200, body: config({ configVersion: 4, openLinkUrl: LINK_V4 }) }] }
    });
    cmc.acceptInvite.mockRejectedValue(cmcError('cmc-capability-invalidated'));
    const e = await rejection(client.join());
    expect(e.id).toBe('join-failed');
    expect(cmc.acceptInvite).toHaveBeenCalledTimes(2);
  });

  it('[SC-S10] another accept failure is join-failed without a config re-fetch', async () => {
    const { client, cmc, net } = setup({ rels: [[]] });
    cmc.acceptInvite.mockRejectedValue(cmcError('cmc-accept-requires-personal-token'));
    const e = await rejection(client.join());
    expect(e.id).toBe('join-failed');
    expect((e.cause as { id: string }).id).toBe('cmc-accept-requires-personal-token');
    expect(net.requests.filter((r) => r.path === '/public/config')).toHaveLength(1);
  });

  it('[SC-S11] cmc-capability-already-accepted-by-you counts as joined', async () => {
    const { client, cmc } = setup({ rels: [[relationship()]] });
    cmc.acceptInvite.mockRejectedValue(cmcError('cmc-capability-already-accepted-by-you'));
    expect(await client.join()).toBe('joined');
    expect(cmc.acceptInvite).toHaveBeenCalledTimes(1);
  });
});

describe('[SC-T] thread, send, userSlug', () => {
  it('[SC-T1] reads the relationship chat stream, oldest first, with bylines', async () => {
    const events = [
      chatEvent('e4', 40, 'Alice: Thanks, all good now?', TEAM_FROM),
      chatEvent('e3', 30, 'Note: my phone is old'),
      chatEvent('e2', 20, 'Welcome to support.', TEAM_FROM),
      chatEvent('e1', 10, 'Hello, I need help'),
      chatEvent('e0', 5, 'gone', undefined, { trashed: true }),
      { id: 'x', time: 1, type: 'note/txt', streamIds: [LOCAL_CHAT], content: 'not chat' }
    ];
    const { client, conn } = setup({ handlers: { 'events.get': () => events } });
    const thread = await client.thread();
    const get = conn.calls.find((c) => c.method === 'events.get')!;
    expect(get.params).toEqual({ streams: [LOCAL_CHAT], types: ['message/chat-cmc'], limit: 200, sortAscending: false });
    expect(thread).toEqual([
      { id: 'e1', time: 10, mine: true, author: null, text: 'Hello, I need help' },
      { id: 'e2', time: 20, mine: false, author: null, text: 'Welcome to support.' },
      // The user's own text is never read as a byline.
      { id: 'e3', time: 30, mine: true, author: null, text: 'Note: my phone is old' },
      { id: 'e4', time: 40, mine: false, author: 'Alice', text: 'Thanks, all good now?' }
    ]);
  });

  it('[SC-T2] userSlug comes from the back-channel remoteChatStreamId', async () => {
    const { client } = setup();
    const info = await client.threadInfoOrThrow();
    expect(info).toMatchObject({ localChatStreamId: LOCAL_CHAT, remoteChatStreamId: REMOTE_CHAT, userSlug: USER_SLUG, userSlugSource: 'back-channel', groupSlug: GROUP_SLUG });
  });

  it('[SC-T3] without the back-channel stamp, userSlug is derived from the own username and the group host', async () => {
    const bare = grantAccess({ permissions: [{ streamId: 'hds-support', level: 'read' }], clientData: { cmc: { role: 'counterparty', counterparty: { username: 'hds-support', host: 'datasafe.dev' } } } });
    const { client } = setup({ handlers: { 'accesses.get': () => [bare] } });
    const info = await client.threadInfoOrThrow();
    expect(info.userSlugSource).toBe('derived');
    expect(info.userSlug).toBe(USER_SLUG);
    expect(info.localChatStreamId).toBe(`${TEAM}:chats:${GROUP_SLUG}`);
  });

  it('[SC-T4] send writes message/chat-cmc on the local chat stream (the hds-webapp path)', async () => {
    const { client, conn } = setup({ handlers: { 'events.create': (p) => ({ id: 'new-1', time: 50, type: p.type, streamIds: p.streamIds, content: p.content }) } });
    const m = await client.send('  Is anyone there?  ');
    const create = conn.calls.find((c) => c.method === 'events.create')!;
    expect(create.params).toEqual({ streamIds: [LOCAL_CHAT], type: 'message/chat-cmc', content: { content: 'Is anyone there?' } });
    expect(m).toEqual({ id: 'new-1', time: 50, mine: true, author: null, text: 'Is anyone there?' });
  });

  it('[SC-T5] send refuses empty and over-long text, and needs a relationship', async () => {
    const { client } = setup({ rels: [[]] });
    expect((await rejection(client.send('   '))).id).toBe('invalid-parameters');
    expect((await rejection(client.send('x'.repeat(10241)))).id).toBe('invalid-parameters');
    expect((await rejection(client.send('hi'))).id).toBe('not-joined');
  });
});

describe('[SC-L] live feed', () => {
  function fakeMonitor () {
    const handlers: Record<string, (p: any) => void> = {};
    const m: SupportMonitor & { emit: (ev: string, p: any) => void } = {
      on: vi.fn((ev: string, cb: (p: any) => void) => { handlers[ev] = cb; return m; }),
      start: vi.fn(async () => {}),
      updateEvents: vi.fn(async () => {}),
      stop: vi.fn(),
      emit: (ev, p) => handlers[ev]?.(p)
    };
    return m;
  }

  it('[SC-L1] monitors cmc.scopes.chats for the thread, re-fetches once after the start race, dedupes', async () => {
    const mon = fakeMonitor();
    const factory = vi.fn(() => mon);
    const { client } = setup({ monitorFactory: factory, handlers: { 'events.get': () => [chatEvent('e1', 10, 'Hello')] } });
    await client.thread();
    const got: any[] = [];
    const off = client.onMessage((m) => got.push(m));
    await tick(30);
    expect(factory).toHaveBeenCalledTimes(1);
    const scope = (factory.mock.calls[0] as unknown[])[1];
    expect(scope).toEqual({ streams: [LOCAL_CHAT], types: ['message/chat-cmc'] });
    expect(mon.start).toHaveBeenCalledTimes(1);
    expect(mon.updateEvents).toHaveBeenCalledTimes(1);
    mon.emit('event', chatEvent('e1', 10, 'Hello'));
    mon.emit('event', chatEvent('e2', 20, 'Bob: On it', TEAM_FROM));
    mon.emit('event', chatEvent('e2', 20, 'Bob: On it', TEAM_FROM));
    expect(got).toEqual([{ id: 'e2', time: 20, mine: false, author: 'Bob', text: 'On it' }]);
    off();
    expect(mon.stop).toHaveBeenCalledTimes(1);
  });

  it('[SC-L2] unsubscribing before the start completes stops without a settle fetch', async () => {
    const mon = fakeMonitor();
    const { client } = setup({ monitorFactory: () => mon });
    const off = client.onMessage(() => {});
    off();
    await tick(30);
    expect(mon.updateEvents).not.toHaveBeenCalled();
  });
});

describe('[SC-P] presence + notifyMe', () => {
  it('[SC-P1] presence reads /public/presence', async () => {
    const { client } = setup({ routes: { 'GET /public/presence': { status: 200, body: { online: false, agents: 0 } } } });
    expect(await client.presence()).toEqual({ online: false, agents: 0 });
  });

  it('[SC-P2] notifyMe mints a 5-minute read proof on the placeholder, posts it with the userSlug, then deletes it', async () => {
    let posted: any = null;
    const { client, conn } = setup({
      handlers: {
        'accesses.create': () => ({ id: 'proof-1', token: 'proof-token' }),
        'accesses.delete': () => ({ accessDeletion: { id: 'proof-1' } })
      },
      routes: {
        'GET /public/config': { status: 200, body: config() },
        'POST /notify': (init: any) => { posted = JSON.parse(init.body); return { status: 204 }; }
      }
    });
    await client.notifyMe(' alice@example.org ', { consent: true });
    const create = conn.calls.find((c) => c.method === 'accesses.create')!;
    expect(create.params).toMatchObject({ type: 'shared', permissions: [{ streamId: 'hds-support', level: 'read' }], expireAfter: 300 });
    expect(create.params.name).toMatch(/^hds-support-notify-proof-/);
    expect(posted).toEqual({ userSlug: USER_SLUG, email: 'alice@example.org', consent: true, proofToken: 'proof-token' });
    await tick();
    expect(conn.calls.at(-1)).toEqual({ method: 'accesses.delete', params: { id: 'proof-1' } });
  });

  it.each([
    ['fr', 'fr'],
    ['fr-CH', 'fr'],
    ['en', 'en'],
    ['de', 'en']
  ])('[SC-P2b] notifyMe sends lang %s as "%s" (v1.1)', async (lang, expected) => {
    let posted: any = null;
    const { client } = setup({
      handlers: { 'accesses.create': () => ({ id: 'p', token: 't' }), 'accesses.delete': () => ({}) },
      routes: {
        'GET /public/config': { status: 200, body: config() },
        'POST /notify': (init: any) => { posted = JSON.parse(init.body); return { status: 204 }; }
      }
    });
    await client.notifyMe('alice@example.org', { consent: true, lang });
    expect(posted.lang).toBe(expected);
  });

  it('[SC-P2c] notifyMe without lang leaves it out (the service defaults to en)', async () => {
    let posted: any = null;
    const { client } = setup({
      handlers: { 'accesses.create': () => ({ id: 'p', token: 't' }), 'accesses.delete': () => ({}) },
      routes: {
        'GET /public/config': { status: 200, body: config() },
        'POST /notify': (init: any) => { posted = JSON.parse(init.body); return { status: 204 }; }
      }
    });
    await client.notifyMe('alice@example.org', { consent: true });
    expect('lang' in posted).toBe(false);
  });

  it('[SC-P3] notifyMe without consent or with a bad address makes no call', async () => {
    const { client, conn, net } = setup();
    expect((await rejection(client.notifyMe('alice@example.org', { consent: false }))).id).toBe('consent-required');
    expect((await rejection(client.notifyMe('not-an-address', { consent: true }))).id).toBe('invalid-parameters');
    expect(conn.calls).toHaveLength(0);
    expect(net.requests).toHaveLength(0);
  });

  const STATUS: Record<string, number> = {
    'invalid-parameters': 400,
    unauthorized: 401,
    'not-a-member': 403,
    'not-an-accepter': 403,
    'unknown-thread': 404,
    'not-found': 404,
    'already-sent': 409,
    'rate-limited': 429,
    'internal-error': 500,
    'upstream-error': 502,
    'not-configured': 503
  };

  it('[SC-P6] /public/config before the first mint is not-configured', async () => {
    const { client } = setup({ routes: { 'GET /public/config': { status: 503, body: { error: { id: 'not-configured', message: 'no link' } } } } });
    const e = await rejection(client.loadConfig());
    expect(e.id).toBe('not-configured');
    expect(e.status).toBe(503);
  });

  it.each(SERVICE_ERROR_IDS.map((id) => [id, STATUS[id]] as const))('[SC-P4] a %s answer (%i) is a SupportError with that id', async (id, status) => {
    const { client } = setup({
      handlers: { 'accesses.create': () => ({ id: 'proof-1', token: 't' }), 'accesses.delete': () => ({}) },
      routes: {
        'GET /public/config': { status: 200, body: config() },
        'POST /notify': { status, body: { error: { id, message: 'nope' } } }
      }
    });
    const e = await rejection(client.notifyMe('alice@example.org', { consent: true }));
    expect(e.id).toBe(id);
    expect(e.status).toBe(status);
  });

  it('[SC-P5] an unknown id is unknown-error (4xx) or upstream-error (5xx); no answer is network-error', async () => {
    const mk = (r: any) => setup({
      handlers: { 'accesses.create': () => ({ id: 'p', token: 't' }), 'accesses.delete': () => ({}) },
      routes: { 'GET /public/config': { status: 200, body: config() }, 'POST /notify': r }
    }).client;
    expect((await rejection(mk({ status: 418, body: { error: { id: 'teapot' } } }).notifyMe('a@b.co', { consent: true }))).id).toBe('unknown-error');
    expect((await rejection(mk({ status: 500, body: 'oops' }).notifyMe('a@b.co', { consent: true }))).id).toBe('upstream-error');
    const down = mk(() => { throw new TypeError('Failed to fetch'); });
    expect((await rejection(down.notifyMe('a@b.co', { consent: true }))).id).toBe('network-error');
  });
});
