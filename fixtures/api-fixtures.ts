/**
 * Playwright API Fixtures
 * Custom fixtures for API testing with automatic setup and teardown
 *
 * The `authenticated*Api` fixtures reuse the token cached by global-setup.ts
 * (see utils/token-store.ts) instead of logging in per test: login endpoints
 * are throttled at 5 requests/min per IP. Tests that need a session of their
 * own (e.g. logout) should use the unauthenticated fixture and call
 * `loginAsX({ fresh: true })` themselves.
 */



import { test as base } from '@playwright/test';
import { AdminApiClient } from '../utils/admin-api-client';
import { PlayerApiClient } from '../utils/player-api-client';
import { AgentApiClient } from '../utils/agent-api-client';
import { TestHelpers } from './test-helpers';
import { logger } from '../utils/logger';

type ApiFixtures = {
  adminApi: AdminApiClient;
  playerApi: PlayerApiClient;
  agentApi: AgentApiClient;
  authenticatedAdminApi: AdminApiClient;
  authenticatedPlayerApi: PlayerApiClient;
  authenticatedAgentApi: AgentApiClient;
  reportExpectations: void;
};

/**
 * Extended Playwright test with API fixtures
 */
export const test = base.extend<ApiFixtures>({
  /**
   * Attaches every assertion's "expected vs actual" to the HTML report, so a
   * passing test shows what was checked and what the API actually returned,
   * not just a green tick. Runs automatically for every test.
   */
  reportExpectations: [
    async ({}, use, testInfo) => {
      TestHelpers.drainChecks(); // drop anything left over from an earlier test
      await use();

      const checks = TestHelpers.drainChecks();
      if (checks.length === 0) return;

      try {
        await testInfo.attach('Expected vs actual', {
          body: checks.map((line, i) => `${i + 1}. ${line}`).join('\n'),
          contentType: 'text/plain',
        });
      } catch {
        // reporting must never fail a test
      }
    },
    { auto: true },
  ],

  /**
   * Admin API Client (not authenticated)
   */
  adminApi: async ({}, use) => {
    logger.info('Setting up Admin API client');
    const client = new AdminApiClient();
    await client.init();

    await use(client);

    logger.info('Tearing down Admin API client');
    await client.dispose();
  },

  /**
   * Player API Client (not authenticated)
   */
  playerApi: async ({}, use) => {
    logger.info('Setting up Player API client');
    const client = new PlayerApiClient();
    await client.init();

    await use(client);

    logger.info('Tearing down Player API client');
    await client.dispose();
  },

  /**
   * Agent API Client (not authenticated)
   */
  agentApi: async ({}, use) => {
    logger.info('Setting up Agent API client');
    const client = new AgentApiClient();
    await client.init();

    await use(client);

    logger.info('Tearing down Agent API client');
    await client.dispose();
  },

  /**
   * Authenticated Admin API Client (shared cached token)
   */
  authenticatedAdminApi: async ({}, use) => {
    logger.info('Setting up authenticated Admin API client');
    const client = new AdminApiClient();
    await client.init();

    try {
      await client.loginAsAdmin();
      logger.info('Admin authentication ready');
    } catch (error) {
      logger.error('Admin authentication failed', error);
      await client.dispose();
      throw error;
    }

    await use(client);

    logger.info('Tearing down authenticated Admin API client');
    await client.dispose();
  },

  /**
   * Authenticated Player API Client (shared cached token)
   */
  authenticatedPlayerApi: async ({}, use) => {
    logger.info('Setting up authenticated Player API client');
    const client = new PlayerApiClient();
    await client.init();

    try {
      await client.loginAsPlayer();
      logger.info('Player authentication ready');
    } catch (error) {
      logger.error('Player authentication failed', error);
      await client.dispose();
      throw error;
    }

    await use(client);

    logger.info('Tearing down authenticated Player API client');
    await client.dispose();
  },

  /**
   * Authenticated Agent API Client (shared cached token)
   */
  authenticatedAgentApi: async ({}, use) => {
    logger.info('Setting up authenticated Agent API client');
    const client = new AgentApiClient();
    await client.init();

    try {
      await client.loginAsAgent();
      logger.info('Agent authentication ready');
    } catch (error) {
      logger.error('Agent authentication failed', error);
      await client.dispose();
      throw error;
    }

    await use(client);

    logger.info('Tearing down authenticated Agent API client');
    await client.dispose();
  },
});

export { expect } from '@playwright/test';
