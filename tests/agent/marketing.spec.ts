/**
 * Agent API - Marketing Tools Tests
 *
 * The agent's "marketing links" are promo codes (/agent/promo-codes/*); promotional
 * materials are the public banner packs (/admin/banner-packs/public).
 * Every promo code these tests create is deleted again in the same chain.
 */

import { test, expect } from '../../fixtures/api-fixtures';
import { TestHelpers, DataGenerator } from '../../fixtures';
import { AgentApiClient } from '../../utils/agent-api-client';

test.describe('Agent API - Marketing Tools', () => {
  test.describe('Marketing Links', () => {
    // create -> read -> update -> delete on one promo code that this chain owns
    test.describe.configure({ mode: 'serial' });

    let createdPromoId: string | undefined;

    test.afterAll(async () => {
      // Safety net: remove the promo code if the delete step did not run
      if (!createdPromoId) return;
      const client = new AgentApiClient();
      await client.init();
      try {
        await client.loginAsAgent();
        await client.deleteMarketingLink(createdPromoId);
      } finally {
        createdPromoId = undefined;
        await client.dispose();
      }
    });

    test('should get all marketing links @smoke', async ({ authenticatedAgentApi }) => {
      const response = await authenticatedAgentApi.getMarketingLinks();

      TestHelpers.assertSuccess(response, 'Get marketing links should succeed');
      TestHelpers.assertHasData(response);
      TestHelpers.assertDataIsArray(response);
    });

    test('should fail to create link without required fields', async ({ authenticatedAgentApi }) => {
      const invalidLinkData = {
        // Missing code / discountType / discountValue
        description: 'Test link',
      };

      const response = await authenticatedAgentApi.createMarketingLink(invalidLinkData);

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 400);
    });

    test('should fail to get stats for non-existent link', async ({ authenticatedAgentApi }) => {
      // A well-formed but unknown uuid (a non-uuid id currently answers 500)
      const response = await authenticatedAgentApi.getMarketingLinkStats(DataGenerator.generateId());

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 404);
    });

    test('should create marketing link @regression', async ({ authenticatedAgentApi }) => {
      const promoData = DataGenerator.generateAgentPromoCode();

      const response = await authenticatedAgentApi.createMarketingLink(promoData);
      test.skip(response.statusCode === 403, `Promo-code creation rejected for the frozen agent: ${response.error}`);

      TestHelpers.assertSuccess(response, 'Create promo code should succeed');
      TestHelpers.assertStatusCode(response, 201);
      TestHelpers.assertHasData(response);
      expect(response.data).toHaveProperty('id');
      expect(response.data?.code).toBe(promoData.code);
      expect(response.data?.discountType).toBe(promoData.discountType);
      expect(response.data?.discountValue).toBe(promoData.discountValue);
      // Agent-created codes enter the approval flow
      expect(response.data).toHaveProperty('approvalStatus');

      createdPromoId = response.data.id;
    });

    test('should get marketing link statistics', async ({ authenticatedAgentApi }) => {
      test.skip(!createdPromoId, 'No promo code was created earlier in this chain');

      const response = await authenticatedAgentApi.getMarketingLinkStats(createdPromoId as string);

      TestHelpers.assertSuccess(response, 'Get promo code should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(createdPromoId);
      // Usage counters are the only statistics a promo code exposes
      TestHelpers.assertHasProperties(response.data, ['code', 'totalClaimed', 'maxUsage', 'maxUsagePerUser', 'isActive']);
      expect(typeof response.data.totalClaimed).toBe('number');
      expect(response.data.totalClaimed).toBe(0);
    });

    test('should update marketing link', async ({ authenticatedAgentApi }) => {
      test.skip(!createdPromoId, 'No promo code was created earlier in this chain');

      const update = { description: `Updated by QA ${Date.now()}`, discountValue: 12 };
      const response = await authenticatedAgentApi.updateMarketingLink(createdPromoId as string, update);

      TestHelpers.assertSuccess(response, 'Update promo code should succeed');
      TestHelpers.assertHasData(response);
      expect(response.data?.id).toBe(createdPromoId);
      expect(response.data?.description).toBe(update.description);
      expect(response.data?.discountValue).toBe(update.discountValue);
    });

    test('should delete marketing link', async ({ authenticatedAgentApi }) => {
      test.skip(!createdPromoId, 'No promo code was created earlier in this chain');
      const promoId = createdPromoId as string;

      const response = await authenticatedAgentApi.deleteMarketingLink(promoId);

      TestHelpers.assertSuccess(response, 'Delete promo code should succeed');
      TestHelpers.assertStatusCode(response, 204);
      createdPromoId = undefined;

      const after = await authenticatedAgentApi.getMarketingLinkStats(promoId);
      TestHelpers.assertStatusCode(after, 404, 'Deleted promo code should be gone');
    });
  });

  test.describe('Link Statistics', () => {
    const NO_LINK_STATS_REASON =
      'Backend has no marketing-link click/registration/conversion stats endpoint (promo codes expose only totalClaimed/maxUsage; checked postman/WulfCasino-Agent-API)';

    test('should show click statistics', async ({ authenticatedAgentApi }) => {
      test.skip(true, NO_LINK_STATS_REASON);
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
      test.skip(true, NO_LINK_STATS_REASON);
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
      test.skip(true, NO_LINK_STATS_REASON);
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
      TestHelpers.assertDataIsArray(response);
      // GET /admin/banner-packs/public: packs with a cover image and folders of downloadable files
      for (const pack of response.data) {
        TestHelpers.assertHasProperties(pack, ['id', 'title', 'coverImage', 'folders', 'fileCount']);
        expect(Array.isArray(pack.folders)).toBeTruthy();
        for (const folder of pack.folders) {
          for (const file of folder.files ?? []) {
            expect(typeof file.fileUrl).toBe('string');
            expect(file.fileUrl).toMatch(/^https?:\/\//);
          }
        }
      }
    });

    test('should filter materials by type', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'GET /admin/banner-packs/public takes no query filters (the type param is ignored; endpoint only documented in postman/WulfCasino-Player-API)'
      );
      const response = await authenticatedAgentApi.getPromotionalMaterials({
        type: 'banner',
      });

      TestHelpers.assertSuccess(response);
      TestHelpers.assertHasData(response);
    });

    test('should filter materials by size', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'GET /admin/banner-packs/public takes no query filters (the size param is ignored; endpoint only documented in postman/WulfCasino-Player-API)'
      );
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
        DataGenerator.generateAgentPromoCode({ description: 'QA campaign 1' }),
        DataGenerator.generateAgentPromoCode({ description: 'QA campaign 2' }),
      ];
      const createdIds: string[] = [];

      try {
        for (const campaign of campaigns) {
          const response = await authenticatedAgentApi.createMarketingLink(campaign);
          test.skip(response.statusCode === 403, `Promo-code creation rejected for the frozen agent: ${response.error}`);
          TestHelpers.assertSuccess(response, 'Create promo code should succeed');
          createdIds.push(response.data.id);
        }

        // Every campaign code the agent created is listed under GET /agent/promo-codes/all
        const list = await authenticatedAgentApi.getMarketingLinks();
        TestHelpers.assertSuccess(list);
        const listedIds = list.data.map((promo: any) => promo.id);
        for (const id of createdIds) {
          expect(listedIds).toContain(id);
        }
      } finally {
        for (const id of createdIds) {
          await authenticatedAgentApi.deleteMarketingLink(id);
        }
      }
    });

    test('should support different traffic sources', async ({ authenticatedAgentApi }) => {
      test.skip(
        true,
        'Promo codes have no traffic-source attribute (CreatePromoCodeDto: code, discountType, discountValue, usage limits, dates; checked postman/WulfCasino-Agent-API)'
      );
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

    test('should serve promotional materials without authentication', async ({ agentApi }) => {
      // GET /admin/banner-packs/public is a public endpoint (documented in postman/WulfCasino-Player-API):
      // banner packs are downloadable without a token.
      const response = await agentApi.getPromotionalMaterials();

      TestHelpers.assertSuccess(response, 'Public banner packs should be served without a token');
      TestHelpers.assertStatusCode(response, 200);
      TestHelpers.assertDataIsArray(response);
    });

    test('should require authentication to create link', async ({ agentApi }) => {
      const linkData = DataGenerator.generateAgentPromoCode();
      const response = await agentApi.createMarketingLink(linkData);

      TestHelpers.assertFailure(response);
      TestHelpers.assertStatusCode(response, 401);
    });
  });
});
