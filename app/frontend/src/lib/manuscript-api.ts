/**
 * Manuscript API client - papers, notes, highlights, concepts
 */

import axios, { AxiosError } from "axios";
import { getAPIBaseURL } from "./config";
import { clearAuthSession, getAuthToken } from "./session";

const API_BASE_URL = "/api/v1/manuscripts";
const PAPER_PDF_UPLOAD_TIMEOUT_MS = 180000;
const PAPER_PDF_FETCH_TIMEOUT_MS = 60000;

const isCodespacesPreviewHost = () => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host.includes(".app.github.dev") || host.endsWith(".github.dev");
};

// M3 backend-first mode: backend is authoritative in all environments.
axios.defaults.timeout = 10000;
axios.interceptors.request.use((config) => {
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

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (isCodespacesPreviewHost()) {
        return Promise.reject(error);
      }
      clearAuthSession();
      if (typeof window !== "undefined") {
        const baseURL = getAPIBaseURL();
        const loginPath = `${baseURL}/api/v1/auth/login`;
        const isOnAuthRoute = window.location.pathname.startsWith("/auth/");
        if (!isOnAuthRoute) {
          window.location.href = loginPath;
        }
      }
    }
    return Promise.reject(error);
  }
);

const STORAGE_KEYS = {
  papers: "rw-manuscript-papers",
  projects: "rw-manuscript-projects",
  notes: "rw-manuscript-notes",
  highlights: "rw-manuscript-highlights",
  concepts: "rw-manuscript-concepts",
  search_records: "rw-manuscript-search-records",
} as const;

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
  url?: string;
  is_entry_paper: boolean;
  is_expanded_paper: boolean;
  reading_status: "Reading" | "Completed" | "To Read";
  relevance?: "high" | "medium" | "low";
  discovery_path?: string;
  discovery_note?: string;
  pdf_path?: string;
  project_id: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type ProjectMemberRole = "viewer" | "editor";

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  email?: string;
  name?: string;
  role: ProjectMemberRole;
  added_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserSearchItem {
  id: string;
  email: string;
  name?: string;
}

export interface Note {
  id: string;
  paper_id: string;
  project_id: string;
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

export interface SearchRecord {
  id: string;
  project_id: string;
  database: string;
  query: string;
  results: number;
  relevant: number;
  searched_at: string;
}

interface StoredConcept extends Concept {
  project_id: string;
}

const PAPER_PDF_OBJECT_URLS = new Set<string>();

const getFileNameFromContentDisposition = (header?: string): string | undefined => {
  if (!header) return undefined;

  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const quotedMatch = header.match(/filename="([^"]+)"/i);
  if (quotedMatch?.[1]) {
    return quotedMatch[1];
  }

  const plainMatch = header.match(/filename=([^;]+)/i);
  return plainMatch?.[1]?.trim();
};

const createObjectUrl = (blob: Blob): string => {
  const objectUrl = URL.createObjectURL(blob);
  PAPER_PDF_OBJECT_URLS.add(objectUrl);
  return objectUrl;
};

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

