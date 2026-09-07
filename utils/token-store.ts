/**
 * Token Store
 * Caches auth tokens per role on disk so a test run performs one login per role
 * instead of one per test. Login endpoints are throttled at 5 requests/min per IP,
 * so re-logging in from every test fixture triggers ThrottlerException.
 *
 * Written by global-setup.ts, read by the authenticated fixtures.
 */

import * as fs from 'fs';
import * as path from 'path';

export type TokenRole = 'admin' | 'player' | 'agent';

export interface StoredToken {
  accessToken: string;
  refreshToken?: string;
  /** Server-side session id of this login (player only). Protected from device eviction. */
  sessionId?: string;
  createdAt: string;
}

const AUTH_DIR = path.resolve(__dirname, '..', '.auth');
const TOKEN_FILE = path.join(AUTH_DIR, 'tokens.json');

type TokenFile = Partial<Record<TokenRole, StoredToken>>;

let memoryCache: TokenFile | undefined;

function readFile(): TokenFile {
  if (memoryCache) return memoryCache;
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      memoryCache = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8')) as TokenFile;
      return memoryCache;
    }
  } catch {
    // corrupt file: ignore and start fresh
  }
  memoryCache = {};
  return memoryCache;
}

function writeFile(data: TokenFile): void {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), 'utf8');
  memoryCache = data;
}

export const tokenStore = {
  get(role: TokenRole): StoredToken | undefined {
    return readFile()[role];
  },

  set(role: TokenRole, token: StoredToken): void {
    const data = { ...readFile(), [role]: token };
    writeFile(data);
  },

  clear(role?: TokenRole): void {
    if (!role) {
      writeFile({});
      return;
    }
    const data = { ...readFile() };
    delete data[role];
    writeFile(data);
  },

  /** Drop the in-process cache so the next read hits disk (used after global setup writes). */
  invalidate(): void {
    memoryCache = undefined;
  },

  filePath(): string {
    return TOKEN_FILE;
  },
};
