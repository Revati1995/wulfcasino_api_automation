/**
 * Agent API - Marketing Tools Tests
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers, DataGenerator } from '../../fixtures';

test.describe('Agent API - Marketing Tools', () => {
  test.describe('Marketing Links', () => {
    test('should get all marketing links @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getMarketingLinks();

      TestHelpers.assertSuccess(response, 'Get marketing links should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertDataIsArray(response);
    });

    test('should create marketing link @regression', async ({ authenticatedAgentApi }) => {
      const linkData = DataGenerator.generateMarketingLink('agent-id', {
        name: `Campaign ${Date.now()}`,
      });

      const response = await authenticatedAgentApi.createMarketingLink(linkData);

      TestHelpers.assertSuccess(response, 'Create marketing link should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data).toHaveProperty('url');
      expect(response.data?.name).toBe(linkData.name);
    });

    test('should get marketing link statistics', async ({ authenticatedAgentApi }) => {
      // First get links
      const listResponse = await authenticatedAgentApi.getMarketingLinks();

      if (listResponse.data && listResponse.data.length > 0) {
        const linkId = listResponse.data[0].id;

        const response = await authenticatedAgentApi.getMarketingLinkStats(linkId);

        TestHelpers.assertSuccess(response, 'Get link stats should succeed');
        TestHelpers.assertHasData(response);
        TestHelpers.assertHasProperties(response.data, ['clicks', 'registrations']);
      }
    });

    test('should fail to create link without required fields', async ({ authenticatedAgentApi }) => {
      const invalidLinkData = {
        // Missing required fields
        description: 'Test link',
      };

      const response = await authenticatedAgentApi.createMarketingLink(invalidLinkData);

      TestHelpers.assertFailure(response);
    });

    test('should fail to get stats for non-existent link', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getMarketingLinkStats('non-existent-id');

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });
  });

  test.describe('Link Statistics', () => {
    test('should show click statistics', async ({ authenticatedAgentApi }) => {
      const listResponse = await authenticatedAgentApi.getMarketingLinks();

      if (listResponse.data && listResponse.data.length > 0) {
        const linkId = listResponse.data[0].id;
        const response = await authenticatedAgentApi.getMarketingLinkStats(linkId);

        TestHelpers.assertSuccess(response);
        if (response.data) {
          expect(response.data).toHaveProperty('clicks');
          expect(typeof response.data.clicks).toBe('number');
        }
      }
    });

    test('should show registration statistics', async ({ authenticatedAgentApi }) => {
      const listResponse = await authenticatedAgentApi.getMarketingLinks();

      if (listResponse.data && listResponse.data.length > 0) {
        const linkId = listResponse.data[0].id;
        const response = await authenticatedAgentApi.getMarketingLinkStats(linkId);

        TestHelpers.assertSuccess(response);
        if (response.data) {
          expect(response.data).toHaveProperty('registrations');
          expect(typeof response.data.registrations).toBe('number');
        }
      }
    });

    test('should show conversion rate', async ({ authenticatedAgentApi }) => {
      const listResponse = await authenticatedAgentApi.getMarketingLinks();

      if (listResponse.data && listResponse.data.length > 0) {
        const linkId = listResponse.data[0].id;
        const response = await authenticatedAgentApi.getMarketingLinkStats(linkId);

        TestHelpers.assertSuccess(response);
        if (response.data) {
          expect(response.data).toHaveProperty('conversionRate');
        }
      }
    });
  });

  test.describe('Promotional Materials', () => {
    test('should get promotional materials @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPromotionalMaterials();

      TestHelpers.assertSuccess(response, 'Get promotional materials should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertDataIsArray(response);
    });

    test('should provide different material types', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPromotionalMaterials();

      TestHelpers.assertSuccess(response);
      if (response.data && response.data.length > 0) {
        response.data.forEach((material: any) => {
          expect(material).toHaveProperty('type');
          expect(material).toHaveProperty('url');
        });
      }
    });

    test('should filter materials by type', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPromotionalMaterials({
        type: 'banner',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter materials by size', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getPromotionalMaterials({
        size: '728x90',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });
  });

  test.describe('Link Management', () => {
    test('should track multiple campaigns', async ({ authenticatedAgentApi }) => {
      const campaigns = [
        DataGenerator.generateMarketingLink('agent-id', { name: 'Campaign 1' }),
        DataGenerator.generateMarketingLink('agent-id', { name: 'Campaign 2' }),
        DataGenerator.generateMarketingLink('agent-id', { name: 'Campaign 3' }),
      ];

      for (const campaign of campaigns) {
        const response = await authenticatedAgentApi.createMarketingLink(campaign);
        TestHelpers.assertSuccess(response);
      }
    });

    test('should support different traffic sources', async ({ authenticatedAgentApi }) => {
      const sources = ['facebook', 'google', 'twitter', 'instagram'];

      for (const source of sources) {
        const linkData = DataGenerator.generateMarketingLink('agent-id', {
          name: `${source} Campaign`,
          source,
        });
        const response = await authenticatedAgentApi.createMarketingLink(linkData);
        TestHelpers.assertSuccess(response);
      }
    });
  });

  test.describe('Marketing Security', () => {
    test('should require authentication for marketing links', async ({ agentApi }) => {
      const response = await agentApi.getMarketingLinks();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication for promotional materials', async ({ agentApi }) => {
      const response = await agentApi.getPromotionalMaterials();

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });

    test('should require authentication to create link', async ({ agentApi }) => {
      const linkData = DataGenerator.generateMarketingLink('agent-id');
      const response = await agentApi.createMarketingLink(linkData);

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
