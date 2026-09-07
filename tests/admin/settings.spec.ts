/**
 * Admin API - Settings Tests
 *
 * Real endpoints (postman/WulfCasino-Admin-API): GET /admin/system-config,
 * GET /admin/system-config/defaults, PUT /admin/system-config, GET /admin/games/providers,
 * PATCH /admin/games/providers/:id.
 *
 * The system configuration and the game providers are shared, live staging
 * state with no create/delete: every test that would write to them is skipped.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers, DataGenerator } from '../../fixtures';

const SHARED_CONFIG =
  'PUT /admin/system-config replaces the shared staging configuration (maintenance mode, deposit limits, ...) and must not be called by tests';
const SHARED_PROVIDER =
  'PATCH /admin/games/providers/:id would enable/disable a shared staging provider; the backend has no create/delete to make a disposable one';

test.describe('Admin API - Settings', () => {
  test.describe('System Settings', () => {
    test('should get system settings @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getSystemSettings();

      TestHelpers.assertSuccess(response, 'Get system settings should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should update system settings', async ({ authenticatedAdminApi }) => {
      test.skip(true, SHARED_CONFIG);
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
      test.skip(true, `${SHARED_CONFIG} (toggling maintenance mode would take staging offline)`);
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
      test.skip(true, SHARED_CONFIG);
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

    test('should expose the configuration sections and shipped defaults', async ({ authenticatedAdminApi }) => {
      // GET /admin/system-config -> { key, version, config: { general, finance, deposit, ... } }
      const current = await authenticatedAdminApi.getSystemSettings();
      TestHelpers.assertSuccess(current);
      TestHelpers.assertHasProperties(current.data, ['key', 'version', 'config']);
      TestHelpers.assertHasProperties(current.data.config, ['general', 'finance', 'deposit', 'withdraw_redeem']);
      expect(typeof current.data.config.general.maintenance_mode).toBe('boolean');

      // GET /admin/system-config/defaults -> the shipped sections (read-only)
      const defaults = await authenticatedAdminApi.getSystemSettingsDefaults();
      TestHelpers.assertSuccess(defaults, 'Get configuration defaults should succeed');
      TestHelpers.assertHasProperties(defaults.data, ['general', 'finance', 'deposit', 'withdraw_redeem']);
      expect(typeof defaults.data.general.maintenance_mode).toBe('boolean');
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
      test.skip(true, SHARED_PROVIDER);
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
      test.skip(true, SHARED_PROVIDER);
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
      test.skip(true, SHARED_PROVIDER);
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

    test('should describe each provider', async ({ authenticatedAdminApi }) => {
      // [ { id, name, slug, enabled, displayOrder, logo, gameCount } ]
      const response = await authenticatedAdminApi.getGameProviders();
      TestHelpers.assertSuccess(response);
      TestHelpers.assertDataIsArray(response);
      expect(response.data!.length).toBeGreaterThan(0);
      for (const provider of response.data as any[]) {
        TestHelpers.assertHasProperties(provider, ['id', 'name', 'slug', 'enabled', 'displayOrder', 'gameCount']);
        expect(typeof provider.enabled).toBe('boolean');
        expect(typeof provider.gameCount).toBe('number');
      }
    });
  });

  test.describe('Settings Validation', () => {
    test('should validate settings format', async ({ authenticatedAdminApi }) => {
      test.skip(
        true,
        `${SHARED_CONFIG} (the body is untyped Partial<SystemConfig>, so an invalid payload would be written as-is)`
      );
      const invalidSettings = {
        maintenanceMode: 'not-a-boolean', // Should be boolean
      };

      const response = await authenticatedAdminApi.updateSystemSettings(invalidSettings);

      TestHelpers.assertFailure(response);
    });

    test('should reject invalid provider ID', async ({ authenticatedAdminApi }) => {
      // A random UUID matches no provider, so nothing can be mutated
      const response = await authenticatedAdminApi.updateGameProvider(DataGenerator.generateId(), {
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
