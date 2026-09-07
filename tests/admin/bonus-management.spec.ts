/**
 * Admin API - Bonus Management Tests
 *
 * Real endpoints (postman/WulfCasino-Admin-API): POST /admin/bonus/create,
 * GET /admin/bonus/all?activeOnly, GET|PATCH|DELETE /admin/bonus/:id.
 * Writes are only performed on bonuses created by this spec (created inactive
 * so real players never see them) and are deleted again at the end.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers, DataGenerator } from '../../fixtures';
import { AdminApiClient } from '../../utils/admin-api-client';
import type { ApiResponse } from '../../types';

/** Run `fn` with a throw-away admin client (for afterAll hooks, which cannot use test fixtures). */
async function withAdminClient<T>(fn: (api: AdminApiClient) => Promise<T>): Promise<T> {
  const api = new AdminApiClient();
  await api.init();
  try {
    await api.loginAsAdmin(); // reuses the cached token, no login call
    return await fn(api);
  } finally {
    await api.dispose();
  }
}

/** Negative-path guard: if the backend unexpectedly accepted the payload, remove the bonus it created. */
async function deleteIfCreated(api: AdminApiClient, response: ApiResponse<any>): Promise<void> {
  const id = response.success ? response.data?.id : undefined;
  if (id) {
    await api.deleteBonus(id);
  }
}

