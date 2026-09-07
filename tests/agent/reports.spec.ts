/**
 * Agent API - Reports Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';

test.describe('Agent API - Reports', () => {
  test.describe('Performance Reports', () => {
    test('should get performance report @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPerformanceReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response, 'Get performance report should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should get weekly performance report', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPerformanceReport({
        startDate: TestData.dateRanges.lastWeek.startDate,
        endDate: TestData.dateRanges.lastWeek.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should get daily performance report', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPerformanceReport({
        startDate: TestData.dateRanges.today.startDate,
        endDate: TestData.dateRanges.today.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should fail with invalid date range', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPerformanceReport({
        startDate: '2024-12-31',
        endDate: '2024-01-01', // End before start
      });

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Player Activity Reports', () => {
    test('should get player activity report @regression', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPlayerActivityReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response, 'Get player activity report should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should filter player activity by player', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPlayerActivityReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        playerId: 'test-player-id',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should group player activity by period', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPlayerActivityReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        groupBy: 'day',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Revenue Reports', () => {
    test('should get revenue report @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getRevenueReport(
        TestData.dateRanges.lastMonth.startDate,
        TestData.dateRanges.lastMonth.endDate
      );

      TestHelpers.assertSuccess(response, 'Get revenue report should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertHasProperties(response.data, ['totalRevenue', 'period']);
    });

    test('should get weekly revenue report', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getRevenueReport(
        TestData.dateRanges.lastWeek.startDate,
        TestData.dateRanges.lastWeek.endDate
      );

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should get daily revenue report', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getRevenueReport(
        TestData.dateRanges.today.startDate,
        TestData.dateRanges.today.endDate
      );

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should show revenue breakdown', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getRevenueReport(
        TestData.dateRanges.lastMonth.startDate,
        TestData.dateRanges.lastMonth.endDate
      );

      TestHelpers.assertSuccess(response);
      if (response.data) {
        expect(response.data).toHaveProperty('totalRevenue');
        expect(typeof response.data.totalRevenue).toBe('number');
      }
    });

    test('should fail with invalid date range', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getRevenueReport('2024-12-31', '2024-01-01');

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Report Exports', () => {
    test('should export report as CSV', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPerformanceReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        format: 'csv',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should export report as PDF', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPerformanceReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
        format: 'pdf',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Report Security', () => {
    test('should require authentication for reports', async ({ agentApi }) => {
      const response = await agentApi.getPerformanceReport({
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
