export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private readonly baseUrl = 'http://localhost:3001/api';

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }

  private async request<T>(path: string, options: ApiRequestOptions): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    return (await response.json()) as T;
  }
}

export const apiClient = new ApiClient();
