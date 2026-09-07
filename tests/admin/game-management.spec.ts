/**
 * Admin API - Game Management Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers, DataGenerator } from '../../fixtures';

test.describe('Admin API - Game Management', () => {
  test.describe('Game CRUD Operations', () => {
    test('should get all games with pagination @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get all games should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
    });

    test('should create a new game @regression', async ({ authenticatedAdminApi }) => {
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
      });

      const response = await authenticatedAdminApi.createGame(gameData);

      TestHelpers.assertSuccess(response, 'Game creation should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data?.name).toBe(gameData.name);
      expect(response.data?.provider).toBe(gameData.provider);
    });

    test('should get game by ID', async ({ authenticatedAdminApi }) => {
      // Create a game first
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createGame(gameData);
      TestHelpers.assertSuccess(createResponse);
      const gameId = createResponse.data?.id;

      // Get the game
      const response = await authenticatedAdminApi.getGameById(gameId);

      TestHelpers.assertSuccess(response, 'Get game by ID should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(gameId);
      expect(response.data?.name).toBe(gameData.name);
    });

    test('should update game information', async ({ authenticatedAdminApi }) => {
      // Create a game first
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createGame(gameData);
      TestHelpers.assertSuccess(createResponse);
      const gameId = createResponse.data?.id;

      // Update the game
      const updateData = {
        name: 'Updated Game Name',
        rtp: 97.5,
      };
      const response = await authenticatedAdminApi.updateGame(gameId, updateData);

      TestHelpers.assertSuccess(response, 'Game update should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.name).toBe(updateData.name);
      expect(response.data?.rtp).toBe(updateData.rtp);
    });

    test('should update game status', async ({ authenticatedAdminApi }) => {
      // Create a game first
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createGame(gameData);
      TestHelpers.assertSuccess(createResponse);
      const gameId = createResponse.data?.id;

      // Update status
      const response = await authenticatedAdminApi.updateGameStatus(gameId, 'inactive');

      TestHelpers.assertSuccess(response, 'Game status update should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.status).toBe('inactive');
    });

    test('should delete game', async ({ authenticatedAdminApi }) => {
      // Create a game first
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createGame(gameData);
      TestHelpers.assertSuccess(createResponse);
      const gameId = createResponse.data?.id;

      // Delete the game
      const response = await authenticatedAdminApi.deleteGame(gameId);

      TestHelpers.assertSuccess(response, 'Game deletion should succeed');
    });

    test('should fail to get non-existent game', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getGameById('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should fail to create game with invalid RTP', async ({ authenticatedAdminApi }) => {
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
        rtp: 150, // Invalid RTP > 100
      });

      const response = await authenticatedAdminApi.createGame(gameData);

      TestHelpers.assertFailure(response, 'Game creation with invalid RTP should fail');
    });
  });

  test.describe('Game Statistics', () => {
    test('should get game statistics', async ({ authenticatedAdminApi }) => {
      // Create a game first
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createGame(gameData);
      TestHelpers.assertSuccess(createResponse);
      const gameId = createResponse.data?.id;

      // Get statistics
      const response = await authenticatedAdminApi.getGameStatistics(gameId);

      TestHelpers.assertSuccess(response, 'Get game statistics should succeed');
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Game Filters and Search', () => {
    test('should filter games by category', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        category: 'slot',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter games by provider', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        provider: 'NetEnt',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter games by status', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        ...TestData.filters.active,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort games', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        sortBy: 'rtp',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Game Validation', () => {
    test('should validate required fields', async ({ authenticatedAdminApi }) => {
      const invalidGameData = {
        // Missing required fields
        description: 'Test description',
      };

      const response = await authenticatedAdminApi.createGame(invalidGameData);

      TestHelpers.assertFailure(response, 'Game creation without required fields should fail');
    });

    test('should validate RTP range', async ({ authenticatedAdminApi }) => {
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
        rtp: -10, // Invalid negative RTP
      });

      const response = await authenticatedAdminApi.createGame(gameData);

      TestHelpers.assertFailure(response);
    });

    test('should validate bet limits', async ({ authenticatedAdminApi }) => {
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
        minBet: 100,
        maxBet: 10, // Invalid: max < min
      });

      const response = await authenticatedAdminApi.createGame(gameData);

      TestHelpers.assertFailure(response);
    });
  });
});
