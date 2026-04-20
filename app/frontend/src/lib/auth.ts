import axios, { AxiosHeaders, AxiosInstance } from 'axios';
import { getAPIBaseURL } from './config';
import { clearAuthSession, getAuthToken } from './session';

class RPApi {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config) => {
      const token = getAuthToken();
      if (token) {
        const headers = AxiosHeaders.from(config.headers);
        headers.set('Authorization', `Bearer ${token}`);
        config.headers = headers;
      }
      return config;
    });
  }

  private getBaseURL() {
    return getAPIBaseURL();
  }

  async getCurrentUser() {
    try {
      const response = await this.client.get(
        `${this.getBaseURL()}/api/v1/auth/me`
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuthSession();
        return null;
      }
      throw new Error(
        error.response?.data?.detail || 'Failed to get user info'
      );
    }
  }

  async login() {
    const base = this.getBaseURL();
    window.location.href = `${base}/api/v1/auth/login`;
  }

  async loginWithPassword(email: string, password: string) {
    try {
      const response = await this.client.post(
        `${this.getBaseURL()}/api/v1/auth/login/password`,
        { email, password }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || 'Failed to login with email/password'
      );
    }
  }

  async registerWithPassword(email: string, password: string, name?: string) {
    try {
      const response = await this.client.post(
        `${this.getBaseURL()}/api/v1/auth/register`,
        { email, password, name }
      );
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.detail || 'Failed to register account'
      );
    }
  }

  async logout() {
    try {
      clearAuthSession();
      const base = this.getBaseURL();

      // Local-only logout by default: keep third-party browser sessions (e.g., Gmail) untouched.
      try {
        await this.client.get(`${base}/api/v1/auth/logout`, {
          params: { local_only: true },
        });
      } catch {
        // Ignore backend logout errors for local session logout.
      }

      window.location.replace('/');
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Failed to logout');
    }
  }
}

export const authApi = new RPApi();
