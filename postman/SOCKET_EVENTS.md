# WulfCasino — Socket.IO Event Reference

> Companion to the Postman collections. Postman Collection v2.1 cannot export Socket.IO requests, so the real-time API is documented here instead. Connect with [socket.io-client](https://socket.io/docs/v4/client-api/) or Postman's **New → Socket.IO** request type.

**Server:** `{{wsUrl}}` → `http://localhost:8000` (same process as the REST API; `PORT` env, default 8000). Socket.IO path: `/socket.io` (default).

## Transport & scaling

RedisIoAdapter extends @nestjs/platform-socket.io IoAdapter and installs @socket.io/redis-adapter (pub/sub) using REDIS_URL, so every server.emit / server.to(room).emit fans out across ALL API instances. It preserves all @WebSocketGateway decorator options (cors, transports, namespaces) and does NOT change the Socket.IO path or namespaces - the default path /socket.io is used. Applied in main.ts via app.useWebSocketAdapter(redisIoAdapter) after connectToRedis(); the API listens on process.env.PORT || 8000. REDIS_URL is mandatory or boot fails.

### Worker → API socket bridge

The worker process (apps/worker) has no Socket.IO server. apps/worker/src/socket/worker-socket.bridge.ts is substituted for SocketService and publishes every emit to the Redis channel SOCKET_EMIT as {scope: 'user'|'role'|'global', userId?, roleId?, event, payload}; the API SocketGateway subscribes to SOCKET_EMIT and re-broadcasts to user:<id>, role:<id> or global. The worker also publishes domain channels TOURNAMENT_WIN, TOURNAMENT_STATUS_CHANGED, RACE_WIN, RACE_SETTLED (payout.processor.ts) and FREE_SPIN_NOTIFICATION_CHANNEL; the API publishes JACKPOT_UPDATE, JACKPOT_WIN, JACKPOT_TIER_UPDATE, JACKPOT_TIER_WIN (jackpot services). SocketGateway.onModuleInit subscribes to all of these and converts them into the socket events documented below.

## Gateways at a glance

| Gateway | Namespace | Auth | Client→Server | Server→Client |
|---|---|---|---|---|
| Main Socket Gateway | `/` | OPTIONAL JWT | 2 | 66 |
| Global Notification Gateway | `/` | None of its own - it piggybacks on the Main Socket Gateway handshake and its user:<userId> rooms | 2 | 6 |
| Agent Notification Gateway | `/` | Admin/agent/sub-agent JWT via the Main Socket Gateway handshake (role 'admin'|'agent' claims); those sockets are auto-joined to admin:<employeeId> and admins | 1 | 4 |
| Community Chat Gateway | `/chat` | REQUIRED JWT in handshake | 9 | 12 |

---

## Main Socket Gateway

Source: `modules/socket/socket.gateway.ts` — namespace `/`

### Connecting

- **URL:** ws://localhost:8000 (process.env.PORT || 8000; frontend uses NEXT_PUBLIC_SOCKET_URL, default http://localhost:8000)
- **Path:** `/socket.io`
- **Transports:** websocket, polling
- **CORS:** origin: true, credentials: true
- **Auth:** OPTIONAL JWT. Token read from handshake.auth.token OR the Authorization header ('Bearer ' prefix stripped). Same access JWT as the REST API (signed with the app JwtService secret; claims used: id|sub|userId, role, ver (tokenVersion), sid (sessionId)). The user frontend sends auth: { token, deviceId, platform: 'web' }. A socket with no/invalid token stays connected but only in the 'global' room (public broadcasts). Player tokens are rejected (disconnect) if the user is missing/inactive, if payload.ver !== user.tokenVersion (revoked token), or if payload.sid fails SessionRegistryService.validate.
- **Notes:** Every socket joins 'global' immediately on connect, authenticated or not. Tokens with role 'admin' or 'agent' are employees: they join admin:<employeeId> and 'admins' and skip the User lookup. Player sockets join user:<userId> and, when the token carries sid, sess:<sessionId>. PresenceService pushes presence:user / presence:employee to the 'admins' room on connect and on last-socket disconnect (stamping last_seen_at).

### Rooms

| Room pattern | Purpose |
|---|---|
| `global` | Every connected socket (joined on connect, no auth required). Target of all emitGlobal broadcasts. |
| `user:<userId>` | All sockets of one authenticated player. Target of emitToUser. |
| `sess:<sessionId>` | One device/session of a player (joined when the JWT carries sid). Used only for per-device revocation (session:revoked). |
| `admin:<employeeId>` | All sockets of one admin/agent/sub-agent (employee) account. Target of emitToAdmin. |
| `admins` | Every connected admin/agent/sub-agent. Target of emitToAllAdmins and presence events. |
| `role:<roleId>` | Role-scoped room supported by the SOCKET_EMIT bridge and SocketService.emitToRole; no code currently joins sockets to it and no producer was found (reserved). |
| `watch:user:<userId>` | Admins currently viewing a player's detail page. Opt-in via the admin:watch-user event; player-scoped events are mirrored here by emitToUserWatchers / emitToUserAndWatchers. |

### Client → Server events

#### `admin:watch-user`

Admin/agent socket joins watch:user:<userId> to receive live mirrors of that player's events (cashback:progress, rakeback_* etc.) while on the player detail page. Payload may also be a bare string userId. Rejected for non-admin/agent sockets.

- **Payload:** `{"userId":"<player uuid>"}`
- **Ack:** { ok: true } on success, { ok: false } if unauthorized or userId missing

#### `admin:unwatch-user`

Leaves watch:user:<userId>. Payload may be a bare string userId.

- **Payload:** `{"userId":"<player uuid>"}`
- **Ack:** { ok: true } / { ok: false }

### Server → Client events

#### `tournament:status-changed`

Tournament/leaderboard campaign status changed.

- **Sent to:** room global
- **Trigger:** Worker publishes TOURNAMENT_STATUS_CHANGED after settlement; also emitted directly (payload {id, status, title}) when an admin creates/updates a leaderboard campaign (admin-leaderboard.controller.ts) or the leaderboard scheduler flips a tournament live/ended (leaderboard-scheduler.service.ts).
- **Payload:** `{"campaignId":"uuid","status":"COMPLETED","isPaid":true,"type":"TOURNAMENT_STATUS_CHANGED"}`

#### `race:completed`

A race finished settlement; open leaderboards should refetch.

- **Sent to:** room global
- **Trigger:** Worker publishes RACE_SETTLED after settling a race (payout.processor.ts).
- **Payload:** `{"raceId":"uuid","status":"COMPLETED","rewardsDistributed":true,"winner":{"userId":"uuid","rank":1},"type":"RACE_SETTLED"}`

#### `race:reward`

Personal race payout alert to the winner.

- **Sent to:** room user:<userId>
- **Trigger:** Worker publishes RACE_WIN per winning participant.
- **Payload:** `{"userId":"uuid","raceId":"uuid","rank":1,"amount":100,"currency":"SC","raceName":"Weekend Race","type":"RACE_WIN"}`

#### `jackpot:update`

Live per-game jackpot pot ticker.

- **Sent to:** room global
- **Trigger:** API jackpot.service publishes JACKPOT_UPDATE on every pot contribution; gateway re-broadcasts.
- **Payload:** `{"gameId":"uuid","amount":1234.56,"type":"JACKPOT_UPDATE"}`

#### `jackpot:win`

Global jackpot win toast.

- **Sent to:** room global
- **Trigger:** JACKPOT_WIN Redis publish when a per-game jackpot drops.
- **Payload:** `{"winId":"uuid","gameId":"uuid","userId":"uuid","amount":500,"currency":"SC","type":"JACKPOT_WIN"}`

#### `jackpot:reward`

Personal jackpot win alert (fired for both per-game and tier jackpots).

- **Sent to:** room user:<userId>
- **Trigger:** Same JACKPOT_WIN / JACKPOT_TIER_WIN publishes; sent additionally to the winner only.
- **Payload:** `{"winId":"uuid","gameId":"uuid","userId":"uuid","amount":500,"currency":"SC","type":"JACKPOT_WIN"}`

#### `jackpot:tier-update`

Live snapshot of global jackpot tiers.

- **Sent to:** room global
- **Trigger:** jackpot-tier.service publishes JACKPOT_TIER_UPDATE snapshot of the four global tiers.
- **Payload:** `{"tiers":[{"tier":"MINI","amount":100.5}],"type":"JACKPOT_TIER_UPDATE"}`

#### `jackpot:tier-win`

Global tier-jackpot win toast (winner also gets jackpot:reward).

- **Sent to:** room global
- **Trigger:** JACKPOT_TIER_WIN Redis publish when a tier pot drops.
- **Payload:** `{"winId":"uuid","tier":"MAJOR","userId":"uuid","amount":2500,"currency":"SC","type":"JACKPOT_TIER_WIN"}`

#### `session:revoked`

This device's session was signed out; client shows the message and clears auth.

- **Sent to:** room sess:<sessionId> (one device only)
- **Trigger:** SessionBroadcastService.announceRevocation (logout of one device, admin revoke, expiry). Sockets in the room are force-disconnected ~250ms after the emit.
- **Payload:** `{"sessionId":"uuid","reason":"REVOKED_BY_USER","message":"You have been signed out.","byDevice":"iPhone 15","at":"2026-08-25T10:00:00.000Z"}`

#### `presence:employee`

Live online/offline state for admin/agent listings.

- **Sent to:** room admins
- **Trigger:** Employee socket authenticates (isOnline true, no lastSeenAt) or their last socket disconnects (isOnline false + lastSeenAt).
- **Payload:** `{"employeeId":"uuid","isOnline":false,"lastSeenAt":"2026-08-25T10:00:00.000Z"}`

#### `presence:user`

Live online/offline state for the players listing.

- **Sent to:** room admins
- **Trigger:** Player socket authenticates / last socket disconnects (offline payload adds lastSeenAt ISO string).
- **Payload:** `{"userId":"uuid","isOnline":true}`

#### `permissions:updated`

Recipient should refetch permissions / reload menus.

- **Sent to:** rooms user:<id> AND admin:<id> (emitToUserAndAdmin)
- **Trigger:** Role permission edits (role.service.ts) or an employee's role assignment changes (employees.service.ts).
- **Payload:** `{"reason":"roles_changed","roleName":"Manager","roles":["Manager"],"at":"2026-08-25T10:00:00.000Z"}`

#### `account:updated`

Account state changed; may carry a message field ('Your account has been deactivated. Please contact admin.').

- **Sent to:** rooms user:<id> AND admin:<id>
- **Trigger:** Admin toggles account active state or edits a profile (profile.service.ts, employees.service.ts, sub-agent-delete-request.service.ts). When deactivating, the server emits then force-disconnects the account's sockets.
- **Payload:** `{"reason":"status_changed","isActive":false,"at":"2026-08-25T10:00:00.000Z"}`

#### `account:deleted`

Account removed; client signs out.

- **Sent to:** rooms user:<id> AND admin:<id>
- **Trigger:** Employee hard-delete (employees.service.ts); sockets are disconnected right after.
- **Payload:** `{"reason":"deleted","at":"2026-08-25T10:00:00.000Z"}`

#### `tournament_win_alert`

High-impact tournament victory toast; a notification:new and an update_Real_Time_Balance follow.

- **Sent to:** room user:<userId>
- **Trigger:** GlobalNotificationService's Redis subscriber on channel TOURNAMENT_WIN (published by the worker payout processor), after persisting the notification row.
- **Payload:** `{"userId":"uuid","username":"player1","campaignId":"uuid","rank":1,"prizeAmount":100,"prizeCurrency":"SC","tournamentTitle":"Weekly Slots","type":"TOURNAMENT_WIN"}`

#### `update_Real_Time_Balance`

Authoritative live balance for one play currency (wulfCash or wulfCoin).

- **Sent to:** room user:<userId>
- **Trigger:** WalletService.emitWalletUpdate on every wallet mutation (bets/wins sync, deposits, redeems, refunds, spin rewards, tournament wins). Also emitted from the worker via the SOCKET_EMIT bridge. transactionType examples: GENERAL, SYNC, CREDIT, REDEEM, REDEEM_REFUND, SPIN_REWARD. Extra fields vary by caller (wulfCash/bonusWulfCash/redeemableWulfCash/amount are optional).
- **Payload:** `{"playCurrency":"wulfCash","balance":105.5,"transactionType":"REDEEM","at":"2026-08-25T10:00:00.000Z","wulfCash":105.5,"bonusWulfCash":0,"redeemableWulfCash":50,"amount":5}`

#### `update_redeem_balance`

Withdrawable/redeemable balance changed.

- **Sent to:** room user:<userId>
- **Trigger:** Wallet redeemable-balance recompute (wallet.service.ts) and redeem flows (redeem.service.ts).
- **Payload:** `{"availableToWithdraw":50,"redeemableWulfCash":50,"wulfCash":105.5}`

#### `update_rollover`

Wagering/rollover progress update.

- **Sent to:** room user:<userId>
- **Trigger:** WageringService.emitRolloverUpdate after wager progress changes (payload is the service's rollover summary object).
- **Payload:** `{"required":100,"progress":40,"remaining":60}`

#### `update_pending_spin_win`

Pending spin-wheel winnings changed.

- **Sent to:** room user:<userId>
- **Trigger:** Lucky-spin execution adds a pending win; redeeming resets it to 0 (redeem.service.ts).
- **Payload:** `{"pendingSpinWin":12.5}`

#### `redeem:requests`

Live refresh of the pending withdrawals list.

- **Sent to:** room user:<userId>
- **Trigger:** Any change to the player's redeem/withdrawal requests (redeem.service.ts, breezpayout.service.ts, coinflow-payout.service.ts). Payload is the full serialized list of the player's redeem requests, each enriched with its latest breezePayout/coinflowPayout summary.
- **Payload:** `[{"id":"uuid","status":"PENDING","amount":50,"breezePayout":{"pageId":"uuid","status":"PENDING"},"coinflowPayout":null}]`

#### `bundle:purchased`

Coin bundle credited; client refreshes balances/receipt.

- **Sent to:** room user:<userId>
- **Trigger:** Coin bundle purchase settles (coin-bundle.service.ts).
- **Payload:** `{"bundleId":"uuid","wulfCoin":10000,"wulfCash":10,"at":"2026-08-25T10:00:00.000Z"}`

#### `waitlist:new_join`

Landing-page leaderboard ticker.

- **Sent to:** room global
- **Trigger:** Someone joins the pre-launch waitlist (waitlist.service.ts).
- **Payload:** `{"name":"Anonymous","referralCount":0,"createdAt":"2026-08-25T10:00:00.000Z"}`

#### `waitlist:leaderboard_update`

Recomputed waitlist leaderboard.

- **Sent to:** room global
- **Trigger:** Worker waitlist-rank job recalculates ranks (apps/worker waitlist-rank.job.ts via SOCKET_EMIT bridge, scope global). Payload is the masked leaderboard array.
- **Payload:** `[{"name":"A***","referralCount":5,"rank":1}]`

#### `announcement:new`

New site announcement. (No listener found in the current user frontend.)

- **Sent to:** room global
- **Trigger:** Admin creates an announcement (announcement.service.ts). Payload is the announcement entity.
- **Payload:** `{"id":"uuid","title":"Maintenance","message":"…","isActive":true}`

#### `raffle:campaign-updated`

Raffle campaign metadata changed.

- **Sent to:** room global
- **Trigger:** Admin creates/updates/activates a raffle campaign (raffle.service.ts).
- **Payload:** `{"action":"activated","campaignId":"uuid"}`

#### `raffle:ticket-updated`

New raffle ticket issued (clients filter by userId).

- **Sent to:** room global
- **Trigger:** A raffle ticket is issued (raffle.service.ts).
- **Payload:** `{"userId":"uuid","ticketId":"uuid","ticketNumber":123,"source":"WAGER","weekNumber":34,"year":2026}`

#### `raffle:draw-won`

Personal raffle win alert.

- **Sent to:** room user:<winner userId>
- **Trigger:** Weekly raffle draw settles a winner (raffle.service.ts).
- **Payload:** `{"drawId":"uuid","campaignId":"uuid","weekNumber":34,"year":2026,"rank":1,"prize":"iPhone"}`

#### `raffle:draw-completed`

Raffle draw finished; winners list available.

- **Sent to:** room global
- **Trigger:** Weekly raffle draw completes (raffle.service.ts).
- **Payload:** `{"drawId":"uuid","campaignId":"uuid","weekNumber":34,"year":2026,"rngMethodVersion":"v1","audit":{}}`

#### `agent-payment:updated`

Agent/sub-agent payout request updated; requester dashboard, parent approval queue and admin listing all refresh.

- **Sent to:** rooms admin:<requester>, admin:<parentAgent> AND admins (all three)
- **Trigger:** Any agent payout request state change (agent-payment.service.ts emitRequestUpdate).
- **Payload:** `{"id":"uuid","status":"APPROVED","requesterEmployeeId":"uuid","parentAgentEmployeeId":"uuid","amount":100,"updatedAt":"2026-08-25T10:00:00.000Z"}`

#### `agent-activity:changed`

Nudge for the agent-activity admin listing to refetch.

- **Sent to:** room admins
- **Trigger:** Commission change request created/decided (commission-change-request.service.ts).
- **Payload:** `{"source":"COMMISSION_CHANGE"}`

#### `sub-agent-ticket:changed`

Nudge for the sub-agent delete-request admin listing to refetch.

- **Sent to:** room global
- **Trigger:** Sub-agent delete request created/decided (sub-agent-delete-request.service.ts).
- **Payload:** `{}`

#### `race:changed`

Race CRUD change (admin listings refetch).

- **Sent to:** room global
- **Trigger:** Admin creates/updates/archives/restores/deletes a race (race.service.ts). action: created|updated|archived|restored|deleted.
- **Payload:** `{"raceId":"uuid","action":"created","status":"SCHEDULED"}`

#### `race:status-changed`

Race lifecycle status changed.

- **Sent to:** room global
- **Trigger:** Race pause/resume, auto-end sweep, or settlement queue (status SETTLING) in race.service.ts.
- **Payload:** `{"raceId":"uuid","status":"PAUSED"}`

#### `race:participants-updated`

Participant count for a race changed.

- **Sent to:** room global
- **Trigger:** A player joins a race (race.service.ts).
- **Payload:** `{"raceId":"uuid","totalParticipants":12,"maxParticipants":100,"isFull":false}`

#### `race:joined`

Personal confirmation so other tabs/devices sync the joined state.

- **Sent to:** room user:<userId>
- **Trigger:** The joining player's own enrollment confirmation (race.service.ts).
- **Payload:** `{"raceId":"uuid"}`

#### `race:leaderboard-updated`

Race leaderboard should refetch.

- **Sent to:** room global
- **Trigger:** A settled bet updates race scores (race.service.ts recordBetSettlement).
- **Payload:** `{"raceId":"uuid"}`

#### `vip:xp-updated`

VIP XP/tier progress changed.

- **Sent to:** room user:<userId>
- **Trigger:** Wagering accrues VIP XP (user-vip.service.ts; constant VIP_XP_UPDATED_SOCKET_EVENT).
- **Payload:** `{"xp":1250,"vipTierId":"uuid"}`

#### `vip:tier-up`

Frontend auto-opens the tier-up claim modal.

- **Sent to:** room user:<userId>
- **Trigger:** XP crosses a tier threshold (user-vip.service.ts; constant VIP_TIER_UP_SOCKET_EVENT; payload is result.tierUpPayload).
- **Payload:** `{"newTierId":"uuid","newTierName":"Gold","rewards":{}}`

#### `system-config:updated`

Platform config (incl. maintenance mode) changed.

- **Sent to:** room global
- **Trigger:** Admin saves system configuration (system-config.service.ts).
- **Payload:** `{"key":"platform","version":7,"updatedAt":"2026-08-25T10:00:00.000Z","general":{"maintenance_mode":false,"maintenance_message":""}}`

#### `payment_methods_updated`

Which gateways/rails are enabled per audience and direction.

- **Sent to:** room global
- **Trigger:** Payment Manager gateway/rail toggles saved (system-config.service.ts). Payload is the full availability object.
- **Payload:** `{"player":{"payin":{"breeze":true,"coinflow":true},"payout":{"breeze":true,"coinflow":false}},"agent":{"payin":{},"payout":{}},"rails":{}}`

#### `payout_methods_updated`

Player payout method availability.

- **Sent to:** room global
- **Trigger:** Same config save; legacy-shaped event kept for the Confirm Redeem picker (player payout availability + rails).
- **Payload:** `{"breeze":true,"coinflow":false,"rails":{"breeze":["bank"],"coinflow":[]}}`

#### `breeze:subscription-updated`

Subscription state changed via Breeze.

- **Sent to:** room user:<userId>
- **Trigger:** Breeze subscription lifecycle (breezsubscription.service.ts); also emitted with {reason: 'admin-change', toPlanId, toPlanName} when an admin changes a plan (subscription-change.service.ts).
- **Payload:** `{"id":"uuid","planId":"uuid","userSubscriptionId":"uuid","breezeSubscriptionId":"ext-id","clientReferenceId":"ref","status":"ACTIVE"}`

#### `coinflow:subscription-updated`

Subscription state changed via Coinflow.

- **Sent to:** room user:<userId>
- **Trigger:** Coinflow subscription confirm/webhook (coinflow-subscription.service.ts).
- **Payload:** `{"id":"uuid","planId":"uuid","userSubscriptionId":"uuid","coinflowSubscriptionId":"ext-id","clientReferenceId":"ref","status":"ACTIVE"}`

#### `breeze:settlement-applied`

Deposit settlement credited; wallet events follow.

- **Sent to:** room user:<userId>
- **Trigger:** Breeze payin settles (breezpayin.service.ts).
- **Payload:** `{"pageId":"uuid","breezePageId":"ext-id","clientReferenceId":"ref","purpose":"DEPOSIT","settlementResult":{},"status":"SETTLED"}`

#### `coinflow:settlement-applied`

Deposit settlement credited.

- **Sent to:** room user:<userId>
- **Trigger:** Coinflow payin settles (coinflow-payin.service.ts).
- **Payload:** `{"pageId":"uuid","coinflowSessionId":"ext-id","clientReferenceId":"ref","status":"SETTLED"}`

#### `breeze:payout-updated`

Withdrawal via Breeze progressed.

- **Sent to:** room user:<userId>
- **Trigger:** Breeze payout status change (breezpayout.service.ts); a redeem:requests emit follows.
- **Payload:** `{"redeemRequestId":"uuid","pageId":"uuid","breezePageId":"ext-id","status":"COMPLETED","pendingStatus":null,"releaseMethod":"AUTO"}`

#### `coinflow:payout-updated`

Withdrawal via Coinflow progressed.

- **Sent to:** room user:<userId>
- **Trigger:** Coinflow payout status change (coinflow-payout.service.ts); a redeem:requests emit follows.
- **Payload:** `{"redeemRequestId":"uuid","pageId":"uuid","coinflowSessionId":"ext-id","status":"COMPLETED","pendingStatus":null,"releaseMethod":"HOSTED"}`

#### `vault:user-updated`

Player's vault balance/state changed.

- **Sent to:** room user:<userId>
- **Trigger:** Vault transfer/settings affecting one player, plus a cron refresh variant with action 'cron_refresh' (vault.service.ts).
- **Payload:** `{"userId":"uuid","action":"deposit"}`

#### `vault:admin-updated`

Admin vault-management screens refetch (admin frontend listens; emitted globally).

- **Sent to:** room global
- **Trigger:** Same vault mutations and settings saves.
- **Payload:** `{"userId":"uuid","action":"deposit"}`

#### `vault:settings-updated`

Vault settings changed.

- **Sent to:** room global
- **Trigger:** Admin saves vault settings (vault.service.ts).
- **Payload:** `{"apr":5,"minDeposit":10}`

#### `kyc:updated`

KYC verification status changed.

- **Sent to:** room user:<userId>
- **Trigger:** Sumsub webhook updates the KYC profile (sumsub-webhook.service.ts).
- **Payload:** `{"id":"uuid","userId":"uuid","applicantId":"sumsub-id","levelName":"basic-kyc","status":"APPROVED","isSubmitted":true}`

#### `daily_streak_claimed`

Streak claim confirmation.

- **Sent to:** room user:<userId>
- **Trigger:** Player claims the daily login streak reward (daily-streak.service.ts).
- **Payload:** `{"day":3,"cashAmount":0.5,"coinAmount":500,"freeSpinsGranted":0,"milestoneBonusCash":0,"milestoneBonusCoin":0}`

#### `medal_near_unlock`

A medal is close to unlocking.

- **Sent to:** room user:<userId>
- **Trigger:** Achievement engine detects >= threshold progress (achievement-engine.service.ts).
- **Payload:** `{"id":"uuid","title":"High Roller","percentage":90,"remaining":100.5}`

#### `medal_unlocked`

Medal unlocked + reward.

- **Sent to:** room user:<userId>
- **Trigger:** Achievement engine unlocks a medal (achievement-engine.service.ts).
- **Payload:** `{"id":"uuid","title":"High Roller","iconUrl":"https://…","rewardValue":10,"rewardType":"WULF_COIN"}`

#### `game:plays:update`

Live play counter for lobby tiles.

- **Sent to:** room global
- **Trigger:** A game launch increments totalPlays (games.service.ts).
- **Payload:** `{"gameId":"uuid","providerGameId":"prov-123","provider":"aleaplay","totalPlays":4211}`

#### `free-spin:granted`

Free-spin grant created (admin listings refetch; clients filter by userId).

- **Sent to:** room global
- **Trigger:** Admin grants free spins (aleaplay-bonus.controller.ts, free-spin-config.controller.ts). Snake_case duplicates are kept for older clients.
- **Payload:** `{"id":"uuid","casino_bonus_id":"ext","casinoBonusId":"ext","user_id":"uuid","userId":"uuid","status":"ACTIVE"}`

#### `free-spin:updated`

Free-spin grant state changed; player rail and admin listing refresh.

- **Sent to:** room global AND room user:<userId> (both)
- **Trigger:** A grant's status changes - used up, cancelled, expired (aleaplay-bonus.service.ts).
- **Payload:** `{"id":"uuid","casinoBonusId":"ext","userId":"uuid","status":"USED"}`

#### `personalization:access-updated`

Personalized-content availability changed.

- **Sent to:** room global
- **Trigger:** Admin toggles personalization access (personalization.service.ts).
- **Payload:** `{"updatedAt":"2026-08-25T10:00:00.000Z","enabled":true}`

#### `rakeback_available`

Rakeback/cashback ready to claim.

- **Sent to:** room user:<userId> AND room watch:user:<userId>
- **Trigger:** Cashback period finalizes with a claimable balance (cashback.service.ts, cashback-notify-cron.service.ts).
- **Payload:** `{"cashbackType":"WEEKLY","amount":12.34,"claimBy":"2026-08-31T00:00:00.000Z","periodEndDate":"2026-08-31T00:00:00.000Z","mustClaimManually":true,"timestamp":"2026-08-25T10:00:00.000Z","message":"Your weekly rakeback of 12.34 Sweep Coin is ready to claim","claimWindowNote":"…"}`

#### `rakeback_expired`

Cashback forfeited.

- **Sent to:** room user:<userId> AND room watch:user:<userId>
- **Trigger:** Unclaimed cashback passes its claim deadline (cashback services; field is amount or expiredAmount depending on path).
- **Payload:** `{"cashbackType":"WEEKLY","amount":12.34,"expiredAmount":12.34,"message":"Your weekly rakeback of 12.34 Sweep Coin has expired.","timestamp":"2026-08-25T10:00:00.000Z"}`

#### `rakeback_carried_forward`

Cashback below the claim minimum was carried forward.

- **Sent to:** room user:<userId> AND room watch:user:<userId>
- **Trigger:** Sub-minimum cashback balance rolls into the next period (cashback-notify-cron.service.ts).
- **Payload:** `{"cashbackType":"WEEKLY","carriedAmount":3.21,"minClaimAmount":5,"nextPeriodEnd":"2026-09-07T00:00:00.000Z","message":"…"}`

#### `cashback:progress`

Admin-facing nudge to refetch the player's cashback snapshot.

- **Sent to:** room watch:user:<userId> only (admins watching the player detail page)
- **Trigger:** Every cashback accrual call (per wager/loss batch) in cashback.service.ts.
- **Payload:** `{"userId":"uuid","context":"wager","timestamp":"2026-08-25T10:00:00.000Z"}`

#### `cashback:credited`

Admin-facing cashback credit notice.

- **Sent to:** room watch:user:<userId>
- **Trigger:** Instant rebate / cashback credit applied (cashback.service.ts emitCashbackUpdateToWatchers).
- **Payload:** `{"userId":"uuid","timestamp":"2026-08-25T10:00:00.000Z"}`

#### `cashback:claimed`

Admin-facing cashback claim notice.

- **Sent to:** room watch:user:<userId>
- **Trigger:** Player claims cashback (cashback.service.ts).
- **Payload:** `{"userId":"uuid","timestamp":"2026-08-25T10:00:00.000Z"}`

#### `affiliate.earning.created`

New affiliate commission earned.

- **Sent to:** rooms user:<referrerId> AND admin:<referrerId> (referrer may be a player or an agent)
- **Trigger:** A referred player's wager generates commission (affiliate.admin.service.ts).
- **Payload:** `{"commissionAmount":1.23,"platformFeeTotal":0.1,"wagerAmount":100}`

#### `affiliate.stats.updated`

Affiliate dashboard totals changed.

- **Sent to:** rooms user:<referrerId> AND admin:<referrerId>
- **Trigger:** Affiliate settlement cron recomputes referrer totals (payout.cron.ts).
- **Payload:** `{"referrerId":"uuid","total":45.6}`

---

## Global Notification Gateway

Source: `modules/global-notification/global-notification.gateway.ts` — namespace `/`

### Connecting

- **URL:** same server/socket as the Main Socket Gateway (default namespace)
- **Path:** `/socket.io`
- **Auth:** None of its own - it piggybacks on the Main Socket Gateway handshake and its user:<userId> rooms. NOTE: its decorator declares transports: ['websocket'] only, but which gateway's options win for the shared default-namespace server depends on instantiation order; in practice the main gateway's websocket+polling config applies.
- **Notes:** The gateway class itself only hosts two ping-style handlers; all notification emits are performed by GlobalNotificationService through SocketService (documented here). GlobalNotificationService also runs a Redis subscriber (FREE_SPIN_NOTIFICATION_CHANNEL, JACKPOT_WIN, JACKPOT_TIER_WIN, TOURNAMENT_WIN) that persists notification rows and re-emits notification:new / tournament_win_alert.

### Rooms

| Room pattern | Purpose |
|---|---|
| `user:<userId>` | Inherited from the main gateway; all per-user notification events target it. |
| `global` | Target of broadcast events (notification:refresh, notification:broadcast). |

### Client → Server events

#### `notification:request-count`

Placeholder for client-initiated unread-count requests; currently just logs.

- **Payload:** `{}`
- **Ack:** { event: 'notification:count-requested', data: {} }

#### `notification:ping`

Connection test.

- **Payload:** `{}`
- **Ack:** { event: 'notification:pong', data: { message: 'pong' } }

### Server → Client events

#### `notification:new`

New bell notification + live unread count.

- **Sent to:** room user:<userId>
- **Trigger:** Any notification row created (GlobalNotificationService.create / createFreeSpinNotification / tournament win subscriber / sendToUsers targeted sends - the sendToUsers variant omits unreadCount).
- **Payload:** `{"notification":{"id":"uuid","userId":"uuid","sourceType":"BONUS","title":"Free spins!","message":"…","data":{"kind":"free_spin_granted","casinoBonusId":"ext"},"isRead":false,"createdAt":"2026-08-25T10:00:00.000Z"},"unreadCount":4}`

#### `notification:read`

Sync read-state across the player's tabs/devices.

- **Sent to:** room user:<userId>
- **Trigger:** Player marks specific notifications read.
- **Payload:** `{"notificationIds":["uuid"]}`

#### `notification:all-read`

All notifications now read.

- **Sent to:** room user:<userId>
- **Trigger:** Player marks all notifications read.
- **Payload:** `{}`

#### `notification:deleted`

Remove one notification from the bell.

- **Sent to:** room user:<userId>
- **Trigger:** Player deletes a notification.
- **Payload:** `{"id":"uuid"}`

#### `notification:refresh`

Refetch notifications.

- **Sent to:** room global
- **Trigger:** Admin broadcast to all users (messaging.service.ts, admin-user-notification.controller.ts) via broadcastToAllUsers - rows are bulk-inserted, then this single global emit tells connected clients to refetch the bell.
- **Payload:** `{"title":"…","message":"…","data":{}}`

#### `notification:broadcast`

Promotional template popup/toast for all connected players.

- **Sent to:** room global
- **Trigger:** Message-template broadcast (message-template.service.ts) - broadcastToAllUsers with event 'notification:broadcast' and the template object as eventPayload.
- **Payload:** `{"templateId":"uuid","title":"…","contents":"…","messageType":"PROMO","imageUrl":null}`

---

## Agent Notification Gateway

Source: `modules/agent-notification/agent-notification.gateway.ts` — namespace `/`

### Connecting

- **URL:** same server/socket as the Main Socket Gateway (default namespace; decorator deliberately passes NO options so the main gateway's config - websocket+polling, cors - applies)
- **Path:** `/socket.io`
- **Auth:** Admin/agent/sub-agent JWT via the Main Socket Gateway handshake (role 'admin'|'agent' claims); those sockets are auto-joined to admin:<employeeId> and admins.
- **Notes:** All emits are performed by AgentNotificationService via SocketService.emitToAdmin.

### Rooms

| Room pattern | Purpose |
|---|---|
| `admin:<employeeId>` | Inherited from the main gateway; all agent-notification events target the recipient employee's room. |

### Client → Server events

#### `agent-notification:ping`

Connection test.

- **Payload:** `{}`
- **Ack:** { event: 'agent-notification:pong', data: { message: 'pong' } }

### Server → Client events

#### `agent-notification:new`

New notification for an agent/sub-agent.

- **Sent to:** room admin:<recipientId>
- **Trigger:** AgentNotificationService.create, or the admin broadcast endpoint (POST agent-notifications/broadcast) which emits per recipient with their own unreadCount.
- **Payload:** `{"notification":{"id":"uuid","recipientId":"uuid","recipientType":"AGENT","type":"PAYOUT_REQUEST","title":"…","message":"…","isRead":false,"createdAt":"2026-08-25T10:00:00.000Z"},"unreadCount":2}`

#### `agent-notification:read`

Read-state sync.

- **Sent to:** room admin:<recipientId>
- **Trigger:** Recipient marks notifications read.
- **Payload:** `{"notificationIds":["uuid"]}`

#### `agent-notification:all-read`

All read.

- **Sent to:** room admin:<recipientId>
- **Trigger:** Recipient marks all read.
- **Payload:** `{}`

#### `agent-notification:deleted`

Remove one notification.

- **Sent to:** room admin:<recipientId>
- **Trigger:** Recipient deletes a notification.
- **Payload:** `{"id":"uuid"}`

---

## Community Chat Gateway

Source: `modules/community-chat/chat.gatway.ts` — namespace `/chat`

### Connecting

- **URL:** ws://localhost:8000/chat (frontend: io(`${NEXT_PUBLIC_SOCKET_URL}/chat`, { path: '/socket.io', transports: ['polling','websocket'], auth: { token, deviceId, platform } }))
- **Path:** `/socket.io`
- **Transports:** websocket (declared in the decorator; the shared server also accepts polling because the main gateway registered first)
- **CORS:** origin: true, credentials: true
- **Auth:** REQUIRED JWT in handshake.auth.token or Authorization header ('Bearer ' stripped) - same access token as REST. The socket is disconnected immediately if the token is missing/invalid or the id resolves to neither a User (with vipTier relation) nor an Employee. Chat permissions (canRead/canSend/canViewOnlineUsers) derive from the VIP tier's communityChat reward level: Basic = read-only, sending starts at level 'Standard', online-users list at 'Featured'; employees get full access. Send rate limit: 5 messages / 10s per user (CHAT_SEND_MAX_IN_WINDOW / CHAT_SEND_WINDOW_MS). Text edits allowed for 15 minutes after sending (CHAT_EDIT_WINDOW_MS).
- **Notes:** On connect the server pushes chat:permissions and chat:active-users to the new socket and, on a user's first connection, chat:user-online + refreshed chat:active-users to eligible sockets. Presence and active-users tracking is per-instance (in-memory Map), not cluster-aware.

### Rooms

| Room pattern | Purpose |
|---|---|
| `chat-room` | The single shared community chat room; every authenticated chat socket joins it. |
| `user:<userId>` | Per-user room within the /chat namespace (joined on connect; currently no direct emits target it). |

### Client → Server events

#### `chat:send-message`

Post a text message. Validates auth, canSend, non-empty content, clientTempId, rate limit and replyToId. On success broadcasts chat:new-message to chat-room (echo carries your clientTempId), then chat:message-translated once translations finish.

- **Payload:** `{"content":"hello","replyToId":"uuid (optional)","clientTempId":"tmp-123","type":"text|system (optional; system allowed for employees only)"}`
- **Ack:** none - errors arrive as chat:error to the sender

#### `chat:send-image`

Post an image message (image already uploaded via REST). Broadcasts chat:new-message.

- **Payload:** `{"imageUrl":"https://…","imageKey":"s3-key","content":"caption (optional)","replyToId":"uuid (optional)","clientTempId":"tmp-124"}`
- **Ack:** none - errors via chat:error

#### `chat:typing-start`

Broadcasts chat:user-typing {typing:true} to everyone else in chat-room; auto-clears after 3s.

- **Payload:** `{}`
- **Ack:** none

#### `chat:typing-stop`

Clears the typing state (room receives chat:user-typing {typing:false}).

- **Payload:** `{}`
- **Ack:** none

#### `chat:get-messages`

Cursor-paginated history (max 100). Response arrives as a chat:messages emit to the caller.

- **Payload:** `{"limit":50,"cursor":"uuid of oldest loaded message (optional)"}`
- **Ack:** none (response via chat:messages)

#### `chat:delete-message`

Soft-deletes your own message; room receives chat:message-deleted.

- **Payload:** `{"messageId":"uuid"}`
- **Ack:** none - errors via chat:error

#### `chat:edit-message`

Edits your own TEXT message within the 15-minute window; room receives chat:message-edited then chat:message-translated.

- **Payload:** `{"messageId":"uuid","content":"new text"}`
- **Ack:** none - errors via chat:error

#### `chat:request-active-users`

Re-sends chat:permissions and chat:active-users to the caller.

- **Payload:** `{}`
- **Ack:** none (responses via those two emits)

#### `chat:ping`

Connection test.

- **Payload:** `{}`
- **Ack:** none - server emits chat:pong { timestamp } to the caller

### Server → Client events

#### `chat:new-message`

New chat message (sender matches it to the optimistic bubble via clientTempId).

- **Sent to:** room chat-room
- **Trigger:** chat:send-message / chat:send-image succeeded.
- **Payload:** `{"id":"uuid","userId":"uuid","userName":"player1","userAvatar":"https://…","userType":"user","type":"text","content":"hello","imageUrl":"https://… (image messages)","status":"active","metadata":{"userType":"user","sentAt":"2026-08-25T10:00:00.000Z"},"replyToId":null,"expiresAt":"2026-09-24T10:00:00.000Z","createdAt":"2026-08-25T10:00:00.000Z","updatedAt":"2026-08-25T10:00:00.000Z","clientTempId":"tmp-123"}`

#### `chat:message-translated`

Late-arriving translations for a message.

- **Sent to:** room chat-room
- **Trigger:** Async translation completes after a send or edit.
- **Payload:** `{"messageId":"uuid","translations":{"es":"hola","pt":"olá"}}`

#### `chat:message-edited`

Message content replaced.

- **Sent to:** room chat-room
- **Trigger:** chat:edit-message succeeded.
- **Payload:** `{"id":"uuid","userId":"uuid","userName":"player1","type":"text","content":"edited text","status":"active","metadata":{"edited":true,"editedAt":"2026-08-25T10:05:00.000Z"},"replyToId":null,"createdAt":"…","updatedAt":"…"}`

#### `chat:message-deleted`

Remove the message from all clients.

- **Sent to:** room chat-room
- **Trigger:** chat:delete-message succeeded.
- **Payload:** `{"messageId":"uuid"}`

#### `chat:user-typing`

Typing indicator.

- **Sent to:** room chat-room
- **Trigger:** chat:typing-start (typing:true, excludes the typist) or any clear - timeout/stop/message sent (typing:false, whole room, no userName).
- **Payload:** `{"userId":"uuid","userName":"player1","typing":true,"timestamp":"2026-08-25T10:00:00.000Z"}`

#### `chat:messages`

Paginated history page (newest first).

- **Sent to:** requesting socket only
- **Trigger:** Response to chat:get-messages.
- **Payload:** `{"messages":[{"id":"uuid","userId":"uuid","userName":"player1","userAvatar":null,"userType":"user","type":"text","content":"…","imageUrl":null,"status":"active","metadata":{},"replyToId":null,"expiresAt":"…","createdAt":"…","updatedAt":"…"}],"hasMore":true,"nextCursor":"uuid"}`

#### `chat:error`

Error feedback for the last action.

- **Sent to:** offending socket only
- **Trigger:** Any failed chat action (unauthorized, read-only tier, rate limit, validation, edit window expired, not your message, …).
- **Payload:** `{"message":"You are sending messages too quickly. Please slow down."}`

#### `chat:pong`

Ping reply.

- **Sent to:** requesting socket only
- **Trigger:** chat:ping.
- **Payload:** `{"timestamp":"2026-08-25T10:00:00.000Z"}`

#### `chat:permissions`

What this user may do in chat.

- **Sent to:** requesting socket only
- **Trigger:** On connect and on chat:request-active-users (permissions are re-read from the DB).
- **Payload:** `{"canRead":true,"canSend":false,"canViewOnlineUsers":false,"tierName":"Bronze","communityChatLevel":"Basic","upgradeMessage":"Your chat access is read-only. Upgrade your VIP tier to send messages."}`

#### `chat:active-users`

Who is currently in chat.

- **Sent to:** individual sockets (permission-filtered)
- **Trigger:** On connect, on chat:request-active-users, and re-broadcast to every socket when someone comes online/offline. Sockets without canViewOnlineUsers receive {count: 0, users: []}.
- **Payload:** `{"count":12,"users":[{"userId":"uuid","userName":"player1","userAvatar":"https://…","userType":"user"}],"timestamp":"2026-08-25T10:00:00.000Z"}`

#### `chat:user-online`

Someone joined chat.

- **Sent to:** sockets with canViewOnlineUsers, excluding the connecting socket
- **Trigger:** A user's FIRST socket connects (reconnects/extra tabs don't fire it).
- **Payload:** `{"userId":"uuid","userName":"player1","userAvatar":"https://…","userType":"user","timestamp":"2026-08-25T10:00:00.000Z"}`

#### `chat:user-offline`

Someone left chat.

- **Sent to:** sockets with canViewOnlineUsers
- **Trigger:** A user's LAST socket disconnects.
- **Payload:** `{"userId":"uuid","userName":"player1","timestamp":"2026-08-25T10:00:00.000Z"}`

---

## Frontend cross-reference

User frontend connects via src/lib/socket.ts: global socket = io(NEXT_PUBLIC_SOCKET_URL || http://localhost:8000, { path: '/socket.io', transports: ['polling','websocket'], withCredentials: true, auth: { token, deviceId, platform: 'web' } }); chat socket = same but namespace /chat. Backend events with NO user-frontend listener found: announcement:new, waitlist:leaderboard_update, daily_streak_claimed, medal_unlocked, medal_near_unlock, jackpot:tier-win (only jackpot:win / jackpot:reward / jackpot:tier-update are consumed), race:joined, breeze:payout-updated, coinflow:payout-updated (the UI relies on the redeem:requests list emit instead), tournament:status-changed (admin-only listener), chat:messages and chat:pong (the chat UI reads history via the ack-less emit but the hook registers chat:messages inside lib/socket helper flows - chat:messages IS consumed there), notification:request-count/notification:ping/agent-notification:ping (test-only endpoints, unused). cashback:progress / cashback:credited / cashback:claimed target the admin watch:user room; the admin player-detail cashback section emits admin:watch-user but registers its data handlers dynamically (only 'connect' appears in a static grep). 'chat:ping' is not used by the frontend (it uses socket.io's built-in heartbeats). The frontend event names otherwise match the backend exactly.

<details><summary><b>Events the player frontend listens to</b> (61)</summary>

`permissions:updated` · `account:updated` · `account:deleted` · `session:revoked` · `notification:new` · `notification:deleted` · `notification:read` · `notification:all-read` · `notification:broadcast` · `notification:refresh` · `free-spin:updated` · `update_Real_Time_Balance` · `update_rollover` · `vip:xp-updated` · `vip:tier-up` · `game:plays:update` · `personalization:access-updated` · `raffle:ticket-updated` · `raffle:draw-completed` · `raffle:campaign-updated` · `raffle:draw-won` · `tournament_win_alert` · `race:reward` · `jackpot:update` · `jackpot:tier-update` · `jackpot:win` · `jackpot:reward` · `vault:user-updated` · `vault:settings-updated` · `kyc:updated` · `system-config:updated` · `payment_methods_updated` · `payout_methods_updated` · `update_redeem_balance` · `update_pending_spin_win` · `redeem:requests` · `bundle:purchased` · `breeze:settlement-applied` · `coinflow:settlement-applied` · `breeze:subscription-updated` · `coinflow:subscription-updated` · `waitlist:new_join` · `affiliate.earning.created` · `affiliate.stats.updated` · `rakeback_available` · `rakeback_expired` · `rakeback_carried_forward` · `race:participants-updated` · `race:status-changed` · `race:completed` · `race:leaderboard-updated` · `chat:new-message` · `chat:message-edited` · `chat:message-deleted` · `chat:message-translated` · `chat:user-typing` · `chat:user-online` · `chat:user-offline` · `chat:active-users` · `chat:permissions` · `chat:error`

</details>

<details><summary><b>Events the player frontend emits</b> (10)</summary>

`chat:send-message` · `chat:send-image` · `chat:typing-start` · `chat:typing-stop` · `chat:get-messages` · `chat:delete-message` · `chat:edit-message` · `chat:request-active-users` · `admin:watch-user (admin frontend)` · `admin:unwatch-user (admin frontend)`

</details>

<details><summary><b>Events the admin frontend listens to</b> (25)</summary>

`presence:employee` · `presence:user` · `payment_methods_updated` · `agent-notification:new` · `agent-notification:read` · `agent-notification:all-read` · `agent-notification:deleted` · `permissions:updated` · `account:updated` · `account:deleted` · `raffle:ticket-updated` · `raffle:draw-completed` · `tournament:status-changed` · `race:changed` · `race:completed` · `race:status-changed` · `race:participants-updated` · `free-spin:granted` · `free-spin:updated` · `vault:admin-updated` · `affiliate.earning.created` · `affiliate.stats.updated` · `agent-payment:updated` · `sub-agent-ticket:changed` · `agent-activity:changed`

</details>
