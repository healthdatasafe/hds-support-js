# hds-support-js

"Help & support" for HDS apps: a headless `SupportClient` and a React `<SupportChat>` that let a signed-in user chat with
the **Health Data Safe team**. The conversation is an ordinary CMC relationship between the user's account and the
platform's support group account, so it also shows as a Connection, with its chat, in hds-webapp. Presence and the
e-mail notification come from `hds-support-service` (contract: `services/hds-support-service/docs/SERVICE-API.md`
v1.1, plan 117).

## How it works

1. The service publishes the group's permanent open-link invite (`GET /public/config`).
2. The user consents to a **chat-only, non-delegable** offer: one `read` permission on the empty `hds-support`
   placeholder stream ("The HDS team can only exchange messages with you; it has no access to your health data.").
   The client refuses any other offer (`invalid-offer`).
3. `cmc.acceptInvite` creates the relationship. Messages go through the relationship's chat stream with the same
   `events.create` hds-webapp uses; agents answer through the service relay, prefixed `"<name>: "`, which the widget
   shows as a byline.
4. When nobody is online (`GET /public/presence`), the user may leave an e-mail address (`POST /notify`), proven by a
   5-minute shared access on their own account. One e-mail, without content, is sent at the first answer.

## Integrating it in a host app

### Install

```json
"dependencies": {
  "hds-support-js": "git+https://github.com/healthdatasafe/hds-support-js.git#0.1.0"
}
```

It depends on `hds-lib` and `hds-forms-js` (for `ConsentPanel`); React 19 is a peer dependency. Like `hds-forms-js`,
the package exposes its TypeScript source to bundlers: in Vite put it in `optimizeDeps.exclude` and dedupe `hds-lib`.

### Styles

The widget uses stock Tailwind classes plus the `primary` scale (`hds-style/css/theme.css` or
`hds-forms-js/css/tokens.css`). Tailwind v4 must scan its source:

```css
@import "tailwindcss";
@import "hds-style/css/theme.css";
@source "../node_modules/hds-support-js/src/**/*.{ts,tsx}";
@source "../node_modules/hds-forms-js/src/**/*.{ts,tsx}";
```

### Build the client

```ts
import { cmc } from 'hds-lib';
import { SupportClient } from 'hds-support-js';

const client = new SupportClient({
  connection,                              // the user's pryv.Connection (personal token: accept needs it)
  serviceUrl: 'https://support-api.datasafe.dev',   // prod: https://support-api.hds.ngo
  scopeStreamId: cmc.appScope('hds-patient')        // YOUR app's CMC scope: where the accept trigger lands
});
```

| Option | |
|---|---|
| `connection` | The signed-in user's connection. `join()` needs a personal token (`cmc-accept-requires-personal-token`). |
| `serviceUrl` | hds-support-service base URL. |
| `scopeStreamId` | The host's `:_cmc:apps:<app code>` stream (must exist, as hds-webapp's `ensureCmcPatientAppScope` does). |
| `fetch` | Optional fetch implementation. |
| `placeholderStreamName` | Name given to `hds-support` if the client creates it (default "HDS support"). |
| `onError` | Live-feed failures. |

Keep one client per signed-in connection (e.g. in a context) and call `client.stop()` on sign-out.

### Render the widget

```tsx
import { SupportChat } from 'hds-support-js';

<SupportChat
  client={client}
  lang={language}                  // 'en' | 'fr' default label sets
  dpoText={t('support.dpo')}       // DPO notice on the consent screen (default: the invite's own consent text)
  defaultEmail={accountEmail}      // prefills the notify-me address, when the app can read it
  onJoined={() => refreshContacts()}
  onRefuse={() => closeView()}
/>
```

States it draws:

| State | What the user sees |
|---|---|
| not joined | intro, then `ConsentPanel` (title, DPO text, the placeholder permission, the chat-only notice), Allow / Refuse |
| joined, online | "Someone from the team is online.", the thread, the composer |
| joined, offline | "Nobody is online right now", the thread, and after the user's first message the notify-me form (address, explicit consent checkbox) |

The composer always shows "Please do not share medical details here." above the input; there are no attachments.

### Consent

The consent UI is `ConsentPanel` from `hds-forms-js`. The host supplies the DPO text (`dpoText`, a string or a node;
never raw HTML). The chat-only notice is a label (`chatOnlyNotice`) and must keep its meaning. After `onJoined`,
refresh whatever lists relationships (hds-webapp: contacts) so "Health Data Safe team" shows in Connections.

### Labels

All texts are injected. `SUPPORT_CHAT_LABELS_EN` and `SUPPORT_CHAT_LABELS_FR` are the defaults (`supportChatLabels(lang)`
picks one); `labels` overrides any key, and `labels.consent` overrides the embedded `ConsentPanel` labels.

```tsx
<SupportChat client={client} lang='fr' labels={{ intro: 'Une question ? Écrivez-nous.' }} />
```

## Headless API

| Call | Returns | Notes |
|---|---|---|
| `loadConfig(force?)` | `SupportConfig` | `GET /public/config`, cached |
| `status()` | `'not-joined' \| 'joined'` | an active accepted relationship with the group `{username, host}`, in any app scope |
| `prepareJoin()` | `SupportOffer` | creates `hds-support`, reads and checks the offer; re-fetches the config once on a withdrawn link |
| `join()` | `'joined'` | `acceptInvite(…, { scopeStreamId, waitForCompletion: true })`; one config re-fetch on `cmc-capability-*` |
| `thread()` | `SupportMessage[]` | newest 200 lines, oldest first, `{ id, time, mine, author, text }` |
| `onMessage(cb)` | unsubscribe | Monitor on `cmc.scopes.chats`, de-duplicated; stops with the last subscriber |
| `send(text)` | `SupportMessage` | `events.create` of `message/chat-cmc` on the relationship chat stream |
| `presence()` | `{ online, agents }` | `GET /public/presence` |
| `notifyMe(email, { consent: true, lang? })` | `void` | proof access + `POST /notify`; `lang` (`fr*` → `"fr"`, else `"en"`) is the email's language; `<SupportChat>` passes its `lang` |
| `threadInfoOrThrow()` | `SupportThreadInfo` | chat streams and `userSlug` |
| `stop()` | | stops the live feed |

Errors are `SupportError` (`isSupportError(e, id)`), with the service ids of `SERVICE-API.md` v1.1
(`invalid-parameters`, `unauthorized`, `not-a-member`, `not-an-accepter`, `unknown-thread`, `not-found`,
`already-sent`, `rate-limited`, `internal-error`, `upstream-error`, `not-configured`) and client ones
(`network-error`, `invalid-response`, `not-joined`, `consent-required`, `invalid-offer`, `join-failed`,
`unknown-error`).

### `userSlug`

The group's thread is `:_cmc:apps:hds-support:team:chats:<userSlug>`. The user side reads it from the data grant of the
relationship: the group's back-channel stamps that stream as `clientData.cmc.counterparty.remoteChatStreamId`. When
that stamp is missing, the slug is `cmc.counterpartySlug({ username: <own username>, host: config.group.host })`
(the CMC host is the platform's DNS domain, shared by the user's and the group's cores). The contract defines
`group.host` as that CMC identity host (v1.1).

## Prerequisites

- Node.js >= 24
- npm

## Setup

```sh
npm run setup
```

## Development

```sh
npm run dev       # vite build --watch
npm test
npm run lint
npm run typecheck
```
