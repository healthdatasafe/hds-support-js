import { cmc as hdsCmc, pryv as hdsPryv } from 'hds-lib';
import { SupportError, serviceError } from './errors';
import { CHAT_EVENT_TYPE, MAX_MESSAGE_LENGTH, parseSupportMessage, toThread } from './messages';
import { createPryvMonitor } from './monitor';
import type {
  SupportConfig, SupportConnection, SupportMessage, SupportMonitor, SupportMonitorFactory,
  SupportOffer, SupportPresence, SupportStatus, SupportThreadInfo, SupportClientLike
} from './types';

type Cmc = typeof hdsCmc;

export interface SupportClientOptions {
  /** The signed-in user's connection. `join()` needs a personal token (`cmc-accept-requires-personal-token`). */
  connection: SupportConnection;
  /** Base URL of hds-support-service, e.g. `https://support-api.datasafe.dev`. */
  serviceUrl: string;
  /** The host app's own CMC scope on the user's account (`cmc.appScope('<its app code>')`): where the accept trigger lands. */
  scopeStreamId: string;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** Name of the placeholder stream if the client has to create it (default: the data model's name, "Health Data Safe support (holds no data)"). */
  placeholderStreamName?: string;
  /** Delay before the extra `updateEvents()` that covers the monitor start race (default 1500 ms). */
  monitorSettleMs?: number;
  /** Failures of the live feed (the `onMessage` callbacks never receive errors). */
  onError?: (error: unknown) => void;
  /** Test seams: CMC helpers (merged over hds-lib's `cmc`), the live feed, the `pryv` handed to `readOffer`. */
  cmc?: Partial<Cmc>;
  monitorFactory?: SupportMonitorFactory;
  pryv?: unknown;
}

const PROOF_TTL_SECONDS = 300;

function randomSuffix (): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

/** The id of a CMC or Pryv API error, whatever its nesting. */
export function errorIdOf (e: unknown): string | undefined {
  const inner = (e as { innerObject?: { id?: unknown; data?: { id?: unknown } } })?.innerObject;
  if (typeof inner?.data?.id === 'string') return inner.data.id;
  if (typeof inner?.id === 'string') return inner.id;
  const id = (e as { id?: unknown })?.id;
  return typeof id === 'string' ? id : undefined;
}

function asUpstream (e: unknown, what: string): SupportError {
  if (e instanceof SupportError) return e;
  return new SupportError('upstream-error', `${what}: ${(e as Error)?.message ?? String(e)}`, { cause: e });
}

/**
 * Headless client of the HDS support channel (plan 117, A7).
 *
 * The user joins the support group's permanent open-link invite (an ordinary CMC relationship, so it also
 * appears in the host app's Connections), then chats on the relationship's chat stream with the same raw
 * `events.create` hds-webapp uses. Presence and the e-mail notification come from hds-support-service
 * (SERVICE-API.md v1).
 */
export class SupportClient implements SupportClientLike {
  readonly connection: SupportConnection;
  readonly serviceUrl: string;
  readonly scopeStreamId: string;
  private readonly fetchImpl: typeof fetch;
  private readonly cmc: Cmc;
  private readonly monitorFactory: SupportMonitorFactory;
  private readonly pryvForOffer: unknown;
  private readonly placeholderStreamName: string;
  private readonly monitorSettleMs: number;
  private readonly onError?: (error: unknown) => void;

