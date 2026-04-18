/**
 * PDF Management API client
 */
import axios from "axios";
import { getAPIBaseURL } from "./config";

const API_V1_BASE = "/api/v1/pdf";
const API_LEGACY_BASE = "/api/pdf";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const buildPrimaryApiBase = (): string => {
  const runtimeBase = trimTrailingSlash(getAPIBaseURL() || "");
  if (!runtimeBase) return API_V1_BASE;

  if (runtimeBase.endsWith("/api/v1")) return `${runtimeBase}/pdf`;
  if (runtimeBase.endsWith("/api")) return `${runtimeBase}/v1/pdf`;
  return `${runtimeBase}/api/v1/pdf`;
};

const getApiBaseCandidates = (): string[] => {
  const candidates = [buildPrimaryApiBase(), API_V1_BASE, API_LEGACY_BASE];
  return [...new Set(candidates.map((item) => trimTrailingSlash(item)))];
};

const isNotFoundError = (error: unknown): boolean => {
  return axios.isAxiosError(error) && error.response?.status === 404;
};

const requestWithFallback = async <T>(
  request: (apiBase: string) => Promise<{ data: T }>
): Promise<T> => {
  let lastError: unknown;

  for (const base of getApiBaseCandidates()) {
    try {
      const res = await request(base);
      return res.data;
    } catch (error) {
      lastError = error;
      if (!isNotFoundError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
};

export interface PDFFileInfo {
  filename: string;
  size: number;
  uploaded_at: string;
}

export interface PDFListResponse {
  files: PDFFileInfo[];
}

export interface UploadResponse {
  filename: string;
  size: number;
  message: string;
}

export const pdfAPI = {
  /** List all uploaded PDFs */
  list: async (): Promise<PDFListResponse> => {
    return requestWithFallback((apiBase) => axios.get<PDFListResponse>(`${apiBase}/list`));
  },

  /** Upload a PDF file */
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return requestWithFallback((apiBase) =>
      axios.post<UploadResponse>(`${apiBase}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  },

  /** Get the direct URL for inline viewing */
  viewUrl: (filename: string): string =>
    `${getApiBaseCandidates()[0]}/view/${encodeURIComponent(filename)}`,

  /** Get the direct URL for downloading */
  downloadUrl: (filename: string): string =>
    `${getApiBaseCandidates()[0]}/download/${encodeURIComponent(filename)}`,

  /** Delete a PDF file */
  delete: async (filename: string): Promise<{ success: boolean; message: string }> => {
    return requestWithFallback((apiBase) =>
      axios.delete<{ success: boolean; message: string }>(`${apiBase}/delete/${encodeURIComponent(filename)}`)
    );
  },
};
