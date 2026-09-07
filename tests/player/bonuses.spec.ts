/**
 * Player API - Bonuses Tests
 *
 * Read-only against the shared staging account: claiming (POST /bonus/claim) and
 * forfeiting (POST /bonus/forfeit/:id) change real bonus balances and are skipped.
 * Non-existent-id negatives use random UUIDs: non-UUID ids make the backend answer 500.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers, DataGenerator } from '../../fixtures';

const mutates = (endpoint: string) => `Skipped: mutates real player balance/status on staging (${endpoint})`;
const NO_BONUS_FILTERS = 'Backend has no query filters on GET /bonus/eligible (checked postman/WulfCasino-Player-API)';

test.describe('Player API - Bonuses', () => {
  test.describe('Available Bonuses', () => {
    test('should get available bonuses @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableBonuses();

      TestHelpers.assertSuccess(response, 'Get available bonuses should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertDataIsArray(response);
    });

    test('should get bonus details', async ({ authenticatedPlayerApi }) => {
      // GET /bonus/my-bonuses/:id resolves a USER bonus (claimed), not a bonus definition
      const listResponse = await authenticatedPlayerApi.getMyBonuses();
      TestHelpers.assertSuccess(listResponse);
      TestHelpers.assertDataIsArray(listResponse);
      test.skip(listResponse.data.length === 0, 'No claimed bonuses on the staging account');

      const userBonusId = listResponse.data[0].id;

      const response = await authenticatedPlayerApi.getBonusDetails(userBonusId);

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(userBonusId);
      TestHelpers.assertHasProperties(response.data, ['bonusId', 'bonus']);
      TestHelpers.assertHasProperties(response.data.bonus, [
        'id',
        'name',
        'type',
        'maxBonus',
        'wageringMultiplier',
      ]);
    });

    test('should fail to get non-existent bonus', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getBonusDetails(DataGenerator.generateId());

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Active Bonuses', () => {
    test('should get active bonuses @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getActiveBonuses();

      TestHelpers.assertSuccess(response, 'Get active bonuses should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertDataIsArray(response);
    });

    test('should get my claimed bonuses', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getMyBonuses();

      TestHelpers.assertSuccess(response, 'Get my bonuses should succeed');
      TestHelpers.assertDataIsArray(response);
      for (const userBonus of response.data) {
        TestHelpers.assertHasProperties(userBonus, ['id', 'userId', 'bonusId', 'bonus']);
      }
    });
  });

  test.describe('Bonus Claims', () => {
    test('should claim available bonus @regression', async ({ authenticatedPlayerApi }) => {
      test.skip(true, mutates('POST /bonus/claim'));
      // Get available bonuses
      const listResponse = await authenticatedPlayerApi.getAvailableBonuses();

      if (listResponse.data && listResponse.data.length > 0) {
        const bonusId = listResponse.data[0].id;

        const response = await authenticatedPlayerApi.claimBonus(bonusId);

        // Should succeed or fail with appropriate message
        expect(response.statusCode).toBeLessThan(500);

        if (response.success) {
          TestHelpers.assertHasData(response);
          expect(response.data).toHaveProperty('bonusId');
        }
      }
    });

    test('should fail to claim non-existent bonus', async ({ authenticatedPlayerApi }) => {
      // A random UUID cannot match any bonus, so nothing can be credited
      const response = await authenticatedPlayerApi.claimBonus(DataGenerator.generateId());

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should fail to claim already claimed bonus', async ({ authenticatedPlayerApi }) => {
      test.skip(true, mutates('POST /bonus/claim'));
      // Get available bonuses
      const listResponse = await authenticatedPlayerApi.getAvailableBonuses();

      if (listResponse.data && listResponse.data.length > 0) {
        const bonusId = listResponse.data[0].id;

        // Claim once
        await authenticatedPlayerApi.claimBonus(bonusId);

        // Try to claim again
        const response = await authenticatedPlayerApi.claimBonus(bonusId);

        TestHelpers.assertFailure(response);
      }
    });

    test('should fail to claim expired bonus', async ({ authenticatedPlayerApi }) => {
      test.skip(true, mutates('POST /bonus/claim; no expired bonus fixture on staging'));
      // This would need an expired bonus ID
      const expiredBonusId = 'expired-bonus-id';

      const response = await authenticatedPlayerApi.claimBonus(expiredBonusId);

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Bonus Cancellation', () => {
    test('should cancel active bonus', async ({ authenticatedPlayerApi }) => {
      test.skip(true, mutates('POST /bonus/forfeit/:id'));
      // Get active bonuses
      const listResponse = await authenticatedPlayerApi.getActiveBonuses();

      if (listResponse.data && listResponse.data.length > 0) {
        const bonusId = listResponse.data[0].id;

        const response = await authenticatedPlayerApi.cancelBonus(bonusId);

        TestHelpers.assertSuccess(response, 'Cancel bonus should succeed');
      }
    });

    test('should fail to cancel non-existent bonus', async ({ authenticatedPlayerApi }) => {
      // A random UUID cannot match any user bonus, so nothing can be forfeited
      const response = await authenticatedPlayerApi.cancelBonus(DataGenerator.generateId());

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should fail to cancel completed bonus', async ({ authenticatedPlayerApi }) => {
      test.skip(true, mutates('POST /bonus/forfeit/:id; no completed bonus fixture on staging'));
      // This would need a completed bonus ID
      const completedBonusId = 'completed-bonus-id';

      const response = await authenticatedPlayerApi.cancelBonus(completedBonusId);

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Bonus Filters', () => {
    test('should filter bonuses by type', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_BONUS_FILTERS);
      const response = await authenticatedPlayerApi.getAvailableBonuses({
        type: 'welcome',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter bonuses by eligibility', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_BONUS_FILTERS);
      const response = await authenticatedPlayerApi.getAvailableBonuses({
        eligible: true,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Bonus Validation', () => {
    test('should validate bonus eligibility', async ({ authenticatedPlayerApi }) => {
      // GET /bonus/eligible is itself the eligibility filter: every entry must be an
      // active bonus definition whose playerStatus applies to the caller
      const listResponse = await authenticatedPlayerApi.getAvailableBonuses();

      TestHelpers.assertSuccess(listResponse);
      TestHelpers.assertDataIsArray(listResponse);
      for (const bonus of listResponse.data) {
        TestHelpers.assertHasProperties(bonus, ['id', 'name', 'type', 'playerStatus', 'isActive']);
        expect(bonus.isActive).toBe(true);
      }
    });

    test('should show wager requirements', async ({ authenticatedPlayerApi }) => {
      // Bonus definitions carry wageringMultiplier / wageringType (decimal strings)
      const listResponse = await authenticatedPlayerApi.getActiveBonuses();

      TestHelpers.assertSuccess(listResponse);
      TestHelpers.assertDataIsArray(listResponse);
      for (const bonus of listResponse.data) {
        TestHelpers.assertHasProperties(bonus, ['wageringMultiplier', 'wageringType', 'maxBonus']);
        expect(Number(bonus.wageringMultiplier)).not.toBeNaN();
      }
    });
  });

  test.describe('Bonus Security', () => {
    test('should require authentication to view bonuses', async ({ playerApi }) => {
      const response = await playerApi.getAvailableBonuses();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication to claim bonus', async ({ playerApi }) => {
      const response = await playerApi.claimBonus(DataGenerator.generateId());

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