  private config: SupportConfig | null = null;
  private relationship: { acceptEventId: string; dataGrantAccessId: string | null; acceptedAt: number | null } | null = null;
  private threadInfo: SupportThreadInfo | null = null;
  private readonly seen = new Set<string>();
  private readonly listeners = new Set<(m: SupportMessage) => void>();
  private monitor: SupportMonitor | null = null;
  private monitorGeneration = 0;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor (opts: SupportClientOptions) {
    if (opts?.connection == null) throw new Error('SupportClient: connection is required');
    if (typeof opts.serviceUrl !== 'string' || opts.serviceUrl === '') throw new Error('SupportClient: serviceUrl is required');
    if (typeof opts.scopeStreamId !== 'string' || !opts.scopeStreamId.startsWith(':_cmc:apps:')) {
      throw new Error('SupportClient: scopeStreamId must be the host app\'s :_cmc:apps:<app> stream');
    }
    this.connection = opts.connection;
    this.serviceUrl = opts.serviceUrl.replace(/\/+$/, '');
    this.scopeStreamId = opts.scopeStreamId;
    const f = opts.fetch ?? (globalThis as { fetch?: typeof fetch }).fetch;
    if (f == null) throw new Error('SupportClient: no fetch available, pass opts.fetch');
    this.fetchImpl = opts.fetch ?? f.bind(globalThis);
    this.cmc = { ...hdsCmc, ...(opts.cmc ?? {}) } as Cmc;
    this.monitorFactory = opts.monitorFactory ?? createPryvMonitor;
    this.pryvForOffer = opts.pryv ?? hdsPryv;
    this.placeholderStreamName = opts.placeholderStreamName ?? 'Health Data Safe support (holds no data)';
    this.monitorSettleMs = opts.monitorSettleMs ?? 1500;
    this.onError = opts.onError;
  }

  // ---- Service ---- //

