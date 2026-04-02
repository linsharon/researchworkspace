/**
 * PDF Management API client
 */
import axios from "axios";

const API_BASE = "/api/v1/pdf";

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
    const res = await axios.get<PDFListResponse>(`${API_BASE}/list`);
    return res.data;
  },

  /** Upload a PDF file */
  upload: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post<UploadResponse>(`${API_BASE}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  /** Get the direct URL for inline viewing */
  viewUrl: (filename: string): string =>
    `${API_BASE}/view/${encodeURIComponent(filename)}`,

  /** Get the direct URL for downloading */
  downloadUrl: (filename: string): string =>
    `${API_BASE}/download/${encodeURIComponent(filename)}`,

  /** Delete a PDF file */
  delete: async (filename: string): Promise<{ success: boolean; message: string }> => {
    const res = await axios.delete(`${API_BASE}/delete/${encodeURIComponent(filename)}`);
    return res.data;
  },
};
