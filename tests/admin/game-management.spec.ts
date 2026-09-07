/**
 * Admin API - Game Management Tests
 *
 * Real endpoints (postman/WulfCasino-Admin-API): GET /admin/games/list
 * (filters: provider, studio, category, search, enabled, sortBy), GET /admin/games/summary,
 * GET /admin/reports/game-report. Games are synced from providers: there is no
 * POST/DELETE, and PATCH /admin/games/:id would mutate shared staging games.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers, DataGenerator } from '../../fixtures';

const NO_CREATE = 'Backend has no POST /admin/games - games are synced from providers (checked postman/WulfCasino-Admin-API)';
const NO_GET_BY_ID = 'Backend has no GET /admin/games/:id endpoint (checked postman/WulfCasino-Admin-API)';
const NO_DELETE = 'Backend has no DELETE /admin/games/:id endpoint (checked postman/WulfCasino-Admin-API)';
const SHARED_GAME =
  'PATCH /admin/games/:id would mutate a shared staging game and the backend has no create/delete to make a disposable one';

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
      test.skip(true, NO_CREATE);
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
      test.skip(true, NO_GET_BY_ID);
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
      test.skip(true, SHARED_GAME);
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
      test.skip(true, SHARED_GAME);
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
      test.skip(true, NO_DELETE);
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
      test.skip(true, NO_GET_BY_ID);
      const response = await authenticatedAdminApi.getGameById('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should fail to create game with invalid RTP', async ({ authenticatedAdminApi }) => {
      test.skip(true, NO_CREATE);
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
      // There is no per-game statistics route: the game report is filtered by provider
      const summary = await authenticatedAdminApi.getGamesSummary();
      TestHelpers.assertSuccess(summary, 'Get games summary should succeed');
      TestHelpers.assertDataIsArray(summary);
      const provider = summary.data[0]?.provider;
      test.skip(!provider, 'no game providers on staging');
      TestHelpers.assertHasProperties(summary.data[0], ['provider', 'totalGames', 'categories']);

      // GET /admin/reports/game-report?provider=...
      const response = await authenticatedAdminApi.getGameStatistics({
        provider,
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get game statistics should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      TestHelpers.assertHasProperties(response.data.summary, ['totalBetAmount', 'totalPayout', 'ggr']);
      for (const row of TestHelpers.paginatedRows(response.data)) {
        expect(row.gameProvider).toBe(provider);
      }
    });
  });

  test.describe('Game Filters and Search', () => {
    test('should filter games by category', async ({ authenticatedAdminApi }) => {
      // Use a category that really exists (e.g. "Live Dealers", "Slots")
      const sample = await authenticatedAdminApi.getAllGames({ page: 1, limit: 1 });
      TestHelpers.assertSuccess(sample);
      const category = TestHelpers.paginatedRows(sample.data)[0]?.category;
      test.skip(!category, 'no games on staging');

      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        category,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      const rows = TestHelpers.paginatedRows(response.data);
      expect(rows.length).toBeGreaterThan(0);
      for (const game of rows) {
        expect(game.category).toBe(category);
      }
    });

    test('should filter games by provider', async ({ authenticatedAdminApi }) => {
      // Providers are integration slugs such as "aleaplay" / "sagames"
      const sample = await authenticatedAdminApi.getAllGames({ page: 1, limit: 1 });
      TestHelpers.assertSuccess(sample);
      const provider = TestHelpers.paginatedRows(sample.data)[0]?.provider;
      test.skip(!provider, 'no games on staging');

      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        provider,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      const rows = TestHelpers.paginatedRows(response.data);
      expect(rows.length).toBeGreaterThan(0);
      for (const game of rows) {
        expect(game.provider).toBe(provider);
      }
    });

    test('should filter games by status', async ({ authenticatedAdminApi }) => {
      // Game status is the boolean `enabled` flag
      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        enabled: true,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const game of TestHelpers.paginatedRows(response.data)) {
        expect(game.enabled, `game ${game.id} should be enabled`).toBe(true);
      }
    });

    test('should sort games', async ({ authenticatedAdminApi }) => {
      // The only documented sort is sortBy=popular
      const response = await authenticatedAdminApi.getAllGames({
        page: 1,
        limit: 10,
        sortBy: 'popular',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      const scores = TestHelpers.paginatedRows(response.data).map((g: any) => Number(g.popularityScore ?? 0));
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i - 1], 'games should be sorted by popularity desc').toBeGreaterThanOrEqual(scores[i]);
      }
    });
  });

  test.describe('Game Validation', () => {
    test('should validate required fields', async ({ authenticatedAdminApi }) => {
      test.skip(true, NO_CREATE);
      const invalidGameData = {
        // Missing required fields
        description: 'Test description',
      };

      const response = await authenticatedAdminApi.createGame(invalidGameData);

      TestHelpers.assertFailure(response, 'Game creation without required fields should fail');
    });

    test('should validate RTP range', async ({ authenticatedAdminApi }) => {
      test.skip(true, NO_CREATE);
      const gameData = DataGenerator.generateGame({
        name: `Test Game ${Date.now()}`,
        rtp: -10, // Invalid negative RTP
      });

      const response = await authenticatedAdminApi.createGame(gameData);

      TestHelpers.assertFailure(response);
    });

    test('should validate bet limits', async ({ authenticatedAdminApi }) => {
      test.skip(true, NO_CREATE);
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
