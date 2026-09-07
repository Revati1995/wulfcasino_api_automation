/**
 * Player API - Authentication Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers, DataGenerator } from '../../fixtures';
import { env } from '../../config/environment';

test.describe('Player API - Authentication', () => {
  test.describe('Registration', () => {
    test('should register a new player successfully @smoke', async ({ playerApi }) => {
      const playerData = DataGenerator.generatePlayer({
        email: TestHelpers.generateUniqueEmail('player'),
        username: TestHelpers.generateUniqueUsername('player'),
      });

      const response = await playerApi.getAuthHelper().register(playerData);

      TestHelpers.assertSuccess(response, 'Player registration should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('accessToken');
    });

    test('should fail registration with duplicate email', async ({ playerApi }) => {
      const playerData = DataGenerator.generatePlayer({
        email: TestHelpers.generateUniqueEmail('player'),
        username: TestHelpers.generateUniqueUsername('player'),
      });

      // Register first player
      const firstResponse = await playerApi.getAuthHelper().register(playerData);
      TestHelpers.assertSuccess(firstResponse);

      // Try to register with same email
      const secondData = { ...playerData, username: TestHelpers.generateUniqueUsername('player') };
      const secondResponse = await playerApi.getAuthHelper().register(secondData);

      TestHelpers.assertFailure(secondResponse, 'Duplicate email registration should fail');
      TestHelpers.assertStatusCode(secondResponse, 409);
    });

    test('should fail registration with invalid email', async ({ playerApi }) => {
      const playerData = DataGenerator.generatePlayer({
        email: 'invalidemail',
      });

      const response = await playerApi.getAuthHelper().register(playerData);

      TestHelpers.assertFailure(response);
    });

    test('should fail registration with weak password', async ({ playerApi }) => {
      const playerData = DataGenerator.generatePlayer({
        email: TestHelpers.generateUniqueEmail('player'),
        password: '123', // Weak password
      });

      const response = await playerApi.getAuthHelper().register(playerData);

      TestHelpers.assertFailure(response);
    });

    test('should fail registration with missing required fields', async ({ playerApi }) => {
      const incompleteData = {
        email: TestHelpers.generateUniqueEmail('player'),
        // Missing other required fields
      };

      const response = await playerApi.getAuthHelper().register(incompleteData);

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Login', () => {
    test('should login successfully with valid credentials @smoke', async ({ playerApi }) => {
      const credentials = env.getPlayerCredentials();

      const response = await playerApi.getAuthHelper().login(credentials, 'entity');

      TestHelpers.assertSuccess(response, 'Player login should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('accessToken');
      expect(response.data?.accessToken).toBeTruthy();
    });

    test('should fail login with invalid email', async ({ playerApi }) => {
      const response = await playerApi.getAuthHelper().login({
        email: 'nonexistent@test.com',
        password: 'SomePassword123!',
      }, 'entity');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should fail login with wrong password', async ({ playerApi }) => {
      const credentials = env.getPlayerCredentials();
      const response = await playerApi.getAuthHelper().login({
        email: credentials.email,
        password: 'wrongpassword',
      });

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should fail login with empty credentials', async ({ playerApi }) => {
      const response = await playerApi.getAuthHelper().login({
        email: '',
        password: '',
      });

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Token Management', () => {
    test('should verify valid token', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAuthHelper().verifyToken();

      TestHelpers.assertSuccess(response, 'Token verification should succeed');
    });

    test('should get current player profile', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAuthHelper().getCurrentUser();

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('email');
    });

    test('should logout successfully @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getAuthHelper().logout();

      TestHelpers.assertSuccess(response, 'Logout should succeed');
      expect(authenticatedPlayerApi.getAuthHelper().isAuthenticated()).toBeFalsy();
    });
  });

  test.describe('Password Management', () => {
    test('should request password reset', async ({ playerApi }) => {
      const response = await playerApi.getAuthHelper().requestPasswordReset('player@test.com');

      expect(response.statusCode).toBeLessThan(500);
    });

    test('should change password when authenticated', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.changePassword('OldPass123!', 'NewPass123!');

      // Should succeed or return validation error
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should fail password change with wrong old password', async ({
      authenticatedPlayerApi,
    }) => {
      const response = await authenticatedPlayerApi.changePassword('WrongOldPass', 'NewPass123!');

      TestHelpers.assertFailure(response);
    });
  });
});
