import { apiClient } from '@/lib/api/client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export interface LoginSuccessResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

export interface LoginTwoFactorRequiredResponse {
  message: string;
  requires2FA: true;
  tempToken: string;
}

export type LoginResponse = LoginSuccessResponse | LoginTwoFactorRequiredResponse;

export async function login(request: LoginRequest): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', request);
}