test.describe('Admin API - Bonus Management', () => {
  test.describe('Bonus CRUD Operations', () => {
    test('should get all bonuses @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllBonuses({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get all bonuses should succeed');
      TestHelpers.assertHasData(response);
      // GET /admin/bonus/all returns a plain array (no pagination envelope)
      TestHelpers.assertDataIsArray(response);
      const bonuses = response.data as unknown as any[];
      if (bonuses.length > 0) {
        TestHelpers.assertHasProperties(bonuses[0], ['id', 'name', 'type']);
      }
    });

    test.describe('Bonus lifecycle (create -> read -> update -> delete)', () => {
      test.describe.configure({ mode: 'serial' });

      const bonusData = DataGenerator.generateAdminBonus();
      let bonusId: string | undefined;

      test.afterAll(async () => {
        // Safety net: the delete step below normally clears bonusId.
        if (bonusId) {
          await withAdminClient((api) => api.deleteBonus(bonusId as string));
          bonusId = undefined;
        }
      });

      test('should create a new bonus @regression', async ({ authenticatedAdminApi }) => {
        const response = await authenticatedAdminApi.createBonus(bonusData);

        TestHelpers.assertSuccess(response, 'Bonus creation should succeed');
        TestHelpers.assertHasData(response);
        expect(response.data).toHaveProperty('id');
        bonusId = response.data.id;
        expect(response.data?.name).toBe(bonusData.name);
        expect(response.data?.type).toBe(bonusData.type);
        expect(response.data?.isActive, 'test bonus must stay hidden from players').toBe(false);
      });

      test('should get bonus by ID', async ({ authenticatedAdminApi }) => {
        test.skip(!bonusId, 'bonus creation failed');

        const response = await authenticatedAdminApi.getBonusById(bonusId as string);

        TestHelpers.assertSuccess(response, 'Get bonus by ID should succeed');
        TestHelpers.assertHasData(response);
        expect(response.data?.id).toBe(bonusId);
        expect(response.data?.name).toBe(bonusData.name);
      });

      test('should update bonus information', async ({ authenticatedAdminApi }) => {
        test.skip(!bonusId, 'bonus creation failed');

        const updateData = {
          name: `${bonusData.name} updated`,
          maxBonus: 200,
        };
        const response = await authenticatedAdminApi.updateBonus(bonusId as string, updateData);

        TestHelpers.assertSuccess(response, 'Bonus update should succeed');
        TestHelpers.assertHasData(response);
        expect(response.data?.name).toBe(updateData.name);
        // decimals are serialised as strings ("200.00")
        expect(Number(response.data?.maxBonus)).toBe(updateData.maxBonus);
        expect(response.data?.isActive).toBe(false);
      });

      test('should delete bonus', async ({ authenticatedAdminApi }) => {
        test.skip(!bonusId, 'bonus creation failed');

        const response = await authenticatedAdminApi.deleteBonus(bonusId as string);

        TestHelpers.assertSuccess(response, 'Bonus deletion should succeed');
        // A never-claimed bonus is hard-deleted, not archived
        expect(response.data?.archived ?? false).toBe(false);

        const afterDelete = await authenticatedAdminApi.getBonusById(bonusId as string);
        TestHelpers.assertStatusCode(afterDelete, 404, 'Deleted bonus should no longer be found');
        bonusId = undefined;
      });
    });

    test('should fail to get non-existent bonus', async ({ authenticatedAdminApi }) => {
      // Non-UUID ids are answered with 500 by the backend; a random UUID gives the proper 404
      const response = await authenticatedAdminApi.getBonusById(DataGenerator.generateId());

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Bonus Assignment', () => {
    test('should assign bonus to user', async ({ authenticatedAdminApi }) => {
      test.skip(
        true,
        'Backend has no bonus assignment endpoint - bonuses are claimed by players (checked postman/WulfCasino-Admin-API)'
      );
      // Create a bonus
      const bonusData = DataGenerator.generateAdminBonus();
      const bonusResponse = await authenticatedAdminApi.createBonus(bonusData);
      TestHelpers.assertSuccess(bonusResponse);
      const bonusId = bonusResponse.data?.id;

      // Assign to user (assuming user exists)
      const response = await authenticatedAdminApi.assignBonusToUser(bonusId, 'test-user-id');

      // Should succeed or return appropriate error if user doesn't exist
      expect(response.statusCode).toBeLessThan(500);
    });
  });

  test.describe('Bonus Filters', () => {
    test('should filter bonuses by type', async ({ authenticatedAdminApi }) => {
      test.skip(
        true,
        'Backend GET /admin/bonus/all has no type filter (only activeOnly) (checked postman/WulfCasino-Admin-API)'
      );
      const response = await authenticatedAdminApi.getAllBonuses({ type: 'deposit_match' });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter bonuses by status', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllBonuses({ activeOnly: true });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertDataIsArray(response);
      for (const bonus of response.data as any[]) {
        expect(bonus.isActive, `bonus ${bonus.id} should be active`).toBe(true);
      }
    });
  });

  test.describe('Bonus Validation', () => {
    test('should validate required fields', async ({ authenticatedAdminApi }) => {
      const invalidBonusData = {
        description: 'Test description',
        // Missing required fields (name, type, ...)
      };

      const response = await authenticatedAdminApi.createBonus(invalidBonusData);
      await deleteIfCreated(authenticatedAdminApi, response);

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 400);
    });

    test('should validate bonus amount', async ({ authenticatedAdminApi }) => {
      const bonusData = DataGenerator.generateAdminBonus({
        maxBonus: -100, // Invalid negative amount
      });

      const response = await authenticatedAdminApi.createBonus(bonusData);
      await deleteIfCreated(authenticatedAdminApi, response);

      TestHelpers.assertFailure(response);
    });

    test('should validate wager requirement', async ({ authenticatedAdminApi }) => {
      const bonusData = DataGenerator.generateAdminBonus({
        wageringMultiplier: -10, // Invalid negative requirement
      });

      const response = await authenticatedAdminApi.createBonus(bonusData);
      await deleteIfCreated(authenticatedAdminApi, response);

      TestHelpers.assertFailure(response);
    });

    test('should validate valid days', async ({ authenticatedAdminApi }) => {
      const bonusData = DataGenerator.generateAdminBonus({
        validityDays: 0, // Invalid: should be at least 1
      });

      const response = await authenticatedAdminApi.createBonus(bonusData);
      await deleteIfCreated(authenticatedAdminApi, response);

      TestHelpers.assertFailure(response);
    });
  });
});
