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

import * as fs from 'fs';
import * as path from 'path';
import type { FullConfig } from '@playwright/test';
import { env } from './config/environment';
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

/**
 * Fail immediately when the machine is not configured, instead of letting the
 * whole suite run against http://localhost:3000. Without a .env every request
 * is refused, which makes ~160 tests fail AND makes the tests that assert an
 * error status pass for the wrong reason.
 */
function assertConfigured(): void {
  const envFile = path.resolve(__dirname, '.env');
  if (!fs.existsSync(envFile)) {
    throw new Error(
      [
        'No .env file found.',
        '',
        `Create ${envFile} by copying .env.example, then fill in the API URLs and`,
        'credentials. .env is git-ignored on purpose (it holds passwords), so a fresh',
        'clone never has one - ask the team for the values.',
      ].join('\n')
    );
  }

  const config = env.get();
  const urls = [config.adminApiUrl, config.playerApiUrl, config.agentApiUrl];
  const missing = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'PLAYER_EMAIL', 'PLAYER_PASSWORD', 'AGENT_EMAIL', 'AGENT_PASSWORD'].filter(
    (key) => !process.env[key]
  );

  if (missing.length) {
    throw new Error(`.env is missing required entries: ${missing.join(', ')}`);
  }

  if (urls.some((url) => url.includes('localhost'))) {
    logger.warn(
      '[global-setup] API URLs point at localhost. If you meant to test the hosted environment, set ADMIN_API_URL / PLAYER_API_URL / AGENT_API_URL in .env.'
    );
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  assertConfigured();

  const wanted = selectedRoles(config);
  logger.info(`[global-setup] preparing auth tokens for: ${[...wanted].join(', ')}`);

  const authenticated: TokenRole[] = [];
  const failed: string[] = [];

  for (const setup of roles) {
    if (!wanted.has(setup.role)) continue;

    const client = setup.create();
    await client.init();

    try {
      const cached = tokenStore.get(setup.role);
      if (cached && (await client.isTokenValid(cached.accessToken))) {
        logger.info(`[global-setup] ${setup.role}: reusing cached token from ${cached.createdAt}`);
        authenticated.push(setup.role);
        continue;
      }

      logger.info(`[global-setup] ${setup.role}: logging in`);
      await setup.login(client);
      logger.info(`[global-setup] ${setup.role}: token cached at ${tokenStore.filePath()}`);
      authenticated.push(setup.role);
    } catch (error) {
      // Do not abort for one role: its authenticated fixtures will surface a
      // clear error, while other roles' tests can still execute.
      logger.error(`[global-setup] ${setup.role}: authentication failed`, error);
      failed.push(`${setup.role}: ${(error as Error).message}`);
      tokenStore.clear(setup.role);
    } finally {
      await client.dispose();
    }
  }

  // Every role failing means the environment is wrong (unreachable API, bad
  // credentials, no network). Stop now rather than reporting hundreds of
  // misleading test failures.
  if (authenticated.length === 0) {
    throw new Error(
      [
        'Could not authenticate as any role - the suite would fail wholesale.',
        `API base URL: ${env.getAdminApiUrl()}`,
        '',
        ...failed,
        '',
        'Check the URLs and credentials in .env, and that the API is reachable from this machine.',
      ].join('\n')
    );
  }
}
