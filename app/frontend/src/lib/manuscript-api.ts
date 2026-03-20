/**
 * Manuscript API client - papers, notes, highlights, concepts
 */

import axios, { AxiosError } from "axios";

const API_BASE_URL = "/api/v1/manuscripts";

// ============================================================
// Types
// ============================================================

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  abstract?: string;
  is_entry_paper: boolean;
  is_expanded_paper: boolean;
  reading_status: "Reading" | "Completed" | "To Read";
  relevance?: "high" | "medium" | "low";
  discovery_path?: string;
  discovery_note?: string;
  project_id: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  paper_id: string;
  title: string;
  description?: string;
  note_type: "literature-note" | "permanent-note";
  page?: number;
  keywords: string[];
  citations: string[];
  content?: string;
  created_at: string;
  updated_at: string;
}

export interface Highlight {
  id: string;
  paper_id: string;
  text: string;
  page?: number;
  color: "yellow" | "green" | "red" | "blue";
  note?: string;
  created_at: string;
}

export interface Concept {
  id: string;
  title: string;
  description?: string;
  definition?: string;
  created_at: string;
}

// ============================================================
// Papers API
// ============================================================

export const paperAPI = {
  create: async (data: {
    title: string;
    authors?: string[];
    year?: number;
    journal?: string;
    abstract?: string;
    url?: string;
    discovery_path?: string;
    discovery_note?: string;
    project_id: string;
  }): Promise<Paper> => {
    const response = await axios.post(`${API_BASE_URL}/papers`, data);
    return response.data;
  },

  list: async (projectId: string): Promise<Paper[]> => {
    const response = await axios.get(`${API_BASE_URL}/papers`, {
      params: { project_id: projectId },
    });
    return response.data;
  },

  listEntryPapers: async (projectId: string): Promise<Paper[]> => {
    const response = await axios.get(`${API_BASE_URL}/papers/entry-papers`, {
      params: { project_id: projectId },
    });
    return response.data;
  },

  get: async (paperId: string): Promise<Paper> => {
    const response = await axios.get(`${API_BASE_URL}/papers/${paperId}`);
    return response.data;
  },

  update: async (
    paperId: string,
    data: Partial<Paper>
  ): Promise<Paper> => {
    const response = await axios.put(
      `${API_BASE_URL}/papers/${paperId}`,
      data
    );
    return response.data;
  },

  delete: async (paperId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/papers/${paperId}`);
  },
};

// ============================================================
// Notes API
// ============================================================

export const noteAPI = {
  create: async (data: {
    paper_id: string;
    project_id: string;
    title: string;
    description?: string;
    note_type: "literature-note" | "permanent-note";
    page?: number;
    keywords?: string[];
    citations?: string[];
    content?: string;
  }): Promise<Note> => {
    const response = await axios.post(`${API_BASE_URL}/notes`, data);
    return response.data;
  },

  list: async (paperId: string): Promise<Note[]> => {
    const response = await axios.get(`${API_BASE_URL}/notes`, {
      params: { paper_id: paperId },
    });
    return response.data;
  },

  get: async (noteId: string): Promise<Note> => {
    const response = await axios.get(`${API_BASE_URL}/notes/${noteId}`);
    return response.data;
  },

  update: async (noteId: string, data: Partial<Note>): Promise<Note> => {
    const response = await axios.put(`${API_BASE_URL}/notes/${noteId}`, data);
    return response.data;
  },

  delete: async (noteId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/notes/${noteId}`);
  },
};

// ============================================================
// Highlights API
// ============================================================

export const highlightAPI = {
  create: async (data: {
    paper_id: string;
    text: string;
    page?: number;
    color?: string;
    note?: string;
  }): Promise<Highlight> => {
    const response = await axios.post(`${API_BASE_URL}/highlights`, data);
    return response.data;
  },

  list: async (paperId: string): Promise<Highlight[]> => {
    const response = await axios.get(`${API_BASE_URL}/highlights`, {
      params: { paper_id: paperId },
    });
    return response.data;
  },

  delete: async (highlightId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/highlights/${highlightId}`);
  },
};

// ============================================================
// Concepts API
// ============================================================

export const conceptAPI = {
  create: async (data: {
    title: string;
    description?: string;
    definition?: string;
    project_id: string;
  }): Promise<Concept> => {
    const response = await axios.post(`${API_BASE_URL}/concepts`, data);
    return response.data;
  },

  list: async (projectId: string): Promise<Concept[]> => {
    const response = await axios.get(`${API_BASE_URL}/concepts`, {
      params: { project_id: projectId },
    });
    return response.data;
  },
};

// ============================================================
// Projects API
// ============================================================

export const projectAPI = {
  /** Create a project, or upsert if the same id already exists */
  ensure: async (data: {
    id: string;
    title: string;
    description?: string;
  }): Promise<Project> => {
    const response = await axios.post(`${API_BASE_URL}/projects`, data);
    return response.data;
  },

  list: async (): Promise<Project[]> => {
    const response = await axios.get(`${API_BASE_URL}/projects`);
    return response.data;
  },

  get: async (projectId: string): Promise<Project> => {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`);
    return response.data;
  },

  update: async (
    projectId: string,
    data: { title?: string; description?: string }
  ): Promise<Project> => {
    const response = await axios.put(
      `${API_BASE_URL}/projects/${projectId}`,
      data
    );
    return response.data;
  },
};
