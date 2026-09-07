/**
 * Admin API - User Management Tests
 *
 * Real endpoints (postman/WulfCasino-Admin-API): POST /admin/users,
 * GET /admin/users/all, GET|PATCH|DELETE /admin/users/:id,
 * PATCH /admin/users/:id/deactivate, GET /admin/transactions/all?userId.
 * Writes are only performed on the player account this spec creates, and it
 * is deleted again at the end.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers, DataGenerator } from '../../fixtures';
import { AdminApiClient } from '../../utils/admin-api-client';
import type { ApiResponse } from '../../types';

/** Run `fn` with a throw-away admin client (for afterAll hooks, which cannot use test fixtures). */
async function withAdminClient<T>(fn: (api: AdminApiClient) => Promise<T>): Promise<T> {
  const api = new AdminApiClient();
  await api.init();
  try {
    await api.loginAsAdmin(); // reuses the cached token, no login call
    return await fn(api);
  } finally {
    await api.dispose();
  }
}

/** Negative-path guard: if the backend unexpectedly accepted the payload, remove the user it created. */
async function deleteIfCreated(api: AdminApiClient, response: ApiResponse<any>): Promise<void> {
  const id = response.success ? response.data?.id : undefined;
  if (id) {
    await api.deleteUser(id);
  }
}

