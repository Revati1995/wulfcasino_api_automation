/**
 * Agent API Client
 * Specialized client for Agent API endpoints
 */

import { ApiClient } from './api-client';
import { AuthHelper } from './auth-helper';
import { env } from '../config/environment';
import { ApiResponse, PaginationParams } from '../types';

export class AgentApiClient {
  private apiClient: ApiClient;
  private authHelper: AuthHelper;
  private readonly basePath = '/api/v1/admin';

  constructor() {
    this.apiClient = new ApiClient({
      baseURL: env.getAgentApiUrl(),
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
   * Login as agent
   */
  async loginAsAgent(): Promise<void> {
    const credentials = env.getAgentCredentials();
    const response = await this.authHelper.login(credentials);
    if (!response.success) {
      throw new Error(`Agent login failed: ${response.error}`);
    }
  }

  // ==================== Profile Management ====================

  async getProfile(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/profile'));
  }

  async updateProfile(profileData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(this.endpoint('/profile'), profileData);
  }

  // ==================== Player Management ====================

  async getPlayers(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/players'), { params });
  }

  async getPlayerById(playerId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/players/${playerId}`);
  }

  async createPlayer(playerData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/players'), playerData);
  }

  async updatePlayer(playerId: string, playerData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(`/players/${playerId}`, playerData);
  }

  async getPlayerStatistics(playerId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/players/${playerId}/statistics`);
  }

  async getPlayerTransactions(playerId: string, params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/players/${playerId}/transactions`, { params });
  }

  async adjustPlayerBalance(playerId: string, amount: number, reason: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(`/players/${playerId}/balance/adjust`, { amount, reason });
  }

  // ==================== Commission Management ====================

  async getCommissionSettings(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/commission/settings'));
  }

  async updateCommissionSettings(settings: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(this.endpoint('/commission/settings'), settings);
  }

  async getCommissionHistory(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/commission/history'), { params });
  }

  async getCommissionReport(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/commission/report'), {
      params: { startDate, endDate },
    });
  }

  async requestCommissionPayout(amount: number, paymentMethod: string): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/commission/payout'), { amount, paymentMethod });
  }

  // ==================== Financial Management ====================

  async getFinancialSummary(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/financials/summary'));
  }

  async getTransactions(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/financials/transactions'), { params });
  }

  async getTransactionById(transactionId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/financials/transactions/${transactionId}`);
  }

  // ==================== Reports ====================

  async getPerformanceReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/reports/performance'), { params });
  }

  async getPlayerActivityReport(params?: any): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/reports/player-activity'), { params });
  }

  async getRevenueReport(startDate: string, endDate: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/reports/revenue'), {
      params: { startDate, endDate },
    });
  }

  // ==================== Sub-Agents Management ====================

  async getSubAgents(params?: PaginationParams): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/sub-agents'), { params });
  }

  async getSubAgentById(subAgentId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/sub-agents/${subAgentId}`);
  }

  async createSubAgent(subAgentData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/sub-agents'), subAgentData);
  }

  async updateSubAgent(subAgentId: string, subAgentData: any): Promise<ApiResponse<any>> {
    return this.apiClient.put(`/sub-agents/${subAgentId}`, subAgentData);
  }

  async deleteSubAgent(subAgentId: string): Promise<ApiResponse<void>> {
    return this.apiClient.delete(`/sub-agents/${subAgentId}`);
  }

  // ==================== Marketing Tools ====================

  async getMarketingLinks(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/marketing/links'));
  }

  async createMarketingLink(linkData: any): Promise<ApiResponse<any>> {
    return this.apiClient.post(this.endpoint('/marketing/links'), linkData);
  }

  async getMarketingLinkStats(linkId: string): Promise<ApiResponse<any>> {
    return this.apiClient.get(`/marketing/links/${linkId}/stats`);
  }

  async getPromotionalMaterials(): Promise<ApiResponse<any>> {
    return this.apiClient.get(this.endpoint('/marketing/materials'));
  }

  // ==================== Cleanup ====================

  async dispose(): Promise<void> {
    await this.apiClient.dispose();
  }
}
