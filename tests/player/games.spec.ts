/**
 * Player API - Games Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers, DataGenerator } from '../../fixtures';
import type { PlayerApiClient } from '../../utils/player-api-client';

const NO_GAME_LOOKUP = 'Backend has no single-game lookup endpoint (checked postman/WulfCasino-Player-API)';

/** First lobby game of the given provider (POST /games/launch provider enum), or undefined. */
async function firstGame(api: PlayerApiClient, provider = 'aleaplay'): Promise<any> {
  const response = await api.getAvailableGames({ page: 1, limit: 1, provider });
  TestHelpers.assertSuccess(response, 'Get available games should succeed');
  return TestHelpers.paginatedRows(response.data)[0];
}

test.describe('Player API - Games', () => {
  test.describe('Game Discovery', () => {
    test('should get available games @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get available games should succeed');
      TestHelpers.assertHasData(response);
      // GET /games/list: { data, pagination: { total, page, limit, nextCursor, ... } }
      TestHelpers.assertPaginationStructure(response.data);
      expect(TestHelpers.paginatedRows(response.data).length).toBeGreaterThan(0);
    });

    test('should get game by ID', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_GAME_LOOKUP);
      // First get games list
      const listResponse = await authenticatedPlayerApi.getAvailableGames({ page: 1, limit: 1 });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const gameId = listResponse.data.data[0].id;

        const response = await authenticatedPlayerApi.getGameById(gameId);

        TestHelpers.assertSuccess(response, 'Get game by ID should succeed');
        TestHelpers.assertHasData(response);
        expect(response.data?.id).toBe(gameId);
      }
    });

    test('should filter games by category', async ({ authenticatedPlayerApi }) => {
      // Category names come from GET /games/categories (e.g. "Slots", "Live Dealers")
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        category: 'Slots',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      const rows = TestHelpers.paginatedRows(response.data);
      expect(rows.length).toBeGreaterThan(0);
      for (const game of rows) {
        expect(game.category).toBe('Slots');
      }
    });

    test('should filter games by provider', async ({ authenticatedPlayerApi }) => {
      // `provider` is the integration (aleaplay, sagames, ...); `studio` is the software house
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        provider: 'aleaplay',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      const rows = TestHelpers.paginatedRows(response.data);
      expect(rows.length).toBeGreaterThan(0);
      for (const game of rows) {
        expect(game.provider).toBe('aleaplay');
      }
    });

    test('should filter games by studio', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        studio: 'NetEnt',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      const rows = TestHelpers.paginatedRows(response.data);
      expect(rows.length).toBeGreaterThan(0);
      for (const game of rows) {
        expect(game.studio).toBe('NetEnt');
      }
    });

    test('should search games by name', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        search: 'Baccarat',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      const rows = TestHelpers.paginatedRows(response.data);
      expect(rows.length).toBeGreaterThan(0);
      for (const game of rows) {
        expect(String(game.name).toLowerCase()).toContain('baccarat');
      }
    });

    test('should sort games', async ({ authenticatedPlayerApi }) => {
      // GET /games/list only supports sortBy=popular (the default order)
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        sortBy: 'popular',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      expect(TestHelpers.paginatedRows(response.data).length).toBeGreaterThan(0);
    });
  });

  test.describe('Game Launch', () => {
    test('should launch game in sweeps (real-currency) mode @regression', async ({ authenticatedPlayerApi }) => {
      // POST /games/launch only opens a provider session; no wager is placed. The
      // wallet is compared before/after to prove the launch itself moves no funds.
      const game = await firstGame(authenticatedPlayerApi);
      test.skip(!game, 'No aleaplay game in the staging lobby');

      const before = await authenticatedPlayerApi.getWalletBalance();
      TestHelpers.assertSuccess(before);

      const response = await authenticatedPlayerApi.launchGame({
        provider: game.provider,
        gameId: game.providerGameId,
        playMode: 'sweeps',
      });

      TestHelpers.assertSuccess(response, 'Game launch should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('url');
      expect(TestHelpers.isValidUrl(response.data.url)).toBeTruthy();

      const after = await authenticatedPlayerApi.getWalletBalance();
      TestHelpers.assertSuccess(after);
      expect(after.data).toEqual(before.data);
    });

    test('should launch game in gold-coin mode', async ({ authenticatedPlayerApi }) => {
      // The backend has no demo mode; gold (Gold Coins) is the play-money equivalent
      const game = await firstGame(authenticatedPlayerApi);
      test.skip(!game, 'No aleaplay game in the staging lobby');

      const response = await authenticatedPlayerApi.launchGame({
        provider: game.provider,
        gameId: game.providerGameId,
        playMode: 'gold',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(TestHelpers.isValidUrl(response.data?.url)).toBeTruthy();
    });

    test('should fail to launch non-existent game', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.launchGame({
        provider: 'aleaplay',
        gameId: '999999999',
        playMode: 'gold',
      });

      // The backend rejects the launch but answers 500 (provider lookup error)
      // rather than 404 for an unknown provider game id
      TestHelpers.assertFailure(response);
    });

    test('should reject an unknown provider', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.launchGame({ provider: 'not-a-provider', gameId: '1' });

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 400);
      // NestJS validation body: { message: [...], error: 'Bad Request' }; the enum hint
      // is in the message array (response.error only carries 'Bad Request')
      expect(String(response.data?.message)).toContain('provider must be one of');
    });

    test('should require authentication to launch game', async ({ playerApi }) => {
      const response = await playerApi.launchGame({ provider: 'aleaplay', gameId: '1', playMode: 'gold' });

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });

  test.describe('Favorite Games', () => {
    test('should get favorite games @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getFavoriteGames();

      TestHelpers.assertSuccess(response, 'Get favorite games should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertDataIsArray(response);
    });

    test('should add game to favorites', async ({ authenticatedPlayerApi }) => {
      const game = await firstGame(authenticatedPlayerApi);
      test.skip(!game, 'No aleaplay game in the staging lobby');

      const initial = await authenticatedPlayerApi.isFavoriteGame(game.id);
      TestHelpers.assertSuccess(initial);
      const wasFavorite = initial.data?.isFavorite === true;

      try {
        const response = await authenticatedPlayerApi.addGameToFavorites(game.id);

        TestHelpers.assertSuccess(response, 'Add to favorites should succeed');
        const check = await authenticatedPlayerApi.isFavoriteGame(game.id);
        expect(check.data?.isFavorite).toBe(true);

        const favorites = await authenticatedPlayerApi.getFavoriteGames();
        expect(favorites.data.map((g: any) => g.id)).toContain(game.id);
      } finally {
        // Restore the account's favourites (POST /favorites/toggle/:gameId)
        if (!wasFavorite) await authenticatedPlayerApi.removeGameFromFavorites(game.id);
      }
    });

    test('should remove game from favorites', async ({ authenticatedPlayerApi }) => {
      const game = await firstGame(authenticatedPlayerApi);
      test.skip(!game, 'No aleaplay game in the staging lobby');

      const initial = await authenticatedPlayerApi.isFavoriteGame(game.id);
      TestHelpers.assertSuccess(initial);
      const wasFavorite = initial.data?.isFavorite === true;

      try {
        // First add to favorites
        TestHelpers.assertSuccess(await authenticatedPlayerApi.addGameToFavorites(game.id));

        // Then remove
        const response = await authenticatedPlayerApi.removeGameFromFavorites(game.id);

        TestHelpers.assertSuccess(response, 'Remove from favorites should succeed');
        const check = await authenticatedPlayerApi.isFavoriteGame(game.id);
        expect(check.data?.isFavorite).toBe(false);
      } finally {
        if (wasFavorite) await authenticatedPlayerApi.addGameToFavorites(game.id);
      }
    });

    test('should fail to add non-existent game to favorites', async ({
      authenticatedPlayerApi,
    }) => {
      // Random UUID: a non-UUID id makes the backend answer 500 instead of 404
      const response = await authenticatedPlayerApi.addGameToFavorites(DataGenerator.generateId());

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Recently Played Games', () => {
    test('should get recently played games', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getRecentlyPlayedGames();

      TestHelpers.assertSuccess(response, 'Get recently played games should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertDataIsArray(response);
    });

    test('should get gameplay logs', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getPlayLogs({ page: 1, limit: 5 });

      TestHelpers.assertSuccess(response, 'Get play logs should succeed');
      // GET /games/play-logs: { data, pagination: { total, page, limit, ... } }
      TestHelpers.assertPaginationStructure(response.data);
    });
  });

  test.describe('Game Filters', () => {
    test('should filter by multiple categories', async ({ authenticatedPlayerApi }) => {
      test.skip(
        true,
        'Backend GET /games/list has no multi-category filter (single `category` only) (checked postman/WulfCasino-Player-API)'
      );
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        categories: ['slot', 'table'],
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter by RTP range', async ({ authenticatedPlayerApi }) => {
      test.skip(true, 'Backend GET /games/list has no RTP range filter (checked postman/WulfCasino-Player-API)');
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        minRtp: 95,
        maxRtp: 98,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter by bet limits', async ({ authenticatedPlayerApi }) => {
      test.skip(true, 'Backend GET /games/list has no bet-limit filter (checked postman/WulfCasino-Player-API)');
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        minBet: 0.1,
        maxBet: 10,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });
});
