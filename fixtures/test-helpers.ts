/**
 * Test Helper Functions
 * Common utilities for test setup, assertions, and cleanup
 */

import { expect } from '@playwright/test';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

export class TestHelpers {
  /**
   * Assert successful API response
   */
  static assertSuccess(response: ApiResponse, message?: string) {
    const errorMessage = message || `Expected success but got: ${response.error}`;
    expect(response.success, errorMessage).toBeTruthy();
    expect(response.statusCode).toBeLessThan(400);
  }

  /**
   * Assert failed API response
   */
  static assertFailure(response: ApiResponse, message?: string) {
    const errorMessage = message || 'Expected failure but got success';
    expect(response.success, errorMessage).toBeFalsy();
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  }

  /**
   * Assert specific status code
   */
  static assertStatusCode(response: ApiResponse, expectedCode: number, message?: string) {
    const errorMessage = message || `Expected status ${expectedCode} but got ${response.statusCode}`;
    expect(response.statusCode, errorMessage).toBe(expectedCode);
  }

  /**
   * Assert response contains data
   */
  static assertHasData(response: ApiResponse, message?: string) {
    const errorMessage = message || 'Expected response to contain data';
    expect(response.data, errorMessage).toBeDefined();
    expect(response.data).not.toBeNull();
  }

  /**
   * Assert response data is array
   */
  static assertDataIsArray(response: ApiResponse, message?: string) {
    this.assertHasData(response);
    const errorMessage = message || 'Expected response data to be an array';
    expect(Array.isArray(response.data), errorMessage).toBeTruthy();
  }

  /**
   * Assert array has minimum length
   */
  static assertArrayMinLength(data: any[], minLength: number, message?: string) {
    const errorMessage = message || `Expected array length >= ${minLength}, got ${data.length}`;
    expect(data.length, errorMessage).toBeGreaterThanOrEqual(minLength);
  }

  /**
   * Assert object has required properties
   */
  static assertHasProperties(obj: any, properties: string[], message?: string) {
    properties.forEach((prop) => {
      const errorMessage = message || `Expected object to have property: ${prop}`;
      expect(obj, errorMessage).toHaveProperty(prop);
    });
  }

  /**
   * Assert response contains error
   */
  static assertHasError(response: ApiResponse, message?: string) {
    const errorMessage = message || 'Expected response to contain error';
    expect(response.error, errorMessage).toBeDefined();
  }

  /**
   * Assert error message contains text
   */
  static assertErrorContains(response: ApiResponse, text: string, message?: string) {
    this.assertHasError(response);
    const errorMessage = message || `Expected error to contain: ${text}`;
    expect(response.error?.toLowerCase(), errorMessage).toContain(text.toLowerCase());
  }

  /**
   * Assert pagination structure
   */
  static assertPaginationStructure(data: any, message?: string) {
    const errorMessage = message || 'Invalid pagination structure';
    expect(data, errorMessage).toHaveProperty('data');
    expect(data, errorMessage).toHaveProperty('pagination');
    expect(data.pagination).toHaveProperty('page');
    expect(data.pagination).toHaveProperty('limit');
    expect(data.pagination).toHaveProperty('total');
    expect(data.pagination).toHaveProperty('totalPages');
  }

  /**
   * Wait for a condition to be true
   */
  static async waitFor(
    condition: () => Promise<boolean>,
    timeout: number = 10000,
    interval: number = 500
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await this.sleep(interval);
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry an operation
   */
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} failed`, error);

        if (attempt < maxRetries - 1) {
          await this.sleep(delay * (attempt + 1));
        }
      }
    }

    throw lastError;
  }

  /**
   * Generate random string
   */
  static randomString(length: number = 10): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate unique email
   */
  static generateUniqueEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = this.randomString(5);
    return `${prefix}_${timestamp}_${random}@test.com`.toLowerCase();
  }

  /**
   * Generate unique username
   */
  static generateUniqueUsername(prefix: string = 'user'): string {
    const timestamp = Date.now();
    const random = this.randomString(5);
    return `${prefix}_${timestamp}_${random}`.toLowerCase();
  }

  /**
   * Deep clone an object
   */
  static clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Merge objects
   */
  static merge<T>(...objects: Partial<T>[]): T {
    return Object.assign({}, ...objects) as T;
  }

  /**
   * Compare two objects for equality
   */
  static deepEqual(obj1: any, obj2: any): boolean {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  }

  /**
   * Extract specific fields from object
   */
  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach((key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  /**
   * Omit specific fields from object
   */
  static omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach((key) => {
      delete result[key];
    });
    return result as Omit<T, K>;
  }

  /**
   * Format currency
   */
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Format date
   */
  static formatDate(date: Date | string, format: string = 'YYYY-MM-DD'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day);
  }

  /**
   * Calculate percentage
   */
  static calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
  }

  /**
   * Round to decimal places
   */
  static round(value: number, decimals: number = 2): number {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Generate random number in range
   */
  static randomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Shuffle array
   */
  static shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Get random element from array
   */
  static randomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Log test step
   */
  static logStep(step: string, data?: any) {
    logger.info(`[TEST STEP] ${step}`, data);
  }

  /**
   * Log test result
   */
  static logResult(passed: boolean, message: string) {
    if (passed) {
      logger.info(`[TEST PASSED] ${message}`);
    } else {
      logger.error(`[TEST FAILED] ${message}`);
    }
  }
}
