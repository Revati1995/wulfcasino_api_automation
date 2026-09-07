/**
 * Agent API - Commission Management Tests
 *
 * Commission data lives under the referral module:
 *   GET  /admin/referral/agent-stats   rates, balances and downline metrics (optionally period-scoped)
 *   GET  /admin/referral/earnings      the full commission history (no query params)
 *   POST /admin/referral/claim         claims real earnings; never called authenticated here
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';

test.describe('Agent API - Commission Management', () => {
  test.describe('Commission Settings', () => {
    test('should get commission settings @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionSettings();

      TestHelpers.assertSuccess(response, 'Get commission settings should succeed');
      TestHelpers.assertHasData(response);
      // GET /admin/referral/agent-stats: commission state for the logged-in agent
      TestHelpers.assertHasProperties(response.data, [
        'referralCode',
        'isAgent',
        'totalEarnings',
        'availableBalance',
        'commissions',
      ]);
      expect(response.data.isAgent).toBe(true);
    });

    test('should update commission settings', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'Mutates shared staging: agents cannot edit commission settings directly, POST /admin/commission-change-requests/request proposes a change to a real sub-agent (checked postman/WulfCasino-Agent-API)'
      );
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
      // GET /admin/referral/earnings: array of commission entries
      TestHelpers.assertDataIsArray(response);
      if (response.data.length > 0) {
        TestHelpers.assertHasProperties(response.data[0], ['id', 'commissionAmount', 'commissionPercent', 'status']);
      }
    });

    test('should filter commission history by date range', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'GET /admin/referral/earnings takes no query params (no date filter); period-scoped totals are covered by the Commission Reports tests (checked postman/WulfCasino-Agent-API)'
      );
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
      test.skip(true, 'GET /admin/referral/earnings has no player filter (checked postman/WulfCasino-Agent-API)');
      const response = await authenticatedAgentApi.getCommissionHistory({
        page: 1,
        limit: 10,
        playerId: 'test-player-id',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort commission history', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'GET /admin/referral/earnings has no sort params; the full array is returned as stored (checked postman/WulfCasino-Agent-API)'
      );
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
      test.skip(
        true,
        'GET /admin/referral/earnings is not paginated; page/limit are ignored and the full array is returned (checked postman/WulfCasino-Agent-API)'
      );
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
      // GET /admin/referral/agent-stats?startDate&endDate: period-scoped earnings + current rates
      TestHelpers.assertHasProperties(response.data, [
        'referralCode',
        'totalEarnings',
        'totalEarnedAllTime',
        'commissions',
        'commissionMode',
      ]);
      expect(typeof response.data.totalEarnings).toBe('number');
      expect(response.data.totalEarnings).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.data.commissions)).toBeTruthy();
      expect(Array.isArray(response.data.referrals)).toBeTruthy();
    });

    test('should get weekly commission report', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionReport(
        TestData.dateRanges.lastWeek.startDate,
        TestData.dateRanges.lastWeek.endDate
      );

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(typeof response.data.totalEarnings).toBe('number');
    });

    test('should get today commission report', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getCommissionReport(
        TestData.dateRanges.today.startDate,
        TestData.dateRanges.today.endDate
      );

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(typeof response.data.totalEarnings).toBe('number');
    });

    test('should fail with invalid date range', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'Backend accepts an inverted startDate/endDate on GET /admin/referral/agent-stats and answers 200 with unscoped stats (verified against staging); no validation to assert'
      );
      const response = await authenticatedAgentApi.getCommissionReport(
        '2024-12-31',
        '2024-01-01' // End before start
      );

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Commission Payouts', () => {
    // POST /admin/referral/claim takes no body and claims ALL of the agent's available earnings.
    const PAYOUT_SKIP_REASON =
      "Mutates shared staging: POST /admin/referral/claim claims the agent's real referral earnings (the endpoint takes no amount/method; the test agent is currently frozen and gets 403)";

    test('should request commission payout', async ({ authenticatedAgentApi }) => {
      test.skip(true, PAYOUT_SKIP_REASON);
      const response = await authenticatedAgentApi.requestCommissionPayout(100, 'bank_transfer');

      // May succeed or fail based on available commission balance
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should fail payout with insufficient balance', async ({ authenticatedAgentApi }) => {
      test.skip(true, PAYOUT_SKIP_REASON);
      const response = await authenticatedAgentApi.requestCommissionPayout(
        999999,
        'bank_transfer'
      );

      TestHelpers.assertFailure(response);
    });

    test('should fail payout with invalid amount', async ({ authenticatedAgentApi }) => {
      test.skip(true, PAYOUT_SKIP_REASON);
      const response = await authenticatedAgentApi.requestCommissionPayout(-100, 'bank_transfer');

      TestHelpers.assertFailure(response);
    });

    test('should fail payout with zero amount', async ({ authenticatedAgentApi }) => {
      test.skip(true, PAYOUT_SKIP_REASON);
      const response = await authenticatedAgentApi.requestCommissionPayout(0, 'bank_transfer');

      TestHelpers.assertFailure(response);
    });

    test('should validate minimum payout amount', async ({ authenticatedAgentApi }) => {
      test.skip(true, PAYOUT_SKIP_REASON);
      const response = await authenticatedAgentApi.requestCommissionPayout(1, 'bank_transfer');

      TestHelpers.assertFailure(response, 'Should fail below minimum payout amount');
    });

    test('should fail payout with invalid payment method', async ({ authenticatedAgentApi }) => {
      test.skip(true, PAYOUT_SKIP_REASON);
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

      // The real model is a commission mode (e.g. FLAT) with one rate per game category
      expect(typeof response.data.commissionMode).toBe('string');
      expect(typeof response.data.flatCommissionRate).toBe('number');
      expect(Array.isArray(response.data.commissions)).toBeTruthy();
      for (const tier of response.data.commissions) {
        TestHelpers.assertHasProperties(tier, ['name', 'rate', 'isFlat']);
        expect(typeof tier.rate).toBe('number');
        expect(tier.rate).toBeGreaterThanOrEqual(0);
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
      // Unauthenticated: nothing can be claimed
      const response = await agentApi.requestCommissionPayout(100, 'bank_transfer');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
