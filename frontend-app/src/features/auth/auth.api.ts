import { apiClient } from '@/lib/api/client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    email: string;
    role?: string;
  };
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', request);
}
