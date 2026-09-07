/**
 * Admin API Client
 * Specialized client for Admin API endpoints
 *
 * Endpoint paths follow postman/WulfCasino-Admin-API.postman_collection.json.
 * Methods whose feature does not exist on the backend are marked
 * "NOT IMPLEMENTED ON BACKEND" and keep a placeholder path.
 *
 * Shared-staging safety: the write methods below are real. Tests may only
 * call them on entities they created themselves (users / bonuses) and must
 * never touch shared config, games, providers, transactions or payouts.
 */

import { ApiClient } from './api-client';
import { AuthHelper } from './auth-helper';
import { env } from '../config/environment';
import { ApiResponse, PaginationParams, PaginatedResponse } from '../types';
import { tokenStore } from './token-store';
import { logger } from './logger';
import type { LoginOptions } from './player-api-client';

export class AdminApiClient {
  private apiClient: ApiClient;
  private authHelper: AuthHelper;
  private readonly basePath = '/api/v1/admin';

  constructor() {
    this.apiClient = new ApiClient({
      baseURL: env.getAdminApiUrl(),
      timeout: env.get().testConfig.apiTimeout,
      retryConfig: {
        retries: env.get().testConfig.retryCount,
        retryDelay: 1000,
      },
    });
    this.authHelper = new AuthHelper(this.apiClient, {
      basePath: this.basePath,
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
   * Login as admin.
   * Reuses the token cached by global-setup unless `fresh` is requested.
   */
  async loginAsAdmin(options: LoginOptions = {}): Promise<void> {
    if (!options.fresh) {
      const cached = tokenStore.get('admin');
      if (cached) {
        if (await this.isTokenValid(cached.accessToken)) {
          this.useToken(cached.accessToken, cached.refreshToken);
          return;
        }
        logger.warn('Cached admin token was rejected; logging in again');
      }
    }

    const credentials = env.getAdminCredentials();
    const response = await this.authHelper.login(credentials);
    if (!response.success || !response.data?.accessToken) {
      throw new Error(`Admin login failed: ${response.error}`);
    }

    tokenStore.set('admin', {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      createdAt: new Date().toISOString(),
    });
  }

  // ==================== User Management ====================

  /**
   * GET /admin/users/all -> { data: [], meta: { total, page, limit, totalPages } }
   * Filters: search, isActive, isVerified, isPremium, isBanned, referrerId, source,
   * kyc, vipTierId, startDate, endDate, sortField, sortOrder, freeSpinEligible.
   */
  async getAllUsers(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.apiClient.get(this.endpoint('/users/all'), { params });
  }

  /** GET /admin/users/:id (id must be a UUID; non-UUID ids return 500) */
  async getUserById(userId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/users/${userId}`));
  }

  /**
   * POST /admin/users -> 201 player account.
   * Body: { entity (email), name, password (required, min 6), avatar }
   * Quirk: the DTO validates isActive / isPremium / isVerified as *strings*
   * ("isActive must be a string"), so JSON booleans are rejected with 400.
   */
  async createUser(userData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/users'), userData);
  }

  /** PATCH /admin/users/:id with any subset of the create fields */
  async updateUser(userId: string, userData: any): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/users/${userId}`), userData);
  }

  /** DELETE /admin/users/:id */
  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(this.endpoint(`/users/${userId}`));
  }

