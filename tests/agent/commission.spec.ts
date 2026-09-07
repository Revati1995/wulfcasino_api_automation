/**
 * Agent API - Commission Management Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';

test.describe('Agent API - Commission Management', () => {
  test.describe('Commission Settings', () => {
    test('should get commission settings @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionSettings();

      TestHelpers.assertSuccess(response, 'Get commission settings should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertHasProperties(response.data, ['percentage', 'tier']);
    });

    test('should update commission settings', async ({ authenticatedAgentApi }) => {
      // First get current settings
      const getResponse = await authenticatedAgentApi.getCommissionSettings();
      TestHelpers.assertSuccess(getResponse);

      // Update settings
      const updateData = {
        ...getResponse.data,
        notificationEnabled: true,
      };

      const response = await authenticatedAgentApi.updateCommissionSettings(updateData);

      TestHelpers.assertSuccess(response, 'Update commission settings should succeed');
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Commission History', () => {
    test('should get commission history @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionHistory({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get commission history should succeed');
      TestHelpers.assertHasData(response);
    });

    test('should filter commission history by date range', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionHistory({
        page: 1,
        limit: 10,
        startDate: TestData.dateRanges.lastMonth.startDate,
        endDate: TestData.dateRanges.lastMonth.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter commission history by player', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionHistory({
        page: 1,
        limit: 10,
        playerId: 'test-player-id',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort commission history', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionHistory({
        page: 1,
        limit: 10,
        sortBy: 'amount',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should paginate commission history', async ({ authenticatedAgentApi }) => {
      const page1 = await authenticatedAgentApi.getCommissionHistory({ page: 1, limit: 5 });
      const page2 = await authenticatedAgentApi.getCommissionHistory({ page: 2, limit: 5 });

      TestHelpers.assertSuccess(page1);
      TestHelpers.assertSuccess(page2);
    });
  });

  test.describe('Commission Reports', () => {
    test('should get commission report @regression', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionReport(
        TestData.dateRanges.lastMonth.startDate,
        TestData.dateRanges.lastMonth.endDate
      );

      TestHelpers.assertSuccess(response, 'Get commission report should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertHasProperties(response.data, ['totalCommission', 'period']);
    });

    test('should get weekly commission report', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionReport(
        TestData.dateRanges.lastWeek.startDate,
        TestData.dateRanges.lastWeek.endDate
      );

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should get today commission report', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionReport(
        TestData.dateRanges.today.startDate,
        TestData.dateRanges.today.endDate
      );

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should fail with invalid date range', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionReport(
        '2024-12-31',
        '2024-01-01' // End before start
      );

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Commission Payouts', () => {
    test('should request commission payout', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.requestCommissionPayout(100, 'bank_transfer');

      // May succeed or fail based on available commission balance
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should fail payout with insufficient balance', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.requestCommissionPayout(
        999999,
        'bank_transfer'
      );

      TestHelpers.assertFailure(response);
    });

    test('should fail payout with invalid amount', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.requestCommissionPayout(-100, 'bank_transfer');

      TestHelpers.assertFailure(response);
    });

    test('should fail payout with zero amount', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.requestCommissionPayout(0, 'bank_transfer');

      TestHelpers.assertFailure(response);
    });

    test('should validate minimum payout amount', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.requestCommissionPayout(1, 'bank_transfer');

      TestHelpers.assertFailure(response, 'Should fail below minimum payout amount');
    });

    test('should fail payout with invalid payment method', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.requestCommissionPayout(
        100,
        'invalid_method'
      );

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Commission Tiers', () => {
    test('should show commission tier information', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionSettings();

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);

      if (response.data) {
        expect(response.data).toHaveProperty('tier');
        expect(response.data).toHaveProperty('percentage');
      }
    });
  });

  test.describe('Commission Security', () => {
    test('should require authentication for commission operations', async ({ agentApi }) => {
      const response = await agentApi.getCommissionHistory();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication for payout request', async ({ agentApi }) => {
      const response = await agentApi.requestCommissionPayout(100, 'bank_transfer');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
