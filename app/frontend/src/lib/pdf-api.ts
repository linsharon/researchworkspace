/**
 * PDF Management API client
 */
import axios from "axios";
import { getAPIBaseURL } from "./config";

const API_V1_BASE = "/api/v1/pdf";
const API_LEGACY_BASE = "/api/pdf";
const STORAGE_API_BASE = "/api/v1/storage";
const STORAGE_BUCKET = "documents";
const STORAGE_REF_PREFIX = "storage://";

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

export interface StorageFileRequest {
  bucket_name: string;
  object_key: string;
}

export interface StorageFileResponse {
  upload_url: string;
  download_url: string;
  expires_at: string;
}

const sanitizeFileName = (name: string): string => {
  const normalized = name.replace(/\\/g, "/").split("/").pop() || "paper.pdf";
  const safe = normalized.replace(/[^A-Za-z0-9._-]/g, "-");
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
};

const buildStorageObjectKey = (name: string): string => {
  const safeName = sanitizeFileName(name);
  return `paper-pdfs/${Date.now()}-${safeName}`;
};

const makeStorageRef = (bucketName: string, objectKey: string): string =>
  `${STORAGE_REF_PREFIX}${bucketName}/${objectKey}`;

const parseStorageRef = (value: string): { bucketName: string; objectKey: string } | null => {
  if (!value || !value.startsWith(STORAGE_REF_PREFIX)) return null;
  const rest = value.slice(STORAGE_REF_PREFIX.length);
  const slashIdx = rest.indexOf("/");
  if (slashIdx <= 0 || slashIdx >= rest.length - 1) return null;
  return {
    bucketName: rest.slice(0, slashIdx),
    objectKey: rest.slice(slashIdx + 1),
  };
};

const storageRequest = async (
  path: string,
  payload: StorageFileRequest
): Promise<StorageFileResponse> => {
  const response = await axios.post<StorageFileResponse>(`${STORAGE_API_BASE}${path}`, payload);
  return response.data;
};

const uploadViaStorage = async (file: File): Promise<UploadResponse> => {
  const objectKey = buildStorageObjectKey(file.name);
  const payload = {
    bucket_name: STORAGE_BUCKET,
    object_key: objectKey,
  };
  const uploadInit = await storageRequest("/upload-url", payload);
  if (!uploadInit.upload_url) {
    throw new Error("Storage upload URL is missing");
  }

  await axios.put(uploadInit.upload_url, file, {
    headers: { "Content-Type": file.type || "application/pdf" },
  });

  return {
    filename: makeStorageRef(STORAGE_BUCKET, objectKey),
    size: file.size,
    message: "Upload successful (storage fallback)",
  };
};

export const pdfAPI = {
  /** List all uploaded PDFs */
  list: async (): Promise<PDFListResponse> => {
    return requestWithFallback((apiBase) => axios.get<PDFListResponse>(`${apiBase}/list`));
  },

  /** Upload a PDF file */
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      return await requestWithFallback((apiBase) =>
        axios.post<UploadResponse>(`${apiBase}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      );
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
      return uploadViaStorage(file);
    }
  },

  /** Get the direct URL for inline viewing */
  viewUrl: (filename: string): string =>
    `${getApiBaseCandidates()[0]}/view/${encodeURIComponent(filename)}`,

  /** Get the direct URL for downloading */
  downloadUrl: (filename: string): string =>
    `${getApiBaseCandidates()[0]}/download/${encodeURIComponent(filename)}`,

  /** Delete a PDF file */
  delete: async (filename: string): Promise<{ success: boolean; message: string }> => {
    const storageRef = parseStorageRef(filename);
    if (storageRef) {
      await axios.delete(`${STORAGE_API_BASE}/delete-object`, {
        params: {
          bucket_name: storageRef.bucketName,
          object_key: storageRef.objectKey,
        },
      });
      return { success: true, message: "Deleted" };
    }

    return requestWithFallback((apiBase) =>
      axios.delete<{ success: boolean; message: string }>(`${apiBase}/delete/${encodeURIComponent(filename)}`)
    );
  },

  isStorageRef: (value: string): boolean => Boolean(parseStorageRef(value)),

  getStorageDownloadUrl: async (value: string): Promise<string> => {
    const storageRef = parseStorageRef(value);
    if (!storageRef) {
      throw new Error("Not a storage reference");
    }

    const response = await storageRequest("/download-url", {
      bucket_name: storageRef.bucketName,
      object_key: storageRef.objectKey,
    });

    if (!response.download_url) {
      throw new Error("Storage download URL is missing");
    }

    return response.download_url;
  },
};
