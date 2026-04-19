import axios from "axios";
import { type UserProfile } from "@/lib/data";
import { getAPIBaseURL } from "./config";
import { clearAuthSession, getAuthToken } from "./session";

const USER_PROFILE_STORAGE_KEY = "rw-user-profiles";

type RawUserProfileResponse = {
  user_id: string;
  email: string;
  username: string;
  bio: string;
  avatar_url: string;
  is_public: boolean;
  updated_at?: string | null;
};

type RawUserProfileSummary = {
  user_id: string;
  username: string;
  bio: string;
  avatar_url: string;
  is_public: boolean;
};

export type UserProfileSummary = {
  userId: string;
  username: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
};

export type ProfileAuthUser = {
  id: string;
  email: string;
  name?: string;
};

const client = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
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

const mapProfile = (raw: RawUserProfileResponse): UserProfile => ({
  userId: raw.user_id,
  email: raw.email,
  username: raw.username,
  bio: raw.bio || "",
  avatarUrl: raw.avatar_url || "",
  isPublic: Boolean(raw.is_public),
  updatedAt: raw.updated_at || new Date().toISOString(),
});

const mapSummary = (raw: RawUserProfileSummary): UserProfileSummary => ({
  userId: raw.user_id,
  username: raw.username,
  bio: raw.bio || "",
  avatarUrl: raw.avatar_url || "",
  isPublic: Boolean(raw.is_public),
});

const defaultUsername = (email: string, name?: string) => {
  const trimmedName = (name || "").trim();
  if (trimmedName) return trimmedName;
  const trimmedEmail = (email || "").trim();
  if (!trimmedEmail) return "User";
  return trimmedEmail.split("@")[0] || trimmedEmail;
};

const readLegacyProfiles = (): UserProfile[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return Object.values(parsed || {}) as UserProfile[];
  } catch {
    return [];
  }
};

const selectLegacyProfile = (userId: string, email: string): UserProfile | null => {
  const normalizedEmail = email.trim().toLowerCase();
  const profiles = readLegacyProfiles();
  const matching = profiles.filter((profile) => {
    const profileEmail = (profile.email || "").trim().toLowerCase();
    return profile.userId === userId || (normalizedEmail && profileEmail === normalizedEmail);
  });

  if (matching.length === 0) return null;

  matching.sort((left, right) => {
    const leftPriority = left.userId === userId ? 1 : 0;
    const rightPriority = right.userId === userId ? 1 : 0;
    if (leftPriority !== rightPriority) return rightPriority - leftPriority;
    return (right.updatedAt || "").localeCompare(left.updatedAt || "");
  });

  return matching[0] || null;
};

const isPristineProfile = (profile: UserProfile, authUser: ProfileAuthUser) => {
  return (
    profile.username === defaultUsername(authUser.email, authUser.name) &&
    !profile.bio &&
    !profile.avatarUrl &&
    profile.isPublic
  );
};

const hasMeaningfulLegacyData = (profile: UserProfile, authUser: ProfileAuthUser) => {
  return (
    profile.username !== defaultUsername(authUser.email, authUser.name) ||
    Boolean(profile.bio) ||
    Boolean(profile.avatarUrl) ||
    profile.isPublic === false
  );
};

export const userProfileApi = {
  async getCurrentProfile() {
    const response = await client.get<RawUserProfileResponse>("/api/v1/users/profile");
    return mapProfile(response.data);
  },

  async updateCurrentProfile(payload: {
    username?: string;
    bio?: string;
    avatarUrl?: string;
    isPublic?: boolean;
  }) {
    const response = await client.put<RawUserProfileResponse>("/api/v1/users/profile", {
      username: payload.username,
      bio: payload.bio,
      avatar_url: payload.avatarUrl,
      is_public: payload.isPublic,
    });
    return mapProfile(response.data);
  },

  async getPublicProfile(userId: string) {
    const response = await client.get<RawUserProfileResponse>(`/api/v1/users/public/${encodeURIComponent(userId)}`);
    return mapProfile(response.data);
  },

  async getPublicProfiles(userIds: string[]) {
    const dedupedIds = Array.from(new Set(userIds.filter(Boolean)));
    if (dedupedIds.length === 0) return {} as Record<string, UserProfileSummary>;

    const response = await client.post<RawUserProfileSummary[]>("/api/v1/users/profiles/batch", {
      user_ids: dedupedIds,
    });

    return response.data.reduce<Record<string, UserProfileSummary>>((acc, item) => {
      const mapped = mapSummary(item);
      acc[mapped.userId] = mapped;
      return acc;
    }, {});
  },

  async migrateLegacyProfile(authUser: ProfileAuthUser) {
    const currentProfile = await this.getCurrentProfile();
    const legacyProfile = selectLegacyProfile(authUser.id, authUser.email);

    if (!legacyProfile || !hasMeaningfulLegacyData(legacyProfile, authUser)) {
      return currentProfile;
    }

    if (!isPristineProfile(currentProfile, authUser)) {
      return currentProfile;
    }

    return this.updateCurrentProfile({
      username: legacyProfile.username,
      bio: legacyProfile.bio,
      avatarUrl: legacyProfile.avatarUrl,
      isPublic: legacyProfile.isPublic,
    });
  },
};