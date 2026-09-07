/**
 * Playwright API Fixtures
 * Custom fixtures for API testing with automatic setup and teardown
 */

import { test as base } from '@playwright/test';
import { AdminApiClient } from '../utils/admin-api-client';
import { PlayerApiClient } from '../utils/player-api-client';
import { AgentApiClient } from '../utils/agent-api-client';
import { logger } from '../utils/logger';

type ApiFixtures = {
  adminApi: AdminApiClient;
  playerApi: PlayerApiClient;
  agentApi: AgentApiClient;
  authenticatedAdminApi: AdminApiClient;
  authenticatedPlayerApi: PlayerApiClient;
  authenticatedAgentApi: AgentApiClient;
};

/**
 * Extended Playwright test with API fixtures
 */
export const test = base.extend<ApiFixtures>({
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
   * Authenticated Admin API Client
   */
  authenticatedAdminApi: async ({}, use) => {
    logger.info('Setting up authenticated Admin API client');
    const client = new AdminApiClient();
    await client.init();

    try {
      await client.loginAsAdmin();
      logger.info('Admin authentication successful');
    } catch (error) {
      logger.error('Admin authentication failed', error);
      throw error;
    }

    await use(client);

    logger.info('Tearing down authenticated Admin API client');
    await client.dispose();
  },

  /**
   * Authenticated Player API Client
   */
  authenticatedPlayerApi: async ({}, use) => {
    logger.info('Setting up authenticated Player API client');
    const client = new PlayerApiClient();
    await client.init();

    try {
      await client.loginAsPlayer();
      logger.info('Player authentication successful');
    } catch (error) {
      logger.error('Player authentication failed', error);
      throw error;
    }

    await use(client);

    logger.info('Tearing down authenticated Player API client');
    await client.dispose();
  },

  /**
   * Authenticated Agent API Client
   */
  authenticatedAgentApi: async ({}, use) => {
    logger.info('Setting up authenticated Agent API client');
    const client = new AgentApiClient();
    await client.init();

    try {
      await client.loginAsAgent();
      logger.info('Agent authentication successful');
    } catch (error) {
      logger.error('Agent authentication failed', error);
      throw error;
    }

    await use(client);

    logger.info('Tearing down authenticated Agent API client');
    await client.dispose();
  },
});

export { expect } from '@playwright/test';
