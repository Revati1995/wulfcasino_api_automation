/**
 * Playwright Global Setup
 *
 * Logs in ONCE per role (admin / player / agent) and caches the tokens in
 * .auth/tokens.json. Authenticated fixtures reuse those tokens instead of
 * logging in per test.
 *
 * Why: the backend throttles /auth/login and /admin/auth/login at 5 req/min
 * per IP (ProxyAwareThrottlerGuard). Logging in from every test fixture
 * produced 140+ login calls per run, 80% of which were 429 ThrottlerException.
 *
 * Tokens from a previous run are validated against the "me" endpoint and
 * reused when still valid, so repeated local runs cost zero logins.
 */

import type { FullConfig } from '@playwright/test';
import { AdminApiClient } from './utils/admin-api-client';
import { PlayerApiClient } from './utils/player-api-client';
import { AgentApiClient } from './utils/agent-api-client';
import { tokenStore, TokenRole } from './utils/token-store';
import { logger } from './utils/logger';

type RoleClient = AdminApiClient | PlayerApiClient | AgentApiClient;

interface RoleSetup {
  role: TokenRole;
  create: () => RoleClient;
  login: (client: RoleClient) => Promise<void>;
}

const roles: RoleSetup[] = [
  {
    role: 'admin',
    create: () => new AdminApiClient(),
    login: (c) => (c as AdminApiClient).loginAsAdmin({ fresh: true }),
  },
  {
    role: 'agent',
    create: () => new AgentApiClient(),
    login: (c) => (c as AgentApiClient).loginAsAgent({ fresh: true }),
  },
  {
    role: 'player',
    create: () => new PlayerApiClient(),
    login: (c) => (c as PlayerApiClient).loginAsPlayer({ fresh: true }),
  },
];

/**
 * Only set up the roles whose specs are selected for this run
 * (e.g. `--project=player-api` should not burn admin login quota).
 */
function selectedRoles(config: FullConfig): Set<TokenRole> {
  const names = config.projects.map((p) => p.name);
  const all = new Set<TokenRole>(['admin', 'agent', 'player']);
  const scoped = new Set<TokenRole>();
  if (names.includes('admin-api')) scoped.add('admin');
  if (names.includes('agent-api')) scoped.add('agent');
  if (names.includes('player-api')) scoped.add('player');
  return scoped.size ? scoped : all;
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const wanted = selectedRoles(config);
  logger.info(`[global-setup] preparing auth tokens for: ${[...wanted].join(', ')}`);

  for (const setup of roles) {
    if (!wanted.has(setup.role)) continue;

    const client = setup.create();
    await client.init();

    try {
      const cached = tokenStore.get(setup.role);
      if (cached && (await client.isTokenValid(cached.accessToken))) {
        logger.info(`[global-setup] ${setup.role}: reusing cached token from ${cached.createdAt}`);
        continue;
      }

      logger.info(`[global-setup] ${setup.role}: logging in`);
      await setup.login(client);
      logger.info(`[global-setup] ${setup.role}: token cached at ${tokenStore.filePath()}`);
    } catch (error) {
      // Do not abort the whole run: the role's authenticated fixtures will
      // surface a clear error, while other roles' tests can still execute.
      logger.error(`[global-setup] ${setup.role}: authentication failed`, error);
      tokenStore.clear(setup.role);
    } finally {
      await client.dispose();
    }
  }
}
