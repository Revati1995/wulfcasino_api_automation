/**
 * Authentication Helper
 * Handles login, token management, and authentication flows
 *
 * Backend facts this helper encodes (see postman/*.postman_collection.json):
 * - Staff (admin/agent) log in at POST /api/v1/admin/auth/login with { email, password }.
 *   There is NO server-side logout for staff; logout is client-side token disposal.
 * - Players log in at POST /api/v1/auth/login with { entity, password } where entity
 *   is email/phone/username. The per-plan device limit may answer with
 *   requiresDeviceConfirmation + deviceGrantToken instead of tokens; the login is
 *   then completed at POST /api/v1/auth/login/confirm-device after choosing
 *   sessions to revoke.
 * - Login endpoints are throttled at 5 requests/min per IP.
 */

import { ApiClient } from './api-client';
import { AuthTokens, LoginCredentials, ApiResponse } from '../types';
import { logger } from './logger';

export interface AuthHelperOptions {
  /** Path prefix for auth routes: '/api/v1' (player) or '/api/v1/admin' (staff). */
  basePath?: string;
  /** Whether the backend exposes POST {basePath}/auth/logout. Staff auth has none. */
  serverLogout?: boolean;
  /** Login identity field: 'email' (staff) or 'entity' (player). */
  loginField?: string;
  /** Session id that must not be revoked during the device-limit flow. */
  protectedSessionId?: string;
}

interface ActiveDevice {
  sessionId?: string;
  isCurrent?: boolean;
  lastSeenAt?: string;
  createdAt?: string;
  deviceLabel?: string;
}

export class AuthHelper {
  private apiClient: ApiClient;
  private currentTokens?: AuthTokens;
  private basePath: string;
  private serverLogout: boolean;
  private loginField: string;
  private protectedSessionId?: string;

  constructor(apiClient: ApiClient, basePathOrOptions: string | AuthHelperOptions = '/api/v1') {
    const options: AuthHelperOptions =
      typeof basePathOrOptions === 'string' ? { basePath: basePathOrOptions } : basePathOrOptions;
    this.apiClient = apiClient;
    this.basePath = options.basePath ?? '/api/v1';
    this.serverLogout = options.serverLogout ?? true;
    this.loginField = options.loginField ?? 'email';
    this.protectedSessionId = options.protectedSessionId;
  }

  /**
   * Session id that the device-limit flow must keep alive (the shared cached session).
   */
  setProtectedSessionId(sessionId?: string): void {
    this.protectedSessionId = sessionId;
  }

  private path(route: string): string {
    return `${this.basePath}${route}`;
  }

  /**
   * Find tokens in the various shapes the backend uses.
   */
  private extractTokens(data: any): AuthTokens | undefined {
    if (!data || typeof data !== 'object') return undefined;
    const candidates = [data, data.data, data.tokens];
    for (const c of candidates) {
      if (!c || typeof c !== 'object') continue;
      const accessToken = c.accessToken || c.token || c.access_token;
      if (typeof accessToken === 'string' && accessToken) {
        return {
          accessToken,
          refreshToken: c.refreshToken || c.refresh_token,
          expiresIn: c.expiresIn,
          tokenType: c.tokenType,
        };
      }
    }
    return undefined;
  }

  private acceptTokens(tokens: AuthTokens, response: ApiResponse<any>, identity: string): ApiResponse<AuthTokens> {
    this.currentTokens = tokens;
    this.apiClient.setAuthToken(tokens.accessToken);
    logger.info(`Login successful for: ${identity}`);
    return {
      success: true,
      data: tokens,
      statusCode: response.statusCode,
      message: response.message,
    };
  }

  /**
   * Login with credentials
   * @param emailFieldName overrides the identity field name ('email' | 'entity')
   */
  async login(credentials: LoginCredentials, emailFieldName?: string): Promise<ApiResponse<AuthTokens>> {
    const field = emailFieldName || this.loginField;
    logger.info(`Attempting login for: ${credentials.email}`);

    const loginData = { [field]: credentials.email, password: credentials.password };

    const response = await this.apiClient.post<any>(this.path('/auth/login'), loginData, {
      requiresAuth: false,
    });

    if (response.success && response.data) {
      const tokens = this.extractTokens(response.data);
      if (tokens) {
        return this.acceptTokens(tokens, response, credentials.email);
      }

      if (response.data.requiresDeviceConfirmation && response.data.deviceGrantToken) {
        return this.confirmDevice(response.data, credentials.email);
      }

      if (response.data.requiresStepUp) {
        const error = `Login for ${credentials.email} requires a SEON step-up OTP; automation cannot complete it`;
        logger.error(error);
        return { success: false, statusCode: response.statusCode, error, data: response.data };
      }

      const error = `Login response contained no access token: ${JSON.stringify(response.data).slice(0, 300)}`;
      logger.error(error);
      return { success: false, statusCode: response.statusCode, error, data: response.data };
    }

    logger.error(`Login failed for: ${credentials.email}`, response.error);
    return response;
  }