  /** PATCH /admin/users/:id/deactivate */
  async deactivateUser(userId: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/users/${userId}/deactivate`));
  }

  /** PATCH /admin/users/:id/ban */
  async banUser(userId: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/users/${userId}/ban`));
  }

  /** status: 'banned' -> ban, 'inactive' -> deactivate, anything else -> PATCH { isActive } (string-typed, see createUser). */
  async updateUserStatus(userId: string, status: string): Promise<ApiResponse<any>> {
    if (status === 'banned') return this.banUser(userId);
    if (status === 'inactive') return this.deactivateUser(userId);
    return this.updateUser(userId, { isActive: String(status === 'active') });
  }

  /** GET /admin/transactions/all?userId= (no per-user transaction route exists) */
  async getUserTransactions(userId: string, params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.apiClient.get(this.endpoint('/transactions/all'), {
      params: { ...(params as any), userId },
    });
  }

  /** GET /admin/users/agents?page&limit&search */
  async getAgents(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/users/agents'), { params });
  }

  // ==================== Game Management ====================

  /**
   * GET /admin/games/list -> { data: [], total, page, limit, totalPages }
   * Filters: provider, studio, category, search, marketing, sortBy (e.g. popular), enabled.
   */
  async getAllGames(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.apiClient.get(this.endpoint('/games/list'), { params });
  }

  /** NOT IMPLEMENTED ON BACKEND: no single-game lookup; use getAllGames({ search }). */
  async getGameById(gameId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/games/${gameId}`));
  }

  /** NOT IMPLEMENTED ON BACKEND: games are synced from providers, not created manually. */
  async createGame(gameData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/games'), gameData);
  }

  /**
   * PATCH /admin/games/:id (Partial<GameEntity>: enabled, isFeatured, isNew, displayOrder, name, category).
   * Mutates a shared staging game - tests must not call this.
   */
  async updateGame(gameId: string, gameData: any): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/games/${gameId}`), gameData);
  }

  /** NOT IMPLEMENTED ON BACKEND */
  async deleteGame(gameId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(this.endpoint(`/games/${gameId}`));
  }

  /** PATCH /admin/games/:id { enabled } - mutates a shared staging game; tests must not call this. */
  async updateGameStatus(gameId: string, status: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/games/${gameId}`), { enabled: status === 'active' });
  }

  /**
   * GET /admin/reports/game-report -> { items: [], total, summary }
   * There is no per-game statistics route; filter the game report by provider / category.
   */
  async getGameStatistics(params?: {
    provider?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/reports/game-report'), { params });
  }

  /** GET /admin/games/summary -> [ { provider, totalGames, categories: [...] } ] */
  async getGamesSummary(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games/summary'));
  }

  // ==================== Transaction Management ====================

  /**
   * GET /admin/transactions/all -> { data: [], total, page, limit }
   * Filters: type (DEPOSIT, CREDIT, DEBIT, PROMOTION, ...), source, fromDate, toDate,
   * search, paymentMethod, minAmount, maxAmount, userId. No sort or status parameters.
   */
  async getAllTransactions(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.apiClient.get(this.endpoint('/transactions/all'), { params });
  }

  /** NOT IMPLEMENTED ON BACKEND: filter getAllTransactions instead. */
  async getTransactionById(transactionId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/transactions/${transactionId}`));
  }

  /**
   * NOT IMPLEMENTED ON BACKEND: wallet transactions have no status endpoint.
   * (Only redeem requests do - PATCH /admin/redeem/:id/status - which is shared
   * payout data and must not be touched by tests.)
   */
  async updateTransactionStatus(transactionId: string, status: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/transactions/${transactionId}/status`), { status });
  }

  // ==================== Bonus Management ====================

  /** GET /admin/bonus/all?activeOnly= -> plain array (no pagination envelope) */
  async getAllBonuses(params?: { activeOnly?: boolean } & Record<string, any>): Promise<ApiResponse<any[]>> {
    return this.apiClient.get(this.endpoint('/bonus/all'), { params });
  }

  /** GET /admin/bonus/:id (id must be a UUID; non-UUID ids return 500) */
  async getBonusById(bonusId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/bonus/${bonusId}`));
  }

  /**
   * POST /admin/bonus/create (CreateBonusDto: name, type, matchPercentage, maxBonus,
   * rewardCurrency, minDeposit, wageringMultiplier, wageringType, validityDays, playerStatus, isActive, ...)
   */
  async createBonus(bonusData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/bonus/create'), bonusData);
  }

  /** PATCH /admin/bonus/:id with a partial CreateBonusDto */
  async updateBonus(bonusId: string, bonusData: any): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/bonus/${bonusId}`), bonusData);
  }

  /** DELETE /admin/bonus/:id -> deletes, or archives when players already claimed it ({ archived, claimCount }) */
  async deleteBonus(bonusId: string): Promise<ApiResponse<any>> {
    return this.apiClient.delete(this.endpoint(`/bonus/${bonusId}`));
  }

  /** PATCH /admin/bonus/:id/activate */
  async activateBonus(bonusId: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/bonus/${bonusId}/activate`));
  }

  /** PATCH /admin/bonus/:id/deactivate */
  async deactivateBonus(bonusId: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/bonus/${bonusId}/deactivate`));
  }

  /** NOT IMPLEMENTED ON BACKEND: bonuses are claimed by players, not assigned by admins. */
  async assignBonusToUser(bonusId: string, userId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint(`/bonus/${bonusId}/assign`), { userId });
  }

  // ==================== Webhook Management ====================
  // NOT IMPLEMENTED ON BACKEND: webhooks are inbound provider callbacks with no admin CRUD.

  async getAllWebhooks(): Promise<ApiResponse<any[]>> {
    return this.apiClient.get(this.endpoint('/webhooks'));
  }

  async getWebhookById(webhookId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/webhooks/${webhookId}`));
  }

  async createWebhook(webhookData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/webhooks'), webhookData);
  }

  async updateWebhook(webhookId: string, webhookData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(this.endpoint(`/webhooks/${webhookId}`), webhookData);
  }

  async deleteWebhook(webhookId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(this.endpoint(`/webhooks/${webhookId}`));
  }

  async testWebhook(webhookId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint(`/webhooks/${webhookId}/test`));
  }

  // ==================== Reports ====================

  /**
   * GET /admin/reports/win-loss-report -> array of
   * { provider, category, totalPlayers, totalBetCounts, totalBet, totalValidBet, totalWin, playerWin, playerLose }
   * Params: startDate, endDate, userStatus, parentId, currency. No format/export parameter.
   */
  async getFinancialReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/reports/win-loss-report'), { params });
  }

  /**
   * GET /admin/reports/engagement-stats -> { summary: { dau, avgSession, d7Retention, sessionsPerUser }, items: [], total }
   * Daily DAU / sessions / retention. Params: startDate, endDate, page, limit.
   */
  async getUserActivityReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/reports/engagement-stats'), { params });
  }

  /** GET /admin/reports/engagement-report -> array of bonus engagement rows { date, bonusName, user, actionName, amount } */
  async getBonusEngagementReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/reports/engagement-report'), { params });
  }

  /**
   * GET /admin/reports/game-report -> { items: [], total, summary: { totalBetAmount, validBet, totalPayout, totalWin, totalLose, ggr } }
   * Params: startDate, endDate, provider (aleaplay|sagames), category (e.g. Slots), parentId, userStatus, result, currency, page, limit.
   */
  async getGamePerformanceReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/reports/game-report'), { params });
  }

  /**
   * GET /admin/reports/daily-report -> { items: [ { date, totalPlayers, totalBets, totalBetAmt, totalWin, ggr, purchaseAmt, redeemAmt, hold } ], summary }
   * Already grouped by day. Params: startDate, endDate, parentId, userStatus, currency. No "total" field.
   */
  async getTransactionReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/reports/daily-report'), { params });
  }

  /** GET /admin/reports/dashboard-stats -> flat stats object */
  async getDashboardStats(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/reports/dashboard-stats'), { params });
  }

  // ==================== Settings ====================

  /** GET /admin/system-config -> { key, version, config: { general, finance, deposit, ... }, createdAt, updatedAt } */
  async getSystemSettings(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/system-config'));
  }

  /** GET /admin/system-config/defaults -> shipped default configuration (read-only) */
  async getSystemSettingsDefaults(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/system-config/defaults'));
  }

  /**
   * PUT /admin/system-config (body: Partial<SystemConfig>, untyped).
   * DANGER: replaces the shared staging configuration - tests must not call this.
   */
  async updateSystemSettings(settings: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(this.endpoint('/system-config'), settings);
  }

  /** GET /admin/games/providers -> [ { id, name, slug, enabled, displayOrder, logo, gameCount } ] */
  async getGameProviders(): Promise<ApiResponse<any[]>> {
    return this.apiClient.get(this.endpoint('/games/providers'));
  }

  /**
   * PATCH /admin/games/providers/:id { enabled, name, logo }.
   * Mutates a shared staging provider - tests may only call this with a non-existent id.
   */
  async updateGameProvider(providerId: string, providerData: any): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint(`/games/providers/${providerId}`), providerData);
  }

  // ==================== Cleanup ====================

  async dispose(): Promise<void> {
    await this.apiClient.dispose();
  }
}