const loadCollection = <T>(key: string): T[] => {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const saveCollection = <T>(key: string, items: T[]) => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(items));
};

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const withLocalFallback = async <T>(
  remote: () => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> => {
  try {
    return await remote();
  } catch (error) {
    if (isCodespacesPreviewHost()) {
      return await fallback();
    }
    throw error;
  }
};

const sortByUpdatedDesc = <T extends { updated_at?: string; created_at?: string }>(items: T[]) =>
  [...items].sort((left, right) => {
    const leftValue = left.updated_at || left.created_at || "";
    const rightValue = right.updated_at || right.created_at || "";
    return rightValue.localeCompare(leftValue);
  });

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
    return withLocalFallback(
      async () => {
        const response = await axios.post(`${API_BASE_URL}/papers`, data);
        return response.data;
      },
      () => {
        const papers = loadCollection<Paper>(STORAGE_KEYS.papers);
        const paper: Paper = {
          id: makeId("paper"),
          title: data.title,
          authors: data.authors || [],
          year: data.year,
          journal: data.journal,
          abstract: data.abstract,
          url: data.url,
          is_entry_paper: false,
          is_expanded_paper: false,
          reading_status: "To Read",
          relevance: undefined,
          discovery_path: data.discovery_path,
          discovery_note: data.discovery_note,
          pdf_path: undefined,
          project_id: data.project_id,
        };
        saveCollection(STORAGE_KEYS.papers, [...papers, paper]);
        return paper;
      }
    );
  },

  list: async (projectId: string): Promise<Paper[]> => {
    return withLocalFallback(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/papers`, {
          params: { project_id: projectId },
        });
        return response.data;
      },
      () => loadCollection<Paper>(STORAGE_KEYS.papers).filter((paper) => paper.project_id === projectId)
    );
  },

  listEntryPapers: async (projectId: string): Promise<Paper[]> => {
    return withLocalFallback(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/papers/entry-papers`, {
          params: { project_id: projectId },
        });
        return response.data;
      },
      () =>
        loadCollection<Paper>(STORAGE_KEYS.papers).filter(
          (paper) =>
            paper.project_id === projectId &&
            (paper.is_entry_paper || paper.is_expanded_paper)
        )
    );
  },

  get: async (paperId: string): Promise<Paper> => {
    return withLocalFallback(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/papers/${paperId}`);
        return response.data;
      },
      () => {
        const paper = loadCollection<Paper>(STORAGE_KEYS.papers).find((item) => item.id === paperId);
        if (!paper) {
          throw new AxiosError("Paper not found", "ERR_BAD_REQUEST");
        }
        return paper;
      }
    );
  },

  update: async (
    paperId: string,
    data: Partial<Paper>
  ): Promise<Paper> => {
    return withLocalFallback(
      async () => {
        const response = await axios.put(
          `${API_BASE_URL}/papers/${paperId}`,
          data
        );
        return response.data;
      },
      () => {
        const papers = loadCollection<Paper>(STORAGE_KEYS.papers);
        const index = papers.findIndex((paper) => paper.id === paperId);
        if (index === -1) {
          throw new AxiosError("Paper not found", "ERR_BAD_REQUEST");
        }
        const updated = { ...papers[index], ...data, id: paperId } as Paper;
        const next = [...papers];
        next[index] = updated;
        saveCollection(STORAGE_KEYS.papers, next);
        return updated;
      }
    );
  },

  delete: async (paperId: string): Promise<void> => {
    return withLocalFallback(
      async () => {
        await axios.delete(`${API_BASE_URL}/papers/${paperId}`);
      },
      () => {
        const papers = loadCollection<Paper>(STORAGE_KEYS.papers);
        saveCollection(
          STORAGE_KEYS.papers,
          papers.filter((paper) => paper.id !== paperId)
        );
      }
    );
  },

  uploadPdf: async (
    paperId: string,
    file: File,
    onProgress?: (progressPercent: number) => void
  ): Promise<Paper> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(`${API_BASE_URL}/papers/${paperId}/pdf`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: PAPER_PDF_UPLOAD_TIMEOUT_MS,
      onUploadProgress: (event) => {
        if (!onProgress) return;
        if (!event.total) {
          onProgress(0);
          return;
        }
        const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
        onProgress(percent);
      },
    });
    return response.data;
  },

  getPdfBlobUrl: async (paperId: string): Promise<string> => {
    const response = await axios.get(`${API_BASE_URL}/papers/${paperId}/pdf`, {
      responseType: "blob",
      timeout: PAPER_PDF_FETCH_TIMEOUT_MS,
    });
    return createObjectUrl(response.data);
  },

  downloadPdf: async (paperId: string): Promise<{ url: string; filename?: string }> => {
    const response = await axios.get(`${API_BASE_URL}/papers/${paperId}/pdf`, {
      responseType: "blob",
      timeout: PAPER_PDF_FETCH_TIMEOUT_MS,
    });
    return {
      url: createObjectUrl(response.data),
      filename: getFileNameFromContentDisposition(response.headers["content-disposition"]),
    };
  },

  revokePdfObjectUrl: (objectUrl: string) => {
    if (!PAPER_PDF_OBJECT_URLS.has(objectUrl)) {
      return;
    }
    URL.revokeObjectURL(objectUrl);
    PAPER_PDF_OBJECT_URLS.delete(objectUrl);
  },

  deletePdf: async (paperId: string): Promise<Paper> => {
    const response = await axios.delete(`${API_BASE_URL}/papers/${paperId}/pdf`);
    return response.data;
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
    return withLocalFallback(
      async () => {
        const response = await axios.post(`${API_BASE_URL}/notes`, data);
        return response.data;
      },
      () => {
        const notes = loadCollection<Note>(STORAGE_KEYS.notes);
        const timestamp = nowIso();
        const note: Note = {
          id: makeId("note"),
          paper_id: data.paper_id,
          project_id: data.project_id,
          title: data.title,
          description: data.description,
          note_type: data.note_type,
          page: data.page,
          keywords: data.keywords || [],
          citations: data.citations || [],
          content: data.content,
          created_at: timestamp,
          updated_at: timestamp,
        };
        saveCollection(STORAGE_KEYS.notes, [...notes, note]);
        return note;
      }
    );
  },

  list: async (paperId: string): Promise<Note[]> => {
    return withLocalFallback(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/notes`, {
          params: { paper_id: paperId },
        });
        return response.data;
      },
      () =>
        sortByUpdatedDesc(
          loadCollection<Note>(STORAGE_KEYS.notes).filter((note) => note.paper_id === paperId)
        )
    );
  },

  listAll: async (): Promise<Note[]> => {
    return withLocalFallback(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/notes`);
        return response.data;
      },
      () => sortByUpdatedDesc(loadCollection<Note>(STORAGE_KEYS.notes))
    );
  },

  listByProject: async (projectId: string): Promise<Note[]> => {
    return withLocalFallback(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/notes`, {
          params: { project_id: projectId },
        });
        return response.data;
      },
      () =>
        sortByUpdatedDesc(
          loadCollection<Note>(STORAGE_KEYS.notes).filter((note) => note.project_id === projectId)
        )
    );
  },

  get: async (noteId: string): Promise<Note> => {
    return withLocalFallback(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/notes/${noteId}`);
        return response.data;
      },
      () => {
        const note = loadCollection<Note>(STORAGE_KEYS.notes).find((item) => item.id === noteId);
        if (!note) {
          throw new AxiosError("Note not found", "ERR_BAD_REQUEST");
        }
        return note;
      }
    );
  },

  update: async (noteId: string, data: Partial<Note>): Promise<Note> => {
    return withLocalFallback(
      async () => {
        const response = await axios.put(`${API_BASE_URL}/notes/${noteId}`, data);
        return response.data;
      },
      () => {
        const notes = loadCollection<Note>(STORAGE_KEYS.notes);
        const index = notes.findIndex((note) => note.id === noteId);
        if (index === -1) {
          throw new AxiosError("Note not found", "ERR_BAD_REQUEST");
        }
        const updated: Note = {
          ...notes[index],
          ...data,
          id: noteId,
          updated_at: nowIso(),
        };
        const next = [...notes];
        next[index] = updated;
        saveCollection(STORAGE_KEYS.notes, next);
        return updated;
      }
    );
  },

  delete: async (noteId: string): Promise<void> => {
    return withLocalFallback(
      async () => {
        await axios.delete(`${API_BASE_URL}/notes/${noteId}`);
      },
      () => {
        const notes = loadCollection<Note>(STORAGE_KEYS.notes);
        saveCollection(
          STORAGE_KEYS.notes,
          notes.filter((note) => note.id !== noteId)
        );
      }
    );
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
    return withLocalFallback(
      async () => {
        const response = await axios.post(`${API_BASE_URL}/highlights`, data);
        return response.data;
      },
      () => {
        const highlights = loadCollection<Highlight>(STORAGE_KEYS.highlights);
        const highlight: Highlight = {
          id: makeId("highlight"),
          paper_id: data.paper_id,
          text: data.text,
          page: data.page,
          color: (data.color as Highlight["color"]) || "yellow",
          note: data.note,
          created_at: nowIso(),
        };
        saveCollection(STORAGE_KEYS.highlights, [...highlights, highlight]);
        return highlight;
      }
    );
  },

  list: async (paperId: string): Promise<Highlight[]> => {
    return withLocalFallback(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/highlights`, {
          params: { paper_id: paperId },
        });
        return response.data;
      },
      () =>
        sortByUpdatedDesc(
          loadCollection<Highlight>(STORAGE_KEYS.highlights).filter(
            (highlight) => highlight.paper_id === paperId
          )
        )
    );
  },

  delete: async (highlightId: string): Promise<void> => {
    return withLocalFallback(
      async () => {
        await axios.delete(`${API_BASE_URL}/highlights/${highlightId}`);
      },
      () => {
        const highlights = loadCollection<Highlight>(STORAGE_KEYS.highlights);
        saveCollection(
          STORAGE_KEYS.highlights,
          highlights.filter((highlight) => highlight.id !== highlightId)
        );
      }
    );
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
    return withLocalFallback(
      async () => {
        const response = await axios.post(`${API_BASE_URL}/concepts`, data);
        return response.data;
      },
      () => {
        const concepts = loadCollection<StoredConcept>(STORAGE_KEYS.concepts);
        const concept: StoredConcept = {
          id: makeId("concept"),
          title: data.title,
          description: data.description,
          definition: data.definition,
          project_id: data.project_id,
          created_at: nowIso(),
        };
        saveCollection(STORAGE_KEYS.concepts, [...concepts, concept]);
        return concept;
      }
    );
  },

  list: async (projectId: string): Promise<Concept[]> => {
    return withLocalFallback(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/concepts`, {
          params: { project_id: projectId },
        });
        return response.data;
      },
      () =>
        loadCollection<StoredConcept>(STORAGE_KEYS.concepts)
          .filter((concept) => concept.project_id === projectId)
          .map(({ project_id: _projectId, ...concept }) => concept)
    );
  },

  update: async (
    conceptId: string,
    data: { title?: string; description?: string; definition?: string }
  ): Promise<Concept> => {
    const response = await axios.put(`${API_BASE_URL}/concepts/${conceptId}`, data);
    return response.data;
  },

  delete: async (conceptId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/concepts/${conceptId}`);
  },
};

