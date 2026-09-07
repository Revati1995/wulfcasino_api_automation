/**
 * Player API - Betting Tests
 *
 * The backend has no player-facing place-bet or cancel-bet API: bets are placed by the
 * game providers through wallet webhooks. Only bet history is testable here.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers } from '../../fixtures';

const NO_PLACE_BET =
  'Backend has no place-bet endpoint (bets are placed by game providers via wallet webhooks) (checked postman/WulfCasino-Player-API)';
const NO_CANCEL_BET = 'Backend has no cancel-bet endpoint (checked postman/WulfCasino-Player-API)';

test.describe('Player API - Betting', () => {
  test.describe('Place Bets', () => {
    test('should place a bet @regression', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_PLACE_BET);
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
      test.skip(true, NO_PLACE_BET);
      const betData = {
        gameId: 'test-game-id',
        amount: 999999, // Very large amount
        currency: 'USD',
      };

      const response = await authenticatedPlayerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
    });

    test('should fail bet with invalid amount', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_PLACE_BET);
      const betData = {
        gameId: 'test-game-id',
        amount: -10, // Negative amount
        currency: 'USD',
      };

      const response = await authenticatedPlayerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
    });

    test('should fail bet with zero amount', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_PLACE_BET);
      const betData = {
        gameId: 'test-game-id',
        amount: 0,
        currency: 'USD',
      };

      const response = await authenticatedPlayerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
    });

    test('should fail bet on non-existent game', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_PLACE_BET);
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
      test.skip(true, NO_PLACE_BET);
      const betData = {
        gameId: 'test-game-id',
        amount: 0.01, // Below minimum
        currency: 'USD',
      };

      const response = await authenticatedPlayerApi.placeBet(betData);

      TestHelpers.assertFailure(response);
    });

    test('should validate maximum bet amount', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_PLACE_BET);
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
      // GET /games/bet-history: { rows, pagination: { total, page, limit, ... } }
      TestHelpers.assertPaginationStructure(response.data);
    });

    test('should get bet by ID', async ({ authenticatedPlayerApi }) => {
      // Get bet history first
      const listResponse = await authenticatedPlayerApi.getBetHistory({ page: 1, limit: 1 });
      TestHelpers.assertSuccess(listResponse);
      const rows = TestHelpers.paginatedRows(listResponse.data);
      test.skip(rows.length === 0, 'No bets on the staging account to look up');

      const betId = rows[0].id;

      const response = await authenticatedPlayerApi.getBetById(betId);

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(betId);
      TestHelpers.assertHasProperties(response.data, [
        'provider',
        'gameId',
        'gameName',
        'transactionType',
        'betAmount',
        'winAmount',
        'playCurrency',
        'createdAt',
      ]);
    });

    test('should filter bets by date range', async ({ authenticatedPlayerApi }) => {
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = new Date();
      const response = await authenticatedPlayerApi.getBetHistory({
        page: 1,
        limit: 10,
        from: from.toISOString(),
        to: to.toISOString(),
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const row of TestHelpers.paginatedRows(response.data)) {
        const createdAt = new Date(row.createdAt).getTime();
        expect(createdAt).toBeGreaterThanOrEqual(from.getTime());
        expect(createdAt).toBeLessThanOrEqual(to.getTime());
      }
    });

    test('should filter bets by preset range', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getBetHistory({ page: 1, limit: 10, range: '7d' });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      for (const row of TestHelpers.paginatedRows(response.data)) {
        expect(new Date(row.createdAt).getTime()).toBeGreaterThanOrEqual(weekAgo);
      }
    });

    test('should filter bets by game type', async ({ authenticatedPlayerApi }) => {
      // The backend filters by game type (`type`), not by game id
      const response = await authenticatedPlayerApi.getBetHistory({
        page: 1,
        limit: 10,
        type: 'slots',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
    });

    test('should filter bets by asset (play currency)', async ({ authenticatedPlayerApi }) => {
      // The backend has no bet status filter; `asset` (wulfCash | wulfCoin) is the
      // closest first-class filter
      const response = await authenticatedPlayerApi.getBetHistory({
        page: 1,
        limit: 10,
        asset: 'wulfCash',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const row of TestHelpers.paginatedRows(response.data)) {
        expect(row.playCurrency).toBe('wulfCash');
      }
    });

    test('should return bets newest first', async ({ authenticatedPlayerApi }) => {
      // GET /games/bet-history has no sort parameters; the default order is newest first
      const response = await authenticatedPlayerApi.getBetHistory({ page: 1, limit: 10 });

      TestHelpers.assertSuccess(response);
      const rows = TestHelpers.paginatedRows(response.data);
      for (let i = 1; i < rows.length; i++) {
        expect(new Date(rows[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(rows[i].createdAt).getTime()
        );
      }
    });

    test('should paginate bet history', async ({ authenticatedPlayerApi }) => {
      const page1 = await authenticatedPlayerApi.getBetHistory({ page: 1, limit: 5 });
      const page2 = await authenticatedPlayerApi.getBetHistory({ page: 2, limit: 5 });

      TestHelpers.assertSuccess(page1);
      TestHelpers.assertSuccess(page2);
      expect(page1.data?.pagination?.page).toBe(1);
      expect(page1.data?.pagination?.limit).toBe(5);
      expect(page2.data?.pagination?.page).toBe(2);

      const ids1 = TestHelpers.paginatedRows(page1.data).map((r: any) => r.id);
      const ids2 = TestHelpers.paginatedRows(page2.data).map((r: any) => r.id);
      expect(ids1.length).toBeLessThanOrEqual(5);
      for (const id of ids2) {
        expect(ids1).not.toContain(id);
      }
    });
  });

  test.describe('Bet Cancellation', () => {
    test('should cancel pending bet', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_CANCEL_BET);
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
      test.skip(true, NO_CANCEL_BET);
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
      test.skip(true, NO_CANCEL_BET);
      const response = await authenticatedPlayerApi.cancelBet('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Betting Security', () => {
    test('should require authentication to place bet', async ({ playerApi }) => {
      test.skip(true, NO_PLACE_BET);
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