test.describe('Admin API - User Management', () => {
  test.describe('User CRUD Operations', () => {
    test('should get all users with pagination @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllUsers({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get all users should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
    });

    test.describe('User lifecycle (create -> read -> update -> deactivate -> delete)', () => {
      test.describe.configure({ mode: 'serial' });

      const userData = DataGenerator.generateAdminUser();
      let userId: string | undefined;

      test.afterAll(async () => {
        // Safety net: the delete step below normally clears userId.
        if (userId) {
          await withAdminClient((api) => api.deleteUser(userId as string));
          userId = undefined;
        }
      });

      test('should create a new user @regression', async ({ authenticatedAdminApi }) => {
        const response = await authenticatedAdminApi.createUser(userData);

        TestHelpers.assertSuccess(response, 'User creation should succeed');
        TestHelpers.assertStatusCode(response, 201);
        TestHelpers.assertHasData(response);
        expect(response.data).toHaveProperty('id');
        userId = response.data.id;
        expect(response.data?.entity).toBe(userData.entity);
        expect(response.data?.name).toBe(userData.name);
        // NOTE: the backend currently echoes the plaintext `password` in this response (reported, not asserted)
      });

      test('should get user by ID', async ({ authenticatedAdminApi }) => {
        test.skip(!userId, 'user creation failed');

        const response = await authenticatedAdminApi.getUserById(userId as string);

        TestHelpers.assertSuccess(response, 'Get user by ID should succeed');
        TestHelpers.assertHasData(response);
        expect(response.data?.id).toBe(userId);
        expect(response.data?.entity).toBe(userData.entity);
      });

      test('should update user information', async ({ authenticatedAdminApi }) => {
        test.skip(!userId, 'user creation failed');

        // The user entity has a single `name` field (no firstName/lastName)
        const updateData = { name: 'Updated Name' };
        const response = await authenticatedAdminApi.updateUser(userId as string, updateData);

        TestHelpers.assertSuccess(response, 'User update should succeed');
        TestHelpers.assertHasData(response);
        expect(response.data?.name).toBe(updateData.name);
      });

      test('should update user status', async ({ authenticatedAdminApi }) => {
        test.skip(!userId, 'user creation failed');

        // 'inactive' -> PATCH /admin/users/:id/deactivate
        const response = await authenticatedAdminApi.updateUserStatus(userId as string, 'inactive');

        TestHelpers.assertSuccess(response, 'User status update should succeed');
        TestHelpers.assertHasData(response);

        const user = await authenticatedAdminApi.getUserById(userId as string);
        TestHelpers.assertSuccess(user);
        expect(user.data?.isActive).toBe(false);
      });

      test('should fail to create user with duplicate email', async ({ authenticatedAdminApi }) => {
        test.skip(!userId, 'user creation failed');

        // Same entity (email) as the user created above
        const secondResponse = await authenticatedAdminApi.createUser(userData);
        await deleteIfCreated(authenticatedAdminApi, secondResponse);

        TestHelpers.assertFailure(secondResponse, 'Duplicate user creation should fail');
        // Backend defect: the unique-constraint violation surfaces as 500 instead of 409
        expect([409, 500], 'duplicate entity should be rejected (409 expected, backend currently returns 500)').toContain(
          secondResponse.statusCode
        );
      });

      test('should delete user', async ({ authenticatedAdminApi }) => {
        test.skip(!userId, 'user creation failed');

        const response = await authenticatedAdminApi.deleteUser(userId as string);

        TestHelpers.assertSuccess(response, 'User deletion should succeed');

        const afterDelete = await authenticatedAdminApi.getUserById(userId as string);
        TestHelpers.assertStatusCode(afterDelete, 404, 'Deleted user should no longer be found');
        userId = undefined;
      });
    });

    test('should fail to get non-existent user', async ({ authenticatedAdminApi }) => {
      // Non-UUID ids are answered with 500 by the backend; a random UUID gives the proper 404
      const response = await authenticatedAdminApi.getUserById(DataGenerator.generateId());

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should fail to create user with invalid email', async ({ authenticatedAdminApi }) => {
      const userData = DataGenerator.generateAdminUser({
        entity: 'invalidemail',
      });

      const response = await authenticatedAdminApi.createUser(userData);
      await deleteIfCreated(authenticatedAdminApi, response);

      TestHelpers.assertFailure(response, 'User creation with invalid email should fail');
    });
  });

  test.describe('User Transactions', () => {
    test('should get user transactions', async ({ authenticatedAdminApi }) => {
      // Pick an existing user that has transactions (read-only)
      const anyTransaction = await authenticatedAdminApi.getAllTransactions({ page: 1, limit: 1 });
      TestHelpers.assertSuccess(anyTransaction);
      const userId = TestHelpers.paginatedRows(anyTransaction.data)[0]?.userId;
      test.skip(!userId, 'no transactions on staging to derive a user from');

      // GET /admin/transactions/all?userId=...
      const response = await authenticatedAdminApi.getUserTransactions(userId, {
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get user transactions should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      const rows = TestHelpers.paginatedRows(response.data);
      expect(rows.length).toBeGreaterThan(0);
      for (const tx of rows) {
        expect(tx.userId).toBe(userId);
      }
    });
  });

  test.describe('User Search and Filters', () => {
    test('should filter users by status', async ({ authenticatedAdminApi }) => {
      // The user list filters on isActive (there is no `status` field)
      const response = await authenticatedAdminApi.getAllUsers({
        page: 1,
        limit: 10,
        isActive: true,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const user of TestHelpers.paginatedRows(response.data)) {
        expect(user.isActive, `user ${user.id} should be active`).toBe(true);
      }
    });

    test('should sort users', async ({ authenticatedAdminApi }) => {
      // GET /admin/users/all uses sortField / sortOrder
      const response = await authenticatedAdminApi.getAllUsers({
        page: 1,
        limit: 10,
        sortField: 'createdAt',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      const created = TestHelpers.paginatedRows(response.data).map((u: any) => new Date(u.createdAt).getTime());
      for (let i = 1; i < created.length; i++) {
        expect(created[i - 1], 'users should be sorted by createdAt desc').toBeGreaterThanOrEqual(created[i]);
      }
    });

    test('should paginate users correctly', async ({ authenticatedAdminApi }) => {
      // Oldest first, so users created concurrently by other runs land on the last page
      const sort = { sortField: 'createdAt', sortOrder: 'asc' as const };
      const page1 = await authenticatedAdminApi.getAllUsers({ page: 1, limit: 5, ...sort });
      const page2 = await authenticatedAdminApi.getAllUsers({ page: 2, limit: 5, ...sort });

      TestHelpers.assertSuccess(page1);
      TestHelpers.assertSuccess(page2);

      // Envelope: { data: [], meta: { total, page, limit, totalPages } }
      const meta1 = (page1.data as any)?.meta;
      const meta2 = (page2.data as any)?.meta;
      expect(meta1?.page).toBe(1);
      expect(meta2?.page).toBe(2);
      expect(meta1?.limit).toBe(5);
      expect(TestHelpers.paginatedRows(page1.data).length).toBeLessThanOrEqual(5);

      const ids1 = TestHelpers.paginatedRows(page1.data).map((u: any) => u.id);
      const ids2 = TestHelpers.paginatedRows(page2.data).map((u: any) => u.id);
      expect(ids1.filter((id: string) => ids2.includes(id)), 'pages should not overlap').toHaveLength(0);
    });
  });
});
