/**
 * Agent API - Financial Management Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';

test.describe('Agent API - Financial Management', () => {
  test.describe('Financial Summary', () => {
    test('should get financial summary @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getFinancialSummary();

      TestHelpers.assertSuccess(response, 'Get financial summary should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertHasProperties(response.data, [
        'totalRevenue',
        'totalCommission',
        'totalPlayers',
      ]);
    });

    test('should show current balance', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getFinancialSummary();

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('balance');
      expect(typeof response.data?.balance).toBe('number');
    });
  });

  test.describe('Transaction Management', () => {
    test('should get all transactions @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getTransactions({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get transactions should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should get transaction by ID', async ({ authenticatedAgentApi }) => {
      // Get transactions first
      const listResponse = await authenticatedAgentApi.getTransactions({ page: 1, limit: 1 });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const transactionId = listResponse.data.data[0].id;

        const response = await authenticatedAgentApi.getTransactionById(transactionId);

        TestHelpers.assertSuccess(response, 'Get transaction by ID should succeed');
        TestHelpers.assertHasData(response);
        expect(response.data?.id).toBe(transactionId);
      }
    });

    test('should filter transactions by type', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getTransactions({
        page: 1,
        limit: 10,
        type: 'commission',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter transactions by date range', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getTransactions({
        page: 1,
        limit: 10,
        startDate: TestData.dateRanges.lastWeek.startDate,
        endDate: TestData.dateRanges.lastWeek.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter transactions by status', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getTransactions({
        page: 1,
        limit: 10,
        ...TestData.filters.completed,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort transactions', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getTransactions({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should paginate transactions', async ({ authenticatedAgentApi }) => {
      const page1 = await authenticatedAgentApi.getTransactions({ page: 1, limit: 5 });
      const page2 = await authenticatedAgentApi.getTransactions({ page: 2, limit: 5 });

      TestHelpers.assertSuccess(page1);
      TestHelpers.assertSuccess(page2);
    });

    test('should fail to get non-existent transaction', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getTransactionById('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Financial Calculations', () => {
    test('should calculate total revenue', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getFinancialSummary();

      TestHelpers.assertSuccess(response);
      if (response.data) {
        expect(typeof response.data.totalRevenue).toBe('number');
        expect(response.data.totalRevenue).toBeGreaterThanOrEqual(0);
      }
    });

    test('should calculate total commission', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getFinancialSummary();

      TestHelpers.assertSuccess(response);
      if (response.data) {
        expect(typeof response.data.totalCommission).toBe('number');
        expect(response.data.totalCommission).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Financial Security', () => {
    test('should require authentication for financial summary', async ({ agentApi }) => {
      const response = await agentApi.getFinancialSummary();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication for transactions', async ({ agentApi }) => {
      const response = await agentApi.getTransactions();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
