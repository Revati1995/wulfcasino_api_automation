/**
 * Agent API - Authentication Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';
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
      const response = await agentApi.getAuthHelper().login({
        email: 'invalid@test.com',
        password: 'SomePassword123!',
      });

      TestHelpers.assertFailure(response, 'Login should fail with invalid email');
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should fail login with invalid password', async ({ agentApi }) => {
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
      const response = await authenticatedAgentApi.getAuthHelper().logout();

      TestHelpers.assertSuccess(response, 'Logout should succeed');
      expect(authenticatedAgentApi.getAuthHelper().isAuthenticated()).toBeFalsy();
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
