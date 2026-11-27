# Changelog

## [0.4.0] - 2026-11-27

### Changed

- **`hds-lib` and `hds-forms-js` are peer dependencies** with a minimum (hds-lib ≥ 2.74.0, hds-forms-js ≥ 0.56.0), no
  longer dependencies at an exact tag (hds-lib 2.51.2, hds-forms-js 0.28.1). A host installs them itself and the library
  uses the host's copy, as hds-forms-js does since 0.42.0. A host with newer pins than ours could not run a plain
  `npm install` (ERESOLVE). Built and tested against hds-lib 2.75.0 and hds-forms-js 0.56.1 (dev dependencies, with
  hds-forms-js's own peers hds-feminine-cycle-ui 0.18.0 and pdfjs-dist 6.4.299).

## [0.3.0] - 2026-11-25

### Added

- Any language by data (plan 138): the labels, the invite's consent text and the email's language are picked by tag (`fr-CH`
  reads `fr`, `pt` reads `pt-BR`), English without them. The email's language is one of the service's `languages`
  (`/public/config`), `en` and `fr` for a service that does not publish them.
- Spanish, Italian and Brazilian Portuguese labels (plan 138): `SUPPORT_CHAT_LABELS_ES`, `_IT`, `_PT_BR` (`pt` and `pt-PT`
  read `pt-BR`). Machine drafts, shipped before a native review.

## [0.2.0] - 2026-11-14

### Changed

- hds-lib `2.51.2` (pryv `3.19.0`), B-2026-11-14-2. The default monitor attaches the socket update method before
  `start()`, so `start()` resolves once the socket has subscribed (`@pryv/monitor` 3.18+), and the socket fetches once
  more what changed in between.

### Removed

- **Breaking:** the `monitorSettleMs` option and the settle `updateEvents()` after `start()` (the B-2026-11-01-1
  workaround, fixed in pryv 3.18.0).

## [0.1.3] - 2026-11-06

### Changed

- hds-lib `2.40.0` (pryv `3.18.0`, `@pryv/cmc` `3.23.0`) and hds-forms-js `0.28.1`, one copy of each.

### Fixed

- Since pryv `3.18.0` `connection.username()` and `accessInfo()` reject on a refused token instead of resolving
  `{ error }` (pryv/lib-js#80). Reading the own username now maps that rejection to a `SupportError`
  (`upstream-error`) instead of letting the raw error escape `threadInfoOrThrow()`.

## [0.1.2] - 2026-11-02

### Fixed

- Joining no longer fails with "upstream-error" when the `hds-support` consent anchor already exists, which is every
  join: `prepareJoin()` creates it and `join()` creates it again. The core's `item-already-exists` answer names the
  existing stream in `data.id`, which `errorIdOf` reads first, so the error was not recognised. Found on demo.

## [0.1.1] - 2026-11-02

### Fixed

- The default `placeholderStreamName` is the data model's stream name, "Health Data Safe support (holds no data)"
  (data-model 3.38.0), not "HDS support", so every consumer creates the consent anchor with the same name.

## [0.1.0] - 2026-11-02

### Added

- **`SupportClient`** (headless, no React): `loadConfig`, `status`, `prepareJoin`, `join`, `thread`, `onMessage` /
  `stop`, `send`, `presence`, `notifyMe`, `threadInfoOrThrow`, against hds-support-service `SERVICE-API.md` v1.1
  (plan 117 WP-C).
  - `notifyMe(email, { consent, lang })` sends the email language (`"en"` / `"fr"`); `<SupportChat>` passes its `lang`.
    A `404 unknown-thread` (the user is no longer joined) shows "This conversation has ended…" in the form.
  - Service error ids of v1.1, including `not-found`, `internal-error` and `not-configured`.
  - Joins the support group's permanent open-link invite with `cmc.acceptInvite` (unique `accessName` per accept,
    `waitForCompletion`), after creating the `hds-support` placeholder stream. A `cmc-capability-*` failure re-fetches
    the config once (link rotation); `cmc-capability-already-accepted-by-you` counts as joined.
  - Refuses an offer that is not the chat-only, non-delegable one of the configured group (`invalid-offer`).
  - Sends with the raw `events.create` of `message/chat-cmc` hds-webapp uses, so the conversation also shows in the
    host's Connections / Chat.
  - Live feed: a `pryv.Monitor` on `cmc.scopes.chats` with one extra `updateEvents()` after the socket settles
    (`@pryv/monitor` start race, B-2026-11-01-1); lines are de-duplicated by id.
  - `userSlug` read from the back-channel stamp (`clientData.cmc.counterparty.remoteChatStreamId` of the data grant),
    derived from the own username + the group's host otherwise.
  - Notify-me proof: a 5-minute shared `read` access on `hds-support`, deleted once the service answered.
  - Typed errors: `SupportError` with the service's ids and client-side ones.
- **`<SupportChat>`**: not-joined (intro, consent through hds-forms-js `ConsentPanel`, DPO text slot, the chat-only
  notice), joined online / offline (presence banner, notify-me form with prefilled address and explicit consent),
  thread with agent bylines, composer with the "do not share medical details" notice, no attachments. Injected
  labels, `SUPPORT_CHAT_LABELS_EN` / `SUPPORT_CHAT_LABELS_FR`.
- Byline parsing (`parseByline`, `parseSupportMessage`): `^([^:\n]{1,40}): ` on team lines only.
