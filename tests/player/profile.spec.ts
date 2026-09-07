/**
 * Player API - Profile Management Tests
 *
 * PATCH /profile/me changes to email / phone / dateOfBirth run the SEON account_edit
 * gate and alter the shared staging account, so those cases are skipped. Writes that
 * remain (displayName, timezone) are restored in the same test.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers } from '../../fixtures';

const SEON_GATED =
  'Skipped: mutates real player balance/status on staging (PATCH /profile/me email/phone/dateOfBirth run the SEON account_edit gate on the shared account)';
const NO_2FA = 'Backend has no two-factor authentication endpoint (checked postman/WulfCasino-Player-API)';

test.describe('Player API - Profile Management', () => {
  test.describe('Profile Operations', () => {
    test('should get player profile @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getProfile();

      TestHelpers.assertSuccess(response, 'Get profile should succeed');
      TestHelpers.assertHasData(response);
      // GET /profile/me wraps the profile as { status, message, data }; the login
      // identity (email/phone) is exposed as "entity".
      const profile = TestHelpers.unwrap(response.data);
      TestHelpers.assertHasProperties(profile, ['id', 'username', 'entity', 'isActive']);
    });

    test('should update player profile', async ({ authenticatedPlayerApi }) => {
      // displayName lives on profile.profile; it is safe to change and restored below
      const before = TestHelpers.unwrap((await authenticatedPlayerApi.getProfile()).data);
      const original = before?.profile?.displayName;
      const displayName = `QA ${Date.now().toString(36)}`;

      try {
        const response = await authenticatedPlayerApi.updateProfile({ displayName });

        TestHelpers.assertSuccess(response, 'Profile update should succeed');
        TestHelpers.assertHasData(response);

        const after = TestHelpers.unwrap((await authenticatedPlayerApi.getProfile()).data);
        expect(after?.profile?.displayName).toBe(displayName);
      } finally {
        if (original) await authenticatedPlayerApi.updateProfile({ displayName: original });
      }
    });

    test('should update partial profile data', async ({ authenticatedPlayerApi }) => {
      // PATCH /profile/me/timezone records the IANA timezone; restored afterwards
      const before = TestHelpers.unwrap((await authenticatedPlayerApi.getProfile()).data);
      const original = before?.timezone;
      const timezone = original === 'America/New_York' ? 'Europe/London' : 'America/New_York';

      try {
        const response = await authenticatedPlayerApi.updateTimezone(timezone);

        TestHelpers.assertSuccess(response, 'Timezone update should succeed');

        const after = TestHelpers.unwrap((await authenticatedPlayerApi.getProfile()).data);
        expect(after?.timezone).toBe(timezone);
      } finally {
        if (original) await authenticatedPlayerApi.updateTimezone(original);
      }
    });

    test('should fail to update with invalid email format', async ({ authenticatedPlayerApi }) => {
      test.skip(true, SEON_GATED);
      const updateData = {
        email: 'invalidemail',
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      TestHelpers.assertFailure(response);
    });

    test('should fail to update with invalid phone format', async ({ authenticatedPlayerApi }) => {
      test.skip(true, SEON_GATED);
      const updateData = {
        phone: 'not-a-phone',
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Avatar Management', () => {
    test('should upload avatar', async ({ authenticatedPlayerApi }) => {
      // PATCH /profile/avatar is gated by the subscription feature 'profileCustomization',
      // which the staging player's Basic plan does not include: expect the guard to refuse.
      const before = TestHelpers.unwrap((await authenticatedPlayerApi.getProfile()).data);

      const response = await authenticatedPlayerApi.uploadAvatar({ avatar: 'samurai_red' });

      if (response.success && before?.avatar) {
        // Plan changed on staging: put the previous avatar back
        await authenticatedPlayerApi.uploadAvatar({ avatar: before.avatar });
      }
      TestHelpers.assertFailure(response, 'Basic plan must not allow avatar customization');
      TestHelpers.assertStatusCode(response, 403);
    });
  });

  test.describe('Two-Factor Authentication', () => {
    test('should enable two-factor authentication', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_2FA);
      const response = await authenticatedPlayerApi.enableTwoFactor();

      // Should return QR code or secret
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should verify two-factor code', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_2FA);
      const response = await authenticatedPlayerApi.verifyTwoFactor('123456');

      // Should succeed with valid code or fail with invalid
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should disable two-factor authentication', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_2FA);
      const response = await authenticatedPlayerApi.disableTwoFactor('123456');

      // Should succeed with valid code
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should fail to verify with invalid 2FA code', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_2FA);
      const response = await authenticatedPlayerApi.verifyTwoFactor('000000');

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Profile Validation', () => {
    test('should validate email uniqueness', async ({ authenticatedPlayerApi }) => {
      test.skip(true, SEON_GATED);
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
      test.skip(true, SEON_GATED);
      const updateData = {
        dateOfBirth: 'invalid-date',
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      TestHelpers.assertFailure(response);
    });

    test('should validate age requirement', async ({ authenticatedPlayerApi }) => {
      test.skip(true, SEON_GATED);
      const updateData = {
        dateOfBirth: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
      };

      const response = await authenticatedPlayerApi.updateProfile(updateData);

      TestHelpers.assertFailure(response, 'Should reject underage users');
    });

    test('should reject a fixed-offset timezone', async ({ authenticatedPlayerApi }) => {
      // PATCH /profile/me/timezone only accepts IANA names; '+05:30' is rejected with 400
      const response = await authenticatedPlayerApi.updateTimezone('+05:30');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 400);
    });
  });

  test.describe('Profile Security', () => {
    test('should require authentication to view profile', async ({ playerApi }) => {
      const response = await playerApi.getProfile();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication to update profile', async ({ playerApi }) => {
      const response = await playerApi.updateProfile({ displayName: 'Test' });

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
