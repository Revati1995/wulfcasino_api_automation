/**
 * Player API Client
 * Specialized client for Player API endpoints
 */

import { ApiClient } from './api-client';
import { AuthHelper } from './auth-helper';
import { env } from '../config/environment';
import { ApiResponse, PaginationParams } from '../types';

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
    this.authHelper = new AuthHelper(this.apiClient, this.basePath);
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
   * Login as player
   */
  async loginAsPlayer(): Promise<void> {
    const credentials = env.getPlayerCredentials();
    // Player API uses "entity" instead of "email"
    const response = await this.apiClient.post<any>(
      this.endpoint('/auth/login'),
      { entity: credentials.email, password: credentials.password },
      { requiresAuth: false }
    );
    
    if (response.success && response.data) {
      const accessToken = response.data.token || response.data.accessToken;
      const refreshToken = response.data.refreshToken;
      
      if (accessToken) {
        this.authHelper.setTokens({ accessToken, refreshToken });
        return;
      }
    }
    
    throw new Error(`Player login failed: ${response.error}`);
  }

  // ==================== Profile Management ====================

  async getProfile(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/profile'));
  }

  async updateProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(this.endpoint('/profile'), profileData);
  }

  async uploadAvatar(avatarData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/profile/avatar'), avatarData);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.apiClient.post(this.endpoint('/profile/change-password'), { oldPassword, newPassword });
  }

  async enableTwoFactor(): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/profile/2fa/enable'));
  }

  async verifyTwoFactor(code: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/profile/2fa/verify'), { code });
  }

  async disableTwoFactor(code: string): Promise<ApiResponse<void>> {
    return this.apiClient.post(this.endpoint('/profile/2fa/disable'), { code });
  }

  // ==================== Wallet Management ====================

  async getWallet(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/wallet'));
  }

  async getWalletBalance(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/wallet/balance'));
  }

  async deposit(amount: number, paymentMethod: string, details?: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/wallet/deposit'), { amount, paymentMethod, ...details });
  }

  async withdraw(amount: number, paymentMethod: string, details?: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/wallet/withdraw'), { amount, paymentMethod, ...details });
  }

  async getTransactionHistory(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/wallet/transactions'), { params });
  }

  async getTransactionById(transactionId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/wallet/transactions/${transactionId}`);
  }

  // ==================== Game Management ====================

  async getAvailableGames(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games'), { params });
  }

  async getGameById(gameId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/games/${gameId}`);
  }

  async launchGame(gameId: string, mode?: 'real' | 'demo'): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/games/${gameId}/launch`, { mode: mode || 'real' });
  }

  async getFavoriteGames(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games/favorites'));
  }

  async addGameToFavorites(gameId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/games/${gameId}/favorite`);
  }

  async removeGameFromFavorites(gameId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(`/games/${gameId}/favorite`);
  }

  async getRecentlyPlayedGames(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/games/recent'));
  }

  // ==================== Bet Management ====================

  async placeBet(betData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/bets'), betData);
  }

  async getBetHistory(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/bets'), { params });
  }

  async getBetById(betId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/bets/${betId}`);
  }

  async cancelBet(betId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/bets/${betId}/cancel`);
  }

  // ==================== Bonus Management ====================

  async getAvailableBonuses(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/bonuses/available'));
  }

  async getActiveBonuses(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/bonuses/active'));
  }

  async claimBonus(bonusId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/bonuses/${bonusId}/claim`);
  }

  async getBonusDetails(bonusId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/bonuses/${bonusId}`);
  }

  async cancelBonus(bonusId: string): Promise<ApiResponse<void>> {
    return this.apiClient.post(`/bonuses/${bonusId}/cancel`);
  }

  // ==================== Notification Management ====================

  async getNotifications(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/notifications'), { params });
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return this.apiClient.patch(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return this.apiClient.post(this.endpoint('/notifications/read-all'));
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(`/notifications/${notificationId}`);
  }

  // ==================== Responsible Gaming ====================

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

  async createSupportTicket(ticketData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/support/tickets'), ticketData);
  }

  async getSupportTickets(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/support/tickets'), { params });
  }

  async getSupportTicketById(ticketId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/support/tickets/${ticketId}`);
  }

  async updateSupportTicket(ticketId: string, message: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/support/tickets/${ticketId}/messages`, { message });
  }

  // ==================== Cleanup ====================

  async dispose(): Promise<void> {
    await this.apiClient.dispose();
  }
}
