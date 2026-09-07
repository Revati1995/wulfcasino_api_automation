# WulfCasino — Postman Collections

API reference for the WulfCasino backend (`hestabit_Backend/apps/api`), generated from the NestJS source: every controller route, its guards, and its validation DTOs were read to produce realistic, ready-to-send requests. **858 requests** across 4 collections, plus a full Socket.IO event reference.

## What's in this folder

| File | Contents |
|---|---|
| `WulfCasino-Player-API.postman_collection.json` | 239 requests — everything the player web app (`hestabit_User`) calls: auth, profile, KYC, wallet/vault, deposits & withdrawals (Coinflow/Breeze), games & lobby, bonuses, VIP, races/raffles/jackpot, subscriptions, notifications, chat |
| `WulfCasino-Agent-API.postman_collection.json` | 61 requests — agent/affiliate portal: affiliate stats, sub-agents, commissions, agent payments (Breeze/Coinflow), packages, promo codes, agent notifications |
| `WulfCasino-Admin-API.postman_collection.json` | 523 requests — back-office (`hestabit_Admin`): employees/roles/permissions, player management, transactions & payouts review, content CMS (banners, sidebar, modals, collections, home layout), reports, system config/logs |
| `WulfCasino-Webhooks-Internal.postman_collection.json` | 35 requests — inbound provider callbacks (Coinflow, Breeze, Sumsub, AleaPlay, SA Games) with signature notes, plus internal test/diagnostic routes. For payload reference and dev-environment replay only |
| `WulfCasino-Local.postman_environment.json` | Environment: `baseUrl`, `wsUrl`, and token variables |
| `SOCKET_EVENTS.md` | Socket.IO reference — 4 gateways, 14 client→server and 88 server→client events with payloads, triggers, and target rooms |

## Quick start

1. **Import** all four collection files and the environment file into Postman (*File → Import*, drop the whole folder).
2. Select the **WulfCasino Local** environment. Default `baseUrl` is `http://localhost:8000/api/v1` — change it for dev/staging.
3. **Log in once per collection** — the login requests carry a test script that saves the JWT to the environment automatically:
   - **Player API** → `Authentication → Login` (`POST /auth/login`) → saves `{{playerToken}}`
   - **Admin API** → `Administration → Login` (`POST /admin/auth/login`) → saves `{{adminToken}}`
   - **Agent API** → `Authentication → Agent login` — agents are *employee* accounts and use `POST /admin/auth/login` with agent credentials → saves `{{agentToken}}`
4. Every other request inherits the collection-level Bearer token. Public and webhook endpoints explicitly override auth with *No Auth*.

## Conventions used in the collections

- **Folders mirror backend modules** (one folder per NestJS module; game providers are nested under *Games & Lobby*).
- **Request bodies** are realistic examples built from the validation DTOs — every field is present, enum options are listed in the request description.
- **Query params**: required ones are enabled; optional ones are included but **disabled** (toggle them on in the Params tab). Each has a description.
- **Path params** use Postman path variables (`:id`) with example values pre-filled.
- **Descriptions** state what the endpoint does, its auth requirement, and — where applicable — the admin **permission key** (`PermissionsGuard`), super-admin requirement, throttling, or feature gates (subscription/VIP).
- **Special headers** are pre-filled where needed (e.g. `x-logs-key` for System Logs — obtain it via `POST /admin/system-logs/access`).

## Things the analysis surfaced (worth knowing)

- **Routing quirks:** `RouterModule` mounts several modules under `/admin` (`manual-deposits`, `subscription-changes`, `agent-notification`, `messaging`); the admin leaderboard lives at the intentional double path `admin/admin/leaderboard`; compliance and SEON config are dual-mounted (both aliases noted in descriptions); the admin medals controller has an empty prefix, so its routes sit at the API root.
- **Unguarded routes that look protected** (flagged in each request description): the entire `admin/coin-bundles` CRUD, the entire banner-pack controller, `admin/kyc/*`, `admin/bonus/seed`, `admin/promotions/seed` + test helpers, the two agent-package webhooks (no signature check), and three upload GET routes. Worth a security pass.
- **Empty controllers** (registered but no routes): `payments`, `ledger`, `notifications`, `integration-providers` — they don't appear in the collections.
- **Webhook signatures** vary by provider: Coinflow payin/subscription use an `Authorization` header equal to the dashboard Validation Key; the payout webhook signs the raw body into `x-coinflow-signature`; Breeze/Coinflow payout callbacks carry an HMAC-SHA256 `signature` in the body; AleaPlay uses a SHA-512 `digest` header; SA Games payloads are DES-encrypted form data. Details per request.

## Real-time API

REST is only half the surface — balance updates, notifications, jackpots, races, chat, and admin live-watch all flow over Socket.IO. See **[SOCKET_EVENTS.md](SOCKET_EVENTS.md)** for connection/handshake details (JWT in `handshake.auth.token`), the room model (`global`, `user:<id>`, `admins`, `watch:user:<id>`, …), and every event with payload examples.

## Keeping this up to date

These files were generated **from the controllers/DTOs/guards in `hestabit_Backend/apps/api/src`** (August 2026). When endpoints change:

- Small edits: adjust the affected request directly in Postman and re-export over the file here.
- Large drifts: regenerate — the source of truth is the controller decorators (`@Controller`, `@Get/@Post/...`, `@UseGuards`, DTOs) plus the `RouterModule.register` prefixes in `app.module.ts`.
- Swagger is also available at `{{baseUrl}}/docs` (basic-auth protected, non-production) for cross-checking.
