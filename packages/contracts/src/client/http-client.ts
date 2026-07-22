import { ERROR_CODES, getErrorMessage } from '../errors';
import type { AuthTokens } from '../schemas/auth.schema';
import { ApiError } from './api-error';

export interface TokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(tokens: AuthTokens): void;
  clear(): void;
}

export interface HttpClientOptions {
  baseUrl: string;
  tokenStore?: TokenStore;
  /** Called after a refresh attempt fails, so the app can route to /login. */
  onSessionExpired?: () => void;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Skips both the Authorization header and the refresh retry. */
  public?: boolean;
  signal?: AbortSignal;
}

/**
 * Thin typed wrapper over fetch.
 *
 * On a 401 it attempts exactly one token refresh and replays the original
 * request. Concurrent 401s share a single in-flight refresh so a page with
 * several parallel queries does not fire several refreshes and trip the
 * server's reuse detection.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly tokenStore?: TokenStore;
  private readonly onSessionExpired?: () => void;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.tokenStore = options.tokenStore;
    this.onSessionExpired = options.onSessionExpired;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);

    if (response.status === 401 && !options.public && this.tokenStore) {
      const refreshed = await this.refreshTokens();
      if (!refreshed) {
        this.tokenStore.clear();
        this.onSessionExpired?.();
        throw new ApiError(ERROR_CODES.UNAUTHORIZED, getErrorMessage('UNAUTHORIZED'), 401);
      }
      return this.parse<T>(await this.send(path, options));
    }

    return this.parse<T>(response);
  }

  get<T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', body });
  }

  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = { Accept: 'application/json' };

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (!options.public) {
      const accessToken = this.tokenStore?.getAccessToken();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    try {
      return await fetch(this.buildUrl(path, options.query), {
        method: options.method ?? 'GET',
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      });
    } catch {
      // Network-level failure: DNS, offline, CORS, or a cold Render instance.
      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت وحاول مرة أخرى.',
        0,
      );
    }
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async parse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    const body: unknown = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      throw ApiError.fromResponse(response.status, body);
    }

    return body as T;
  }

  private refreshTokens(): Promise<boolean> {
    this.refreshInFlight ??= this.performRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async performRefresh(): Promise<boolean> {
    const refreshToken = this.tokenStore?.getRefreshToken();
    if (!refreshToken || !this.tokenStore) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return false;
      }

      this.tokenStore.setTokens((await response.json()) as AuthTokens);
      return true;
    } catch {
      return false;
    }
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
