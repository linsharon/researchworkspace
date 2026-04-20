import axios, { AxiosHeaders } from 'axios';

import { getAPIBaseURL } from './config';
import { clearAuthSession, getAuthToken } from './session';

type RawAdminUser = {
  user_id: string;
  email: string;
  username: string;
  avatar_url: string;
  created_at?: string | null;
  last_login?: string | null;
  role: string;
  is_premium: boolean;
  online_duration_ms: number;
  last_seen_ip: string;
  country: string;
  city: string;
  payment_tag: string;
};

type RawAdminUserList = {
  total: number;
  items: RawAdminUser[];
};

export type AdminUser = {
  userId: string;
  email: string;
  username: string;
  avatarUrl: string;
  createdAt: string;
  lastLogin: string;
  role: string;
  isPremium: boolean;
  onlineDurationMs: number;
  lastSeenIp: string;
  country: string;
  city: string;
  paymentTag: string;
};

export class AdminUsersApiError extends Error {
  statusCode?: number;
  detail?: string;

  constructor(message: string, options?: { statusCode?: number; detail?: string }) {
    super(message);
    this.name = 'AdminUsersApiError';
    this.statusCode = options?.statusCode;
    this.detail = options?.detail;
  }
}

const client = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }

  const baseURL = getAPIBaseURL();
  if (baseURL) {
    config.baseURL = baseURL;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuthSession();
    }
    return Promise.reject(error);
  }
);

const mapAdminUser = (raw: RawAdminUser): AdminUser => ({
  userId: raw.user_id,
  email: raw.email,
  username: raw.username,
  avatarUrl: raw.avatar_url || '',
  createdAt: raw.created_at || '',
  lastLogin: raw.last_login || '',
  role: raw.role || 'user',
  isPremium: Boolean(raw.is_premium),
  onlineDurationMs: Number(raw.online_duration_ms || 0),
  lastSeenIp: raw.last_seen_ip || '',
  country: raw.country || '',
  city: raw.city || '',
  paymentTag: raw.payment_tag || '',
});

const toAdminUsersApiError = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
    return new AdminUsersApiError(detail || error.message || fallback, {
      statusCode: error.response?.status,
      detail,
    });
  }
  if (error instanceof Error) {
    return new AdminUsersApiError(error.message || fallback);
  }
  return new AdminUsersApiError(fallback);
};

export const adminUsersApi = {
  async list(query?: string) {
    try {
      const response = await client.get<RawAdminUserList>('/api/v1/admin/users', {
        params: query?.trim() ? { q: query.trim() } : undefined,
      });
      return {
        total: response.data.total,
        items: response.data.items.map(mapAdminUser),
      };
    } catch (error) {
      throw toAdminUsersApiError(error, 'Failed to load users');
    }
  },

  async update(
    userId: string,
    payload: {
      email?: string;
      username?: string;
      bio?: string;
      avatarUrl?: string;
      role?: string;
      isPremium?: boolean;
      paymentTag?: string;
    }
  ) {
    try {
      const response = await client.put<RawAdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}`, {
        email: payload.email,
        username: payload.username,
        bio: payload.bio,
        avatar_url: payload.avatarUrl,
        role: payload.role,
        is_premium: payload.isPremium,
        payment_tag: payload.paymentTag,
      });
      return mapAdminUser(response.data);
    } catch (error) {
      throw toAdminUsersApiError(error, 'Failed to update user');
    }
  },

  async resetPassword(userId: string, newPassword: string) {
    try {
      const response = await client.post<RawAdminUser>(`/api/v1/admin/users/${encodeURIComponent(userId)}/reset-password`, {
        new_password: newPassword,
      });
      return mapAdminUser(response.data);
    } catch (error) {
      throw toAdminUsersApiError(error, 'Failed to reset password');
    }
  },

  async remove(userId: string) {
    try {
      await client.delete(`/api/v1/admin/users/${encodeURIComponent(userId)}`);
    } catch (error) {
      throw toAdminUsersApiError(error, 'Failed to delete user');
    }
  },
};