  /**
   * Second half of the device-limit flow: revoke the oldest session(s) that are
   * not the protected (shared) session, then exchange the grant for tokens.
   */
  private async confirmDevice(loginData: any, identity: string): Promise<ApiResponse<AuthTokens>> {
    const devices: ActiveDevice[] = Array.isArray(loginData.activeDevices) ? loginData.activeDevices : [];
    const limit = Number(loginData.deviceLimit) || 1;
    const needed = Math.max(1, devices.length - limit + 1);

    const byAge = (a: ActiveDevice, b: ActiveDevice) =>
      new Date(a.lastSeenAt || a.createdAt || 0).getTime() - new Date(b.lastSeenAt || b.createdAt || 0).getTime();

    const withId = devices.filter((d) => !!d.sessionId);
    const preferred = withId
      .filter((d) => !d.isCurrent && d.sessionId !== this.protectedSessionId)
      .sort(byAge);

    let revokeSessionIds = preferred.slice(0, needed).map((d) => d.sessionId as string);
    if (revokeSessionIds.length < needed) {
      // Not enough unprotected sessions: fall back to the oldest sessions overall.
      revokeSessionIds = withId
        .sort(byAge)
        .slice(0, needed)
        .map((d) => d.sessionId as string);
    }

    logger.warn(
      `Device limit (${limit}) reached for ${identity}: ${devices.length} active device(s). Revoking ${revokeSessionIds.length}: ${revokeSessionIds.join(', ')}`
    );

    const response = await this.apiClient.post<any>(
      this.path('/auth/login/confirm-device'),
      { deviceGrantToken: loginData.deviceGrantToken, revokeSessionIds },
      { requiresAuth: false }
    );

    if (response.success && response.data) {
      const tokens = this.extractTokens(response.data);
      if (tokens) {
        return this.acceptTokens(tokens, response, identity);
      }
    }

    const error = response.error || 'Device confirmation did not return an access token';
    logger.error(`Device confirmation failed for: ${identity}`, error);
    return { success: false, statusCode: response.statusCode, error, data: response.data };
  }

  /**
   * Register a new user
   */
  async register(userData: any): Promise<ApiResponse<any>> {
    const identity = userData.entity || userData.email;
    logger.info(`Attempting registration for: ${identity}`);

    const response = await this.apiClient.post<any>(this.path('/auth/register'), userData, {
      requiresAuth: false,
    });

    if (response.success) {
      logger.info(`Registration successful for: ${identity}`);
    } else {
      logger.error(`Registration failed for: ${identity}`, response.error);
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

    const response = await this.apiClient.post<any>(
      this.path('/auth/refresh'),
      { refreshToken: token },
      { requiresAuth: false }
    );

    if (response.success && response.data) {
      const tokens = this.extractTokens(response.data);
      if (tokens) {
        this.currentTokens = { ...tokens, refreshToken: tokens.refreshToken || token };
        this.apiClient.setAuthToken(tokens.accessToken);
        logger.info('Token refresh successful');
        return { ...response, data: this.currentTokens };
      }
    }

    logger.error('Token refresh failed', response.error);
    return response;
  }

  /**
   * Logout.
   * Player: POST /auth/logout revokes the session server-side.
   * Staff: no server endpoint exists; tokens are discarded client-side.
   */
  async logout(): Promise<ApiResponse<void>> {
    logger.info('Attempting logout');

    if (!this.serverLogout) {
      this.clearTokens();
      logger.info('Logout: no server-side endpoint for this role, tokens cleared client-side');
      return {
        success: true,
        statusCode: 200,
        message: 'No server-side logout endpoint for this role; tokens cleared client-side',
      };
    }

    const response = await this.apiClient.post<void>(this.path('/auth/logout'));

    if (response.success) {
      this.clearTokens();
      logger.info('Logout successful');
    } else {
      logger.error('Logout failed', response.error);
    }

    return response;
  }

  /**
   * Verify token validity against the "me" endpoint
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

    return this.apiClient.get<any>(this.path('/auth/me'), {
      headers: { Authorization: `Bearer ${authToken}` },
      requiresAuth: false,
    });
  }

  /**
   * True when the given token is accepted by the "me" endpoint
   */
  async isTokenValid(token: string): Promise<boolean> {
    const response = await this.verifyToken(token);
    return response.success;
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<any>> {
    logger.info('Fetching current user profile');
    return await this.apiClient.get<any>(this.path('/auth/me'));
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<void>> {
    logger.info('Attempting password change');

    const response = await this.apiClient.post<void>(this.path('/auth/change-password'), {
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
      this.path('/auth/forgot-password'),
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
      this.path('/auth/reset-password'),
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
