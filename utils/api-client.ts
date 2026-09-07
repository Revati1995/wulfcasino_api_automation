/**
 * Base API Client
 * Provides common functionality for making API requests
 */

import { APIRequestContext, request } from '@playwright/test';
import { ApiConfig, ApiRequestOptions, ApiResponse, RetryConfig } from '../types';
import { logger, logApiRequest, logApiResponse, logApiError } from './logger';

/** Fallback wait when the server returns 429 without a Retry-After header. */
const DEFAULT_RATE_LIMIT_DELAY_MS = 15000;
/** Never wait longer than this for a single 429 back-off. */
const MAX_RATE_LIMIT_DELAY_MS = 65000;

export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retryConfig: RetryConfig;
  private context?: APIRequestContext;
  private authToken?: string;

  constructor(config: ApiConfig) {
    this.baseURL = config.baseURL;
    this.timeout = config.timeout || 30000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.headers,
    };
    this.retryConfig = config.retryConfig || {
      retries: 3,
      retryDelay: 1000,
    };
  }

  /**
   * Initialize the API request context
   */
  async init(): Promise<void> {
    await this.ensureContext();
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = undefined;
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | undefined {
    return this.authToken;
  }

  /**
   * Ensure context is initialized.
   * The Authorization header is applied per request (see makeRequest), so the
   * context does not need to be recreated when the token changes.
   */
  private async ensureContext(): Promise<APIRequestContext> {
    if (!this.context) {
      this.context = await request.newContext({
        baseURL: this.baseURL,
        timeout: this.timeout,
        extraHTTPHeaders: this.defaultHeaders,
      });
    }
    return this.context;
  }

  /**
   * Build query string from params
   */
  private buildQueryString(params?: Record<string, string | number | boolean>): string {
    if (!params || Object.keys(params).length === 0) return '';
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      query.append(key, String(value));
    });
    const qs = query.toString();
    return qs ? `?${qs}` : '';
  }

  /**
   * Work out how long to back off after a 429, honouring Retry-After when present.
   */
  private rateLimitDelay(headers: Record<string, string>): number {
    const retryAfter = headers['retry-after'];
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (!Number.isNaN(seconds) && seconds > 0) {
        return Math.min(seconds * 1000 + 500, MAX_RATE_LIMIT_DELAY_MS);
      }
    }
    return DEFAULT_RATE_LIMIT_DELAY_MS;
  }

  /**
   * Make an API request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = this.timeout,
      requiresAuth = true,
    } = options;

    const context = await this.ensureContext();
    const url = `${endpoint}${this.buildQueryString(params)}`;
    const fullUrl = `${this.baseURL}${url}`;
    const requestHeaders: Record<string, string> = { ...this.defaultHeaders, ...headers };

    if (requiresAuth && this.authToken) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    let lastError: any;
    const retries = this.retryConfig.retries ?? 3;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        logApiRequest(method, fullUrl, body);

        const response = await context.fetch(url, {
          method,
          headers: requestHeaders,
          data: body,
          timeout,
        });

        const responseBody = await this.parseResponse(response);
        const statusCode = response.status();

        logApiResponse(method, fullUrl, statusCode, responseBody);

        // Rate limited: back off (Retry-After aware) and try again
        if (statusCode === 429 && attempt < retries) {
          const delay = this.rateLimitDelay(response.headers());
          logger.warn(
            `Rate limited (429) on ${method} ${url}. Waiting ${delay}ms before retry ${attempt + 1}/${retries}`
          );
          await this.sleep(delay);
          continue;
        }

        return {
          success: response.ok(),
          data: responseBody,
          statusCode,
          message: responseBody && typeof responseBody === 'object' ? responseBody.message : undefined,
          error: !response.ok() ? this.extractError(responseBody, statusCode) : undefined,
        };
      } catch (error: any) {
        lastError = error;
        logApiError(method, fullUrl, error);

        if (attempt < retries) {
          const delay = this.retryConfig.retryDelay || 1000;
          logger.warn(`Retry attempt ${attempt + 1}/${retries} after ${delay}ms`);
          await this.sleep(delay * (attempt + 1));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed after retries',
      statusCode: lastError?.statusCode || 500,
    };
  }

  /**
   * Pull a human readable error out of an error body (NestJS style or plain text)
   */
  private extractError(body: any, statusCode: number): string {
    if (body == null) return `HTTP ${statusCode}`;
    if (typeof body === 'string') return body || `HTTP ${statusCode}`;
    const msg = body.error || body.message;
    if (Array.isArray(msg)) return msg.join('; ');
    if (typeof msg === 'string') return msg;
    return `HTTP ${statusCode}`;
  }

  /**
   * Parse response body
   */
  private async parseResponse(response: any): Promise<any> {
    const contentType = response.headers()['content-type'] || '';

    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        return await response.text();
      }
    }

    return await response.text();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * HTTP Methods
   */

  async get<T>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(
    endpoint: string,
    body?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(
    endpoint: string,
    body?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async patch<T>(
    endpoint: string,
    body?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, options: Omit<ApiRequestOptions, 'method'> = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Dispose the context
   */
  async dispose(): Promise<void> {
    if (this.context) {
      await this.context.dispose();
      this.context = undefined;
    }
  }
}
