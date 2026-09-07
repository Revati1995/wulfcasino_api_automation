/**
 * Agent API - Player Management Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers, DataGenerator } from '../../fixtures';

test.describe('Agent API - Player Management', () => {
  test.describe('Player Operations', () => {
    test('should get all players @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPlayers({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get all players should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should create a new player @regression', async ({ authenticatedAgentApi }) => {
      const playerData = DataGenerator.generatePlayer({
        email: TestHelpers.generateUniqueEmail('agent_player'),
        username: TestHelpers.generateUniqueUsername('agent_player'),
      });

      const response = await authenticatedAgentApi.createPlayer(playerData);

      TestHelpers.assertSuccess(response, 'Player creation should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data?.email).toBe(playerData.email);
    });

    test('should get player by ID', async ({ authenticatedAgentApi }) => {
      // Create a player first
      const playerData = DataGenerator.generatePlayer({
        email: TestHelpers.generateUniqueEmail('agent_player'),
        username: TestHelpers.generateUniqueUsername('agent_player'),
      });
      const createResponse = await authenticatedAgentApi.createPlayer(playerData);
      TestHelpers.assertSuccess(createResponse);
      const playerId = createResponse.data?.id;

      // Get the player
      const response = await authenticatedAgentApi.getPlayerById(playerId);

      TestHelpers.assertSuccess(response, 'Get player by ID should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(playerId);
    });

    test('should update player information', async ({ authenticatedAgentApi }) => {
      // Create a player first
      const playerData = DataGenerator.generatePlayer({
        email: TestHelpers.generateUniqueEmail('agent_player'),
        username: TestHelpers.generateUniqueUsername('agent_player'),
      });
      const createResponse = await authenticatedAgentApi.createPlayer(playerData);
      TestHelpers.assertSuccess(createResponse);
      const playerId = createResponse.data?.id;

      // Update the player
      const updateData = {
        firstName: 'Updated',
        lastName: 'Player',
      };
      const response = await authenticatedAgentApi.updatePlayer(playerId, updateData);

      TestHelpers.assertSuccess(response, 'Player update should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.firstName).toBe(updateData.firstName);
    });

    test('should fail to create player with duplicate email', async ({ authenticatedAgentApi }) => {
      const playerData = DataGenerator.generatePlayer({
        email: TestHelpers.generateUniqueEmail('agent_player'),
        username: TestHelpers.generateUniqueUsername('agent_player'),
      });

      // Create first player
      const firstResponse = await authenticatedAgentApi.createPlayer(playerData);
      TestHelpers.assertSuccess(firstResponse);

      // Try to create with same email
      const secondResponse = await authenticatedAgentApi.createPlayer(playerData);

      TestHelpers.assertFailure(secondResponse, 'Duplicate player creation should fail');
      TestHelpers.assertStatusCode(secondResponse, 409);
    });

    test('should fail to get non-existent player', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPlayerById('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Player Statistics', () => {
    test('should get player statistics', async ({ authenticatedAgentApi }) => {
      // Create a player first
      const playerData = DataGenerator.generatePlayer({
        email: TestHelpers.generateUniqueEmail('agent_player'),
        username: TestHelpers.generateUniqueUsername('agent_player'),
      });
      const createResponse = await authenticatedAgentApi.createPlayer(playerData);
      TestHelpers.assertSuccess(createResponse);
      const playerId = createResponse.data?.id;

      // Get statistics
      const response = await authenticatedAgentApi.getPlayerStatistics(playerId);

      TestHelpers.assertSuccess(response, 'Get player statistics should succeed');
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Player Transactions', () => {
    test('should get player transactions', async ({ authenticatedAgentApi }) => {
      // Get players first
      const listResponse = await authenticatedAgentApi.getPlayers({ page: 1, limit: 1 });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const playerId = listResponse.data.data[0].id;

        const response = await authenticatedAgentApi.getPlayerTransactions(playerId, {
          page: 1,
          limit: 10,
        });

        TestHelpers.assertSuccess(response, 'Get player transactions should succeed');
        TestHelpers.assertHasData(response);
      }
    });

    test('should filter player transactions by type', async ({ authenticatedAgentApi }) => {
      const listResponse = await authenticatedAgentApi.getPlayers({ page: 1, limit: 1 });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const playerId = listResponse.data.data[0].id;

        const response = await authenticatedAgentApi.getPlayerTransactions(playerId, {
          page: 1,
          limit: 10,
          type: 'deposit',
        });

        TestHelpers.assertSuccess(response);
        TestHelpers.assertHasData(response);
      }
    });
  });

  test.describe('Balance Adjustments', () => {
    test('should adjust player balance', async ({ authenticatedAgentApi }) => {
      const listResponse = await authenticatedAgentApi.getPlayers({ page: 1, limit: 1 });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const playerId = listResponse.data.data[0].id;

        const response = await authenticatedAgentApi.adjustPlayerBalance(
          playerId,
          50.0,
          'Bonus adjustment'
        );

        TestHelpers.assertSuccess(response, 'Balance adjustment should succeed');
        TestHelpers.assertHasData(response);
      }
    });

    test('should fail balance adjustment with negative amount', async ({
      authenticatedAgentApi,
    }) => {
      const response = await authenticatedAgentApi.adjustPlayerBalance(
        'player-id',
        -999999,
        'Invalid adjustment'
      );

      TestHelpers.assertFailure(response);
    });

    test('should fail balance adjustment without reason', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.adjustPlayerBalance('player-id', 50, '');

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Player Filters', () => {
    test('should filter players by status', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPlayers({
        page: 1,
        limit: 10,
        ...TestData.filters.active,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort players', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPlayers({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should search players by email', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPlayers({
        page: 1,
        limit: 10,
        search: 'test',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });
});
