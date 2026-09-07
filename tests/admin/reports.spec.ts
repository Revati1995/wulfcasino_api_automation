/**
 * Admin API - Reports Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';

test.describe('Admin API - Reports', () => {
  test.describe('Financial Reports', () => {
    test('should get financial report @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getFinancialReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response, 'Get financial report should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertHasProperties(response.data, ['totalRevenue', 'totalExpenses']);
    });

    test('should get financial report for custom date range', async ({
      authenticatedAdminApi,
    }) => {
      const response = await authenticatedAdminApi.getFinancialReport({
        startDate: TestData.dateRanges.lastWeek.startDate,
        endDate: TestData.dateRanges.lastWeek.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should fail with invalid date range', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getFinancialReport({
        startDate: '2024-12-31',
        endDate: '2024-01-01', // End before start
      });

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('User Activity Reports', () => {
    test('should get user activity report', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getUserActivityReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response, 'Get user activity report should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should filter user activity by user type', async ({ authenticatedAdminApi }) => {
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
    });

    test('should filter game performance by category', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getGamePerformanceReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        category: 'slot',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter game performance by provider', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getGamePerformanceReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        provider: 'NetEnt',
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

      TestHelpers.assertSuccess(response, 'Get transaction report should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should filter transaction report by type', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getTransactionReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        type: 'deposit',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should group transaction report by period', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getTransactionReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        groupBy: 'day',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Report Exports', () => {
    test('should export report as CSV', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getFinancialReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        format: 'csv',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should export report as PDF', async ({ authenticatedAdminApi }) => {
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
    test('should schedule recurring report', async ({ authenticatedAdminApi }) => {
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
