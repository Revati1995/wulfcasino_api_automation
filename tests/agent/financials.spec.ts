/**
 * Agent API - Financial Management Tests
 *
 *   GET /admin/referral/agent-stats   earnings + wallet balances
 *   GET /admin/transactions/me        the agent's own ledger { data, total, page, limit }
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';

test.describe('Agent API - Financial Management', () => {
  test.describe('Financial Summary', () => {
    test('should get financial summary @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getFinancialSummary();

      TestHelpers.assertSuccess(response, 'Get financial summary should succeed');
      TestHelpers.assertHasData(response);
      // GET /admin/referral/agent-stats: earnings + wallet balances for the agent
      TestHelpers.assertHasProperties(response.data, [
        'totalEarnings',
        'totalEarnedAllTime',
        'availableBalance',
        'frozenBalance',
        'totalReferrals',
      ]);
    });

    test('should show current balance', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getFinancialSummary();

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      // Wallet state: available / frozen / pending / locked balances
      for (const field of ['availableBalance', 'frozenBalance', 'pendingIncome', 'lockedIncome']) {
        expect(typeof response.data?.[field], `${field} should be a number`).toBe('number');
        expect(response.data?.[field]).toBeGreaterThanOrEqual(0);
      }
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
      // GET /admin/transactions/me: { data, total, page, limit }
      TestHelpers.assertPaginationStructure(response.data);
    });

    test('should get transaction by ID', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'Backend has no single-transaction lookup for agents (GET /admin/transactions/me/:id does not exist; checked postman/WulfCasino-Agent-API)'
      );
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
      // type enum: CREDIT | DEBIT (unknown values answer 500)
      const response = await authenticatedAgentApi.getTransactions({
        page: 1,
        limit: 10,
        type: 'CREDIT',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const transaction of TestHelpers.paginatedRows(response.data)) {
        expect(transaction.type).toBe('CREDIT');
      }
    });

    test('should filter transactions by date range', async ({ authenticatedAgentApi }) => {
      // GET /admin/transactions/me filters with fromDate / toDate
      const response = await authenticatedAgentApi.getTransactions({
        page: 1,
        limit: 10,
        fromDate: TestData.dateRanges.lastWeek.startDate,
        toDate: TestData.dateRanges.lastWeek.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      const from = new Date(TestData.dateRanges.lastWeek.startDate).getTime();
      for (const transaction of TestHelpers.paginatedRows(response.data)) {
        expect(new Date(transaction.createdAt).getTime()).toBeGreaterThanOrEqual(from);
      }
    });

    test('should filter transactions by status', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'GET /admin/transactions/me has no status filter (only type, source, fromDate, toDate; checked postman/WulfCasino-Agent-API)'
      );
      const response = await authenticatedAgentApi.getTransactions({
        page: 1,
        limit: 10,
        ...TestData.filters.completed,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort transactions', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'GET /admin/transactions/me has no sort params (only type, source, fromDate, toDate, page, limit; checked postman/WulfCasino-Agent-API)'
      );
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
      TestHelpers.assertPaginationStructure(page1.data);
      TestHelpers.assertPaginationStructure(page2.data);
      // The envelope echoes the requested page/limit and a stable total
      expect(page1.data.page).toBe(1);
      expect(page2.data.page).toBe(2);
      expect(page1.data.limit).toBe(5);
      expect(page2.data.limit).toBe(5);
      expect(page1.data.total).toBe(page2.data.total);
      expect(TestHelpers.paginatedRows(page1.data).length).toBeLessThanOrEqual(5);
    });

    test('should fail to get non-existent transaction', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'Backend has no single-transaction lookup for agents (GET /admin/transactions/me/:id does not exist, so 404 would only prove the route is missing; checked postman/WulfCasino-Agent-API)'
      );
      const response = await authenticatedAgentApi.getTransactionById('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Financial Calculations', () => {
    test('should calculate total revenue', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getFinancialSummary();

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      // Team revenue = the agent's own earnings plus the sub-agents' earnings
      expect(typeof response.data.totalTeamEarnings).toBe('number');
      expect(response.data.totalTeamEarnings).toBeGreaterThanOrEqual(0);
      expect(typeof response.data.subAgentsEarnedAllTime).toBe('number');
      expect(response.data.subAgentsEarnedAllTime).toBeGreaterThanOrEqual(0);
    });

    test('should calculate total commission', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getFinancialSummary();

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(typeof response.data.totalEarnings).toBe('number');
      expect(response.data.totalEarnings).toBeGreaterThanOrEqual(0);
      expect(typeof response.data.totalEarnedAllTime).toBe('number');
      expect(response.data.totalEarnedAllTime).toBeGreaterThanOrEqual(0);
      expect(typeof response.data.totalClaimed).toBe('number');
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
