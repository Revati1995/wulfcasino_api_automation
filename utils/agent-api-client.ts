/**
 * Agent API Client
 * Specialized client for Agent API endpoints
 *
 * Agents are staff accounts: they authenticate through /api/v1/admin/auth/login
 * and use the employee JWT on /api/v1/admin/referral/*, /api/v1/admin/transactions/me,
 * /api/v1/agent/* etc. Paths follow postman/WulfCasino-Agent-API.postman_collection.json.
 * The admin-side routes agents share (/admin/users/all, /admin/reports/*, /admin/transactions/*)
 * are auto-scoped to the agent's downline by the backend.
 */

import { ApiClient } from './api-client';
import { AuthHelper } from './auth-helper';
import { env } from '../config/environment';
import { ApiResponse, PaginationParams } from '../types';
import { tokenStore } from './token-store';
import { logger } from './logger';
import type { LoginOptions } from './player-api-client';

export class AgentApiClient {
  private apiClient: ApiClient;
  private authHelper: AuthHelper;
  private readonly basePath = '/api/v1';

  constructor() {
    this.apiClient = new ApiClient({
      baseURL: env.getAgentApiUrl(),
      timeout: env.get().testConfig.apiTimeout,
      retryConfig: {
        retries: env.get().testConfig.retryCount,
        retryDelay: 1000,
      },
    });
    this.authHelper = new AuthHelper(this.apiClient, {
      basePath: `${this.basePath}/admin`,
      loginField: 'email',
      serverLogout: false, // no POST /admin/auth/logout on the backend
    });
  }

  /**
   * Initialize the client
   */
  async init(): Promise<void> {
    await this.apiClient.init();
  }

  /**
   * Get auth helper
   */
  getAuthHelper(): AuthHelper {
    return this.authHelper;
  }

  /**
   * Build full endpoint path
   */
  private endpoint(path: string): string {
    return `${this.basePath}${path}`;
  }

  /**
   * Use an existing access token (no login call)
   */
  useToken(accessToken: string, refreshToken?: string): void {
    this.authHelper.setTokens({ accessToken, refreshToken });
  }

  /**
   * Check whether a token is still accepted by GET /admin/auth/me
   */
  async isTokenValid(token: string): Promise<boolean> {
    return this.authHelper.isTokenValid(token);
  }

  /**
   * Login as agent.
   * Reuses the token cached by global-setup unless `fresh` is requested.
   */
  async loginAsAgent(options: LoginOptions = {}): Promise<void> {
    if (!options.fresh) {
      const cached = tokenStore.get('agent');
      if (cached) {
        if (await this.isTokenValid(cached.accessToken)) {
          this.useToken(cached.accessToken, cached.refreshToken);
          return;
        }
        logger.warn('Cached agent token was rejected; logging in again');
      }
    }

    const credentials = env.getAgentCredentials();
    const response = await this.authHelper.login(credentials);
    if (!response.success || !response.data?.accessToken) {
      throw new Error(`Agent login failed: ${response.error}`);
    }

    tokenStore.set('agent', {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      createdAt: new Date().toISOString(),
    });
  }

  // ==================== Profile Management ====================

  /** GET /admin/auth/me: staff account plus nested `agent` (referralCode, commissionMode, flatCommissionRate, isFrozen...). */
  async getProfile(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/auth/me'));
  }

