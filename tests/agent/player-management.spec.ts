/**
 * Agent API - Player Management Tests
 *
 * Agents read their downline through the admin user endpoints (auto-scoped by the backend):
 *   GET /admin/users/all, GET /admin/users/:id, GET /admin/referral/user-stats/:userId,
 *   GET /admin/transactions/all?userId=
 * Agents cannot create a disposable player, so every write against a real player is skipped.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers, DataGenerator } from '../../fixtures';

const NO_PLAYER_CREATION_REASON =
  'Agent collection has no player-creation endpoint; POST /admin/users is the admin-side "Create user (admin)" route and would leave real player accounts on shared staging (checked postman/WulfCasino-Agent-API)';

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
      test.skip(true, NO_PLAYER_CREATION_REASON);
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
      // Agents cannot create players: read one of the agent's own downline players instead
      const listResponse = await authenticatedAgentApi.getPlayers({ page: 1, limit: 1 });
      TestHelpers.assertSuccess(listResponse);
      const players = TestHelpers.paginatedRows(listResponse.data);
      test.skip(players.length === 0, 'The agent has no downline players to read');
      const playerId = players[0].id;

      const response = await authenticatedAgentApi.getPlayerById(playerId);

      TestHelpers.assertSuccess(response, 'Get player by ID should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(playerId);
      expect(response.data).toHaveProperty('username');
    });

    test('should update player information', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'Mutates shared staging: PATCH /admin/users/:id would modify a real downline player and agents cannot create a disposable one (checked postman/WulfCasino-Agent-API)'
      );
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
      test.skip(true, NO_PLAYER_CREATION_REASON);
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
      // A well-formed but unknown uuid (a non-uuid id currently answers 500)
      const response = await authenticatedAgentApi.getPlayerById(DataGenerator.generateId());

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Player Statistics', () => {
    test('should get player statistics', async ({ authenticatedAgentApi }) => {
      const listResponse = await authenticatedAgentApi.getPlayers({ page: 1, limit: 1 });
      TestHelpers.assertSuccess(listResponse);
      const players = TestHelpers.paginatedRows(listResponse.data);
      test.skip(players.length === 0, 'The agent has no downline players to read');
      const playerId = players[0].id;

      const response = await authenticatedAgentApi.getPlayerStatistics(playerId);

      TestHelpers.assertSuccess(response, 'Get player statistics should succeed');
      TestHelpers.assertHasData(response);
      // GET /admin/referral/user-stats/:userId
      TestHelpers.assertHasProperties(response.data, [
        'totalEarnings',
        'pendingPayouts',
        'totalClaimed',
        'totalReferralConnections',
        'xp',
      ]);
    });
  });

  test.describe('Player Transactions', () => {
    test('should get player transactions', async ({ authenticatedAgentApi }) => {
      const listResponse = await authenticatedAgentApi.getPlayers({ page: 1, limit: 1 });
      TestHelpers.assertSuccess(listResponse);
      const players = TestHelpers.paginatedRows(listResponse.data);
      test.skip(players.length === 0, 'The agent has no downline players to read');
      const playerId = players[0].id;

      const response = await authenticatedAgentApi.getPlayerTransactions(playerId, {
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get player transactions should succeed');
      TestHelpers.assertHasData(response);
      // GET /admin/transactions/all?userId=: { data, total, page, limit }
      TestHelpers.assertPaginationStructure(response.data);
      for (const transaction of TestHelpers.paginatedRows(response.data)) {
        expect(transaction.userId).toBe(playerId);
      }
    });

    test('should filter player transactions by type', async ({ authenticatedAgentApi }) => {
      const listResponse = await authenticatedAgentApi.getPlayers({ page: 1, limit: 1 });
      TestHelpers.assertSuccess(listResponse);
      const players = TestHelpers.paginatedRows(listResponse.data);
      test.skip(players.length === 0, 'The agent has no downline players to read');
      const playerId = players[0].id;

      // type values are upper-case enum members (DEPOSIT, CREDIT, DEBIT...)
      const response = await authenticatedAgentApi.getPlayerTransactions(playerId, {
        page: 1,
        limit: 10,
        type: 'DEPOSIT',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const transaction of TestHelpers.paginatedRows(response.data)) {
        expect(transaction.type).toBe('DEPOSIT');
      }
    });
  });

  test.describe('Balance Adjustments', () => {
    const NO_BALANCE_ADJUSTMENT_REASON =
      'Backend has no agent balance-adjustment endpoint (checked postman/WulfCasino-Agent-API)';

    test('should adjust player balance', async ({ authenticatedAgentApi }) => {
      test.skip(true, NO_BALANCE_ADJUSTMENT_REASON);
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
      test.skip(true, NO_BALANCE_ADJUSTMENT_REASON);
      const response = await authenticatedAgentApi.adjustPlayerBalance(
        'player-id',
        -999999,
        'Invalid adjustment'
      );

      TestHelpers.assertFailure(response);
    });

    test('should fail balance adjustment without reason', async ({ authenticatedAgentApi }) => {
      test.skip(true, NO_BALANCE_ADJUSTMENT_REASON);
      const response = await authenticatedAgentApi.adjustPlayerBalance('player-id', 50, '');

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Player Filters', () => {
    test('should filter players by status', async ({ authenticatedAgentApi }) => {
      // GET /admin/users/all filters on the boolean isActive flag
      const response = await authenticatedAgentApi.getPlayers({
        page: 1,
        limit: 10,
        isActive: true,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const player of TestHelpers.paginatedRows(response.data)) {
        expect(player.isActive).toBe(true);
      }
    });

    test('should sort players', async ({ authenticatedAgentApi }) => {
      // GET /admin/users/all sorts with sortField / sortOrder
      const response = await authenticatedAgentApi.getPlayers({
        page: 1,
        limit: 10,
        sortField: 'createdAt',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      const createdAt = TestHelpers.paginatedRows(response.data).map((player: any) =>
        new Date(player.createdAt).getTime()
      );
      for (let i = 1; i < createdAt.length; i++) {
        expect(createdAt[i]).toBeLessThanOrEqual(createdAt[i - 1]);
      }
    });

    test('should search players by email', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPlayers({
        page: 1,
        limit: 10,
        search: 'test',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
    });
  });
});
