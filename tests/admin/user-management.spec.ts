/**
 * Admin API - User Management Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers, DataGenerator } from '../../fixtures';

test.describe('Admin API - User Management', () => {
  let createdUserId: string;

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

    test('should create a new user @regression', async ({ authenticatedAdminApi }) => {
      const userData = DataGenerator.generateUser({
        email: TestHelpers.generateUniqueEmail('admin_test'),
      });

      const response = await authenticatedAdminApi.createUser(userData);

      TestHelpers.assertSuccess(response, 'User creation should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data?.email).toBe(userData.email);

      // Store for cleanup
      createdUserId = response.data?.id;
    });

    test('should get user by ID', async ({ authenticatedAdminApi }) => {
      // First create a user
      const userData = DataGenerator.generateUser({
        email: TestHelpers.generateUniqueEmail('admin_test'),
      });
      const createResponse = await authenticatedAdminApi.createUser(userData);
      TestHelpers.assertSuccess(createResponse);
      const userId = createResponse.data?.id;

      // Then get the user
      const response = await authenticatedAdminApi.getUserById(userId);

      TestHelpers.assertSuccess(response, 'Get user by ID should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(userId);
      expect(response.data?.email).toBe(userData.email);
    });

    test('should update user information', async ({ authenticatedAdminApi }) => {
      // Create a user first
      const userData = DataGenerator.generateUser({
        email: TestHelpers.generateUniqueEmail('admin_test'),
      });
      const createResponse = await authenticatedAdminApi.createUser(userData);
      TestHelpers.assertSuccess(createResponse);
      const userId = createResponse.data?.id;

      // Update the user
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };
      const response = await authenticatedAdminApi.updateUser(userId, updateData);

      TestHelpers.assertSuccess(response, 'User update should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.firstName).toBe(updateData.firstName);
      expect(response.data?.lastName).toBe(updateData.lastName);
    });

    test('should update user status', async ({ authenticatedAdminApi }) => {
      // Create a user first
      const userData = DataGenerator.generateUser({
        email: TestHelpers.generateUniqueEmail('admin_test'),
      });
      const createResponse = await authenticatedAdminApi.createUser(userData);
      TestHelpers.assertSuccess(createResponse);
      const userId = createResponse.data?.id;

      // Update status
      const response = await authenticatedAdminApi.updateUserStatus(userId, 'inactive');

      TestHelpers.assertSuccess(response, 'User status update should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.status).toBe('inactive');
    });

    test('should delete user', async ({ authenticatedAdminApi }) => {
      // Create a user first
      const userData = DataGenerator.generateUser({
        email: TestHelpers.generateUniqueEmail('admin_test'),
      });
      const createResponse = await authenticatedAdminApi.createUser(userData);
      TestHelpers.assertSuccess(createResponse);
      const userId = createResponse.data?.id;

      // Delete the user
      const response = await authenticatedAdminApi.deleteUser(userId);

      TestHelpers.assertSuccess(response, 'User deletion should succeed');
    });

    test('should fail to get non-existent user', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getUserById('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should fail to create user with duplicate email', async ({ authenticatedAdminApi }) => {
      const userData = DataGenerator.generateUser({
        email: TestHelpers.generateUniqueEmail('admin_test'),
      });

      // Create first user
      const firstResponse = await authenticatedAdminApi.createUser(userData);
      TestHelpers.assertSuccess(firstResponse);

      // Try to create with same email
      const secondResponse = await authenticatedAdminApi.createUser(userData);

      TestHelpers.assertFailure(secondResponse, 'Duplicate user creation should fail');
      TestHelpers.assertStatusCode(secondResponse, 409);
    });

    test('should fail to create user with invalid email', async ({ authenticatedAdminApi }) => {
      const userData = DataGenerator.generateUser({
        email: 'invalidemail',
      });

      const response = await authenticatedAdminApi.createUser(userData);

      TestHelpers.assertFailure(response, 'User creation with invalid email should fail');
    });
  });

  test.describe('User Transactions', () => {
    test('should get user transactions', async ({ authenticatedAdminApi }) => {
      // First create a user
      const userData = DataGenerator.generateUser({
        email: TestHelpers.generateUniqueEmail('admin_test'),
      });
      const createResponse = await authenticatedAdminApi.createUser(userData);
      TestHelpers.assertSuccess(createResponse);
      const userId = createResponse.data?.id;

      // Get transactions
      const response = await authenticatedAdminApi.getUserTransactions(userId, {
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get user transactions should succeed');
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('User Search and Filters', () => {
    test('should filter users by status', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllUsers({
        page: 1,
        limit: 10,
        ...TestData.filters.active,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort users', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllUsers({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should paginate users correctly', async ({ authenticatedAdminApi }) => {
      const page1 = await authenticatedAdminApi.getAllUsers({ page: 1, limit: 5 });
      const page2 = await authenticatedAdminApi.getAllUsers({ page: 2, limit: 5 });

      TestHelpers.assertSuccess(page1);
      TestHelpers.assertSuccess(page2);

      expect(page1.data?.pagination.page).toBe(1);
      expect(page2.data?.pagination.page).toBe(2);
    });
  });
});
