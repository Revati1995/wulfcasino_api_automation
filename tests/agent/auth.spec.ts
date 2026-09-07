/**
 * Agent API - Authentication Tests
 *
 * POST /admin/auth/login is throttled at 5 requests/min per IP (shared with admin logins) and
 * locks the account after repeated wrong passwords. This file therefore makes at most three
 * login calls per run and never sends a wrong password for the real agent account.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers } from '../../fixtures';
import { env } from '../../config/environment';

test.describe('Agent API - Authentication', () => {
  test.describe('Login', () => {
    test('should login successfully with valid credentials @smoke', async ({ agentApi }) => {
      const credentials = env.getAgentCredentials();

      const response = await agentApi.getAuthHelper().login(credentials);

      TestHelpers.assertSuccess(response, 'Agent login should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data?.accessToken).toBeTruthy();
    });

    test('should fail login with invalid email', async ({ agentApi }) => {
      // A non-existent account: no lockout risk for the real agent
      const response = await agentApi.getAuthHelper().login({
        email: `nobody_${Date.now()}@example.com`,
        password: 'SomePassword123!',
      });

      TestHelpers.assertFailure(response, 'Login should fail with invalid email');
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should fail login with invalid password', async ({ agentApi }) => {
      test.skip(
        true,
        'Wrong passwords trigger the per-account lockout on the real agent account and login is throttled 5/min per IP; covered by "should fail login with invalid email"'
      );
      const credentials = env.getAgentCredentials();
      const response = await agentApi.getAuthHelper().login({
        email: credentials.email,
        password: 'wrongpassword',
      });

      TestHelpers.assertFailure(response, 'Login should fail with invalid password');
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should fail login with empty credentials', async ({ agentApi }) => {
      const response = await agentApi.getAuthHelper().login({
        email: '',
        password: '',
      });

      TestHelpers.assertFailure(response, 'Login should fail with empty credentials');
    });

    test('should fail login with malformed email', async ({ agentApi }) => {
      test.skip(true, 'login throttled 5/min per IP; covered by "should fail login with empty credentials"');
      const response = await agentApi.getAuthHelper().login({
        email: 'notanemail',
        password: 'Password123!',
      });

      TestHelpers.assertFailure(response, 'Login should fail with malformed email');
    });
  });

  test.describe('Token Management', () => {
    test('should verify valid token', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getAuthHelper().verifyToken();

      TestHelpers.assertSuccess(response, 'Token verification should succeed');
    });

    test('should get current agent profile', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getAuthHelper().getCurrentUser();

      TestHelpers.assertSuccess(response, 'Get current user should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('email');
    });

    test('should logout successfully @smoke', async ({ authenticatedAgentApi }) => {
      // Agents authenticate through /admin/auth; there is no server-side logout endpoint.
      const response = await authenticatedAgentApi.getAuthHelper().logout();

      TestHelpers.assertSuccess(response, 'Logout should succeed');
      expect(authenticatedAgentApi.getAuthHelper().isAuthenticated()).toBeFalsy();

      // Once the token is dropped, protected endpoints must reject this client
      const me = await authenticatedAgentApi.getAuthHelper().getCurrentUser();
      TestHelpers.assertStatusCode(me, 401, 'Requests without a token should be rejected after logout');
    });
  });

  test.describe('Password Management', () => {
    test('should request password reset', async ({ agentApi }) => {
      const response = await agentApi.getAuthHelper().requestPasswordReset('agent@test.com');

      // Should succeed or return appropriate message
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should fail password reset with invalid email', async ({ agentApi }) => {
      const response = await agentApi.getAuthHelper().requestPasswordReset('notanemail');

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Authentication Security', () => {
    test('should reject access without authentication', async ({ agentApi }) => {
      const response = await agentApi.getProfile();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
