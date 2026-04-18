import axios from "axios";
import { getAPIBaseURL } from "./config";
import { clearAuthSession, getAuthToken } from "./session";

const API_BASE_URL = "/api/v1/documents";

const isCodespacesPreviewHost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host.includes(".app.github.dev") || host.endsWith(".github.dev");
};

function buildConfig() {
  const token = getAuthToken();
  const baseURL = getAPIBaseURL();
  return {
    baseURL: baseURL || undefined,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}

function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    if (isCodespacesPreviewHost()) {
      throw error;
    }
    clearAuthSession();
    const base = getAPIBaseURL();
    const loginPath = `${base}/api/v1/auth/login`;
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/auth/")) {
      window.location.href = loginPath;
    }
  }
  throw error;
}

export type DocumentStatus = "draft" | "review" | "published" | "archived";
export type DocumentPermission = "private" | "team" | "public";
export type DocumentAccessLevel = "read" | "edit";

export interface DocumentShareItem {
  document_id: string;
  grantee_user_id: string;
  grantee_email?: string | null;
  grantee_name?: string | null;
  granted_by_user_id: string;
  access_level: DocumentAccessLevel;
  created_at: string;
  updated_at: string;
}

export interface UserSearchItem {
  id: string;
  email: string;
  name?: string | null;
}

export interface DocumentItem {
  id: string;
  owner_user_id: string;
  project_id: string | null;
  title: string;
  description?: string | null;
  tags: string[];
  status: DocumentStatus;
  permission: DocumentPermission;
  storage_provider: string;
  bucket_name?: string | null;
  object_key?: string | null;
  search_highlight?: string | null;
  effective_access_level: "read" | "edit" | "owner";
  is_owner: boolean;
  is_deleted: boolean;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentVersionItem {
  id: string;
  document_id: string;
  version_number: number;
  filename: string;
  content_type?: string | null;
  size_bytes?: number | null;
  checksum?: string | null;
  bucket_name?: string | null;
  object_key?: string | null;
  change_note?: string | null;
  created_by_user_id: string;
  created_at: string;
}

export interface PagedDocumentResponse {
  total: number;
  items: DocumentItem[];
}

export interface DocumentUploadInitResponse {
  bucket_name: string;
  object_key: string;
  upload_url: string;
  expires_at: string;
  suggested_version_number: number;
}

export interface FileTransferResponse {
  upload_url?: string;
  download_url?: string;
  expires_at: string;
}

export const documentAPI = {
  async create(payload: {
    title: string;
    description?: string;
    tags?: string[];
    project_id?: string;
    status?: DocumentStatus;
    permission?: DocumentPermission;
  }): Promise<DocumentItem> {
    try {
      const response = await axios.post(`${API_BASE_URL}`, payload, buildConfig());
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async update(
    documentId: string,
    payload: {
      title?: string;
      description?: string;
      tags?: string[];
      status?: DocumentStatus;
      permission?: DocumentPermission;
    }
  ): Promise<DocumentItem> {
    try {
      const response = await axios.patch(`${API_BASE_URL}/${documentId}`, payload, buildConfig());
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async search(params: {
    q?: string;
    status?: DocumentStatus;
    tag?: string;
    permission?: DocumentPermission;
    owner_user_id?: string;
    created_from?: string;
    created_to?: string;
    updated_from?: string;
    updated_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<PagedDocumentResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/search`, {
        ...buildConfig(),
        params,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async recycleBin(params?: { limit?: number; offset?: number }): Promise<PagedDocumentResponse> {
    try {
      const response = await axios.get(`${API_BASE_URL}/recycle-bin`, {
        ...buildConfig(),
        params,
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async softDelete(documentId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/${documentId}`, buildConfig());
    } catch (error) {
      return handleApiError(error);
    }
  },

  async restore(documentId: string): Promise<DocumentItem> {
    try {
      const response = await axios.post(`${API_BASE_URL}/${documentId}/restore`, {}, buildConfig());
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async changeStatus(documentId: string, status: DocumentStatus): Promise<DocumentItem> {
    try {
      const response = await axios.post(`${API_BASE_URL}/${documentId}/status`, { status }, buildConfig());
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async listVersions(documentId: string): Promise<DocumentVersionItem[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/${documentId}/versions`, buildConfig());
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async uploadInit(
    documentId: string,
    payload: {
      filename: string;
      content_type?: string;
      bucket_name?: string;
      object_prefix?: string;
    }
  ): Promise<DocumentUploadInitResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/${documentId}/upload-url`, payload, buildConfig());
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async uploadToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
    });
  },

  async uploadComplete(
    documentId: string,
    payload: {
      bucket_name: string;
      object_key: string;
      filename: string;
      content_type?: string;
      size_bytes?: number;
      checksum?: string;
      change_note?: string;
    }
  ): Promise<DocumentVersionItem> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/${documentId}/upload-complete`,
        payload,
        buildConfig()
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async getDocumentDownloadUrl(documentId: string, payload?: { version_id?: string }): Promise<FileTransferResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/${documentId}/download-url`, payload ?? {}, buildConfig());
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async restoreVersion(documentId: string, versionId: string, payload?: { change_note?: string }): Promise<DocumentVersionItem> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/${documentId}/versions/${versionId}/restore`,
        payload ?? {},
        buildConfig()
      );
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async listShares(documentId: string): Promise<DocumentShareItem[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/${documentId}/share`, buildConfig());
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async grantShare(documentId: string, payload: { grantee_user_id: string; access_level: DocumentAccessLevel }): Promise<DocumentShareItem> {
    try {
      const response = await axios.post(`${API_BASE_URL}/${documentId}/share`, payload, buildConfig());
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async revokeShare(documentId: string, granteeUserId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/${documentId}/share/${granteeUserId}`, buildConfig());
    } catch (error) {
      return handleApiError(error);
    }
  },

  async searchUsers(q: string, limit = 8): Promise<UserSearchItem[]> {
    try {
      const response = await axios.get(`/api/v1/users/search`, {
        ...buildConfig(),
        params: { q, limit },
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
};
