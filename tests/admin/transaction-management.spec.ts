/**
 * Admin API - Transaction Management Tests
 *
 * Real endpoints (postman/WulfCasino-Admin-API): GET /admin/transactions/all
 * (filters: type, source, fromDate, toDate, search, paymentMethod, minAmount,
 * maxAmount, userId - no sort/status params) and GET /admin/reports/daily-report.
 * There is no single-transaction route and no transaction status endpoint.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';

const NO_GET_BY_ID = 'Backend has no GET /admin/transactions/:id endpoint (checked postman/WulfCasino-Admin-API)';
const NO_STATUS_UPDATE =
  'Backend has no transaction status endpoint; only redeem/payout requests have one and those are shared staging data that must not be changed (checked postman/WulfCasino-Admin-API)';
const NO_SORT = 'Backend GET /admin/transactions/all has no sortBy/sortOrder parameters (checked postman/WulfCasino-Admin-API)';

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
      test.skip(true, NO_GET_BY_ID);
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
      test.skip(true, NO_GET_BY_ID);
      const response = await authenticatedAdminApi.getTransactionById('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Transaction Status Management', () => {
    test('should update transaction status', async ({ authenticatedAdminApi }) => {
      test.skip(true, NO_STATUS_UPDATE);
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
      test.skip(true, NO_STATUS_UPDATE);
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
      // Transaction types are upper-case enums: DEPOSIT, CREDIT, DEBIT, PROMOTION, ...
      const type = 'DEPOSIT';
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        type,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      const rows = TestHelpers.paginatedRows(response.data);
      expect(rows.length).toBeGreaterThan(0);
      for (const transaction of rows) {
        expect(transaction.type).toBe(type);
      }
    });

    test('should filter transactions by status', async ({ authenticatedAdminApi }) => {
      test.skip(
        true,
        'Backend GET /admin/transactions/all has no status filter (wallet transactions carry no status) (checked postman/WulfCasino-Admin-API)'
      );
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        ...TestData.filters.completed,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter transactions by date range', async ({ authenticatedAdminApi }) => {
      // The list uses fromDate / toDate (YYYY-MM-DD)
      const fromDate = TestData.dateRanges.lastWeek.startDate;
      const toDate = TestData.dateRanges.lastWeek.endDate;
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        fromDate,
        toDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      const lower = new Date(`${fromDate}T00:00:00.000Z`).getTime();
      const upper = new Date(`${toDate}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000;
      for (const transaction of TestHelpers.paginatedRows(response.data)) {
        const created = new Date(transaction.createdAt).getTime();
        expect(created, `transaction ${transaction.id} should be within the date range`).toBeGreaterThanOrEqual(lower);
        expect(created, `transaction ${transaction.id} should be within the date range`).toBeLessThan(upper);
      }
    });

    test('should filter transactions by user', async ({ authenticatedAdminApi }) => {
      // userId must be a real UUID: take it from an existing transaction
      const sample = await authenticatedAdminApi.getAllTransactions({ page: 1, limit: 1 });
      TestHelpers.assertSuccess(sample);
      const userId = TestHelpers.paginatedRows(sample.data)[0]?.userId;
      test.skip(!userId, 'no transactions on staging to derive a user from');

      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        userId,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      const rows = TestHelpers.paginatedRows(response.data);
      expect(rows.length).toBeGreaterThan(0);
      for (const transaction of rows) {
        expect(transaction.userId).toBe(userId);
      }
    });

    test('should filter transactions by amount range', async ({ authenticatedAdminApi }) => {
      const minAmount = 10;
      const maxAmount = 100;
      const response = await authenticatedAdminApi.getAllTransactions({
        page: 1,
        limit: 10,
        minAmount,
        maxAmount,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const transaction of TestHelpers.paginatedRows(response.data)) {
        // `amount` is a decimal string; rows without one (e.g. jackpot contributions) carry the movement in *Added fields
        if (transaction.amount === null || transaction.amount === undefined) continue;
        const amount = Math.abs(Number(transaction.amount));
        expect(amount, `transaction ${transaction.id} amount ${transaction.amount}`).toBeGreaterThanOrEqual(minAmount);
        expect(amount, `transaction ${transaction.id} amount ${transaction.amount}`).toBeLessThanOrEqual(maxAmount);
      }
    });
  });

  test.describe('Transaction Sorting', () => {
    test('should sort transactions by date', async ({ authenticatedAdminApi }) => {
      test.skip(true, NO_SORT);
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
      test.skip(true, NO_SORT);
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
      // GET /admin/reports/daily-report: { items: [...per day], summary }
      const response = await authenticatedAdminApi.getTransactionReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertHasProperties(response.data, ['items', 'summary']);
      expect(Array.isArray(response.data.items)).toBeTruthy();
      TestHelpers.assertHasProperties(response.data.summary, ['totalPurchase', 'totalRedeem', 'ggr']);
    });
  });
});
