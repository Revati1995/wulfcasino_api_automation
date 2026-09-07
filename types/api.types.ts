/**
 * API Types and Interfaces
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  requiresAuth?: boolean;
}

export interface ApiConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  retryConfig?: RetryConfig;
}

export interface RetryConfig {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: any) => boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Admin API Types
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

// Player API Types
export interface Player {
  id: string;
  email: string;
  username: string;
  balance: number;
  currency: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  id: string;
  name: string;
  provider: string;
  category: string;
  status: 'active' | 'inactive';
  rtp?: number;
}

export interface Transaction {
  id: string;
  playerId: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'win';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

// Agent API Types
export interface Agent {
  id: string;
  email: string;
  name: string;
  commission: number;
  status: 'active' | 'inactive';
  totalPlayers?: number;
  createdAt: string;
}

export interface AgentPlayer {
  id: string;
  agentId: string;
  playerId: string;
  commission: number;
  status: string;
  createdAt: string;
}

// Webhook Types
export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  secret?: string;
}

// Error Types
export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
  details?: any;
}
