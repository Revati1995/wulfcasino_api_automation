#!/usr/bin/env node
/**
 * One-off staging clean-up for side effects left by the legacy (pre-mapping)
 * admin specs that ran on 2026-09-07:
 *
 *   1. Game provider JILI (2c2c0d56-…) was disabled by the old
 *      "should disable game provider" test and never re-enabled.
 *   2. The old user-management tests created users through POST /admin/users
 *      with a payload the backend did not understand, leaving records with
 *      entity = null and username = null.
 *
 * Dry run by default: prints what it would do. Pass --apply to execute.
 * Uses the cached admin token from .auth/tokens.json (run any admin test
 * first if the file is missing or stale).
 *
 *   node scripts/staging-cleanup.js            # dry run
 *   node scripts/staging-cleanup.js --apply    # perform the changes
 */

const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const BASE = (process.env.ADMIN_API_URL || 'https://api-staging.wulfcasino.com') + '/api/v1/admin';
const JILI_PROVIDER_ID = '2c2c0d56-4b23-4ad4-a12c-7f042133f3a1';
const JUNK_USERS_FROM = '2026-09-07T09:30:00.000Z'; // 15:00 IST
const JUNK_USERS_TO = '2026-09-07T09:45:00.000Z'; // 15:15 IST

function adminToken() {
  const file = path.resolve(__dirname, '..', '.auth', 'tokens.json');
  const tokens = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!tokens.admin?.accessToken) throw new Error(`No admin token in ${file}`);
  return tokens.admin.accessToken;
}

async function call(method, route, body) {
  const res = await fetch(BASE + route, {
    method,
    headers: {
      Authorization: `Bearer ${adminToken()}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, json };
}

async function fixProvider() {
  const { json: providers } = await call('GET', '/games/providers');
  const jili = (providers || []).find((p) => p.id === JILI_PROVIDER_ID);
  if (!jili) {
    console.log('[provider] JILI not found, nothing to do');
    return;
  }
  console.log(`[provider] JILI enabled=${jili.enabled}`);
  if (jili.enabled) return;

  if (!APPLY) {
    console.log('[provider] would PATCH /games/providers/' + JILI_PROVIDER_ID + ' { enabled: true }');
    return;
  }
  const res = await call('PATCH', `/games/providers/${JILI_PROVIDER_ID}`, { enabled: true });
  console.log(`[provider] PATCH -> ${res.status}`, JSON.stringify(res.json).slice(0, 200));
}

async function fixJunkUsers() {
  const { json } = await call('GET', '/users/all?sortField=createdAt&sortOrder=desc&limit=100&page=1');
  const rows = json?.data || [];
  const junk = rows.filter(
    (u) =>
      u.entity == null &&
      u.username == null &&
      u.createdAt >= JUNK_USERS_FROM &&
      u.createdAt <= JUNK_USERS_TO
  );
  console.log(`[users] ${junk.length} junk user(s) (entity=null, username=null, created ${JUNK_USERS_FROM}..${JUNK_USERS_TO})`);
  for (const u of junk) {
    if (!APPLY) {
      console.log(`[users] would DELETE /users/${u.id}  (createdAt ${u.createdAt})`);
      continue;
    }
    const res = await call('DELETE', `/users/${u.id}`);
    console.log(`[users] DELETE ${u.id} -> ${res.status}`);
  }
}

(async () => {
  console.log(APPLY ? '=== APPLY mode ===' : '=== DRY RUN (pass --apply to execute) ===');
  await fixProvider();
  await fixJunkUsers();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