export const searchRecordAPI = {
  create: async (data: {
    project_id: string;
    database: string;
    query: string;
    results?: number;
    relevant?: number;
  }): Promise<SearchRecord> => {
    const response = await axios.post(`${API_BASE_URL}/search-records`, data);
    return response.data;
  },

  list: async (projectId: string): Promise<SearchRecord[]> => {
    const response = await axios.get(`${API_BASE_URL}/search-records`, {
      params: { project_id: projectId },
    });
    return response.data;
  },

  update: async (
    recordId: string,
    data: {
      database?: string;
      query?: string;
      results?: number;
      relevant?: number;
    }
  ): Promise<SearchRecord> => {
    const response = await axios.put(`${API_BASE_URL}/search-records/${recordId}`, data);
    return response.data;
  },

  delete: async (recordId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/search-records/${recordId}`);
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
    const fallback = () => {
      const projects = loadCollection<Project>(STORAGE_KEYS.projects);
      const existing = projects.find((project) => project.id === data.id);
      const timestamp = nowIso();
      const nextProject: Project = existing
        ? {
            ...existing,
            title: data.title,
            description: data.description,
            updated_at: timestamp,
          }
        : {
            id: data.id,
            title: data.title,
            description: data.description,
            created_at: timestamp,
            updated_at: timestamp,
          };
      const nextProjects = existing
        ? projects.map((project) => (project.id === data.id ? nextProject : project))
        : [...projects, nextProject];
      saveCollection(STORAGE_KEYS.projects, nextProjects);
      return nextProject;
    };

    if (isCodespacesPreviewHost()) {
      return fallback();
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/projects`, data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return fallback();
      }
      throw error;
    }
  },

  list: async (): Promise<Project[]> => {
    const fallback = () => sortByUpdatedDesc(loadCollection<Project>(STORAGE_KEYS.projects));

    if (isCodespacesPreviewHost()) {
      return fallback();
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/projects`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return fallback();
      }
      throw error;
    }
  },

  get: async (projectId: string): Promise<Project> => {
    return withLocalFallback(
      async () => {
        const response = await axios.get(`${API_BASE_URL}/projects/${projectId}`);
        return response.data;
      },
      () => {
        const project = loadCollection<Project>(STORAGE_KEYS.projects).find(
          (item) => item.id === projectId
        );
        if (!project) {
          throw new AxiosError("Project not found", "ERR_BAD_REQUEST");
        }
        return project;
      }
    );
  },

  update: async (
    projectId: string,
    data: { title?: string; description?: string }
  ): Promise<Project> => {
    return withLocalFallback(
      async () => {
        const response = await axios.put(
          `${API_BASE_URL}/projects/${projectId}`,
          data
        );
        return response.data;
      },
      () => {
        const projects = loadCollection<Project>(STORAGE_KEYS.projects);
        const index = projects.findIndex((project) => project.id === projectId);
        if (index === -1) {
          throw new AxiosError("Project not found", "ERR_BAD_REQUEST");
        }
        const updated: Project = {
          ...projects[index],
          ...data,
          id: projectId,
          updated_at: nowIso(),
        };
        const next = [...projects];
        next[index] = updated;
        saveCollection(STORAGE_KEYS.projects, next);
        return updated;
      }
    );
  },

  delete: async (projectId: string): Promise<void> => {
    return withLocalFallback(
      async () => {
        await axios.delete(`${API_BASE_URL}/projects/${projectId}`);
      },
      () => {
        const projects = loadCollection<Project>(STORAGE_KEYS.projects);
        const papers = loadCollection<Paper>(STORAGE_KEYS.papers);
        const notes = loadCollection<Note>(STORAGE_KEYS.notes);
        const concepts = loadCollection<StoredConcept>(STORAGE_KEYS.concepts);
        const records = loadCollection<SearchRecord>(STORAGE_KEYS.search_records);
        const highlights = loadCollection<Highlight>(STORAGE_KEYS.highlights);

        const paperIds = new Set(
          papers.filter((paper) => paper.project_id === projectId).map((paper) => paper.id)
        );

        saveCollection(
          STORAGE_KEYS.projects,
          projects.filter((project) => project.id !== projectId)
        );
        saveCollection(
          STORAGE_KEYS.papers,
          papers.filter((paper) => paper.project_id !== projectId)
        );
        saveCollection(
          STORAGE_KEYS.notes,
          notes.filter((note) => note.project_id !== projectId)
        );
        saveCollection(
          STORAGE_KEYS.concepts,
          concepts.filter((concept) => concept.project_id !== projectId)
        );
        saveCollection(
          STORAGE_KEYS.search_records,
          records.filter((record) => record.project_id !== projectId)
        );
        saveCollection(
          STORAGE_KEYS.highlights,
          highlights.filter((highlight) => !paperIds.has(highlight.paper_id))
        );
      }
    );
  },

  listMembers: async (projectId: string): Promise<ProjectMember[]> => {
    const response = await axios.get(`${API_BASE_URL}/projects/${projectId}/members`);
    return response.data;
  },

  addMember: async (
    projectId: string,
    data: { user_id: string; role: ProjectMemberRole }
  ): Promise<ProjectMember> => {
    const response = await axios.post(`${API_BASE_URL}/projects/${projectId}/members`, data);
    return response.data;
  },

  updateMember: async (
    projectId: string,
    memberUserId: string,
    data: { role: ProjectMemberRole }
  ): Promise<ProjectMember> => {
    const response = await axios.patch(`${API_BASE_URL}/projects/${projectId}/members/${memberUserId}`, data);
    return response.data;
  },

  removeMember: async (projectId: string, memberUserId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/projects/${projectId}/members/${memberUserId}`);
  },

  searchUsers: async (q: string, limit = 8): Promise<UserSearchItem[]> => {
    const response = await axios.get(`/api/v1/users/search`, { params: { q, limit } });
    return response.data;
  },
};
