/**
 * Base API Client
 * Provides common functionality for making API requests
 */

import { APIRequestContext, request } from '@playwright/test';
import { ApiConfig, ApiRequestOptions, ApiResponse, RetryConfig } from '../types';
import { logger, logApiRequest, logApiResponse, logApiError } from './logger';

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
    this.context = await request.newContext({
      baseURL: this.baseURL,
      timeout: this.timeout,
      extraHTTPHeaders: this.defaultHeaders,
    });
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
    if (this.context) {
      this.context = undefined;
    }
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.authToken = undefined;
    if (this.context) {
      this.context = undefined;
    }
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | undefined {
    return this.authToken;
  }

  /**
   * Ensure context is initialized
   */
  private async ensureContext(): Promise<APIRequestContext> {
    if (!this.context) {
      const headers = { ...this.defaultHeaders };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      this.context = await request.newContext({
        baseURL: this.baseURL,
        timeout: this.timeout,
        extraHTTPHeaders: headers,
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
      query.append(key, String(value));
    });
    return `?${query.toString()}`;
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
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    if (requiresAuth && this.authToken) {
      requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    let lastError: any;
    const retries = this.retryConfig.retries || 3;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        logApiRequest(method, url, body);

        const response = await context.fetch(url, {
          method,
          headers: requestHeaders,
          data: body,
          timeout,
        });

        const responseBody = await this.parseResponse(response);
        const statusCode = response.status();

        logApiResponse(method, url, statusCode, responseBody);

        return {
          success: response.ok(),
          data: responseBody,
          statusCode,
          message: responseBody?.message,
          error: !response.ok() ? responseBody?.error || responseBody?.message : undefined,
        };
      } catch (error: any) {
        lastError = error;
        logApiError(method, url, error);

        if (attempt < retries) {
          const delay = this.retryConfig.retryDelay || 1000;
          logger.warn(`Retry attempt ${attempt + 1}/${retries} after ${delay}ms`);
          await this.sleep(delay * (attempt + 1));
        }
      }
    }

    return {
      success: false,
      error: lastError.message || 'Request failed after retries',
      statusCode: lastError.statusCode || 500,
    };
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
