/**
 * Admin API - Authentication Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers, DataGenerator } from '../../fixtures';
import { env } from '../../config/environment';

test.describe('Admin API - Authentication', () => {
  test.describe('Login', () => {
    test('should login successfully with valid credentials @smoke', async ({ adminApi }) => {
      const credentials = env.getAdminCredentials();

      const response = await adminApi.getAuthHelper().login(credentials);

      TestHelpers.assertSuccess(response, 'Admin login should succeed');
      TestHelpers.assertHasData(response, 'Login response should contain data');
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data?.accessToken).toBeTruthy();
    });

    test('should fail login with invalid email', async ({ adminApi }) => {
      const response = await adminApi.getAuthHelper().login({
        email: 'invalid@test.com',
        password: 'SomePassword123!',
      });

      TestHelpers.assertFailure(response, 'Login should fail with invalid email');
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should fail login with invalid password', async ({ adminApi }) => {
      const credentials = env.getAdminCredentials();
      const response = await adminApi.getAuthHelper().login({
        email: credentials.email,
        password: 'wrongpassword',
      });

      TestHelpers.assertFailure(response, 'Login should fail with invalid password');
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should fail login with empty credentials', async ({ adminApi }) => {
      const response = await adminApi.getAuthHelper().login({
        email: '',
        password: '',
      });

      TestHelpers.assertFailure(response, 'Login should fail with empty credentials');
    });

    test('should fail login with malformed email', async ({ adminApi }) => {
      const response = await adminApi.getAuthHelper().login({
        email: 'notanemail',
        password: 'Password123!',
      });

      TestHelpers.assertFailure(response, 'Login should fail with malformed email');
    });
  });

  test.describe('Token Management', () => {
    test('should verify valid token', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAuthHelper().verifyToken();

      TestHelpers.assertSuccess(response, 'Token verification should succeed');
    });

    test('should get current admin user', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAuthHelper().getCurrentUser();

      TestHelpers.assertSuccess(response, 'Get current user should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('email');
    });

    test('should logout successfully @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAuthHelper().logout();

      TestHelpers.assertSuccess(response, 'Logout should succeed');
      expect(authenticatedAdminApi.getAuthHelper().isAuthenticated()).toBeFalsy();
    });
  });

  test.describe('Password Management', () => {
    test('should request password reset', async ({ adminApi }) => {
      const response = await adminApi.getAuthHelper().requestPasswordReset('admin@test.com');

      // Should succeed or return appropriate message
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should fail password reset with invalid email', async ({ adminApi }) => {
      const response = await adminApi.getAuthHelper().requestPasswordReset('notanemail');

      TestHelpers.assertFailure(response);
    });
  });
});
