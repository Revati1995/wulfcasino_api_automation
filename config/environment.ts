/**
 * Environment Configuration Manager
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables - look for .env in current directory first, then parent
const envPath = path.resolve(__dirname, '../.env');
const parentEnvPath = path.resolve(__dirname, '../../.env');

// Try loading from current directory first
let result = dotenv.config({ path: envPath });
// If not found, try parent directory
if (result.error) {
  result = dotenv.config({ path: parentEnvPath });
}
// If still not found, use default dotenv.config() which checks process.cwd()
if (result.error) {
  dotenv.config();
}

export interface EnvironmentConfig {
  nodeEnv: string;
  baseURL: string;
  adminApiUrl: string;
  playerApiUrl: string;
  agentApiUrl: string;
  adminCredentials: {
    email: string;
    password: string;
  };
  playerCredentials: {
    email: string;
    password: string;
  };
  agentCredentials: {
    email: string;
    password: string;
  };
  testConfig: {
    timeout: number;
    apiTimeout: number;
    retryCount: number;
  };
  logging: {
    level: string;
    toFile: boolean;
  };
  testData: {
    useRealData: boolean;
    cleanup: boolean;
  };
  webhookSecret?: string;
  apiKey?: string;
}

class Environment {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): EnvironmentConfig {
    return {
      nodeEnv: process.env.NODE_ENV || 'local',
      baseURL: process.env.BASE_URL || 'http://localhost:3000',
      adminApiUrl: process.env.ADMIN_API_URL || 'http://localhost:3000/admin',
      playerApiUrl: process.env.PLAYER_API_URL || 'http://localhost:3000/player',
      agentApiUrl: process.env.AGENT_API_URL || 'http://localhost:3000/agent',
      adminCredentials: {
        email: process.env.ADMIN_EMAIL || 'admin@wulfcasino.com',
        password: process.env.ADMIN_PASSWORD || 'SecurePassword123!',
      },
      playerCredentials: {
        email: process.env.PLAYER_EMAIL || 'player@test.com',
        password: process.env.PLAYER_PASSWORD || 'PlayerPass123!',
      },
      agentCredentials: {
        email: process.env.AGENT_EMAIL || 'agent@test.com',
        password: process.env.AGENT_PASSWORD || 'AgentPass123!',
      },
      testConfig: {
        timeout: parseInt(process.env.TEST_TIMEOUT || '60000'),
        apiTimeout: parseInt(process.env.API_TIMEOUT || '30000'),
        retryCount: parseInt(process.env.RETRY_COUNT || '3'),
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        toFile: process.env.LOG_TO_FILE === 'true',
      },
      testData: {
        useRealData: process.env.USE_REAL_DATA === 'true',
        cleanup: process.env.CLEANUP_TEST_DATA !== 'false',
      },
      webhookSecret: process.env.WEBHOOK_SECRET,
      apiKey: process.env.API_KEY,
    };
  }

  public get(): EnvironmentConfig {
    return this.config;
  }

  public getAdminApiUrl(): string {
    return this.config.adminApiUrl;
  }

  public getPlayerApiUrl(): string {
    return this.config.playerApiUrl;
  }

  public getAgentApiUrl(): string {
    return this.config.agentApiUrl;
  }

  public getAdminCredentials() {
    return this.config.adminCredentials;
  }

  public getPlayerCredentials() {
    return this.config.playerCredentials;
  }

  public getAgentCredentials() {
    return this.config.agentCredentials;
  }

  public isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.nodeEnv === 'development' || this.config.nodeEnv === 'local';
  }
}

// Export singleton instance
export const env = new Environment();
