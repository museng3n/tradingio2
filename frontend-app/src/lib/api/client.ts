export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

interface ApiErrorResponse {
  error?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

class ApiClient {
  private readonly baseUrl = 'http://localhost:3001/api';

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body });
  }

  private async request<T>(path: string, options: ApiRequestOptions): Promise<T> {
    const token = this.getAccessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    if (!response.ok) {
      const errorBody = (await this.parseJson<ApiErrorResponse>(response)) ?? {};
      throw new ApiError(errorBody.error ?? 'Request failed', errorBody.statusCode ?? response.status);
    }

    return (await this.parseJson<T>(response)) as T;
  }

  private getAccessToken(): string | null {
    try {
      const stored = window.localStorage.getItem('tradinghub_auth');

      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as { accessToken?: string };
      return parsed.accessToken ?? null;
    } catch (error) {
      console.error('Failed to read auth session:', error);
      return null;
    }
  }

  private async parseJson<T>(response: Response): Promise<T | null> {
    const contentType = response.headers.get('content-type');

    if (!contentType?.includes('application/json')) {
      return null;
    }

    return (await response.json()) as T;
  }
}

export const apiClient = new ApiClient();
