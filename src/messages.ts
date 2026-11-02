import type { SupportMessage } from './types';

/** `message/chat-cmc` (`cmc.ET_CHAT`). */
export const CHAT_EVENT_TYPE = 'message/chat-cmc';

/** Chat body limits (data-types `message/chat-cmc`): 1 to 10240 characters. */
export const MAX_MESSAGE_LENGTH = 10240;

/**
 * SERVICE-API.md widget parsing rule: a group-side line matching `^([^:\n]{1,40}): ` carries an agent byline.
 * The support service prefixes every agent reply with `"<display name>: "`, the only attribution that reaches
 * the user (`clientData` is not forwarded and the chat body must be a string, plan 117 WP-A (3)).
 */
const BYLINE = /^([^:\n]{1,40}): /;

export function parseByline (text: string): { author: string | null; text: string } {
  const m = BYLINE.exec(text);
  if (m == null) return { author: null, text };
  const author = m[1].trim();
  if (author === '') return { author: null, text };
  return { author, text: text.slice(m[0].length) };
}

/**
 * One chat event as a `SupportMessage`, or null when it is not a drawable chat line (another type,
 * trashed, empty body). Direction follows the plugin: a delivered (incoming) event carries
 * `content.from`, the user's own outgoing event does not (hds-lib `Contact.chatEventInfos`).
 * Only the team's lines are parsed for a byline; the user's own text is never reinterpreted.
 */
export function parseSupportMessage (event: any): SupportMessage | null {
  if (event == null || event.trashed === true || event.type !== CHAT_EVENT_TYPE) return null;
  const content = event.content as { content?: unknown; from?: { username?: unknown } } | null | undefined;
  const raw = typeof content?.content === 'string' ? content.content : '';
  if (raw.trim() === '') return null;
  const mine = typeof content?.from?.username !== 'string' || content.from.username === '';
  const time = typeof event.time === 'number' ? event.time : 0;
  if (mine) return { id: String(event.id), time, mine, author: null, text: raw };
  const { author, text } = parseByline(raw);
  return { id: String(event.id), time, mine, author, text };
}

/** Parse, drop the non-chat events, sort oldest first. */
export function toThread (events: any[]): SupportMessage[] {
  const out: SupportMessage[] = [];
  for (const ev of events) {
    const m = parseSupportMessage(ev);
    if (m != null) out.push(m);
  }
  return out.sort((a, b) => a.time - b.time);
}
