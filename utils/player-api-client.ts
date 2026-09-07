/**
 * Player API Client
 * Specialized client for Player API endpoints
 *
 * Endpoint paths follow postman/WulfCasino-Player-API.postman_collection.json.
 * Methods whose feature does not exist on the backend are marked
 * "NOT IMPLEMENTED ON BACKEND" and keep a placeholder path.
 */

import { ApiClient } from './api-client';
import { AuthHelper } from './auth-helper';
import { env } from '../config/environment';
import { ApiResponse, PaginationParams } from '../types';
import { tokenStore } from './token-store';
import { logger } from './logger';

export interface LoginOptions {
  /** Force a real login instead of reusing the token cached by global-setup. */
  fresh?: boolean;
}

/** Body of POST /games/launch */
export interface LaunchGameOptions {
  /** sagames | evolution | pragmaticplay | pgsoft | aleaplay */
  provider: string;
  /** Provider-side game id (games/list `providerGameId`); defaults to the provider lobby. */
  gameId?: string;
  /** sweeps = Sweep Coin (wulfCash), gold = Gold Coins (wulfCoin). Backend default: sweeps. */
  playMode?: 'sweeps' | 'gold';
  mobile?: boolean;
}

/** Query params of GET /games/list */
export interface GameListParams extends PaginationParams {
  provider?: string;
  studio?: string;
  category?: string;
  search?: string;
  cursor?: string;
  isFeatured?: boolean;
  isNew?: boolean;
}

export class PlayerApiClient {
  private apiClient: ApiClient;
  private authHelper: AuthHelper;
  private readonly basePath = '/api/v1';

  constructor() {
    this.apiClient = new ApiClient({
      baseURL: env.getPlayerApiUrl(),
      timeout: env.get().testConfig.apiTimeout,
      retryConfig: {
        retries: env.get().testConfig.retryCount,
        retryDelay: 1000,
      },
    });
    this.authHelper = new AuthHelper(this.apiClient, {
      basePath: this.basePath,
      loginField: 'entity',
      serverLogout: true,
      protectedSessionId: tokenStore.get('player')?.sessionId,
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
   * Check whether a token is still accepted by GET /auth/me
   */
  async isTokenValid(token: string): Promise<boolean> {
    return this.authHelper.isTokenValid(token);
  }

  /**
   * Login as player.
   * Reuses the token cached by global-setup unless `fresh` is requested.
   * Handles the device-limit confirmation flow transparently.
   *
   * Observed on staging: a new login from the same device fingerprint (IP + user agent)
   * replaces that device's existing session, so any real login from the test runner
   * invalidates the cached token; the next loginAsPlayer() then self-heals with one login.
   */
  async loginAsPlayer(options: LoginOptions = {}): Promise<void> {
    if (!options.fresh) {
      const cached = tokenStore.get('player');
      if (cached) {
        // POST /auth/logout revokes every session of the account, so a logout test
        // can invalidate the shared token mid-run: verify before trusting it.
        if (await this.isTokenValid(cached.accessToken)) {
          this.useToken(cached.accessToken, cached.refreshToken);
          this.authHelper.setProtectedSessionId(cached.sessionId);
          return;
        }
        logger.warn('Cached player token was rejected; logging in again');
      }
    }

    // Protect the shared session that other tests may still be using
    this.authHelper.setProtectedSessionId(tokenStore.get('player')?.sessionId);

    const credentials = env.getPlayerCredentials();
    const response = await this.authHelper.login(credentials, 'entity');

    if (!response.success || !response.data?.accessToken) {
      throw new Error(`Player login failed: ${response.error}`);
    }

    // Remember which server-side session this token belongs to so later
    // device-limit evictions never kill the shared session.
    let sessionId: string | undefined;
    const sessions = await this.getSessions();
    if (sessions.success && sessions.data) {
      const list: any[] = Array.isArray(sessions.data)
        ? sessions.data
        : sessions.data.devices || sessions.data.sessions || sessions.data.data || [];
      sessionId = list.find((s: any) => s?.isCurrent)?.sessionId;
    }

    tokenStore.set('player', {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      sessionId,
      createdAt: new Date().toISOString(),
    });
    this.authHelper.setProtectedSessionId(sessionId);
  }

  // ==================== Auth (password recovery) ====================

  /**
   * POST /auth/forgot-password { entity }: sends a reset OTP; 404 when no such user.
   * Throttled 3/min per IP.
   */
  async forgotPassword(entity: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/auth/forgot-password'), { entity }, { requiresAuth: false });
  }

  // ==================== Sessions & Devices ====================

  /** GET /sessions -> { devices: [{ sessionId, isCurrent, ... }], limit, ... } */
  async getSessions(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/sessions'));
  }

  /** DELETE /sessions/others */
  async signOutOtherDevices(): Promise<ApiResponse<any>> {
    return this.apiClient.delete(this.endpoint('/sessions/others'));
  }

  /** DELETE /sessions/:sessionId */
  async signOutDevice(sessionId: string): Promise<ApiResponse<any>> {
    return this.apiClient.delete(this.endpoint(`/sessions/${sessionId}`));
  }

  // ==================== Profile Management ====================

  /** GET /profile/me -> { status, message, data: profile } */
  async getProfile(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/profile/me'));
  }

  /**
   * PATCH /profile/me { displayName, fullName, ethnicity, state, country, pinCode, gender,
   * phone, email, dateOfBirth, timezone, ... }.
   * Changing email/phone/dateOfBirth triggers the SEON account_edit gate (403 / 428).
   */
  async updateProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint('/profile/me'), profileData);
  }

  /** PATCH /profile/me/timezone { timezone } (IANA name; fixed offsets rejected with 400). Throttled 10/min. */
  async updateTimezone(timezone: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint('/profile/me/timezone'), { timezone });
  }