  private async request (method: 'GET' | 'POST', path: string, body?: unknown): Promise<any> {
    let res: Response;
    try {
      res = await this.fetchImpl(this.serviceUrl + path, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json', Accept: 'application/json' } : { Accept: 'application/json' },
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch (e) {
      throw new SupportError('network-error', `support service unreachable (${method} ${path})`, { cause: e });
    }
    let parsed: unknown = null;
    if (res.status !== 204) {
      const text = await res.text().catch(() => '');
      if (text !== '') {
        try { parsed = JSON.parse(text); } catch (_e) { parsed = null; }
      }
    }
    if (!res.ok) throw serviceError(res.status, parsed);
    return parsed;
  }

  /** `GET /public/config`, cached; `force` re-fetches (after a link rotation). */
  async loadConfig (force = false): Promise<SupportConfig> {
    if (this.config != null && !force) return this.config;
    const c = await this.request('GET', '/public/config');
    const ok = c != null && typeof c === 'object' &&
      typeof c.openLinkUrl === 'string' && c.openLinkUrl !== '' &&
      typeof c.group?.username === 'string' && c.group.username !== '' &&
      typeof c.group?.host === 'string' && c.group.host !== '' &&
      typeof c.teamStreamId === 'string' && typeof c.placeholderStreamId === 'string';
    if (!ok) throw new SupportError('invalid-response', 'support service config is incomplete');
    this.config = {
      appCode: typeof c.appCode === 'string' ? c.appCode : 'hds-support',
      displayName: typeof c.displayName === 'string' && c.displayName !== '' ? c.displayName : 'Health Data Safe team',
      group: { username: c.group.username, host: c.group.host },
      teamStreamId: c.teamStreamId,
      placeholderStreamId: c.placeholderStreamId,
      openLinkUrl: c.openLinkUrl,
      configVersion: typeof c.configVersion === 'number' ? c.configVersion : 0
    };
    return this.config;
  }

  /** `GET /public/presence`. */
  async presence (): Promise<SupportPresence> {
    const p = await this.request('GET', '/public/presence');
    if (p == null || typeof p.online !== 'boolean') throw new SupportError('invalid-response', 'support service presence is malformed');
    return { online: p.online, agents: typeof p.agents === 'number' ? p.agents : 0 };
  }

  // ---- Relationship ---- //

  private sameGroup (cp: { username?: unknown; host?: unknown } | null | undefined, group: SupportConfig['group']): boolean {
    if (typeof cp?.username !== 'string' || cp.username.toLowerCase() !== group.username.toLowerCase()) return false;
    if (typeof cp.host !== 'string' || cp.host === '') return false;
    try {
      return this.cmc.slugifyHost(cp.host) === this.cmc.slugifyHost(group.host);
    } catch (_e) {
      return false;
    }
  }

  /** `'joined'` when an active accepted relationship with the configured group exists (any of the user's app scopes). */
  async status (): Promise<SupportStatus> {
    const config = await this.loadConfig();
    let rels: Awaited<ReturnType<Cmc['listAcceptedRelationships']>>;
    try {
      rels = await this.cmc.listAcceptedRelationships(this.connection);
    } catch (e) {
      throw asUpstream(e, 'listing relationships failed');
    }
    const mine = rels
      .filter((r) => this.sameGroup(r.counterparty as { username?: string; host?: string } | null, config.group))
      .sort((a, b) => (b.acceptedAt ?? 0) - (a.acceptedAt ?? 0));
    const rel = mine[0];
    if (rel == null) {
      this.relationship = null;
      this.threadInfo = null;
      return 'not-joined';
    }
    if (this.relationship?.acceptEventId !== rel.acceptEventId) this.threadInfo = null;
    this.relationship = { acceptEventId: rel.acceptEventId, dataGrantAccessId: rel.dataGrantAccessId, acceptedAt: rel.acceptedAt };
    return 'joined';
  }

  private async ensurePlaceholderStream (config: SupportConfig): Promise<void> {
    try {
      await this.connection.apiOne('streams.create', { id: config.placeholderStreamId, name: this.placeholderStreamName }, 'stream');
    } catch (e) {
      // the core names the existing stream in `data.id`, so errorIdOf (which prefers `data.id`) cannot be used here
      if ((e as { innerObject?: { id?: unknown } })?.innerObject?.id === 'item-already-exists') return;
      throw asUpstream(e, `creating the "${config.placeholderStreamId}" stream failed`);
    }
  }

  /**
   * Refuse anything but the chat-only, non-delegable offer of the configured group (plan 117 A2, criterion 8):
   * a rotated or tampered link must not get a broader grant past the consent screen.
   */
  private checkOffer (offer: Awaited<ReturnType<Cmc['readOffer']>>, config: SupportConfig): SupportOffer {
    const requester = offer.requester ?? { username: null, host: '' };
    if (requester.username != null && requester.username.toLowerCase() !== config.group.username.toLowerCase()) {
      throw new SupportError('invalid-offer', `the support link is from "${requester.username}", not the support group`);
    }
    if (offer.accessType !== 'shared') throw new SupportError('invalid-offer', 'the support link asks for a delegable access');
    if (offer.membership === true) throw new SupportError('invalid-offer', 'the support link is a membership request');
    const perms = offer.requestedPermissions ?? [];
    if (perms.length === 0 || perms.some((p) => p.streamId !== config.placeholderStreamId || p.level !== 'read')) {
      throw new SupportError('invalid-offer', `the support link asks for more than read on "${config.placeholderStreamId}"`);
    }
    return {
      requester: { username: requester.username, host: requester.host, displayName: requester.displayName },
      displayName: config.displayName || requester.displayName || config.group.username,
      consent: offer.consent ?? null,
      permissions: perms.map((p) => ({ streamId: p.streamId, level: p.level, defaultName: this.placeholderStreamName })),
      features: { chat: offer.features?.chat !== false, systemMessaging: offer.features?.systemMessaging !== false },
      accessType: offer.accessType
    };
  }

  /** Read and check the offer. A link that is withdrawn or unreadable throws with `cause: 'stale-link'`. */
  private async readCheckedOffer (config: SupportConfig): Promise<SupportOffer> {
    let offer: Awaited<ReturnType<Cmc['readOffer']>>;
    try {
      offer = await this.cmc.readOffer(config.openLinkUrl, { pryv: this.pryvForOffer });
    } catch (e) {
      throw new SupportError('invalid-offer', `the support link cannot be read (${errorIdOf(e) ?? (e as Error)?.message})`, { cause: 'stale-link' });
    }
    if (offer.capabilityState === 'invalidated' || offer.capabilityState === 'consumed') {
      throw new SupportError('invalid-offer', `the support link is ${offer.capabilityState}`, { cause: 'stale-link' });
    }
    return this.checkOffer(offer, config);
  }

  /**
   * Ready the join: create the `hds-support` placeholder stream (the consent anchor the offer names), read the
   * offer and return it for the host's consent UI. A link that cannot be read (rotated since the config was
   * cached) re-fetches the config once.
   */
  async prepareJoin (): Promise<SupportOffer> {
    let config = await this.loadConfig();
    await this.ensurePlaceholderStream(config);
    try {
      return await this.readCheckedOffer(config);
    } catch (e) {
      if (!(e instanceof SupportError) || e.cause !== 'stale-link') throw e;
      const previous = config.openLinkUrl;
      config = await this.loadConfig(true);
      if (config.openLinkUrl === previous) throw e;
      return await this.readCheckedOffer(config);
    }
  }

  private async accept (config: SupportConfig): Promise<void> {
    await this.cmc.acceptInvite(this.connection, config.openLinkUrl, {
      scopeStreamId: this.scopeStreamId,
      // The data grant is DB-unique on (name, type, deviceName): never reuse a name (hds-webapp appService).
      accessName: 'hds-support-' + randomSuffix(),
      waitForCompletion: true
    });
  }

  /**
   * Accept the support invite (after the user consented to the offer `prepareJoin()` returned).
   * A `cmc-capability-*` failure re-fetches the config once and, when the link was rotated, re-checks the new
   * offer and accepts it. `cmc-capability-already-accepted-by-you` counts as joined.
   */
  async join (): Promise<SupportStatus> {
    let config = await this.loadConfig();
    await this.ensurePlaceholderStream(config);
    try {
      await this.accept(config);
    } catch (e) {
      const id = errorIdOf(e);
      if (id !== 'cmc-capability-already-accepted-by-you') {
        if (id == null || !id.startsWith('cmc-capability-')) {
          throw new SupportError('join-failed', `joining the support channel failed (${id ?? (e as Error)?.message})`, { cause: e });
        }
        config = await this.loadConfig(true);
        await this.readCheckedOffer(config);
        try {
          await this.accept(config);
        } catch (e2) {
          if (errorIdOf(e2) !== 'cmc-capability-already-accepted-by-you') {
            throw new SupportError('join-failed', `joining the support channel failed (${errorIdOf(e2) ?? (e2 as Error)?.message})`, { cause: e2 });
          }
        }
      }
    }
    this.relationship = null;
    this.threadInfo = null;
    const s = await this.status();
    if (s !== 'joined') throw new SupportError('join-failed', 'the accept completed but no relationship with the support group is listed');
    return s;
  }

  // ---- Thread ---- //

  // Since pryv 3.18.0 `username()` and `accessInfo()` reject on a refused token instead of resolving `{ error }`.
  private async ownUsername (): Promise<string> {
    try {
      if (typeof this.connection.username === 'function') {
        const u = await this.connection.username();
        if (typeof u === 'string' && u !== '') return u;
      }
      if (typeof this.connection.accessInfo === 'function') {
        const info = await this.connection.accessInfo();
        const u = info?.user?.username;
        if (typeof u === 'string' && u !== '') return u;
      }
    } catch (e) {
      throw asUpstream(e, 'cannot read this account\'s username');
    }
    throw new SupportError('upstream-error', 'cannot read this account\'s username');
  }

  /**
   * Where the conversation lives (resolved once per relationship).
   *
   * `userSlug` (this user as the group sees it): the group's back-channel stamps the group-side thread on the
   * user's data-grant access as `clientData.cmc.counterparty.remoteChatStreamId`
   * (`:_cmc:apps:hds-support:team:chats:<userSlug>`, open-pryv.io `handleIncomingAccept` → `handleIncomingBackChannel`);
   * its leaf is the authoritative slug. Without it (access not readable, back-channel not arrived yet), the slug is
   * derived as `cmc.counterpartySlug({ username: <own username>, host: config.group.host })`, which holds because
   * the CMC host is the platform's `dns:domain`, shared by the user's and the group's cores.
   */
  async threadInfoOrThrow (): Promise<SupportThreadInfo> {
    if (this.threadInfo != null) return this.threadInfo;
    if (this.relationship == null) {
      const s = await this.status();
      if (s !== 'joined' || this.relationship == null) throw new SupportError('not-joined', 'not joined to the support channel');
    }
    const config = await this.loadConfig();
    const rel = this.relationship!;
    const groupSlug = this.cmc.counterpartySlug(config.group);
    let accesses: any[] = [];
    try {
      accesses = (await this.connection.apiOne('accesses.get', {}, 'accesses')) ?? [];
    } catch (_e) {
      accesses = [];
    }
    const grant = (rel.dataGrantAccessId != null ? accesses.find((a) => a?.id === rel.dataGrantAccessId) : undefined) ??
      accesses.find((a) => a?.clientData?.cmc?.role === 'counterparty' && this.sameGroup(a.clientData.cmc.counterparty, config.group));
    const remote: unknown = grant?.clientData?.cmc?.counterparty?.remoteChatStreamId;
    const remoteChatStreamId = typeof remote === 'string' && remote !== '' ? remote : null;

    const grantedChat = (grant?.permissions ?? []).find((p: { streamId?: unknown; level?: unknown }) =>
      typeof p.streamId === 'string' && p.streamId.endsWith(`:chats:${groupSlug}`) &&
      (p.level === 'contribute' || p.level === 'manage'));
    let localChatStreamId: string;
    if (grantedChat != null) localChatStreamId = grantedChat.streamId;
    else if (remoteChatStreamId != null) localChatStreamId = this.cmc.chatStreamUnder(remoteChatStreamId.replace(/:chats:[^:]+$/, ''), groupSlug);
    else localChatStreamId = this.cmc.chatStreamUnder(config.teamStreamId, groupSlug);

    let userSlug: string | null = null;
    if (remoteChatStreamId != null) userSlug = this.cmc.parseChatStreamId(remoteChatStreamId)?.counterpartySlug ?? null;
    const userSlugSource: SupportThreadInfo['userSlugSource'] = userSlug != null ? 'back-channel' : 'derived';
    if (userSlug == null) userSlug = this.cmc.counterpartySlug({ username: await this.ownUsername(), host: config.group.host });

    this.threadInfo = {
      localChatStreamId,
      remoteChatStreamId,
      userSlug,
      userSlugSource,
      groupSlug,
      acceptEventId: rel.acceptEventId,
      dataGrantAccessId: rel.dataGrantAccessId
    };
    return this.threadInfo;
  }

  /** The conversation, oldest first (the newest 200 lines). */
  async thread (): Promise<SupportMessage[]> {
    const info = await this.threadInfoOrThrow();
    let events: any[];
    try {
      events = (await this.connection.apiOne('events.get', {
        streams: [info.localChatStreamId],
        types: [CHAT_EVENT_TYPE],
        limit: 200,
        sortAscending: false
      }, 'events')) ?? [];
    } catch (e) {
      throw asUpstream(e, 'reading the support thread failed');
    }
    const lines = toThread(events);
    for (const m of lines) this.seen.add(m.id);
    return lines;
  }

  /**
   * Send a line, with the same raw `events.create` of `message/chat-cmc` on the relationship's chat stream that
   * hds-webapp's Chat page uses (`model/Contact.ts` `chatPost`), so it shows in the host's Connections thread too.
   */
  async send (text: string): Promise<SupportMessage> {
    const body = typeof text === 'string' ? text.trim() : '';
    if (body === '' || body.length > MAX_MESSAGE_LENGTH) {
      throw new SupportError('invalid-parameters', `a message is 1 to ${MAX_MESSAGE_LENGTH} characters`);
    }
    const info = await this.threadInfoOrThrow();
    let event: any;
    try {
      event = await this.connection.apiOne('events.create', {
        streamIds: [info.localChatStreamId],
        type: CHAT_EVENT_TYPE,
        content: { content: body }
      }, 'event');
    } catch (e) {
      throw asUpstream(e, 'sending the message failed');
    }
    const m = parseSupportMessage(event) ?? { id: String(event?.id), time: event?.time ?? Date.now() / 1000, mine: true, author: null, text: body };
    this.seen.add(m.id);
    return m;
  }

  // ---- Live ---- //

  /**
   * Subscribe to new lines (the user's own included, e.g. written from another device). Starts a Monitor on
   * `cmc.scopes.chats` for the relationship's chat stream on the first subscriber and stops it with the last.
   * Lines already returned by `thread()` / `send()` are not re-emitted.
   */
  onMessage (cb: (message: SupportMessage) => void): () => void {
    this.listeners.add(cb);
    if (this.monitor == null) {
      this.startMonitor().catch((e) => this.onError?.(e));
    }
    return () => {
      this.listeners.delete(cb);
      if (this.listeners.size === 0) this.stopMonitor();
    };
  }

  private async startMonitor (): Promise<void> {
    const generation = ++this.monitorGeneration;
    const info = await this.threadInfoOrThrow();
    if (generation !== this.monitorGeneration || this.listeners.size === 0) return;
    const scope = {
      ...this.cmc.scopes.chats({ scopeStreamId: info.localChatStreamId.replace(/:chats:[^:]+$/, ''), peerSlug: info.groupSlug }),
      types: [CHAT_EVENT_TYPE]
    };
    const monitor = this.monitorFactory(this.connection, scope);
    monitor.on('event', (event: any) => this.handleLiveEvent(event));
    monitor.on('error', (e: unknown) => this.onError?.(e));
    this.monitor = monitor;
    await monitor.start();
    if (generation !== this.monitorGeneration) {
      monitor.stop();
      return;
    }
    // B-2026-11-01-1: start() resolves before the socket subscribes; fetch once more after it settled.
    this.settleTimer = setTimeout(() => {
      this.settleTimer = null;
      if (generation !== this.monitorGeneration) return;
      monitor.updateEvents().catch((e) => this.onError?.(e));
    }, this.monitorSettleMs);
  }

  private handleLiveEvent (event: any): void {
    const m = parseSupportMessage(event);
    if (m == null || this.seen.has(m.id)) return;
    this.seen.add(m.id);
    for (const cb of [...this.listeners]) {
      try { cb(m); } catch (e) { this.onError?.(e); }
    }
  }

  private stopMonitor (): void {
    this.monitorGeneration++;
    if (this.settleTimer != null) {
      clearTimeout(this.settleTimer);
      this.settleTimer = null;
    }
    if (this.monitor != null) {
      try { this.monitor.stop(); } catch (_e) { /* already stopped */ }
      this.monitor = null;
    }
  }

  /** Stop the live feed and drop every subscriber. */
  stop (): void {
    this.listeners.clear();
    this.stopMonitor();
  }

  // ---- Offline path ---- //

  /**
   * Leave an address to be told (once, no content) when the team answers (`POST /notify`).
   *
   * Proof that the caller controls the accepter behind `userSlug`: a 5-minute shared access with `read` on the
   * placeholder stream, minted on the user's own account; the service checks its token with `accessInfo` on the
   * accepter's endpoint, which it builds itself. The access is deleted again once the service answered.
   *
   * `lang` is the language of the one email (SERVICE-API.md v1.1): any `fr*` value sends `"fr"`, anything else
   * `"en"`; omitted, the service defaults to English. A `404 unknown-thread` means the user is no longer joined.
   */
  async notifyMe (email: string, opts: { consent: boolean; lang?: string }): Promise<void> {
    if (opts?.consent !== true) throw new SupportError('consent-required', 'the user must consent to store the address');
    const address = typeof email === 'string' ? email.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || address.length > 254) {
      throw new SupportError('invalid-parameters', 'not an e-mail address');
    }
    const config = await this.loadConfig();
    const info = await this.threadInfoOrThrow();
    let access: { id?: string; token?: string } | null;
    try {
      access = await this.connection.apiOne('accesses.create', {
        name: 'hds-support-notify-proof-' + randomSuffix(),
        type: 'shared',
        permissions: [{ streamId: config.placeholderStreamId, level: 'read' }],
        expireAfter: PROOF_TTL_SECONDS
      }, 'access');
    } catch (e) {
      throw asUpstream(e, 'minting the proof access failed');
    }
    if (typeof access?.token !== 'string' || access.token === '') {
      throw new SupportError('upstream-error', 'the proof access came back without a token');
    }
    try {
      const body: Record<string, unknown> = { userSlug: info.userSlug, email: address, consent: true, proofToken: access.token };
      if (typeof opts.lang === 'string' && opts.lang !== '') body.lang = opts.lang.toLowerCase().startsWith('fr') ? 'fr' : 'en';
      await this.request('POST', '/notify', body);
    } finally {
      if (access.id != null) {
        this.connection.apiOne('accesses.delete', { id: access.id }).catch(() => { /* expires anyway */ });
      }
    }
  }
}