  /** PATCH /admin/auth/update-profile { username?, email?, name? } (admin collection). */
  async updateProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint('/admin/auth/update-profile'), profileData);
  }

  // ==================== Player Management ====================
  // Agents share the admin user endpoints; results are auto-scoped to the agent's downline
  // (referrerId forced to the agent). Envelope: { data: [], meta: { total, page, limit, totalPages } }.

  /**
   * GET /admin/users/all. Filters: search, isActive, isVerified, isPremium, isBanned, referrerId,
   * source, kyc, vipTierId, startDate, endDate, sortField, sortOrder, freeSpinEligible.
   */
  async getPlayers(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/users/all'), { params });
  }

  /** GET /admin/users/:id (404 for an unknown uuid; a non-uuid id currently answers 500). */
  async getPlayerById(playerId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/admin/users/${playerId}`));
  }

  /**
   * POST /admin/users { entity, password, name?, isActive?, ... }: the admin-side "Create user (admin)"
   * route. It is not part of the agent collection and creates a real player account, so the
   * agent specs skip it.
   */
  async createPlayer(playerData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/admin/users'), playerData);
  }

  /** PATCH /admin/users/:id: admin-side "Update user". Mutates a real player, so the agent specs skip it. */
  async updatePlayer(playerId: string, playerData: any): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/admin/users/${playerId}`), playerData);
  }

  /** GET /admin/referral/user-stats/:userId -> { totalEarnings, pendingPayouts, totalClaimed, settledAmount, totalReferralConnections, xp }. */
  async getPlayerStatistics(playerId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/admin/referral/user-stats/${playerId}`));
  }

  /**
   * GET /admin/transactions/all?userId=... -> { data, total, page, limit }.
   * `type` must be upper-case (DEPOSIT, CREDIT, DEBIT...); lower-case values answer 500.
   */
  async getPlayerTransactions(playerId: string, params?: PaginationParams & Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/transactions/all'), {
      params: { ...(params as any), userId: playerId },
    });
  }

  /** NOT IMPLEMENTED ON BACKEND for agents (admin-only wallet adjustments). */
  async adjustPlayerBalance(playerId: string, amount: number, reason: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint(`/admin/users/${playerId}/balance/adjust`), { amount, reason });
  }

  // ==================== Commission Management ====================
  // Commission data lives under the referral module.

  /**
   * GET /admin/referral/agent-stats: commission rates (commissions[], commissionMode, flatCommissionRate),
   * wallet balances and downline metrics for the logged-in agent.
   */
  async getCommissionSettings(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/referral/agent-stats'));
  }

  /**
   * POST /admin/commission-change-requests/request { subAgentId, commissions: { category: rate }, note }.
   * Agents cannot edit commission directly; this proposes a change that the sub-agent must approve.
   * MUTATES shared staging data, so the agent specs skip it.
   */
  async updateCommissionSettings(settings: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/admin/commission-change-requests/request'), settings);
  }

  /**
   * GET /admin/referral/earnings: the full array of commission entries.
   * The endpoint takes no query parameters (no paging, filtering or sorting); `_params` is
   * accepted for backwards compatibility only and is not sent.
   */
  async getCommissionHistory(_params?: PaginationParams & Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/referral/earnings'));
  }

  /** GET /admin/referral/agent-stats?startDate&endDate: period-scoped earnings; balances stay current-state. */
  async getCommissionReport(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/referral/agent-stats'), {
      params: { startDate, endDate },
    });
  }

  /**
   * POST /admin/referral/claim: claims ALL available referral earnings. The endpoint takes no
   * body; `_amount` / `_paymentMethod` are accepted for backwards compatibility only.
   * MUTATES shared staging data, so the specs only ever call it unauthenticated (401 check).
   */
  async requestCommissionPayout(_amount?: number, _paymentMethod?: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/admin/referral/claim'));
  }

  /** GET /admin/referral/history: the agent's claim history (array). */
  async getClaimHistory(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/referral/history'));
  }

  // ==================== Financial Management ====================

  /**
   * GET /admin/referral/agent-stats: totalEarnings, totalEarnedAllTime, availableBalance,
   * frozenBalance, pendingIncome, lockedIncome, totalTeamEarnings...
   */
  async getFinancialSummary(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/referral/agent-stats'));
  }

  /**
   * GET /admin/transactions/me -> { data, total, page, limit }: the agent's own ledger.
   * Params: page, limit, type (CREDIT | DEBIT), source, fromDate, toDate.
   */
  async getTransactions(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/transactions/me'), { params: params as any });
  }

  /** NOT IMPLEMENTED ON BACKEND: no single-transaction lookup for agents (the path answers 404). */
  async getTransactionById(transactionId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/admin/transactions/me/${transactionId}`));
  }

  /** GET /admin/agent-payment/my-requests: the agent's own payout requests. */
  async getPaymentRequests(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/agent-payment/my-requests'));
  }

  // ==================== Reports ====================

  /** GET /admin/referral/agent-stats?startDate&endDate: the agent's performance for a period. */
  async getPerformanceReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/referral/agent-stats'), { params });
  }

  /**
   * GET /admin/reports/game-report -> { items, total, summary }: per-bet game log, auto-scoped to
   * the agent's downline. Params: startDate, endDate, provider, category, userStatus, result,
   * currency, page, limit (no player filter).
   */
  async getPlayerActivityReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/reports/game-report'), { params });
  }

  /** GET /admin/reports/daily-report?startDate&endDate: win-loss aggregated by day, auto-scoped for agents. */
  async getDailyReport(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/reports/daily-report'), {
      params: { startDate, endDate },
    });
  }

  /**
   * GET /admin/reports/win-loss-report?startDate&endDate: array of rows per provider/category,
   * auto-scoped to the agent's downline. Amount fields are decimal strings ("80.00").
   */
  async getRevenueReport(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/reports/win-loss-report'), {
      params: { startDate, endDate },
    });
  }

  // ==================== Sub-Agents Management ====================
  // Read-only use only: registering, updating or deleting sub-agents touches real employee accounts.

  /** GET /admin/users/agents: paginated staff-agent list (admin collection). */
  async getSubAgents(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/users/agents'), { params: params as any });
  }

  /** GET /admin/referral/sub-agent/:id (parent agent only). */
  async getSubAgentById(subAgentId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/admin/referral/sub-agent/${subAgentId}`));
  }

  /** POST /admin/referral/register-sub-agent (CreateSubAgentDto): creates a real employee account. */
  async createSubAgent(subAgentData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/admin/referral/register-sub-agent'), subAgentData);
  }

  /** PATCH /admin/referral/sub-agent/:id { displayName?, phone?, commissionPercentage? } (parent agent only). */
  async updateSubAgent(subAgentId: string, subAgentData: any): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/admin/referral/sub-agent/${subAgentId}`), subAgentData);
  }

  /** DELETE /admin/referral/sub-agent/:id (parent agent only). */
  async deleteSubAgent(subAgentId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(this.endpoint(`/admin/referral/sub-agent/${subAgentId}`));
  }

  // ==================== Marketing Tools ====================
  // Agent marketing = promo codes (/agent/promo-codes/*) + the public banner packs.

  /** GET /agent/promo-codes/all?activeOnly=: array of the agent's promo codes. */
  async getMarketingLinks(params?: Record<string, string | number | boolean>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/agent/promo-codes/all'), { params });
  }

  /**
   * POST /agent/promo-codes/create (CreatePromoCodeDto, see DataGenerator.generateAgentPromoCode).
   * New agent codes enter the approval flow: approvalStatus "pending", isActive false.
   */
  async createMarketingLink(linkData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/agent/promo-codes/create'), linkData);
  }

  /**
   * GET /agent/promo-codes/:id (agent-owned only). The only usage "statistics" a promo code
   * exposes are totalClaimed / maxUsage / maxUsagePerUser; there are no click or registration counters.
   */
  async getMarketingLinkStats(linkId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/agent/promo-codes/${linkId}`));
  }

  /** PATCH /agent/promo-codes/:id: partial CreatePromoCodeDto (agent-owned only). */
  async updateMarketingLink(linkId: string, linkData: any): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/agent/promo-codes/${linkId}`), linkData);
  }

  /** DELETE /agent/promo-codes/:id: 204 No Content (agent-owned only). */
  async deleteMarketingLink(linkId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(this.endpoint(`/agent/promo-codes/${linkId}`));
  }

  /**
   * GET /admin/banner-packs/public: array of banner packs
   * { id, title, description, coverImage, packSize, isActive, folders[].files[].fileUrl, fileCount }.
   * The endpoint takes no query filters; `params` is passed through untouched.
   */
  async getPromotionalMaterials(params?: Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/admin/banner-packs/public'), { params });
  }

  // ==================== Cleanup ====================

  async dispose(): Promise<void> {
    await this.apiClient.dispose();
  }
}
