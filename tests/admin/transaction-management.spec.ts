/**
 * Admin API - Transaction Management Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers, DataGenerator } from '../../fixtures';

test.describe('Admin API - Transaction Management', () => {
  test.describe('Transaction Retrieval', () => {
    test('should get all transactions with pagination @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get all transactions should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
    });

    test('should get transaction by ID', async ({ authenticatedAdminApi }) => {
      // First get all transactions
      const listResponse = await authenticatedAdminApi.getAllTransactions({ page: 1, limit: 1 });
      TestHelpers.assertSuccess(listResponse);

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const transactionId = listResponse.data.data[0].id;

        // Get specific transaction
        const response = await authenticatedAdminApi.getTransactionById(transactionId);

        TestHelpers.assertSuccess(response, 'Get transaction by ID should succeed');
        TestHelpers.assertHasData(response);
        expect(response.data?.id).toBe(transactionId);
      }
    });

    test('should fail to get non-existent transaction', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getTransactionById('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Transaction Status Management', () => {
    test('should update transaction status', async ({ authenticatedAdminApi }) => {
      // Get a pending transaction
      const listResponse = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 1,
        ...TestData.filters.pending,
      });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const transactionId = listResponse.data.data[0].id;

        // Update status
        const response = await authenticatedAdminApi.updateTransactionStatus(
          transactionId,
          'completed'
        );

        TestHelpers.assertSuccess(response, 'Transaction status update should succeed');
        TestHelpers.assertHasData(response);
        expect(response.data?.status).toBe('completed');
      }
    });

    test('should handle invalid status transition', async ({ authenticatedAdminApi }) => {
      const listResponse = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 1,
      });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const transactionId = listResponse.data.data[0].id;

        // Try invalid status
        const response = await authenticatedAdminApi.updateTransactionStatus(
          transactionId,
          'invalid_status'
        );

        TestHelpers.assertFailure(response);
      }
    });
  });

  test.describe('Transaction Filters', () => {
    test('should filter transactions by type', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        type: 'deposit',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);

      if (response.data?.data) {
        response.data.data.forEach((transaction: any) => {
          expect(transaction.type).toBe('deposit');
        });
      }
    });

    test('should filter transactions by status', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        ...TestData.filters.completed,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter transactions by date range', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        startDate: TestData.dateRanges.lastWeek.startDate,
        endDate: TestData.dateRanges.lastWeek.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter transactions by user', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        userId: 'test-user-id',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter transactions by amount range', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        minAmount: 10,
        maxAmount: 100,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Transaction Sorting', () => {
    test('should sort transactions by date', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort transactions by amount', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        sortBy: 'amount',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Transaction Reports', () => {
    test('should get transaction report', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getTransactionReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });
});
