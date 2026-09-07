/**
 * Logger Utility
 */

import winston from 'winston';
import path from 'path';
import { env } from '../config/environment';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return stack
      ? `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`
      : `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), logFormat),
  }),
];

// Add file transport if enabled
if (env.get().logging.toFile) {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: logFormat,
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: logFormat,
    })
  );
}

export const logger = winston.createLogger({
  level: env.get().logging.level,
  format: logFormat,
  transports,
});

// Helper functions for structured logging
export const logApiRequest = (method: string, url: string, data?: any) => {
  logger.info(`API Request: ${method} ${url}`, { data });
};

export const logApiResponse = (method: string, url: string, status: number, data?: any) => {
  logger.info(`API Response: ${method} ${url} - Status: ${status}`, { data });
};

export const logApiError = (method: string, url: string, error: any) => {
  logger.error(`API Error: ${method} ${url}`, { error: error.message, stack: error.stack });
};

export const logTestStart = (testName: string) => {
  logger.info(`=== Test Started: ${testName} ===`);
};

export const logTestEnd = (testName: string, passed: boolean) => {
  logger.info(`=== Test ${passed ? 'Passed' : 'Failed'}: ${testName} ===`);
};
