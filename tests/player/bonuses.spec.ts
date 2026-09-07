/**
 * Player API - Bonuses Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers } from '../../fixtures';

test.describe('Player API - Bonuses', () => {
  test.describe('Available Bonuses', () => {
    test('should get available bonuses @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableBonuses();

      TestHelpers.assertSuccess(response, 'Get available bonuses should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertDataIsArray(response);
    });

    test('should get bonus details', async ({ authenticatedPlayerApi }) => {
      // First get available bonuses
      const listResponse = await authenticatedPlayerApi.getAvailableBonuses();

      if (listResponse.data && listResponse.data.length > 0) {
        const bonusId = listResponse.data[0].id;

        const response = await authenticatedPlayerApi.getBonusDetails(bonusId);

        TestHelpers.assertSuccess(response);
        TestHelpers.assertHasData(response);
        TestHelpers.assertHasProperties(response.data, [
          'id',
          'name',
          'type',
          'amount',
          'wagerRequirement',
        ]);
      }
    });

    test('should fail to get non-existent bonus', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getBonusDetails('non-existent-id');

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
  });

  test.describe('Bonus Claims', () => {
    test('should claim available bonus @regression', async ({ authenticatedPlayerApi }) => {
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
      const response = await authenticatedPlayerApi.claimBonus('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should fail to claim already claimed bonus', async ({ authenticatedPlayerApi }) => {
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
      // This would need an expired bonus ID
      const expiredBonusId = 'expired-bonus-id';

      const response = await authenticatedPlayerApi.claimBonus(expiredBonusId);

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Bonus Cancellation', () => {
    test('should cancel active bonus', async ({ authenticatedPlayerApi }) => {
      // Get active bonuses
      const listResponse = await authenticatedPlayerApi.getActiveBonuses();

      if (listResponse.data && listResponse.data.length > 0) {
        const bonusId = listResponse.data[0].id;

        const response = await authenticatedPlayerApi.cancelBonus(bonusId);

        TestHelpers.assertSuccess(response, 'Cancel bonus should succeed');
      }
    });

    test('should fail to cancel non-existent bonus', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.cancelBonus('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should fail to cancel completed bonus', async ({ authenticatedPlayerApi }) => {
      // This would need a completed bonus ID
      const completedBonusId = 'completed-bonus-id';

      const response = await authenticatedPlayerApi.cancelBonus(completedBonusId);

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Bonus Filters', () => {
    test('should filter bonuses by type', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableBonuses({
        type: 'welcome',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter bonuses by eligibility', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAvailableBonuses({
        eligible: true,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Bonus Validation', () => {
    test('should validate bonus eligibility', async ({ authenticatedPlayerApi }) => {
      const listResponse = await authenticatedPlayerApi.getAvailableBonuses();

      if (listResponse.data && listResponse.data.length > 0) {
        listResponse.data.forEach((bonus: any) => {
          expect(bonus).toHaveProperty('eligible');
        });
      }
    });

    test('should show wager requirements', async ({ authenticatedPlayerApi }) => {
      const listResponse = await authenticatedPlayerApi.getActiveBonuses();

      if (listResponse.data && listResponse.data.length > 0) {
        listResponse.data.forEach((bonus: any) => {
          expect(bonus).toHaveProperty('wagerRequirement');
          expect(bonus).toHaveProperty('wageredAmount');
        });
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
      const response = await playerApi.claimBonus('bonus-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
