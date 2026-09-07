/**
 * Player API - Games Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';

test.describe('Player API - Games', () => {
  test.describe('Game Discovery', () => {
    test('should get available games @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get available games should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should get game by ID', async ({ authenticatedPlayerApi }) => {
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
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        category: 'slot',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter games by provider', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        provider: 'NetEnt',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should search games by name', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        search: 'slot',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort games', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        sortBy: 'popularity',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Game Launch', () => {
    test('should launch game in real mode @regression', async ({ authenticatedPlayerApi }) => {
      // Get a game first
      const listResponse = await authenticatedPlayerApi.getAvailableGames({ page: 1, limit: 1 });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const gameId = listResponse.data.data[0].id;

        const response = await authenticatedPlayerApi.launchGame(gameId, 'real');

        TestHelpers.assertSuccess(response, 'Game launch should succeed');
        TestHelpers.assertHasData(response);
        expect(response.data).toHaveProperty('gameUrl');
      }
    });

    test('should launch game in demo mode', async ({ authenticatedPlayerApi }) => {
      const listResponse = await authenticatedPlayerApi.getAvailableGames({ page: 1, limit: 1 });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const gameId = listResponse.data.data[0].id;

        const response = await authenticatedPlayerApi.launchGame(gameId, 'demo');

        TestHelpers.assertSuccess(response);
        TestHelpers.assertHasData(response);
      }
    });

    test('should fail to launch non-existent game', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.launchGame('non-existent-id', 'real');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should require authentication to launch game', async ({ playerApi }) => {
      const response = await playerApi.launchGame('game-id', 'real');

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
      const listResponse = await authenticatedPlayerApi.getAvailableGames({ page: 1, limit: 1 });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const gameId = listResponse.data.data[0].id;

        const response = await authenticatedPlayerApi.addGameToFavorites(gameId);

        TestHelpers.assertSuccess(response, 'Add to favorites should succeed');
      }
    });

    test('should remove game from favorites', async ({ authenticatedPlayerApi }) => {
      // First add to favorites
      const listResponse = await authenticatedPlayerApi.getAvailableGames({ page: 1, limit: 1 });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const gameId = listResponse.data.data[0].id;

        await authenticatedPlayerApi.addGameToFavorites(gameId);

        // Then remove
        const response = await authenticatedPlayerApi.removeGameFromFavorites(gameId);

        TestHelpers.assertSuccess(response, 'Remove from favorites should succeed');
      }
    });

    test('should fail to add non-existent game to favorites', async ({
      authenticatedPlayerApi,
    }) => {
      const response = await authenticatedPlayerApi.addGameToFavorites('non-existent-id');

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
  });

  test.describe('Game Filters', () => {
    test('should filter by multiple categories', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableGames({
        page: 1,
        limit: 10,
        categories: ['slot', 'table'],
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter by RTP range', async ({ authenticatedPlayerApi }) => {
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
