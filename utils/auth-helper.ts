/**
 * Authentication Helper
 * Handles login, token management, and authentication flows
 */

import { ApiClient } from './api-client';
import { AuthTokens, LoginCredentials, ApiResponse } from '../types';
import { logger } from './logger';

export class AuthHelper {
  private apiClient: ApiClient;
  private currentTokens?: AuthTokens;
  private basePath: string;

  constructor(apiClient: ApiClient, basePath: string = '/api/v1') {
    this.apiClient = apiClient;
    this.basePath = basePath;
  }

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials, emailFieldName: string = 'email'): Promise<ApiResponse<AuthTokens>> {
    logger.info(`Attempting login for: ${credentials.email}`);

    const loginData = emailFieldName === 'email' 
      ? { email: credentials.email, password: credentials.password }
      : { [emailFieldName]: credentials.email, password: credentials.password };

    const response = await this.apiClient.post<any>(
      `${this.basePath}/auth/login`,
      loginData,
      { requiresAuth: false }
    );

    if (response.success && response.data) {
      // Handle both token formats: { token: "..." } or { accessToken: "..." }
      const accessToken = response.data.token || response.data.accessToken;
      const refreshToken = response.data.refreshToken;
      
      if (accessToken) {
        this.currentTokens = {
          accessToken,
          refreshToken,
        };
        this.apiClient.setAuthToken(accessToken);
        logger.info(`Login successful for: ${credentials.email}`);
        
        // Return normalized format
        return {
          success: true,
          data: this.currentTokens,
          statusCode: response.statusCode,
          message: response.message,
        };
      }
    }
    
    logger.error(`Login failed for: ${credentials.email}`, response.error);
    return response;
  }

  /**
   * Register a new user
   */
  async register(userData: any): Promise<ApiResponse<any>> {
    logger.info(`Attempting registration for: ${userData.email}`);

    const response = await this.apiClient.post<any>(
      '/auth/register',
      userData,
      { requiresAuth: false }
    );

    if (response.success) {
      logger.info(`Registration successful for: ${userData.email}`);
    } else {
      logger.error(`Registration failed for: ${userData.email}`, response.error);
    }

    return response;
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken?: string): Promise<ApiResponse<AuthTokens>> {
    const token = refreshToken || this.currentTokens?.refreshToken;

    if (!token) {
      return {
        success: false,
        error: 'No refresh token available',
      };
    }

    logger.info('Attempting to refresh token');

    const response = await this.apiClient.post<AuthTokens>(
      '/auth/refresh',
      { refreshToken: token },
      { requiresAuth: false }
    );

    if (response.success && response.data) {
      this.currentTokens = response.data;
      this.apiClient.setAuthToken(response.data.accessToken);
      logger.info('Token refresh successful');
    } else {
      logger.error('Token refresh failed', response.error);
    }

    return response;
  }

  /**
   * Logout
   */
  async logout(): Promise<ApiResponse<void>> {
    logger.info('Attempting logout');

    const response = await this.apiClient.post<void>('/auth/logout');

    if (response.success) {
      this.clearTokens();
      logger.info('Logout successful');
    } else {
      logger.error('Logout failed', response.error);
    }

    return response;
  }

  /**
   * Verify token validity
   */
  async verifyToken(token?: string): Promise<ApiResponse<any>> {
    const authToken = token || this.currentTokens?.accessToken;

    if (!authToken) {
      return {
        success: false,
        error: 'No token available to verify',
      };
    }

    logger.info('Verifying token');

    const response = await this.apiClient.get<any>('/auth/verify', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    return response;
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<any>> {
    logger.info('Fetching current user profile');
    return await this.apiClient.get<any>('/auth/me');
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    logger.info('Attempting password change');

    const response = await this.apiClient.post<void>('/auth/change-password', {
      oldPassword,
      newPassword,
    });

    if (response.success) {
      logger.info('Password change successful');
    } else {
      logger.error('Password change failed', response.error);
    }

    return response;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    logger.info(`Requesting password reset for: ${email}`);

    const response = await this.apiClient.post<void>(
      '/auth/forgot-password',
      { email },
      { requiresAuth: false }
    );

    if (response.success) {
      logger.info(`Password reset email sent to: ${email}`);
    } else {
      logger.error(`Password reset request failed for: ${email}`, response.error);
    }

    return response;
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<void>> {
    logger.info('Attempting password reset with token');

    const response = await this.apiClient.post<void>(
      '/auth/reset-password',
      { token, newPassword },
      { requiresAuth: false }
    );

    if (response.success) {
      logger.info('Password reset successful');
    } else {
      logger.error('Password reset failed', response.error);
    }

    return response;
  }

  /**
   * Get current tokens
   */
  getTokens(): AuthTokens | undefined {
    return this.currentTokens;
  }

  /**
   * Set tokens manually
   */
  setTokens(tokens: AuthTokens): void {
    this.currentTokens = tokens;
    this.apiClient.setAuthToken(tokens.accessToken);
    logger.info('Tokens set manually');
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    this.currentTokens = undefined;
    this.apiClient.clearAuthToken();
    logger.info('Tokens cleared');
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return !!this.currentTokens?.accessToken;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | undefined {
    return this.currentTokens?.accessToken;
  }
}
