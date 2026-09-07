/**
 * Admin API - Webhook Management Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestData, TestHelpers, DataGenerator } from '../../fixtures';

test.describe('Admin API - Webhook Management', () => {
  test.describe('Webhook CRUD Operations', () => {
    test('should get all webhooks @smoke', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getAllWebhooks();

      TestHelpers.assertSuccess(response, 'Get all webhooks should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertDataIsArray(response);
    });

    test('should create a new webhook @regression', async ({ authenticatedAdminApi }) => {
      const webhookData = DataGenerator.generateWebhook({
        url: `https://webhook.test.com/${Date.now()}`,
      });

      const response = await authenticatedAdminApi.createWebhook(webhookData);

      TestHelpers.assertSuccess(response, 'Webhook creation should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data?.url).toBe(webhookData.url);
      TestHelpers.assertHasProperties(response.data, ['events', 'status']);
    });

    test('should get webhook by ID', async ({ authenticatedAdminApi }) => {
      // Create a webhook first
      const webhookData = DataGenerator.generateWebhook({
        url: `https://webhook.test.com/${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createWebhook(webhookData);
      TestHelpers.assertSuccess(createResponse);
      const webhookId = createResponse.data?.id;

      // Get the webhook
      const response = await authenticatedAdminApi.getWebhookById(webhookId);

      TestHelpers.assertSuccess(response, 'Get webhook by ID should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(webhookId);
      expect(response.data?.url).toBe(webhookData.url);
    });

    test('should update webhook configuration', async ({ authenticatedAdminApi }) => {
      // Create a webhook first
      const webhookData = DataGenerator.generateWebhook({
        url: `https://webhook.test.com/${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createWebhook(webhookData);
      TestHelpers.assertSuccess(createResponse);
      const webhookId = createResponse.data?.id;

      // Update the webhook
      const updateData = {
        url: `https://webhook.updated.com/${Date.now()}`,
        events: ['user.created', 'user.updated', 'user.deleted'],
      };
      const response = await authenticatedAdminApi.updateWebhook(webhookId, updateData);

      TestHelpers.assertSuccess(response, 'Webhook update should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.url).toBe(updateData.url);
      expect(response.data?.events).toEqual(updateData.events);
    });

    test('should delete webhook', async ({ authenticatedAdminApi }) => {
      // Create a webhook first
      const webhookData = DataGenerator.generateWebhook({
        url: `https://webhook.test.com/${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createWebhook(webhookData);
      TestHelpers.assertSuccess(createResponse);
      const webhookId = createResponse.data?.id;

      // Delete the webhook
      const response = await authenticatedAdminApi.deleteWebhook(webhookId);

      TestHelpers.assertSuccess(response, 'Webhook deletion should succeed');
    });

    test('should fail to get non-existent webhook', async ({ authenticatedAdminApi }) => {
      const response = await authenticatedAdminApi.getWebhookById('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Webhook Testing', () => {
    test('should test webhook delivery', async ({ authenticatedAdminApi }) => {
      // Create a webhook first
      const webhookData = DataGenerator.generateWebhook({
        url: `https://webhook.test.com/${Date.now()}`,
      });
      const createResponse = await authenticatedAdminApi.createWebhook(webhookData);
      TestHelpers.assertSuccess(createResponse);
      const webhookId = createResponse.data?.id;

      // Test the webhook
      const response = await authenticatedAdminApi.testWebhook(webhookId);

      // Should succeed or return appropriate error
      expect(response.statusCode).toBeLessThan(500);
    });
  });

  test.describe('Webhook Validation', () => {
    test('should validate webhook URL format', async ({ authenticatedAdminApi }) => {
      const webhookData = DataGenerator.generateWebhook({
        url: 'invalid-url', // Invalid URL format
      });

      const response = await authenticatedAdminApi.createWebhook(webhookData);

      TestHelpers.assertFailure(response);
    });

    test('should validate required fields', async ({ authenticatedAdminApi }) => {
      const invalidWebhookData = {
        description: 'Test webhook',
        // Missing required fields (url, events)
      };

      const response = await authenticatedAdminApi.createWebhook(invalidWebhookData);

      TestHelpers.assertFailure(response);
    });

    test('should validate events array', async ({ authenticatedAdminApi }) => {
      const webhookData = DataGenerator.generateWebhook({
        url: `https://webhook.test.com/${Date.now()}`,
        events: [], // Empty events array
      });

      const response = await authenticatedAdminApi.createWebhook(webhookData);

      TestHelpers.assertFailure(response);
    });

    test('should reject duplicate webhook URLs', async ({ authenticatedAdminApi }) => {
      const url = `https://webhook.test.com/${Date.now()}`;
      const webhookData = DataGenerator.generateWebhook({ url });

      // Create first webhook
      const firstResponse = await authenticatedAdminApi.createWebhook(webhookData);
      TestHelpers.assertSuccess(firstResponse);

      // Try to create duplicate
      const secondResponse = await authenticatedAdminApi.createWebhook(webhookData);

      TestHelpers.assertFailure(secondResponse, 'Duplicate webhook creation should fail');
      TestHelpers.assertStatusCode(secondResponse, 409);
    });
  });

  test.describe('Webhook Events', () => {
    test('should support multiple event subscriptions', async ({ authenticatedAdminApi }) => {
      const webhookData = DataGenerator.generateWebhook({
        url: `https://webhook.test.com/${Date.now()}`,
        events: [
          'user.created',
          'user.updated',
          'transaction.completed',
          'bet.placed',
          'game.launched',
        ],
      });

      const response = await authenticatedAdminApi.createWebhook(webhookData);

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
      expect(response.data?.events).toHaveLength(5);
    });

    test('should update webhook events', async ({ authenticatedAdminApi }) => {
      // Create webhook
      const webhookData = DataGenerator.generateWebhook({
        url: `https://webhook.test.com/${Date.now()}`,
        events: ['user.created'],
      });
      const createResponse = await authenticatedAdminApi.createWebhook(webhookData);
      TestHelpers.assertSuccess(createResponse);
      const webhookId = createResponse.data?.id;

      // Update events
      const updateData = {
        events: ['user.created', 'user.updated', 'user.deleted'],
      };
      const response = await authenticatedAdminApi.updateWebhook(webhookId, updateData);

      TestHelpers.assertSuccess(response);
      expect(response.data?.events).toHaveLength(3);
    });
  });
});
