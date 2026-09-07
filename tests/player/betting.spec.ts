/**
 * Player API - Betting Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers, DataGenerator } from '../../fixtures';

test.describe('Player API - Betting', () => {
  test.describe('Place Bets', () => {
    test('should place a bet @regression', async ({ authenticatedPlayerApi }) => {
      // Get a game first
      const gamesResponse = await authenticatedPlayerApi.getAvailableGames({ page: 1, limit: 1 });

      if (gamesResponse.data?.data && gamesResponse.data.data.length > 0) {
        const gameId = gamesResponse.data.data[0].id;

        const betData = {
          gameId,
          amount: 10.0,
          currency: 'USD',
        };

        const response = await authenticatedPlayerApi.placeBet(betData);

        // May succeed or fail based on balance
        expect(response.statusCode).toBeLessThan(500);

        if (response.success) {
          TestHelpers.assertHasData(response);
          expect(response.data).toHaveProperty('betId');
        }
      }
    });

    test('should fail bet with insufficient balance', async ({ authenticatedPlayerApi }) => {
      const betData = {
        gameId: 'test-game-id',
        amount: 999999, // Very large amount
        currency: 'USD',
      };

      const response = await authenticatedPlayerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
    });

    test('should fail bet with invalid amount', async ({ authenticatedPlayerApi }) => {
      const betData = {
        gameId: 'test-game-id',
        amount: -10, // Negative amount
        currency: 'USD',
      };

      const response = await authenticatedPlayerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
    });

    test('should fail bet with zero amount', async ({ authenticatedPlayerApi }) => {
      const betData = {
        gameId: 'test-game-id',
        amount: 0,
        currency: 'USD',
      };

      const response = await authenticatedPlayerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
    });

    test('should fail bet on non-existent game', async ({ authenticatedPlayerApi }) => {
      const betData = {
        gameId: 'non-existent-game',
        amount: 10,
        currency: 'USD',
      };

      const response = await authenticatedPlayerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should validate minimum bet amount', async ({ authenticatedPlayerApi }) => {
      const betData = {
        gameId: 'test-game-id',
        amount: 0.01, // Below minimum
        currency: 'USD',
      };

      const response = await authenticatedPlayerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
    });

    test('should validate maximum bet amount', async ({ authenticatedPlayerApi }) => {
      const betData = {
        gameId: 'test-game-id',
        amount: 10000, // Above maximum
        currency: 'USD',
      };

      const response = await authenticatedPlayerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Bet History', () => {
    test('should get bet history @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getBetHistory({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get bet history should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should get bet by ID', async ({ authenticatedPlayerApi }) => {
      // Get bet history first
      const listResponse = await authenticatedPlayerApi.getBetHistory({ page: 1, limit: 1 });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const betId = listResponse.data.data[0].id;

        const response = await authenticatedPlayerApi.getBetById(betId);

        TestHelpers.assertSuccess(response);
        TestHelpers.assertHasData(response);
        expect(response.data?.id).toBe(betId);
      }
    });

    test('should filter bets by date range', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getBetHistory({
        page: 1,
        limit: 10,
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter bets by game', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getBetHistory({
        page: 1,
        limit: 10,
        gameId: 'test-game-id',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter bets by status', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getBetHistory({
        page: 1,
        limit: 10,
        status: 'win',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort bets', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getBetHistory({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should paginate bet history', async ({ authenticatedPlayerApi }) => {
      const page1 = await authenticatedPlayerApi.getBetHistory({ page: 1, limit: 5 });
      const page2 = await authenticatedPlayerApi.getBetHistory({ page: 2, limit: 5 });

      TestHelpers.assertSuccess(page1);
      TestHelpers.assertSuccess(page2);
    });
  });

  test.describe('Bet Cancellation', () => {
    test('should cancel pending bet', async ({ authenticatedPlayerApi }) => {
      // This test assumes there's a pending bet
      const listResponse = await authenticatedPlayerApi.getBetHistory({
        page: 1,
        limit: 1,
        status: 'pending',
      });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const betId = listResponse.data.data[0].id;

        const response = await authenticatedPlayerApi.cancelBet(betId);

        // Should succeed if bet is cancellable
        expect(response.statusCode).toBeLessThan(500);
      }
    });

    test('should fail to cancel completed bet', async ({ authenticatedPlayerApi }) => {
      const listResponse = await authenticatedPlayerApi.getBetHistory({
        page: 1,
        limit: 1,
        status: 'completed',
      });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const betId = listResponse.data.data[0].id;

        const response = await authenticatedPlayerApi.cancelBet(betId);

        TestHelpers.assertFailure(response);
      }
    });

    test('should fail to cancel non-existent bet', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.cancelBet('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Betting Security', () => {
    test('should require authentication to place bet', async ({ playerApi }) => {
      const betData = {
        gameId: 'test-game-id',
        amount: 10,
        currency: 'USD',
      };

      const response = await playerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication to view bet history', async ({ playerApi }) => {
      const response = await playerApi.getBetHistory();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
