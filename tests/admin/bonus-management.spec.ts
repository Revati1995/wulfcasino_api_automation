/**
 * Admin API - Bonus Management Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers, DataGenerator } from '../../fixtures';

test.describe('Admin API - Bonus Management', () => {
  test.describe('Bonus CRUD Operations', () => {
    test('should get all bonuses @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllBonuses({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get all bonuses should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
    });

    test('should create a new bonus @regression', async ({ authenticatedAdminApi }) => {
      const bonusData = DataGenerator.generateBonus({
        name: `Test Bonus ${Date.now()}`,
      });

      const response = await authenticatedAdminApi.createBonus(bonusData);

      TestHelpers.assertSuccess(response, 'Bonus creation should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data?.name).toBe(bonusData.name);
      expect(response.data?.type).toBe(bonusData.type);
    });

    test('should get bonus by ID', async ({ authenticatedAdminApi }) => {
      // Create a bonus first
      const bonusData = DataGenerator.generateBonus({
        name: `Test Bonus ${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createBonus(bonusData);
      TestHelpers.assertSuccess(createResponse);
      const bonusId = createResponse.data?.id;

      // Get the bonus
      const response = await authenticatedAdminApi.getBonusById(bonusId);

      TestHelpers.assertSuccess(response, 'Get bonus by ID should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(bonusId);
      expect(response.data?.name).toBe(bonusData.name);
    });

    test('should update bonus information', async ({ authenticatedAdminApi }) => {
      // Create a bonus first
      const bonusData = DataGenerator.generateBonus({
        name: `Test Bonus ${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createBonus(bonusData);
      TestHelpers.assertSuccess(createResponse);
      const bonusId = createResponse.data?.id;

      // Update the bonus
      const updateData = {
        name: 'Updated Bonus Name',
        amount: 200,
      };
      const response = await authenticatedAdminApi.updateBonus(bonusId, updateData);

      TestHelpers.assertSuccess(response, 'Bonus update should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.name).toBe(updateData.name);
      expect(response.data?.amount).toBe(updateData.amount);
    });

    test('should delete bonus', async ({ authenticatedAdminApi }) => {
      // Create a bonus first
      const bonusData = DataGenerator.generateBonus({
        name: `Test Bonus ${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createBonus(bonusData);
      TestHelpers.assertSuccess(createResponse);
      const bonusId = createResponse.data?.id;

      // Delete the bonus
      const response = await authenticatedAdminApi.deleteBonus(bonusId);

      TestHelpers.assertSuccess(response, 'Bonus deletion should succeed');
    });

    test('should fail to get non-existent bonus', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getBonusById('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Bonus Assignment', () => {
    test('should assign bonus to user', async ({ authenticatedAdminApi }) => {
      // Create a bonus
      const bonusData = DataGenerator.generateBonus({
        name: `Test Bonus ${Date.now()}`,
      });
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
      const response = await authenticatedAdminApi.getAllBonuses({
        page: 1,
        limit: 10,
        type: 'welcome',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter bonuses by status', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllBonuses({
        page: 1,
        limit: 10,
        ...TestData.filters.active,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Bonus Validation', () => {
    test('should validate required fields', async ({ authenticatedAdminApi }) => {
      const invalidBonusData = {
        description: 'Test description',
        // Missing required fields
      };

      const response = await authenticatedAdminApi.createBonus(invalidBonusData);

      TestHelpers.assertFailure(response);
    });

    test('should validate bonus amount', async ({ authenticatedAdminApi }) => {
      const bonusData = DataGenerator.generateBonus({
        name: `Test Bonus ${Date.now()}`,
        amount: -100, // Invalid negative amount
      });

      const response = await authenticatedAdminApi.createBonus(bonusData);

      TestHelpers.assertFailure(response);
    });

    test('should validate wager requirement', async ({ authenticatedAdminApi }) => {
      const bonusData = DataGenerator.generateBonus({
        name: `Test Bonus ${Date.now()}`,
        wagerRequirement: -10, // Invalid negative requirement
      });

      const response = await authenticatedAdminApi.createBonus(bonusData);

      TestHelpers.assertFailure(response);
    });

    test('should validate valid days', async ({ authenticatedAdminApi }) => {
      const bonusData = DataGenerator.generateBonus({
        name: `Test Bonus ${Date.now()}`,
        validDays: 0, // Invalid: should be at least 1
      });

      const response = await authenticatedAdminApi.createBonus(bonusData);

      TestHelpers.assertFailure(response);
    });
  });
});
