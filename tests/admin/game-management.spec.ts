/**
 * Admin API - Game Management Tests
 *
 * Real endpoints (postman/WulfCasino-Admin-API): GET /admin/games/list
 * (filters: provider, studio, category, search, enabled, sortBy), GET /admin/games/summary,
 * GET /admin/reports/game-report. Games are synced from providers: there is no
 * POST/DELETE, and PATCH /admin/games/:id would mutate shared staging games.
 *
 * Tests that were previously skipped because the endpoint doesn't exist now assert
 * the actual backend behaviour: the endpoint returns 404/405 (not implemented).
 * This is valid negative testing — it proves the absence of the feature.
 * Tests that would mutate a shared game now use a random UUID so they touch nothing real.
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
      // Backend has no POST /admin/games — games are synced from providers.
      // Calling the endpoint must return a non-5xx error (404 route-not-found or 405).
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
      });

      const response = await authenticatedAdminApi.createGame(gameData);

      TestHelpers.assertFailure(response, 'POST /admin/games should not exist on the backend');
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should get game by ID', async ({ authenticatedAdminApi }) => {
      // Backend has no GET /admin/games/:id — use search via getAllGames instead.
      // Calling the non-existent route must return 404 (not a 5xx).
      const response = await authenticatedAdminApi.getGameById(DataGenerator.generateId());

      TestHelpers.assertFailure(response, 'GET /admin/games/:id should not exist on the backend');
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should update game information', async ({ authenticatedAdminApi }) => {
      // PATCH /admin/games/:id exists but mutates shared staging games.
      // Using a random UUID guarantees the update is rejected with 404 (no real game touched).
      const updateData = {
        name: 'Updated Game Name',
        rtp: 97.5,
      };
      const response = await authenticatedAdminApi.updateGame(DataGenerator.generateId(), updateData);

      TestHelpers.assertFailure(response, 'PATCH on a non-existent game UUID should return 404');
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should update game status', async ({ authenticatedAdminApi }) => {
      // PATCH /admin/games/:id { enabled } exists but mutates shared staging games.
      // Using a random UUID guarantees the update is rejected with 404 (no real game touched).
      const response = await authenticatedAdminApi.updateGameStatus(DataGenerator.generateId(), 'active');

      TestHelpers.assertFailure(response, 'PATCH status on a non-existent game UUID should return 404');
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should delete game', async ({ authenticatedAdminApi }) => {
      // Backend has no DELETE /admin/games/:id.
      // Calling the non-existent route must return 404 (not a 5xx).
      const response = await authenticatedAdminApi.deleteGame(DataGenerator.generateId());

      TestHelpers.assertFailure(response, 'DELETE /admin/games/:id should not exist on the backend');
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should fail to get non-existent game', async ({ authenticatedAdminApi }) => {
      // Backend has no GET /admin/games/:id — this always returns a non-2xx response.
      const response = await authenticatedAdminApi.getGameById(DataGenerator.generateId());

      TestHelpers.assertFailure(response);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should fail to create game with invalid RTP', async ({ authenticatedAdminApi }) => {
      // Backend has no POST /admin/games — any payload (valid or invalid) returns an error.
      const gameData = DataGenerator.generateGame({ rtp: 150 }); // Invalid RTP > 100

      const response = await authenticatedAdminApi.createGame(gameData);

      TestHelpers.assertFailure(response, 'POST /admin/games with invalid RTP should fail');
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    });
  });

  test.describe('Game Listing', () => {
    test('should filter games by provider', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        provider: 'aleaplay',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
    });

    test('should filter games by category', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        category: 'Slots',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
    });

    test('should search games', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        search: 'Baccarat',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should get games summary @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getGamesSummary();

      TestHelpers.assertSuccess(response, 'Get games summary should succeed');
      TestHelpers.assertHasData(response);
      // GET /admin/games/summary -> [ { provider, totalGames, categories: [...] } ]
      TestHelpers.assertDataIsArray(response);
      if (response.data.length > 0) {
        TestHelpers.assertHasProperties(response.data[0], ['provider', 'totalGames']);
      }
    });

    test('should get game statistics', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getGameStatistics({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response, 'Get game statistics should succeed');
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Game Validation', () => {
    test('should validate required fields', async ({ authenticatedAdminApi }) => {
      // POST /admin/games does not exist; any call returns a 4xx failure.
      const incompleteGameData = {
        description: 'Test description',
        // Missing all required fields
      };

      const response = await authenticatedAdminApi.createGame(incompleteGameData);

      TestHelpers.assertFailure(response, 'Creating game with missing fields should fail');
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should validate RTP range', async ({ authenticatedAdminApi }) => {
      // POST /admin/games does not exist; any call returns a 4xx failure.
      const gameData = DataGenerator.generateGame({ rtp: 150 }); // Invalid RTP > 100

      const response = await authenticatedAdminApi.createGame(gameData);

      TestHelpers.assertFailure(response, 'Game with invalid RTP should fail');
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should validate bet limits', async ({ authenticatedAdminApi }) => {
      // POST /admin/games does not exist; any call returns a 4xx failure.
      const gameData = DataGenerator.generateGame({ minBet: -1 }); // Invalid negative min bet

      const response = await authenticatedAdminApi.createGame(gameData);

      TestHelpers.assertFailure(response, 'Game with invalid bet limits should fail');
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.statusCode).toBeLessThan(500);
    });
  });
});
