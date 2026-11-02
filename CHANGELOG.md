# Changelog

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
