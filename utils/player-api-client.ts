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

  constructor() {
    this.apiClient = new ApiClient({
      baseURL: env.getPlayerApiUrl(),
      timeout: env.get().testConfig.apiTimeout,
      retryConfig: {
        retries: env.get().testConfig.retryCount,
        retryDelay: 1000,
      },
    });
    this.authHelper = new AuthHelper(this.apiClient);
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
   * Login as player
   */
  async loginAsPlayer(): Promise<void> {
    const credentials = env.getPlayerCredentials();
    const response = await this.authHelper.login(credentials);
    if (!response.success) {
      throw new Error(`Player login failed: ${response.error}`);
    }
  }

  // ==================== Profile Management ====================

  async getProfile(): Promise<ApiResponse<any>> {
    return this.apiClient.get('/profile');
  }

  async updateProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put('/profile', profileData);
  }

  async uploadAvatar(avatarData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post('/profile/avatar', avatarData);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    return this.apiClient.post('/profile/change-password', { oldPassword, newPassword });
  }

  async enableTwoFactor(): Promise<ApiResponse<any>> {
    return this.apiClient.post('/profile/2fa/enable');
  }

  async verifyTwoFactor(code: string): Promise<ApiResponse<any>> {
    return this.apiClient.post('/profile/2fa/verify', { code });
  }

  async disableTwoFactor(code: string): Promise<ApiResponse<void>> {
    return this.apiClient.post('/profile/2fa/disable', { code });
  }

  // ==================== Wallet Management ====================

  async getWallet(): Promise<ApiResponse<any>> {
    return this.apiClient.get('/wallet');
  }

  async getWalletBalance(): Promise<ApiResponse<any>> {
    return this.apiClient.get('/wallet/balance');
  }

  async deposit(amount: number, paymentMethod: string, details?: any): Promise<ApiResponse<any>> {
    return this.apiClient.post('/wallet/deposit', { amount, paymentMethod, ...details });
  }

  async withdraw(amount: number, paymentMethod: string, details?: any): Promise<ApiResponse<any>> {
    return this.apiClient.post('/wallet/withdraw', { amount, paymentMethod, ...details });
  }

  async getTransactionHistory(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get('/wallet/transactions', { params });
  }

  async getTransactionById(transactionId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/wallet/transactions/${transactionId}`);
  }

  // ==================== Game Management ====================

  async getAvailableGames(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get('/games', { params });
  }

  async getGameById(gameId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/games/${gameId}`);
  }

  async launchGame(gameId: string, mode?: 'real' | 'demo'): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/games/${gameId}/launch`, { mode: mode || 'real' });
  }

  async getFavoriteGames(): Promise<ApiResponse<any>> {
    return this.apiClient.get('/games/favorites');
  }

  async addGameToFavorites(gameId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/games/${gameId}/favorite`);
  }

  async removeGameFromFavorites(gameId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(`/games/${gameId}/favorite`);
  }

  async getRecentlyPlayedGames(): Promise<ApiResponse<any>> {
    return this.apiClient.get('/games/recent');
  }

  // ==================== Bet Management ====================

  async placeBet(betData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post('/bets', betData);
  }

  async getBetHistory(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get('/bets', { params });
  }

  async getBetById(betId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/bets/${betId}`);
  }

  async cancelBet(betId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/bets/${betId}/cancel`);
  }

  // ==================== Bonus Management ====================

  async getAvailableBonuses(): Promise<ApiResponse<any>> {
    return this.apiClient.get('/bonuses/available');
  }

  async getActiveBonuses(): Promise<ApiResponse<any>> {
    return this.apiClient.get('/bonuses/active');
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
    return this.apiClient.get('/notifications', { params });
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<void>> {
    return this.apiClient.patch(`/notifications/${notificationId}/read`);
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return this.apiClient.post('/notifications/read-all');
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(`/notifications/${notificationId}`);
  }

  // ==================== Responsible Gaming ====================

  async setDepositLimit(limit: number, period: string): Promise<ApiResponse<any>> {
    return this.apiClient.post('/responsible-gaming/deposit-limit', { limit, period });
  }

  async setLossLimit(limit: number, period: string): Promise<ApiResponse<any>> {
    return this.apiClient.post('/responsible-gaming/loss-limit', { limit, period });
  }

  async setSessionTimeLimit(minutes: number): Promise<ApiResponse<any>> {
    return this.apiClient.post('/responsible-gaming/session-limit', { minutes });
  }

  async selfExclude(duration: number, unit: 'days' | 'weeks' | 'months'): Promise<ApiResponse<any>> {
    return this.apiClient.post('/responsible-gaming/self-exclude', { duration, unit });
  }

  async getRealityCheck(): Promise<ApiResponse<any>> {
    return this.apiClient.get('/responsible-gaming/reality-check');
  }

  // ==================== Support ====================

  async createSupportTicket(ticketData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post('/support/tickets', ticketData);
  }

  async getSupportTickets(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get('/support/tickets', { params });
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
