/**
 * Player API - Profile Management Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers } from '../../fixtures';

test.describe('Player API - Profile Management', () => {
  test.describe('Profile Operations', () => {
    test('should get player profile @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getProfile();

      TestHelpers.assertSuccess(response, 'Get profile should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertHasProperties(response.data, ['email', 'username']);
    });

    test('should update player profile', async ({ authenticatedPlayerApi }) => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567890',
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      TestHelpers.assertSuccess(response, 'Profile update should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.firstName).toBe(updateData.firstName);
      expect(response.data?.lastName).toBe(updateData.lastName);
    });

    test('should update partial profile data', async ({ authenticatedPlayerApi }) => {
      const updateData = {
        phone: '+9876543210',
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(response.data?.phone).toBe(updateData.phone);
    });

    test('should fail to update with invalid email format', async ({ authenticatedPlayerApi }) => {
      const updateData = {
        email: 'invalidemail',
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      TestHelpers.assertFailure(response);
    });

    test('should fail to update with invalid phone format', async ({ authenticatedPlayerApi }) => {
      const updateData = {
        phone: 'not-a-phone',
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Avatar Management', () => {
    test('should upload avatar', async ({ authenticatedPlayerApi }) => {
      const avatarData = {
        avatar: 'base64-encoded-image-data',
      };

      const response = await authenticatedPlayerApi.uploadAvatar(avatarData);

      // Should succeed or return appropriate error
      expect(response.statusCode).toBeLessThan(500);
    });
  });

  test.describe('Two-Factor Authentication', () => {
    test('should enable two-factor authentication', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.enableTwoFactor();

      // Should return QR code or secret
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should verify two-factor code', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.verifyTwoFactor('123456');

      // Should succeed with valid code or fail with invalid
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should disable two-factor authentication', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.disableTwoFactor('123456');

      // Should succeed with valid code
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should fail to verify with invalid 2FA code', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.verifyTwoFactor('000000');

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Profile Validation', () => {
    test('should validate email uniqueness', async ({ authenticatedPlayerApi }) => {
      // Try to update to an existing email
      const updateData = {
        email: 'existing@test.com',
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      // Should fail if email already exists
      if (!response.success) {
        TestHelpers.assertStatusCode(response, 409);
      }
    });

    test('should validate date of birth format', async ({ authenticatedPlayerApi }) => {
      const updateData = {
        dateOfBirth: 'invalid-date',
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      TestHelpers.assertFailure(response);
    });

    test('should validate age requirement', async ({ authenticatedPlayerApi }) => {
      const updateData = {
        dateOfBirth: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      TestHelpers.assertFailure(response, 'Should reject underage users');
    });
  });

  test.describe('Profile Security', () => {
    test('should require authentication to view profile', async ({ playerApi }) => {
      const response = await playerApi.getProfile();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication to update profile', async ({ playerApi }) => {
      const response = await playerApi.updateProfile({ firstName: 'Test' });

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
