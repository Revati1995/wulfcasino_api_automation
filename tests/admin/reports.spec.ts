/**
 * Admin API - Reports Tests
 *
 * Real endpoints (postman/WulfCasino-Admin-API): GET /admin/reports/win-loss-report,
 * /engagement-stats, /engagement-report, /game-report, /daily-report, /dashboard-stats.
 * All are read-only.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';

const NO_EXPORT = 'Backend reports have no format/export parameter (checked postman/WulfCasino-Admin-API)';

test.describe('Admin API - Reports', () => {
  test.describe('Financial Reports', () => {
    test('should get financial report @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getFinancialReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response, 'Get financial report should succeed');
      TestHelpers.assertHasData(response);
      // GET /admin/reports/win-loss-report: one row per provider/category
      TestHelpers.assertDataIsArray(response);
      if (response.data.length > 0) {
        TestHelpers.assertHasProperties(response.data[0], ['provider', 'totalBet', 'totalWin', 'totalPlayers']);
      }
    });

    test('should get financial report for custom date range', async ({
      authenticatedAdminApi,
    }) => {
      const response = await authenticatedAdminApi.getFinancialReport({
        startDate: TestData.dateRanges.lastWeek.startDate,
        endDate: TestData.dateRanges.lastWeek.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertDataIsArray(response);
      for (const row of response.data as any[]) {
        TestHelpers.assertHasProperties(row, ['provider', 'category', 'totalBet', 'totalWin', 'playerWin', 'playerLose']);
      }
    });

    test('should fail with invalid date range', async ({ authenticatedAdminApi }) => {
      test.skip(
        true,
        'Backend win-loss-report does not reject endDate < startDate (returns 200 with an empty array)'
      );
      const response = await authenticatedAdminApi.getFinancialReport({
        startDate: '2024-12-31',
        endDate: '2024-01-01', // End before start
      });

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('User Activity Reports', () => {
    test('should get user activity report', async ({ authenticatedAdminApi }) => {
      // GET /admin/reports/engagement-stats: daily DAU / sessions / retention
      const response = await authenticatedAdminApi.getUserActivityReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get user activity report should succeed');
      TestHelpers.assertHasData(response);
      // { summary: { dau, avgSession, d7Retention, sessionsPerUser }, items: [], total }
      TestHelpers.assertPaginationStructure(response.data);
      TestHelpers.assertHasProperties(response.data.summary, ['dau', 'avgSession', 'd7Retention', 'sessionsPerUser']);
      for (const row of TestHelpers.paginatedRows(response.data)) {
        TestHelpers.assertHasProperties(row, ['date', 'dau', 'newReg', 'totalSessions']);
      }
    });

    test('should filter user activity by user type', async ({ authenticatedAdminApi }) => {
      test.skip(
        true,
        'Backend engagement-stats has no userType filter (only startDate/endDate/page/limit) (checked postman/WulfCasino-Admin-API)'
      );
      const response = await authenticatedAdminApi.getUserActivityReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        userType: 'player',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Game Performance Reports', () => {
    test('should get game performance report @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getGamePerformanceReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response, 'Get game performance report should succeed');
      TestHelpers.assertHasData(response);
      // GET /admin/reports/game-report: { items, total, summary }
      TestHelpers.assertPaginationStructure(response.data);
      TestHelpers.assertHasProperties(response.data.summary, ['totalBetAmount', 'totalPayout', 'ggr']);
    });

    test('should filter game performance by category', async ({ authenticatedAdminApi }) => {
      // Categories are capitalised game types, e.g. "Slots"
      const category = 'Slots';
      const response = await authenticatedAdminApi.getGamePerformanceReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        category,
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const row of TestHelpers.paginatedRows(response.data)) {
        expect(row.gameType).toBe(category);
      }
    });

    test('should filter game performance by provider', async ({ authenticatedAdminApi }) => {
      // Providers are integration slugs: aleaplay | sagames
      const provider = 'aleaplay';
      const response = await authenticatedAdminApi.getGamePerformanceReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        provider,
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const row of TestHelpers.paginatedRows(response.data)) {
        expect(row.gameProvider).toBe(provider);
      }
    });
  });

  test.describe('Transaction Reports', () => {
    test('should get transaction report', async ({ authenticatedAdminApi }) => {
      // GET /admin/reports/daily-report: { items: [...per day], summary } (no `total`)
      const response = await authenticatedAdminApi.getTransactionReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response, 'Get transaction report should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertHasProperties(response.data, ['items', 'summary']);
      expect(Array.isArray(response.data.items)).toBeTruthy();
      TestHelpers.assertHasProperties(response.data.summary, ['totalBet', 'playerWin', 'ggr', 'totalPurchase', 'totalRedeem']);
    });

    test('should filter transaction report by type', async ({ authenticatedAdminApi }) => {
      test.skip(
        true,
        'Backend daily-report has no transaction type filter (only startDate/endDate/parentId/userStatus/currency) (checked postman/WulfCasino-Admin-API)'
      );
      const response = await authenticatedAdminApi.getTransactionReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        type: 'deposit',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should group transaction report by period', async ({ authenticatedAdminApi }) => {
      // The daily report is inherently grouped by day: one item per calendar day
      const response = await authenticatedAdminApi.getTransactionReport({
        startDate: TestData.dateRanges.lastWeek.startDate,
        endDate: TestData.dateRanges.lastWeek.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      const items: any[] = response.data.items;
      expect(Array.isArray(items)).toBeTruthy();
      const days = items.map((row) => {
        TestHelpers.assertHasProperties(row, ['date', 'totalPlayers', 'totalBets', 'totalBetAmt', 'totalWin', 'ggr']);
        return String(row.date).slice(0, 10);
      });
      expect(new Set(days).size, 'each day should appear once').toBe(days.length);
    });
  });

  test.describe('Report Exports', () => {
    test('should export report as CSV', async ({ authenticatedAdminApi }) => {
      test.skip(true, NO_EXPORT);
      const response = await authenticatedAdminApi.getFinancialReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        format: 'csv',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should export report as PDF', async ({ authenticatedAdminApi }) => {
      test.skip(true, NO_EXPORT);
      const response = await authenticatedAdminApi.getFinancialReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        format: 'pdf',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Report Scheduling', () => {
    test('should schedule recurring report', async () => {
      test.skip(true, 'Backend has no report scheduling endpoint (checked postman/WulfCasino-Admin-API)');
      const scheduleData = {
        reportType: 'financial',
        frequency: 'weekly',
        recipients: ['admin@test.com'],
        format: 'pdf',
      };

      // Note: This assumes there's a schedule endpoint
      // Adjust based on actual API
      expect(scheduleData).toBeDefined();
    });
  });
});
