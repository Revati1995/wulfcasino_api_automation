/**
 * Player API - Wallet Management Tests
 *
 * The wallet is dual-currency (wulfCash / wulfCoin). There is no plain deposit API
 * (deposits are Coinflow/Breeze payin pages) and POST /redeem/request creates a real
 * withdrawal after a SEON gate, so both groups are skipped on the shared account.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers } from '../../fixtures';

const NO_DEPOSIT =
  'Backend has no plain wallet deposit endpoint; deposits are Coinflow/Breeze payin pages that create real payment sessions (checked postman/WulfCasino-Player-API)';
const WITHDRAW_MUTATES =
  'Skipped: mutates real player balance/status on staging (POST /redeem/request runs the SEON withdrawal gate and creates a redeem request)';

test.describe('Player API - Wallet Management', () => {
  test.describe('Wallet Information', () => {
    test('should get wallet information @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getWallet();

      TestHelpers.assertSuccess(response, 'Get wallet should succeed');
      TestHelpers.assertHasData(response);
      // GET /wallet/balance: dual-currency wallet (wulfCash / wulfCoin)
      TestHelpers.assertHasProperties(response.data, ['userId', 'wulfCash', 'wulfCoin', 'redeemableWulfCash']);
      expect(typeof response.data.wulfCash).toBe('number');
      expect(typeof response.data.wulfCoin).toBe('number');
    });

    test('should get wallet balance', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getWalletBalance();

      TestHelpers.assertSuccess(response, 'Get wallet balance should succeed');
      TestHelpers.assertHasData(response);
      for (const field of ['wulfCash', 'wulfCoin', 'bonusWulfCash', 'redeemableWulfCash']) {
        expect(typeof response.data?.[field], `${field} should be a number`).toBe('number');
        expect(response.data?.[field]).toBeGreaterThanOrEqual(0);
      }
      // Redeemable cash can never exceed the cash balance
      expect(response.data.redeemableWulfCash).toBeLessThanOrEqual(response.data.wulfCash);
    });

    test('should get redeemable balance', async ({ authenticatedPlayerApi }) => {
      const wallet = await authenticatedPlayerApi.getWalletBalance();
      const response = await authenticatedPlayerApi.getRedeemableBalance();

      TestHelpers.assertSuccess(response, 'Get redeemable balance should succeed');
      TestHelpers.assertHasProperties(response.data, [
        'redeemableWulfCash',
        'wulfCash',
        'availableToWithdraw',
        'pendingRedeems',
        'redeemLimits',
      ]);
      // GET /redeem/balance mirrors GET /wallet/balance
      expect(response.data.redeemableWulfCash).toBe(wallet.data.redeemableWulfCash);
      expect(response.data.wulfCash).toBe(wallet.data.wulfCash);
    });
  });

  test.describe('Deposits', () => {
    test('should create deposit request @regression', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_DEPOSIT);
      const depositData = {
        amount: 100.0,
        paymentMethod: 'credit_card',
        cardNumber: '4111111111111111',
        expiryDate: '12/25',
        cvv: '123',
      };

      const response = await authenticatedPlayerApi.deposit(
        depositData.amount,
        depositData.paymentMethod,
        depositData
      );

      TestHelpers.assertSuccess(response, 'Deposit request should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('transactionId');
    });

    test('should fail deposit with invalid amount', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_DEPOSIT);
      const response = await authenticatedPlayerApi.deposit(-50, 'credit_card');

      TestHelpers.assertFailure(response, 'Negative deposit should fail');
    });

    test('should fail deposit with zero amount', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_DEPOSIT);
      const response = await authenticatedPlayerApi.deposit(0, 'credit_card');

      TestHelpers.assertFailure(response);
    });

    test('should fail deposit with invalid payment method', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_DEPOSIT);
      const response = await authenticatedPlayerApi.deposit(100, 'invalid_method');

      TestHelpers.assertFailure(response);
    });

    test('should validate minimum deposit amount', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_DEPOSIT);
      const response = await authenticatedPlayerApi.deposit(0.01, 'credit_card'); // Below minimum

      TestHelpers.assertFailure(response);
    });

    test('should validate maximum deposit amount', async ({ authenticatedPlayerApi }) => {
      test.skip(true, NO_DEPOSIT);
      const response = await authenticatedPlayerApi.deposit(1000000, 'credit_card'); // Above maximum

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Withdrawals', () => {
    test('should create withdrawal request', async ({ authenticatedPlayerApi }) => {
      test.skip(true, WITHDRAW_MUTATES);
      const withdrawalData = {
        amount: 50.0,
        paymentMethod: 'Coinflow',
      };

      const response = await authenticatedPlayerApi.withdraw(
        withdrawalData.amount,
        withdrawalData.paymentMethod,
        withdrawalData
      );

      // May succeed or fail based on balance
      expect(response.statusCode).toBeLessThan(500);
    });

    test('should fail withdrawal with insufficient balance', async ({ authenticatedPlayerApi }) => {
      test.skip(true, WITHDRAW_MUTATES);
      const response = await authenticatedPlayerApi.withdraw(999999, 'Coinflow');

      TestHelpers.assertFailure(response);
    });

    test('should fail withdrawal with invalid amount', async ({ authenticatedPlayerApi }) => {
      test.skip(true, WITHDRAW_MUTATES);
      const response = await authenticatedPlayerApi.withdraw(-50, 'Coinflow');

      TestHelpers.assertFailure(response);
    });

    test('should fail withdrawal with zero amount', async ({ authenticatedPlayerApi }) => {
      test.skip(true, WITHDRAW_MUTATES);
      const response = await authenticatedPlayerApi.withdraw(0, 'Coinflow');

      TestHelpers.assertFailure(response);
    });

    test('should validate minimum withdrawal amount', async ({ authenticatedPlayerApi }) => {
      test.skip(true, WITHDRAW_MUTATES);
      const response = await authenticatedPlayerApi.withdraw(1, 'Coinflow'); // Below minimum

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Transaction History', () => {
    test('should get transaction history @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getTransactionHistory({
        page: 1,
        limit: 10,
      });

      TestHelpers.assertSuccess(response, 'Get transaction history should succeed');
      TestHelpers.assertHasData(response);
      // GET /transactions/me: { data, total, page, limit }
      TestHelpers.assertPaginationStructure(response.data);
    });

    test('should get transaction by ID', async ({ authenticatedPlayerApi }) => {
      // First get transaction list
      const listResponse = await authenticatedPlayerApi.getTransactionHistory({
        page: 1,
        limit: 1,
      });
      TestHelpers.assertSuccess(listResponse);
      const rows = TestHelpers.paginatedRows(listResponse.data);
      test.skip(rows.length === 0, 'No transactions on the staging account to look up');

      const transactionId = rows[0].id;

      // GET /transactions/me/:id/detail
      const response = await authenticatedPlayerApi.getTransactionById(transactionId);

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(transactionId);
      TestHelpers.assertHasProperties(response.data, ['userId', 'type', 'source', 'createdAt']);
    });

    test('should filter transactions by type', async ({ authenticatedPlayerApi }) => {
      // type enum: CREDIT, DEBIT, DEPOSIT, PROMOTION
      const response = await authenticatedPlayerApi.getTransactionHistory({
        page: 1,
        limit: 10,
        type: 'DEPOSIT',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      for (const row of TestHelpers.paginatedRows(response.data)) {
        expect(row.type).toBe('DEPOSIT');
      }
    });

    test('should filter transactions by date range', async ({ authenticatedPlayerApi }) => {
      // GET /transactions/me uses fromDate / toDate (YYYY-MM-DD)
      const { startDate, endDate } = TestData.dateRanges.lastMonth;
      const response = await authenticatedPlayerApi.getTransactionHistory({
        page: 1,
        limit: 10,
        fromDate: startDate,
        toDate: endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertPaginationStructure(response.data);
      const from = new Date(startDate).getTime();
      for (const row of TestHelpers.paginatedRows(response.data)) {
        expect(new Date(row.createdAt).getTime()).toBeGreaterThanOrEqual(from);
      }
    });

    test('should return transactions newest first', async ({ authenticatedPlayerApi }) => {
      // GET /transactions/me has no sort parameters; the default order is newest first
      const response = await authenticatedPlayerApi.getTransactionHistory({ page: 1, limit: 10 });

      TestHelpers.assertSuccess(response);
      const rows = TestHelpers.paginatedRows(response.data);
      for (let i = 1; i < rows.length; i++) {
        expect(new Date(rows[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(rows[i].createdAt).getTime()
        );
      }
    });

    test('should paginate transaction history', async ({ authenticatedPlayerApi }) => {
      const page1 = await authenticatedPlayerApi.getTransactionHistory({ page: 1, limit: 5 });
      const page2 = await authenticatedPlayerApi.getTransactionHistory({ page: 2, limit: 5 });

      TestHelpers.assertSuccess(page1);
      TestHelpers.assertSuccess(page2);
      expect(page1.data?.page).toBe(1);
      expect(page1.data?.limit).toBe(5);
      expect(page2.data?.page).toBe(2);

      const ids1 = TestHelpers.paginatedRows(page1.data).map((r: any) => r.id);
      const ids2 = TestHelpers.paginatedRows(page2.data).map((r: any) => r.id);
      expect(ids1.length).toBeLessThanOrEqual(5);
      for (const id of ids2) {
        expect(ids1).not.toContain(id);
      }
    });
  });

  test.describe('Wallet Security', () => {
    test('should require authentication for wallet operations', async ({ playerApi }) => {
      const response = await playerApi.getWallet();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication for deposit', async ({ playerApi }) => {
      test.skip(true, NO_DEPOSIT);
      const response = await playerApi.deposit(100, 'credit_card');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication for withdrawal', async ({ playerApi }) => {
      // POST /redeem/request without a token is rejected before any gate runs
      const response = await playerApi.withdraw(50, 'Coinflow');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