  /** PATCH /profile/avatar { avatar } - gated by the subscription feature 'profileCustomization'. */
  async uploadAvatar(avatarData: any): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint('/profile/avatar'), avatarData);
  }

  /** PATCH /profile/username { username } - gated by the subscription feature 'profileCustomization'. */
  async updateUsername(username: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(this.endpoint('/profile/username'), { username });
  }

  /** NOT IMPLEMENTED ON BACKEND: players change password via forgot/reset-password OTP flow. */
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.apiClient.post(this.endpoint('/profile/change-password'), { oldPassword, newPassword });
  }

  /** NOT IMPLEMENTED ON BACKEND */
  async enableTwoFactor(): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/profile/2fa/enable'));
  }

  /** NOT IMPLEMENTED ON BACKEND */
  async verifyTwoFactor(code: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/profile/2fa/verify'), { code });
  }

  /** NOT IMPLEMENTED ON BACKEND */
  async disableTwoFactor(code: string): Promise<ApiResponse<void>> {
    return this.apiClient.post(this.endpoint('/profile/2fa/disable'), { code });
  }

  // ==================== Wallet Management ====================

  /** GET /wallet/balance -> { userId, wulfCash, wulfCoin, bonusWulfCash, redeemableWulfCash } */
  async getWallet(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/wallet/balance'));
  }

  /** GET /wallet/balance (alias of getWallet) */
  async getWalletBalance(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/wallet/balance'));
  }

  /** GET /redeem/balance -> { redeemableWulfCash, wulfCash, availableToWithdraw, redeemLimits, ... } */
  async getRedeemableBalance(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/redeem/balance'));
  }

  /** NOT IMPLEMENTED ON BACKEND as a plain deposit: real deposits go through Coinflow/Breeze payin pages. */
  async deposit(amount: number, paymentMethod: string, details?: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/wallet/deposit'), { amount, paymentMethod, ...details });
  }

  /**
   * POST /redeem/request { amount, paymentMethod: 'Coinflow' | 'Breeze', ... }.
   * Runs the SEON withdrawal gate and creates a real redeem request.
   */
  async withdraw(amount: number, paymentMethod: string, details?: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/redeem/request'), { amount, paymentMethod, ...details });
  }

  /** GET /redeem/my-requests -> array of redeem requests */
  async getRedeemRequests(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/redeem/my-requests'));
  }

  /**
   * GET /transactions/me?page&limit&type&source&fromDate&toDate -> { data, total, page, limit }.
   * type enum: CREDIT, DEBIT, DEPOSIT, PROMOTION. No sort parameters (newest first).
   */
  async getTransactionHistory(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/transactions/me'), { params: params as any });
  }

  /** GET /transactions/me/:id/detail */
  async getTransactionById(transactionId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/transactions/me/${transactionId}/detail`));
  }

  // ==================== Game Management ====================

  /**
   * GET /games/list?page&limit&provider&studio&category&search&cursor&isFeatured&isNew&sortBy
   * -> { data, pagination: { total, page, limit, totalPages, nextCursor, hasNextPage } }
   */
  async getAvailableGames(params?: GameListParams & Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games/list'), { params: params as any });
  }

  /** GET /games/categories -> array of { id, name, slug, displayOrder, isActive } */
  async getGameCategories(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games/categories'));
  }

  /** GET /games/providers -> array of { studio, studioLogo, gameCount } */
  async getGameProviders(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games/providers'));
  }

  /** NOT IMPLEMENTED ON BACKEND: there is no single-game lookup; use getAvailableGames({ search }). */
  async getGameById(gameId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/games/${gameId}`));
  }

  /** POST /games/launch { provider, gameId, playMode, mobile } -> { url } */
  async launchGame(options: LaunchGameOptions): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/games/launch'), {
      provider: options.provider,
      gameId: options.gameId,
      playMode: options.playMode ?? 'gold',
      mobile: options.mobile ?? false,
    });
  }

  /** GET /games/favorites -> array of games */
  async getFavoriteGames(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games/favorites'));
  }

  /** GET /favorites/check/:gameId -> { isFavorite } */
  async isFavoriteGame(gameId: string): Promise<ApiResponse<{ isFavorite: boolean }>> {
    return this.apiClient.get(this.endpoint(`/favorites/check/${gameId}`));
  }

  /** POST /favorites/toggle/:gameId -> { isFavorite, message }; 404 for an unknown game. */
  async toggleFavoriteGame(gameId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint(`/favorites/toggle/${gameId}`));
  }

  /** Backend only exposes a toggle: check first so this is idempotent. */
  async addGameToFavorites(gameId: string): Promise<ApiResponse<any>> {
    const check = await this.isFavoriteGame(gameId);
    if (check.success && check.data?.isFavorite) {
      return check;
    }
    return this.toggleFavoriteGame(gameId);
  }

  /** Backend only exposes a toggle: check first so this is idempotent. */
  async removeGameFromFavorites(gameId: string): Promise<ApiResponse<any>> {
    const check = await this.isFavoriteGame(gameId);
    if (check.success && check.data && !check.data.isFavorite) {
      return check;
    }
    return this.toggleFavoriteGame(gameId);
  }

  /** GET /games/recent -> array of the last 20 launched games */
  async getRecentlyPlayedGames(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games/recent'));
  }

  /** GET /games/play-logs?page&limit&all&cursor -> { data, pagination } */
  async getPlayLogs(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games/play-logs'), { params: params as any });
  }

  // ==================== Bet Management ====================

  /** NOT IMPLEMENTED ON BACKEND: bets are placed by game providers via webhooks. */
  async placeBet(betData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/bets'), betData);
  }

  /**
   * GET /games/bet-history?page&limit&type&asset&from&to&range&cursor
   * -> { rows, pagination: { total, page, limit, totalPages, hasMore, nextCursor } }
   * asset enum: all | wulfCash | wulfCoin. No sort parameters (newest first).
   */
  async getBetHistory(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games/bet-history'), { params: params as any });
  }

  /** GET /games/bet-history/:id */
  async getBetById(betId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/games/bet-history/${betId}`));
  }

  /** NOT IMPLEMENTED ON BACKEND */
  async cancelBet(betId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint(`/bets/${betId}/cancel`));
  }

  // ==================== Bonus Management ====================

  /**
   * GET /bonus/eligible -> array of bonus definitions. The backend accepts no
   * query filters; `params` is kept for call-site compatibility only.
   */
  async getAvailableBonuses(params?: Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/bonus/eligible'), { params });
  }

  /** GET /bonus/active/user -> array of bonus definitions */
  async getActiveBonuses(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/bonus/active/user'));
  }

  /** GET /bonus/my-bonuses?status -> array of user bonuses { id, bonusId, bonus, ... } */
  async getMyBonuses(status?: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/bonus/my-bonuses'), { params: status ? { status } : undefined });
  }

  /** POST /bonus/claim { bonusId, depositAmount?, bundleId?, paymentMethod? } - credits real bonus balance. */
  async claimBonus(bonusId: string, extra?: Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/bonus/claim'), { bonusId, ...extra });
  }

  /** GET /bonus/my-bonuses/:id - `id` is the USER bonus id (from getMyBonuses), not the bonus definition id. */
  async getBonusDetails(userBonusId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/bonus/my-bonuses/${userBonusId}`));
  }

  /** POST /bonus/forfeit/:id - forfeits an active USER bonus (irreversible). */
  async cancelBonus(userBonusId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint(`/bonus/forfeit/${userBonusId}`));
  }

  // ==================== Notification Management ====================

  /** GET /global-notification/me?sourceType&isRead&page&limit -> { data, total, page, limit, totalPages } */
  async getNotifications(params?: PaginationParams & Record<string, any>): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/global-notification/me'), { params: params as any });
  }

  /** GET /global-notification/me/unread-count -> { count } */
  async getUnreadNotificationCount(): Promise<ApiResponse<{ count: number }>> {
    return this.apiClient.get(this.endpoint('/global-notification/me/unread-count'));
  }

  /** PATCH /global-notification/mark-read { notificationIds } */
  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return this.apiClient.patch(this.endpoint('/global-notification/mark-read'), {
      notificationIds: [notificationId],
    });
  }

  /** PATCH /global-notification/mark-all-read */
  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return this.apiClient.patch(this.endpoint('/global-notification/mark-all-read'));
  }

  /** DELETE /global-notification/:id */
  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(this.endpoint(`/global-notification/${notificationId}`));
  }

  // ==================== Responsible Gaming ====================
  // NOT IMPLEMENTED ON BACKEND: no responsible-gaming endpoints exist in the API.

  async setDepositLimit(limit: number, period: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/responsible-gaming/deposit-limit'), { limit, period });
  }

  async setLossLimit(limit: number, period: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/responsible-gaming/loss-limit'), { limit, period });
  }

  async setSessionTimeLimit(minutes: number): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/responsible-gaming/session-limit'), { minutes });
  }

  async selfExclude(duration: number, unit: 'days' | 'weeks' | 'months'): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/responsible-gaming/self-exclude'), { duration, unit });
  }

  async getRealityCheck(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/responsible-gaming/reality-check'));
  }

  // ==================== Support ====================
  // NOT IMPLEMENTED ON BACKEND: support runs through chat, not tickets.

  async createSupportTicket(ticketData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/support/tickets'), ticketData);
  }

  async getSupportTickets(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/support/tickets'), { params: params as any });
  }

  async getSupportTicketById(ticketId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint(`/support/tickets/${ticketId}`));
  }

  async updateSupportTicket(ticketId: string, message: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint(`/support/tickets/${ticketId}/messages`), { message });
  }

  // ==================== Cleanup ====================

  async dispose(): Promise<void> {
    await this.apiClient.dispose();
  }
}
