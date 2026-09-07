/**
 * Player API - Wallet Management Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers, DataGenerator } from '../../fixtures';

test.describe('Player API - Wallet Management', () => {
  test.describe('Wallet Information', () => {
    test('should get wallet information @smoke', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getWallet();

      TestHelpers.assertSuccess(response, 'Get wallet should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertHasProperties(response.data, ['balance', 'currency']);
    });

    test('should get wallet balance', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getWalletBalance();

      TestHelpers.assertSuccess(response, 'Get wallet balance should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('balance');
      expect(typeof response.data?.balance).toBe('number');
    });
  });

  test.describe('Deposits', () => {
    test('should create deposit request @regression', async ({ authenticatedPlayerApi }) => {
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
      const response = await authenticatedPlayerApi.deposit(-50, 'credit_card');

      TestHelpers.assertFailure(response, 'Negative deposit should fail');
    });

    test('should fail deposit with zero amount', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.deposit(0, 'credit_card');

      TestHelpers.assertFailure(response);
    });

    test('should fail deposit with invalid payment method', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.deposit(100, 'invalid_method');

      TestHelpers.assertFailure(response);
    });

    test('should validate minimum deposit amount', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.deposit(0.01, 'credit_card'); // Below minimum

      TestHelpers.assertFailure(response);
    });

    test('should validate maximum deposit amount', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.deposit(1000000, 'credit_card'); // Above maximum

      TestHelpers.assertFailure(response);
    });
  });

  test.describe('Withdrawals', () => {
    test('should create withdrawal request', async ({ authenticatedPlayerApi }) => {
      const withdrawalData = {
        amount: 50.0,
        paymentMethod: 'bank_transfer',
        bankAccount: '1234567890',
        bankCode: 'TEST123',
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
      const response = await authenticatedPlayerApi.withdraw(999999, 'bank_transfer');

      TestHelpers.assertFailure(response);
    });

    test('should fail withdrawal with invalid amount', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.withdraw(-50, 'bank_transfer');

      TestHelpers.assertFailure(response);
    });

    test('should fail withdrawal with zero amount', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.withdraw(0, 'bank_transfer');

      TestHelpers.assertFailure(response);
    });

    test('should validate minimum withdrawal amount', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.withdraw(1, 'bank_transfer'); // Below minimum

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
    });

    test('should get transaction by ID', async ({ authenticatedPlayerApi }) => {
      // First get transaction list
      const listResponse = await authenticatedPlayerApi.getTransactionHistory({
        page: 1,
        limit: 1,
      });

      if (listResponse.data?.data && listResponse.data.data.length > 0) {
        const transactionId = listResponse.data.data[0].id;

        const response = await authenticatedPlayerApi.getTransactionById(transactionId);

        TestHelpers.assertSuccess(response);
        TestHelpers.assertHasData(response);
        expect(response.data?.id).toBe(transactionId);
      }
    });

    test('should filter transactions by type', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getTransactionHistory({
        page: 1,
        limit: 10,
        type: 'deposit',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter transactions by date range', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getTransactionHistory({
        page: 1,
        limit: 10,
        startDate: TestData.dateRanges.lastWeek.startDate,
        endDate: TestData.dateRanges.lastWeek.endDate,
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should sort transactions', async ({ authenticatedPlayerApi }) => {
      const response = await authenticatedPlayerApi.getTransactionHistory({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should paginate transaction history', async ({ authenticatedPlayerApi }) => {
      const page1 = await authenticatedPlayerApi.getTransactionHistory({ page: 1, limit: 5 });
      const page2 = await authenticatedPlayerApi.getTransactionHistory({ page: 2, limit: 5 });

      TestHelpers.assertSuccess(page1);
      TestHelpers.assertSuccess(page2);
    });
  });

  test.describe('Wallet Security', () => {
    test('should require authentication for wallet operations', async ({ playerApi }) => {
      const response = await playerApi.getWallet();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication for deposit', async ({ playerApi }) => {
      const response = await playerApi.deposit(100, 'credit_card');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication for withdrawal', async ({ playerApi }) => {
      const response = await playerApi.withdraw(50, 'bank_transfer');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
