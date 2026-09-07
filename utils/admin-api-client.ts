/**
 * Admin API Client
 * Specialized client for Admin API endpoints
 */

import { ApiClient } from './api-client';
import { AuthHelper } from './auth-helper';
import { env } from '../config/environment';
import { ApiResponse, PaginationParams, PaginatedResponse } from '../types';

export class AdminApiClient {
  private apiClient: ApiClient;
  private authHelper: AuthHelper;

  constructor() {
    this.apiClient = new ApiClient({
      baseURL: env.getAdminApiUrl(),
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
   * Login as admin
   */
  async loginAsAdmin(): Promise<void> {
    const credentials = env.getAdminCredentials();
    const response = await this.authHelper.login(credentials);
    if (!response.success) {
      throw new Error(`Admin login failed: ${response.error}`);
    }
  }

  // ==================== User Management ====================

  async getAllUsers(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.apiClient.get('/users', { params });
  }

  async getUserById(userId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/users/${userId}`);
  }

  async createUser(userData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post('/users', userData);
  }

  async updateUser(userId: string, userData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(`/users/${userId}`, userData);
  }

  async deleteUser(userId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(`/users/${userId}`);
  }

  async updateUserStatus(userId: string, status: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(`/users/${userId}/status`, { status });
  }

  async getUserTransactions(userId: string, params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.apiClient.get(`/users/${userId}/transactions`, { params });
  }

  // ==================== Game Management ====================

  async getAllGames(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.apiClient.get('/games', { params });
  }

  async getGameById(gameId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/games/${gameId}`);
  }

  async createGame(gameData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post('/games', gameData);
  }

  async updateGame(gameId: string, gameData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(`/games/${gameId}`, gameData);
  }

  async deleteGame(gameId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(`/games/${gameId}`);
  }

  async updateGameStatus(gameId: string, status: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(`/games/${gameId}/status`, { status });
  }

  async getGameStatistics(gameId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/games/${gameId}/statistics`);
  }

  // ==================== Transaction Management ====================

  async getAllTransactions(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.apiClient.get('/transactions', { params });
  }

  async getTransactionById(transactionId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/transactions/${transactionId}`);
  }

  async updateTransactionStatus(transactionId: string, status: string): Promise<ApiResponse<any>> {
    return this.apiClient.patch(`/transactions/${transactionId}/status`, { status });
  }

  // ==================== Bonus Management ====================

  async getAllBonuses(params?: PaginationParams): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.apiClient.get('/bonuses', { params });
  }

  async getBonusById(bonusId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/bonuses/${bonusId}`);
  }

  async createBonus(bonusData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post('/bonuses', bonusData);
  }

  async updateBonus(bonusId: string, bonusData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(`/bonuses/${bonusId}`, bonusData);
  }

  async deleteBonus(bonusId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(`/bonuses/${bonusId}`);
  }

  async assignBonusToUser(bonusId: string, userId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/bonuses/${bonusId}/assign`, { userId });
  }

  // ==================== Webhook Management ====================

  async getAllWebhooks(): Promise<ApiResponse<any[]>> {
    return this.apiClient.get('/webhooks');
  }

  async getWebhookById(webhookId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/webhooks/${webhookId}`);
  }

  async createWebhook(webhookData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post('/webhooks', webhookData);
  }

  async updateWebhook(webhookId: string, webhookData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(`/webhooks/${webhookId}`, webhookData);
  }

  async deleteWebhook(webhookId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(`/webhooks/${webhookId}`);
  }

  async testWebhook(webhookId: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/webhooks/${webhookId}/test`);
  }

  // ==================== Reports ====================

  async getFinancialReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get('/reports/financial', { params });
  }

  async getUserActivityReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get('/reports/user-activity', { params });
  }

  async getGamePerformanceReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get('/reports/game-performance', { params });
  }

  async getTransactionReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get('/reports/transactions', { params });
  }

  // ==================== Settings ====================

  async getSystemSettings(): Promise<ApiResponse<any>> {
    return this.apiClient.get('/settings');
  }

  async updateSystemSettings(settings: any): Promise<ApiResponse<any>> {
    return this.apiClient.put('/settings', settings);
  }

  async getGameProviders(): Promise<ApiResponse<any[]>> {
    return this.apiClient.get('/settings/game-providers');
  }

  async updateGameProvider(providerId: string, providerData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(`/settings/game-providers/${providerId}`, providerData);
  }

  // ==================== Cleanup ====================

  async dispose(): Promise<void> {
    await this.apiClient.dispose();
  }
}
