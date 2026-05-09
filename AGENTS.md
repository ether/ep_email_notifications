# Agent Guide — ep_email_notifications

Subscribe to a pad and receive an email when someone edits your pad.

## Tech stack

* Etherpad plugin framework (hooks declared in `ep.json`)
* EJS templates rendered server-side via `eejsBlock_*` hooks
* html10n for i18n (`locales/<lang>.json`, `data-l10n-id` in templates)

## Project structure

```
ep_email_notifications/
├── AGENTS.md
├── CONTRIBUTING.md
├── client.js
├── ep.json
├── handleMessage.js
├── index.js
├── locales/
│   ├── de.json
│   ├── en.json
│   ├── es.json
│   ├── fr.json
│   ├── hu.json
├── package.json
├── static/
│   ├── css/
│   ├── js/
│   ├── tests/
├── templates/
│   ├── email_notifications_settings.ejs
│   ├── response.ejs
├── update.js
```

## Helpers used

_None — `ep_plugin_helpers` is not a dependency. Adoption is part of the helpers-adoption sweep (Phase 4)._


## Helpers NOT used

_To be audited in the helpers-adoption sweep (Phase 4)._


## Running tests locally

`ep_email_notifications` runs inside Etherpad's test harness. From an etherpad checkout that has installed this plugin via `pnpm run plugins i --path ../ep_email_notifications`:

```bash
# Backend (Mocha) — harness boots its own server
pnpm --filter ep_etherpad-lite run test

# Playwright — needs `pnpm run dev` in a second terminal
pnpm --filter ep_etherpad-lite run test-ui
```

## Standing rules for agent edits

* PRs target `main`. Linear commits, no merge commits.
* Every bug fix includes a regression test in the same commit.
* All user-facing strings in `locales/`. No hardcoded English in templates.
* No hardcoded `aria-label` on icon-only controls — etherpad's html10n auto-populates `aria-label` from the localized string when (a) the element has a `data-l10n-id` and (b) no author-supplied `aria-label` is present. Adding a hardcoded English `aria-label` blocks that and leaves it untranslated. (See `etherpad-lite/src/static/js/vendors/html10n.ts:665-678`.)
* No nested interactive elements (no `<button>` inside `<a>`).
* LLM/Agent contributions are explicitly welcomed by maintainers.

## Quick reference: hooks declared in `ep.json`

* Server: `padUpdate`, `handleMessage`, `eejsBlock_mySettings`, `eejsBlock_styles`, `clientVars`, `expressCreateServer`
* Client: `postAceInit`, `handleClientMessage_emailSubscriptionSuccess`, `handleClientMessage_emailUnsubscriptionSuccess`, `handleClientMessage_emailNotificationGetUserInfo`, `handleClientMessage_emailNotificationMissingParams`

When adding a hook, register it in both `ep.json` *and* the matching `exports.<hook> = ...` in the JS file.
