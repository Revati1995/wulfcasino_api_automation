/**
 * Admin API - Settings Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers } from '../../fixtures';

test.describe('Admin API - Settings', () => {
  test.describe('System Settings', () => {
    test('should get system settings @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getSystemSettings();

      TestHelpers.assertSuccess(response, 'Get system settings should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should update system settings', async ({ authenticatedAdminApi }) => {
      // First get current settings
      const getResponse = await authenticatedAdminApi.getSystemSettings();
      TestHelpers.assertSuccess(getResponse);

      // Update settings
      const updateData = {
        maintenanceMode: false,
        registrationEnabled: true,
        ...getResponse.data,
      };

      const response = await authenticatedAdminApi.updateSystemSettings(updateData);

      TestHelpers.assertSuccess(response, 'Update system settings should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should toggle maintenance mode', async ({ authenticatedAdminApi }) => {
      // Get current settings
      const getResponse = await authenticatedAdminApi.getSystemSettings();
      TestHelpers.assertSuccess(getResponse);
      const currentMode = getResponse.data?.maintenanceMode;

      // Toggle maintenance mode
      const updateData = {
        ...getResponse.data,
        maintenanceMode: !currentMode,
      };
      const response = await authenticatedAdminApi.updateSystemSettings(updateData);

      TestHelpers.assertSuccess(response);
      expect(response.data?.maintenanceMode).toBe(!currentMode);
    });

    test('should update registration settings', async ({ authenticatedAdminApi }) => {
      const getResponse = await authenticatedAdminApi.getSystemSettings();
      TestHelpers.assertSuccess(getResponse);

      const updateData = {
        ...getResponse.data,
        registrationEnabled: true,
        emailVerificationRequired: true,
      };
      const response = await authenticatedAdminApi.updateSystemSettings(updateData);

      TestHelpers.assertSuccess(response);
      expect(response.data?.registrationEnabled).toBe(true);
    });
  });

  test.describe('Game Providers', () => {
    test('should get all game providers @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getGameProviders();

      TestHelpers.assertSuccess(response, 'Get game providers should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertDataIsArray(response);
    });

    test('should update game provider configuration', async ({ authenticatedAdminApi }) => {
      // First get providers
      const listResponse = await authenticatedAdminApi.getGameProviders();
      TestHelpers.assertSuccess(listResponse);

      if (listResponse.data && listResponse.data.length > 0) {
        const providerId = listResponse.data[0].id;

        // Update provider
        const updateData = {
          enabled: true,
          apiKey: 'test-api-key',
        };
        const response = await authenticatedAdminApi.updateGameProvider(providerId, updateData);

        TestHelpers.assertSuccess(response, 'Update game provider should succeed');
      }
    });

    test('should enable game provider', async ({ authenticatedAdminApi }) => {
      const listResponse = await authenticatedAdminApi.getGameProviders();
      TestHelpers.assertSuccess(listResponse);

      if (listResponse.data && listResponse.data.length > 0) {
        const providerId = listResponse.data[0].id;

        const updateData = { enabled: true };
        const response = await authenticatedAdminApi.updateGameProvider(providerId, updateData);

        TestHelpers.assertSuccess(response);
        expect(response.data?.enabled).toBe(true);
      }
    });

    test('should disable game provider', async ({ authenticatedAdminApi }) => {
      const listResponse = await authenticatedAdminApi.getGameProviders();
      TestHelpers.assertSuccess(listResponse);

      if (listResponse.data && listResponse.data.length > 0) {
        const providerId = listResponse.data[0].id;

        const updateData = { enabled: false };
        const response = await authenticatedAdminApi.updateGameProvider(providerId, updateData);

        TestHelpers.assertSuccess(response);
        expect(response.data?.enabled).toBe(false);
      }
    });
  });

  test.describe('Settings Validation', () => {
    test('should validate settings format', async ({ authenticatedAdminApi }) => {
      const invalidSettings = {
        maintenanceMode: 'not-a-boolean', // Should be boolean
      };

      const response = await authenticatedAdminApi.updateSystemSettings(invalidSettings);

      TestHelpers.assertFailure(response);
    });

    test('should reject invalid provider ID', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.updateGameProvider('invalid-id', {
        enabled: true,
      });

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Settings Permissions', () => {
    test('should require admin authentication', async ({ adminApi }) => {
      // Try without authentication
      const response = await adminApi.getSystemSettings();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
