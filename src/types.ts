/** `GET /public/config` (SERVICE-API.md v1). */
export interface SupportConfig {
  appCode: string;
  displayName: string;
  /** The support group account, as CMC identifies it (`host` is the platform's CMC host, not a core URL). */
  group: { username: string; host: string };
  teamStreamId: string;
  placeholderStreamId: string;
  openLinkUrl: string;
  configVersion: number;
}

/** `GET /public/presence`. */
export interface SupportPresence {
  online: boolean;
  agents: number;
}

export type SupportStatus = 'not-joined' | 'joined';

/** One line of the support conversation, as the widget draws it. */
export interface SupportMessage {
  id: string;
  /** Pryv time (seconds). */
  time: number;
  /** Written by this user (the local outgoing event carries no `content.from`). */
  mine: boolean;
  /**
   * Agent byline parsed from a `"<name>: "` prefix (SERVICE-API.md, widget parsing rule).
   * `null` for the user's own lines and for team lines without a byline ("Health Data Safe team").
   */
  author: string | null;
  /** Body, byline removed. */
  text: string;
}

/** A permission of the support offer, in the shape `ConsentPanel` takes. */
export interface SupportOfferPermission {
  streamId: string;
  level: string;
  defaultName?: string;
}

/** What `prepareJoin()` hands to the host's consent UI. */
export interface SupportOffer {
  /** The group, as the capability reports it. */
  requester: { username: string | null; host: string; displayName?: string };
  /** Display name to show (the config's, falling back to the offer's). */
  displayName: string;
  /** Consent / DPO text of the invite, per language (`{ en, fr }`), when the invite carries one. */
  consent: Record<string, string> | null;
  permissions: SupportOfferPermission[];
  features: { chat: boolean; systemMessaging: boolean };
  accessType: 'shared' | 'app';
}

/** Where the conversation lives, resolved from the accepted relationship. */
export interface SupportThreadInfo {
  /** The user-side chat stream (`…:chats:<groupSlug>`): the user writes and reads here. */
  localChatStreamId: string;
  /** The group-side thread leaf (`…:team:chats:<userSlug>`), as the group's back-channel reported it; null on a relationship without it. */
  remoteChatStreamId: string | null;
  /** This user's slug as the group sees it (the leaf suffix of the group-side thread). */
  userSlug: string;
  /** How `userSlug` was obtained: `'back-channel'` (authoritative) or `'derived'` (own username + the group's host). */
  userSlugSource: 'back-channel' | 'derived';
  groupSlug: string;
  acceptEventId: string;
  dataGrantAccessId: string | null;
}

/** The subset of a `pryv.Connection` the client uses. */
export interface SupportConnection {
  apiOne: (method: string, params: Record<string, unknown>, resultKey?: string) => Promise<any>;
  username?: () => Promise<string> | string;
  accessInfo?: () => Promise<any>;
}

/** A live chat feed (a `pryv.Monitor` wrapped). */
export interface SupportMonitor {
  on: (event: 'event' | 'error', cb: (payload: any) => void) => unknown;
  /** Resolves once the monitor ran its first fetch and attached its live transport. */
  start: () => Promise<void>;
  updateEvents: () => Promise<unknown>;
  stop: () => void;
}

export type SupportMonitorFactory = (connection: SupportConnection, scope: { streams: string[]; types?: string[] }) => SupportMonitor;

/** The methods of `SupportClient` the React component relies on (lets a host or a test pass a stand-in). */
export interface SupportClientLike {
  loadConfig: (force?: boolean) => Promise<SupportConfig>;
  status: () => Promise<SupportStatus>;
  prepareJoin: () => Promise<SupportOffer>;
  join: () => Promise<SupportStatus>;
  thread: () => Promise<SupportMessage[]>;
  onMessage: (cb: (message: SupportMessage) => void) => () => void;
  send: (text: string) => Promise<SupportMessage>;
  presence: () => Promise<SupportPresence>;
  notifyMe: (email: string, opts: { consent: boolean; lang?: string }) => Promise<void>;
}
