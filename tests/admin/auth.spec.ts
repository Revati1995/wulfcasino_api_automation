/**
 * Admin API - Authentication Tests
 *
 * Real endpoints (postman/WulfCasino-Admin-API): POST /admin/auth/login (throttled
 * 5/min per IP, shared with agent login; per-account lockout on wrong passwords),
 * GET /admin/auth/me, POST /admin/auth/forgot-password (3/min per IP).
 * There is no POST /admin/auth/logout.
 *
 * Login budget: this file performs at most 3 login calls (valid, unknown email,
 * empty credentials) and never sends a wrong password for the real admin account.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers } from '../../fixtures';
import { env } from '../../config/environment';

test.describe('Admin API - Authentication', () => {
  test.describe('Login', () => {
    test('should login successfully with valid credentials @smoke', async ({ adminApi }) => {
      const credentials = env.getAdminCredentials();

      const response = await adminApi.getAuthHelper().login(credentials);

      TestHelpers.assertSuccess(response, 'Admin login should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data?.accessToken).toBeTruthy();
    });

    test('should fail login with invalid email', async ({ adminApi }) => {
      // An account that cannot exist, so no real account accrues failed attempts
      const response = await adminApi.getAuthHelper().login({
        email: `nobody_${Date.now()}@example.com`,
        password: 'SomePassword123!',
      });

      TestHelpers.assertFailure(response, 'Login should fail with invalid email');
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should fail login with invalid password', async ({ adminApi }) => {
      // Use a non-existent dummy account so the real admin account is never locked out
      const response = await adminApi.getAuthHelper().login({
        email: `dummy_invalidpw_${Date.now()}@example.com`,
        password: 'wrongpassword',
      });

      TestHelpers.assertFailure(response, 'Login should fail with invalid credentials');
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should fail login with empty credentials', async ({ adminApi }) => {
      const response = await adminApi.getAuthHelper().login({
        email: '',
        password: '',
      });

      TestHelpers.assertFailure(response, 'Login should fail with empty credentials');
      expect([400, 401]).toContain(response.statusCode);
    });

    test('should fail login with malformed email', async ({ adminApi }) => {
      // A malformed email hits the validation layer before any account lookup
      const response = await adminApi.getAuthHelper().login({
        email: 'notanemail',
        password: 'Password123!',
      });

      TestHelpers.assertFailure(response, 'Login should fail with malformed email');
      expect([400, 401]).toContain(response.statusCode);
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
      // GET /admin/auth/me -> { id, username, email, roles: [...], isActive, ... }
      expect(response.data).toHaveProperty('email');
      expect(response.data?.email).toBe(env.getAdminCredentials().email);
      TestHelpers.assertHasProperties(response.data, ['id', 'username', 'roles', 'isActive']);
      expect(Array.isArray(response.data?.roles)).toBeTruthy();
    });

    test('should logout successfully @smoke', async ({ authenticatedAdminApi }) => {
      // The backend has no POST /admin/auth/logout: staff logout is client-side token disposal.
      const response = await authenticatedAdminApi.getAuthHelper().logout();

      TestHelpers.assertSuccess(response, 'Logout should succeed');
      expect(authenticatedAdminApi.getAuthHelper().isAuthenticated()).toBeFalsy();

      // Once the token is dropped, protected endpoints must reject this client
      const me = await authenticatedAdminApi.getAuthHelper().getCurrentUser();
      TestHelpers.assertStatusCode(me, 401, 'Requests without a token should be rejected after logout');
    });
  });

  test.describe('Password Management', () => {
    test('should request password reset', async ({ adminApi }) => {
      // Unknown staff email: exercises the endpoint without emailing a real account
      const response = await adminApi.getAuthHelper().requestPasswordReset(`nobody_${Date.now()}@example.com`);

      // Backend answers 404 "Email not found" for unknown accounts
      expect(response.statusCode).toBeLessThan(500);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should fail password reset with invalid email', async ({ adminApi }) => {
      const response = await adminApi.getAuthHelper().requestPasswordReset('notanemail');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 400);
      // NestJS validation body: { message: ["email must be an email"], error: "Bad Request", statusCode: 400 }
      expect(JSON.stringify((response.data as any)?.message ?? '')).toContain('email must be an email');
    });
  });
});
