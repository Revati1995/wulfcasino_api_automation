/**
 * Player API - Responsible Gaming Tests
 *
 * The player API has no responsible-gaming endpoints: limits live in the admin
 * system-config (responsible_gaming) and the player only sees rgStatus / rgUntil on
 * GET /profile/me. Every test here is skipped until the backend exposes the feature.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers } from '../../fixtures';

const NO_RG =
  'Backend has no player responsible-gaming endpoint; limits live in admin system-config.responsible_gaming and /profile/me.rgStatus (checked postman/WulfCasino-Player-API)';

test.describe('Player API - Responsible Gaming', () => {
  test.describe('Deposit Limits', () => {
    test('should set daily deposit limit @smoke', async ({ authenticatedPlayerApi }) => {
      test.skip(
        true,
        'Backend has no player responsible-gaming endpoints; limits live in admin system-config.responsible_gaming and /profile/me.rgStatus'
      );
      const response = await authenticatedPlayerApi.setDepositLimit(100, 'daily');

      TestHelpers.assertSuccess(response, 'Set deposit limit should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should set weekly deposit limit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setDepositLimit(500, 'weekly');

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should set monthly deposit limit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setDepositLimit(2000, 'monthly');

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should fail with invalid period', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setDepositLimit(100, 'invalid-period');

      TestHelpers.assertFailure(response);
    });

    test('should fail with negative limit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setDepositLimit(-100, 'daily');

      TestHelpers.assertFailure(response);
    });

    test('should fail with zero limit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setDepositLimit(0, 'daily');

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Loss Limits', () => {
    test('should set daily loss limit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setLossLimit(50, 'daily');

      TestHelpers.assertSuccess(response, 'Set loss limit should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should set weekly loss limit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setLossLimit(250, 'weekly');

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should set monthly loss limit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setLossLimit(1000, 'monthly');

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should fail with invalid period', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setLossLimit(50, 'invalid-period');

      TestHelpers.assertFailure(response);
    });

    test('should fail with negative limit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setLossLimit(-50, 'daily');

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Session Time Limits', () => {
    test('should set session time limit @smoke', async ({ authenticatedPlayerApi }) => {
      test.skip(
        true,
        'Backend has no player responsible-gaming endpoints; limits live in admin system-config.responsible_gaming and /profile/me.rgStatus'
      );
      const response = await authenticatedPlayerApi.setSessionTimeLimit(60); // 60 minutes

      TestHelpers.assertSuccess(response, 'Set session time limit should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should set short session limit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setSessionTimeLimit(30);

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should set long session limit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setSessionTimeLimit(240);

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should fail with invalid duration', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setSessionTimeLimit(-30);

      TestHelpers.assertFailure(response);
    });

    test('should fail with zero duration', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.setSessionTimeLimit(0);

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Self-Exclusion', () => {
    test('should set self-exclusion period', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.selfExclude(7, 'days');

      // This is a serious action, should succeed with appropriate warnings
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should support different exclusion durations', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const durationsToTest = [
        { duration: 7, unit: 'days' as const },
        { duration: 2, unit: 'weeks' as const },
        { duration: 1, unit: 'months' as const },
      ];

      for (const { duration, unit } of durationsToTest) {
        const response = await authenticatedPlayerApi.selfExclude(duration, unit);
        expect(response.statusCode).toBeLessThan(500);
      }
    });

    test('should fail with invalid duration unit', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.selfExclude(7, 'invalid' as any);

      TestHelpers.assertFailure(response);
    });

    test('should fail with zero duration', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.selfExclude(0, 'days');

      TestHelpers.assertFailure(response);
    });

    test('should fail with negative duration', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.selfExclude(-7, 'days');

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Reality Check', () => {
    test('should get reality check information', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      const response = await authenticatedPlayerApi.getRealityCheck();

      TestHelpers.assertSuccess(response, 'Get reality check should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertHasProperties(response.data, ['sessionDuration', 'totalWagered']);
    });
  });

  test.describe('Limit Updates', () => {
    test('should allow increasing limits after cooldown', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      // Set initial limit
      await authenticatedPlayerApi.setDepositLimit(100, 'daily');

      // Try to increase (may need to wait for cooldown in real scenario)
      const response = await authenticatedPlayerApi.setDepositLimit(200, 'daily');

      expect(response.statusCode).toBeLessThan(500);
    });

    test('should allow immediate decrease of limits', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_RG);
      // Set initial limit
      await authenticatedPlayerApi.setDepositLimit(200, 'daily');

      // Decrease immediately
      const response = await authenticatedPlayerApi.setDepositLimit(100, 'daily');

      TestHelpers.assertSuccess(response, 'Decreasing limits should be immediate');
    });
  });

  test.describe('Responsible Gaming Security', () => {
    test('should require authentication for setting limits', async ({ playerApi }) => {
      test.skip(true, NO_RG);
      const response = await playerApi.setDepositLimit(100, 'daily');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication for self-exclusion', async ({ playerApi }) => {
      test.skip(true, NO_RG);
      const response = await playerApi.selfExclude(7, 'days');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication for reality check', async ({ playerApi }) => {
      test.skip(true, NO_RG);
      const response = await playerApi.getRealityCheck();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
