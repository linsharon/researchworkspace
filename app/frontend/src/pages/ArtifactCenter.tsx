import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Archive,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Eye,
  Lightbulb,
  Search,
  ArrowRight,
  Target,
  BookOpen,
  Network,
  Map as MapIcon,
  PenLine,
  Package,
  PackageCheck,
  Globe,
  CheckSquare,
  Square,
  Share2,
  X,
  ChevronDown,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  DUMMY_ARTIFACTS,
  ARTIFACT_TYPE_META,
  STEP_META,
  type Artifact,
  type ArtifactType,
  type ArtifactPackage,
} from "@/lib/data";
import { conceptAPI, noteAPI, paperAPI, projectAPI } from "@/lib/manuscript-api";
import type { Concept as ApiConcept, Note } from "@/lib/manuscript-api";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getAPIBaseURL } from "@/lib/config";
import { getAuthToken } from "@/lib/session";
import { readJsonWithBackup, writeJsonWithBackup } from "@/lib/local-persistence";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const STATIC_ARTIFACTS = DUMMY_ARTIFACTS.filter(
  (artifact) =>
    artifact.type !== "literature-note" && artifact.type !== "permanent-note" && artifact.type !== "pre-writing-note"
);

function formatArtifactDate(value: string) {
  return value.includes("T") ? value.split("T")[0] : value;
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${bytes} B`;
}

function noteToArtifact(note: Note): Artifact {
  return {
    id: note.id,
    title: note.title,
    type: note.note_type,
    projectId: note.project_id,
    sourceStep: 3,
    description: note.description || note.content || "Saved note",
    updatedAt: formatArtifactDate(note.updated_at),
    content: note.content || note.description,
  };
}

function paperToArtifact(paper: {
  id: string;
  title: string;
  project_id: string;
  journal?: string;
  year?: number;
  is_entry_paper: boolean;
  is_expanded_paper: boolean;
  discovery_note?: string;
}): Artifact {
  return {
    id: `entry-paper-${paper.id}`,
    title: paper.title,
    type: "entry-paper",
    projectId: paper.project_id,
    sourceStep: 3,
    description:
      paper.discovery_note ||
      [
        paper.is_entry_paper ? "Entry Paper" : null,
        paper.is_expanded_paper ? "Expanded Paper" : null,
        paper.journal,
        paper.year ? String(paper.year) : null,
      ]
        .filter(Boolean)
        .join(" · "),
    updatedAt: new Date().toISOString().split("T")[0],
    content: "",
  };
}

const defaultConceptCategory = "Concept";
const defaultConceptColor = "#6366f1";

const CATEGORY_ORDER = [
  "Concept",
  "Construct",
  "Theory",
  "Framework",
  "Method",
  "Variable",
  "Other",
] as const;

const CATEGORY_ALIAS_MAP: Record<string, (typeof CATEGORY_ORDER)[number]> = {
  keyword: "Concept",
  concept: "Concept",
  construct: "Construct",
  theory: "Theory",
  framework: "Framework",
  method: "Method",
  variable: "Variable",
  finding: "Other",
  findings: "Other",
  result: "Other",
  results: "Other",
  other: "Other",
};

function normalizeCategory(raw?: string): (typeof CATEGORY_ORDER)[number] {
  const key = (raw || "").trim().toLowerCase();
  if (!key) return defaultConceptCategory;
  return CATEGORY_ALIAS_MAP[key] || defaultConceptCategory;
}

function parseConceptDefinition(definition?: string): { category: string; color: string } {
  if (!definition) {
    return { category: defaultConceptCategory, color: defaultConceptColor };
  }

  try {
    const parsed = JSON.parse(definition) as { category?: string; color?: string };
    return {
      category: parsed.category || defaultConceptCategory,
      color: parsed.color || defaultConceptColor,
    };
  } catch {
    return { category: defaultConceptCategory, color: defaultConceptColor };
  }
}

function apiConceptToLocal(concept: ApiConcept) {
  const meta = parseConceptDefinition(concept.definition);
  return {
    id: concept.id,
    name: concept.title,
    description: concept.description || "",
    category: normalizeCategory(meta.category),
    color: meta.color,
  };
}

function localConceptToApiPayload(concept: { name: string; description: string; category: string; color: string }) {
  return {
    title: concept.name,
    description: concept.description,
    definition: JSON.stringify({
      category: normalizeCategory(concept.category),
      color: concept.color || defaultConceptColor,
    }),
  };
}

function conceptToArtifact(concept: { id: string; name: string; description: string; category: string; color: string }, projectId: string): Artifact {
  return {
    id: `keyword-${concept.id}`,
    title: concept.name,
    type: "keyword",
    projectId: projectId || "global",
    sourceStep: 4,
    description: concept.description || `Keyword in ${normalizeCategory(concept.category)}`,
    updatedAt: new Date().toISOString().split("T")[0],
    content: JSON.stringify({
      category: normalizeCategory(concept.category),
      color: concept.color,
      conceptId: concept.id,
    }),
  };
}

function parseVisualizationContent(content?: string): { bucketName?: string; objectKey?: string; accessUrl?: string } | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return {
      bucketName:
        typeof parsed.bucketName === "string"
          ? parsed.bucketName
          : typeof parsed.bucket_name === "string"
            ? parsed.bucket_name
            : undefined,
      objectKey:
        typeof parsed.objectKey === "string"
          ? parsed.objectKey
          : typeof parsed.object_key === "string"
            ? parsed.object_key
            : undefined,
      accessUrl:
        typeof parsed.accessUrl === "string"
          ? parsed.accessUrl
          : typeof parsed.access_url === "string"
            ? parsed.access_url
            : typeof parsed.url === "string"
              ? parsed.url
              : undefined,
    };
  } catch {
    return null;
  }
}

const FILTER_OPTIONS: { value: string; label: string; zhLabel: string }[] = [
  { value: "all", label: "All", zhLabel: "全部" },
  { value: "purpose", label: "Purposes", zhLabel: "目的" },
  { value: "concepts", label: "Keywords", zhLabel: "关键词" },
  { value: "search", label: "Searches", zhLabel: "检索" },
  { value: "literature", label: "Literature", zhLabel: "文献" },
  { value: "notes", label: "Notes", zhLabel: "笔记" },
  { value: "visual", label: "Visuals", zhLabel: "视觉" },
  { value: "drafts", label: "Drafts", zhLabel: "草稿" },
];

const FILTER_MAP: Record<string, ArtifactType[]> = {
  all: [],
  purpose: ["purpose"],
  search: ["search-log"],
  literature: ["entry-paper"],
  notes: ["literature-note", "permanent-note", "pre-writing-note"],
  visual: ["visualization"],
  drafts: ["rq-draft", "writing-block", "writing-draft"],
};

export default function ArtifactCenter() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const { user } = useAuth();
  const NOTES_UPDATED_EVENT = "notes-updated";
  const ARTIFACTS_STORAGE_KEY = "rw-artifacts";
  const ARTIFACTS_UPDATED_EVENT = "artifacts-updated";
  const COMMUNITY_PACKAGES_KEY = "rw-community-packages";
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabFromUrl = searchParams.get("tab") || "all";
  const projectIdFromUrl = searchParams.get("projectId") || "";
  const [filter, setFilter] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([...STATIC_ARTIFACTS]);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<
    Array<{ id: string; name: string; description: string; category: string; color: string }>
  >([]);
  const [showConceptDialog, setShowConceptDialog] = useState(false);
  const [conceptDialogMode, setConceptDialogMode] = useState<"view" | "edit">("view");
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [selectedKeywordCategory, setSelectedKeywordCategory] = useState<string>("all");
  const [expandedKeywordCategories, setExpandedKeywordCategories] = useState<Record<string, boolean>>({});
  const [conceptForm, setConceptForm] = useState({
    name: "",
    description: "",
    category: "",
    color: "#6366f1",
  });
  // Pack & Share state
  const [packMode, setPackMode] = useState(false);
  const [selectedForPack, setSelectedForPack] = useState<Set<string>>(new Set());
  const [showPackDialog, setShowPackDialog] = useState(false);
  const [packName, setPackName] = useState("");
  const [packDescription, setPackDescription] = useState("");
  const [packSaved, setPackSaved] = useState(false);
  const [cardPageSize, setCardPageSize] = useState<30 | 60 | "all">(30);
  const [cardPage, setCardPage] = useState(1);
  const [myPackages, setMyPackages] = useState<ArtifactPackage[]>([]);
  const [paperTitleMap, setPaperTitleMap] = useState<Record<string, string>>({});
  const [visualThumbUrls, setVisualThumbUrls] = useState<Record<string, string>>({});
  const [showAddPaperDialog, setShowAddPaperDialog] = useState(false);
  const [showAddMultiplePaperDialog, setShowAddMultiplePaperDialog] = useState(false);
  const [newPaperTitle, setNewPaperTitle] = useState("");
  const [newPaperAuthors, setNewPaperAuthors] = useState("");
  const [newPaperYear, setNewPaperYear] = useState("");
  const [newPaperJournal, setNewPaperJournal] = useState("");
  const [newPaperDiscoveryPath, setNewPaperDiscoveryPath] = useState("Academic Database");
  const [newPaperDiscoveryNote, setNewPaperDiscoveryNote] = useState("");
  const [newPaperDoiUrl, setNewPaperDoiUrl] = useState("");
  const [doiFetching, setDoiFetching] = useState(false);
  const [doiFetchError, setDoiFetchError] = useState<string | null>(null);
  const [bulkDoiInput, setBulkDoiInput] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const visualUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{
      id: string;
      name: string;
      size: string;
      date: string;
      uploading?: boolean;
      progress?: number;
      failed?: boolean;
      errorMessage?: string;
      addedToVisual?: boolean;
      artifactId?: string;
      bucketName?: string;
      storageKey?: string;
    }>
  >([]);
  const failedUploadFilesRef = useRef<Map<string, File>>(new Map());

  const DISCOVERY_PATH_OPTIONS = [
    "Academic Database",
    "Google Scholar",
    "Reference Mining",
    "Citation Tracking",
    "Manual Add",
  ];

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && FILTER_OPTIONS.some((o) => o.value === tab)) {
      setFilter(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    setMyPackages(loadPackages());
  }, []);

  const loadLocalArtifacts = (): Artifact[] => {
    return readJsonWithBackup<Artifact[]>(
      ARTIFACTS_STORAGE_KEY,
      (value): value is Artifact[] => Array.isArray(value),
      []
    );
  };

  const saveLocalArtifacts = (artifactsToSave: Artifact[]) => {
    if (typeof window === "undefined") return;
    writeJsonWithBackup(ARTIFACTS_STORAGE_KEY, artifactsToSave);
    window.dispatchEvent(new CustomEvent(ARTIFACTS_UPDATED_EVENT));
  };

  const isArtifactVisibleInScope = (artifact: Artifact) => {
    if (!projectIdFromUrl) return true;
    return !artifact.projectId || artifact.projectId === projectIdFromUrl;
  };

  const persistVisualArtifact = (payload: {
    fileName: string;
    fileSize: number;
    bucketName: string;
    objectKey: string;
    accessUrl?: string;
  }) => {
    const artifactId = `visual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const artifact: Artifact = {
      id: artifactId,
      title: payload.fileName,
      type: "visualization",
      projectId: projectIdFromUrl,
      sourceStep: 5,
      description: `Uploaded visualization image (${formatFileSize(payload.fileSize)})`,
      updatedAt: new Date().toISOString().split("T")[0],
      content: JSON.stringify({
        kind: "visualization-upload",
        fileName: payload.fileName,
        bucketName: payload.bucketName,
        objectKey: payload.objectKey,
        accessUrl: payload.accessUrl || "",
      }),
    };

    const localArtifacts = loadLocalArtifacts();
    saveLocalArtifacts([...localArtifacts, artifact]);
    setArtifacts((prev) => Array.from(new Map([...prev, artifact].map((item) => [item.id, item])).values()));
    return artifact;
  };

  const uploadVisualizationBytes = async (bucketName: string, objectKey: string, file: File) => {
    const token = getAuthToken();
    const baseURL = getAPIBaseURL() || "";
    const formData = new FormData();
    formData.append("bucket_name", bucketName);
    formData.append("object_key", objectKey);
    formData.append("file", file);

    const response = await fetch(`${baseURL}/api/v1/storage/upload-bytes`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      let detail = "Failed to upload visualization file";
      try {
        const payload = (await response.json()) as { detail?: string };
        if (payload?.detail) detail = payload.detail;
      } catch {
        // Ignore JSON parsing issues and keep the generic message.
      }
      throw new Error(detail);
    }

    return (await response.json()) as { bucket_name: string; object_key: string; access_url?: string };
  };

  const uploadVisualizationFile = async (rowId: string, file: File) => {
    if (!projectIdFromUrl) {
      throw new Error("Project ID is required to upload visuals");
    }

    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "-");
    const objectKey = `visualizations/${projectIdFromUrl}/${Date.now()}-${safeName}`;
    const bucketName = "visualizations";

    setUploadedFiles((prev) =>
      prev.map((item) =>
        item.id === rowId ? { ...item, progress: 20, uploading: true } : item
      )
    );

    const uploadResult = await uploadVisualizationBytes(bucketName, objectKey, file);

    const artifact = persistVisualArtifact({
      fileName: file.name,
      fileSize: file.size,
      bucketName: uploadResult.bucket_name,
      objectKey: uploadResult.object_key,
      accessUrl: uploadResult.access_url,
    });

    setUploadedFiles((prev) =>
      prev.map((item) =>
        item.id === rowId
          ? {
              ...item,
              uploading: false,
              progress: 100,
              failed: false,
              errorMessage: "",
              addedToVisual: true,
              artifactId: artifact.id,
              bucketName: uploadResult.bucket_name,
              storageKey: uploadResult.object_key,
            }
          : item
      )
    );
    failedUploadFilesRef.current.delete(rowId);
  };

  const handleVisualUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const images = Array.from(fileList).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      toast.error(isZh ? "请选择至少一个图片文件。" : "Please choose at least one image file");
      event.target.value = "";
      return;
    }

    let successCount = 0;
    for (const image of images) {
      const rowId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setUploadedFiles((prev) => [
        ...prev,
        {
          id: rowId,
          name: image.name,
          size: formatFileSize(image.size),
          date: new Date().toISOString().split("T")[0],
          uploading: true,
          progress: 0,
          failed: false,
          addedToVisual: false,
        },
      ]);

      try {
        await uploadVisualizationFile(rowId, image);
        successCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed. Please retry.";
        failedUploadFilesRef.current.set(rowId, image);
        setUploadedFiles((prev) =>
          prev.map((item) =>
            item.id === rowId
              ? { ...item, uploading: false, failed: true, errorMessage: message }
              : item
          )
        );
        console.error("Failed to upload visualization:", error);
        toast.error(isZh ? `上传失败：${image.name}（${message}）` : `Upload failed: ${image.name} (${message})`);
      }
    }

    if (successCount > 0) {
      toast.success(
        isZh
          ? `已上传 ${successCount} 个可视化文件`
          : `Uploaded ${successCount} visualization file${successCount > 1 ? "s" : ""}`
      );
    }
    event.target.value = "";
  };

  const handleRetryVisualUpload = async (rowId: string) => {
    const file = failedUploadFilesRef.current.get(rowId);
    if (!file) return;

    setUploadedFiles((prev) =>
      prev.map((item) =>
        item.id === rowId ? { ...item, uploading: true, failed: false, errorMessage: "", progress: 0 } : item
      )
    );

    try {
      await uploadVisualizationFile(rowId, file);
      toast.success(isZh ? `上传成功：${file.name}` : `Upload succeeded: ${file.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed. Please retry.";
      setUploadedFiles((prev) =>
        prev.map((item) =>
          item.id === rowId
            ? { ...item, uploading: false, failed: true, errorMessage: message }
            : item
        )
      );
      console.error("Failed to retry visualization upload:", error);
      toast.error(isZh ? `重试失败：${file.name}（${message}）` : `Retry failed: ${file.name} (${message})`);
    }
  };

  const loadPackages = (): ArtifactPackage[] => {
    return readJsonWithBackup<ArtifactPackage[]>(
      COMMUNITY_PACKAGES_KEY,
      (value): value is ArtifactPackage[] => Array.isArray(value),
      []
    );
  };

  const savePackages = (packages: ArtifactPackage[]) => {
    if (typeof window === "undefined") return;
    writeJsonWithBackup(COMMUNITY_PACKAGES_KEY, packages);
    setMyPackages(packages);
  };

  const loadApiConcepts = async () => {
    try {
      if (projectIdFromUrl) {
        const projectConcepts = await conceptAPI.list(projectIdFromUrl);
        setConcepts(projectConcepts.map(apiConceptToLocal));
        return;
      }

      const projects = await projectAPI.list();
      const allConcepts = await Promise.all(projects.map((project) => conceptAPI.list(project.id)));
      const merged = allConcepts.flat().map(apiConceptToLocal);
      const deduped = Array.from(new Map(merged.map((concept) => [concept.id, concept])).values());
      setConcepts(deduped);
    } catch {
      setConcepts([]);
    }
  };

  useEffect(() => {
    void loadApiConcepts();
  }, [projectIdFromUrl]);

  useEffect(() => {
    const loadSavedNotes = async () => {
      try {
        const papers = projectIdFromUrl
          ? await paperAPI.list(projectIdFromUrl)
          : (await Promise.all((await projectAPI.list()).map((project) => paperAPI.list(project.id)))).flat();
        setPaperTitleMap(Object.fromEntries(papers.map((paper) => [paper.id, paper.title])));
        const literatureArtifacts = papers
          .filter((paper) => paper.is_entry_paper || paper.is_expanded_paper)
          .map((paper) => paperToArtifact(paper));
        const savedNotes = projectIdFromUrl
          ? await noteAPI.listByProject(projectIdFromUrl)
          : await noteAPI.listAll();
        const savedNoteArtifacts = savedNotes.map(noteToArtifact);
        const localArtifacts = loadLocalArtifacts().filter(isArtifactVisibleInScope);
        const merged = [...STATIC_ARTIFACTS, ...localArtifacts, ...literatureArtifacts, ...savedNoteArtifacts];
        const deduped = Array.from(new Map(merged.map((artifact) => [artifact.id, artifact])).values());
        setArtifacts(deduped);
      } catch (error) {
        console.error("Failed to load notes for Artifact Center:", error);
        setPaperTitleMap({});
        setArtifacts([
          ...STATIC_ARTIFACTS,
          ...loadLocalArtifacts().filter(isArtifactVisibleInScope),
        ]);
      }
    };

    loadSavedNotes();

    if (typeof window !== "undefined") {
      const onNotesUpdated = () => {
        loadSavedNotes();
      };
      window.addEventListener(NOTES_UPDATED_EVENT, onNotesUpdated);
      window.addEventListener(ARTIFACTS_UPDATED_EVENT, onNotesUpdated);
      window.addEventListener("storage", onNotesUpdated);
      return () => {
        window.removeEventListener(NOTES_UPDATED_EVENT, onNotesUpdated);
        window.removeEventListener(ARTIFACTS_UPDATED_EVENT, onNotesUpdated);
        window.removeEventListener("storage", onNotesUpdated);
      };
    }
  }, [projectIdFromUrl]);

  useEffect(() => {
    const baseURL = getAPIBaseURL() || "";
    const token = getAuthToken();
    // Track blob URLs created in this effect so we can revoke them on cleanup
    const createdBlobUrls: string[] = [];

    const loadVisualThumbs = async () => {
      const visualArtifacts = artifacts.filter((artifact) => artifact.type === "visualization");
      if (visualArtifacts.length === 0) {
        setVisualThumbUrls({});
        return;
      }

      const entries = await Promise.all(
        visualArtifacts.map(async (artifact) => {
          const meta = parseVisualizationContent(artifact.content);
          if (!meta) return [artifact.id, ""] as const;

          // If we have bucket+key, fetch through the backend proxy so the image
          // works regardless of whether the internal MinIO endpoint is accessible
          // from the user's browser.
          if (meta.bucketName && meta.objectKey) {
            try {
              const proxyUrl = `${baseURL}/api/v1/storage/proxy/${encodeURIComponent(meta.bucketName)}/${meta.objectKey.split("/").map(encodeURIComponent).join("/")}`;
              const response = await fetch(proxyUrl, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (response.ok) {
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                createdBlobUrls.push(blobUrl);
                return [artifact.id, blobUrl] as const;
              }
            } catch {
              // Fall through to accessUrl fallback
            }
          }

          // Fallback: use stored accessUrl (e.g. local-visual endpoint for local uploads)
          return [artifact.id, meta.accessUrl || ""] as const;
        })
      );

      setVisualThumbUrls(Object.fromEntries(entries));
    };

    void loadVisualThumbs();

    return () => {
      // Revoke blob URLs to avoid memory leaks
      createdBlobUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [artifacts]);

  const keywordArtifactsForAll = useMemo(() => {
    return concepts.map((concept) => conceptToArtifact(concept, projectIdFromUrl));
  }, [concepts, projectIdFromUrl]);

  const filteredArtifacts = (filter === "all"
    ? (() => {
        const merged = [...artifacts, ...keywordArtifactsForAll];
        const deduped = Array.from(new Map(merged.map((artifact) => [artifact.id, artifact])).values());
        return deduped;
      })()
    : artifacts
  ).filter((a) => {
    const matchesFilter =
      filter === "all" || FILTER_MAP[filter]?.includes(a.type);
    const matchesSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const artifactPackToken = (id: string) => `artifact:${id}`;
  const conceptPackToken = (id: string) => `concept:${id}`;

  const selected = artifacts.find((a) => a.id === selectedArtifact);
  const selectedConcept = concepts.find((c) => c.id === selectedConceptId) || null;

  const parseArtifactJson = (value?: string): Record<string, unknown> | null => {
    if (!value) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  };

  const resolveDraftDisplayTitle = (artifact: Artifact) => {
    if (artifact.type !== "rq-draft" && artifact.type !== "writing-block" && artifact.type !== "writing-draft") {
      return artifact.title;
    }

    const payload = parseArtifactJson(artifact.content);
    const getString = (key: string) => {
      const value = payload?.[key];
      return typeof value === "string" ? value.trim() : "";
    };

    const sourcePaper = payload?.sourcePaper && typeof payload.sourcePaper === "object"
      ? (payload.sourcePaper as Record<string, unknown>)
      : null;

    const directTitle =
      getString("paperTitle") ||
      getString("sourcePaperTitle") ||
      (typeof sourcePaper?.title === "string" ? sourcePaper.title.trim() : "");

    if (directTitle) return directTitle;

    const paperId =
      getString("paperId") ||
      getString("paper_id") ||
      getString("sourcePaperId") ||
      (typeof sourcePaper?.id === "string" ? sourcePaper.id.trim() : "");

    if (paperId && paperTitleMap[paperId]) {
      return paperTitleMap[paperId];
    }

    return artifact.title;
  };

  const deriveLiteratureTags = (artifact: Artifact) => {
    if (artifact.type !== "entry-paper") {
      return { isEntry: false, isExpanded: false };
    }
    const desc = artifact.description || "";
    return {
      isEntry: /Entry Paper/i.test(desc),
      isExpanded: /Expanded Paper/i.test(desc),
    };
  };

  const openConceptDialog = (conceptId: string, mode: "view" | "edit") => {
    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept) return;
    setSelectedConceptId(conceptId);
    setConceptDialogMode(mode);
    setConceptForm({
      name: concept.name,
      description: concept.description,
      category: concept.category,
      color: concept.color,
    });
    setShowConceptDialog(true);
  };

  const handleDeleteConcept = async (conceptId: string) => {
    setConcepts((prev) => prev.filter((c) => c.id !== conceptId));
    try {
      await conceptAPI.delete(conceptId);
    } catch {
      await loadApiConcepts();
    }

    if (selectedConceptId === conceptId) {
      setShowConceptDialog(false);
      setSelectedConceptId(null);
    }
  };

  const handleSaveConcept = async () => {
    if (!selectedConceptId) return;
    const trimmedName = conceptForm.name.trim();
    if (!trimmedName) return;

    const nextConcept = {
      name: trimmedName,
      description: conceptForm.description.trim(),
      category: conceptForm.category.trim() || defaultConceptCategory,
      color: conceptForm.color,
    };

    setConcepts((prev) => prev.map((c) => (c.id === selectedConceptId ? { ...c, ...nextConcept } : c)));

    try {
      await conceptAPI.update(selectedConceptId, localConceptToApiPayload(nextConcept));
    } catch {
      await loadApiConcepts();
    }

    setShowConceptDialog(false);
    setSelectedConceptId(null);
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    const artifact = artifacts.find((item) => item.id === artifactId);

    // In All tab, keyword cards are concept-backed artifacts built at runtime.
    if (!artifact) {
      const maybeConceptId = artifactId.startsWith("keyword-") ? artifactId.slice("keyword-".length) : "";
      if (maybeConceptId && concepts.some((concept) => concept.id === maybeConceptId)) {
        await handleDeleteConcept(maybeConceptId);
      }
      return;
    }

    if (
      artifact &&
      (artifact.type === "literature-note" || artifact.type === "permanent-note")
    ) {
      try {
        await noteAPI.delete(artifactId);
      } catch (error) {
        console.error("Failed to delete note artifact:", error);
        return;
      }
    }

    if (artifact?.type === "entry-paper") {
      const paperId = artifact.id.replace(/^entry-paper-/, "");
      try {
        await paperAPI.update(paperId, { is_entry_paper: false, is_expanded_paper: false });
      } catch (error) {
        console.error("Failed to delete literature artifact:", error);
        return;
      }
    }

    const localArtifacts = loadLocalArtifacts();
    if (localArtifacts.some((item) => item.id === artifactId)) {
      saveLocalArtifacts(localArtifacts.filter((item) => item.id !== artifactId));
    }

    setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
    if (selectedArtifact === artifactId) {
      setSelectedArtifact(null);
    }
  };

  const extractDoiFromText = (input: string) => {
    const doiMatch = input.match(/\b10\.\d{4,}\/[^\s]+/i);
    return doiMatch ? doiMatch[0].replace(/[.,;)>]+$/, "") : null;
  };

  const handleFetchByDoiUrl = async () => {
    const input = newPaperDoiUrl.trim();
    if (!input) return;
    const doi = extractDoiFromText(input);
    if (!doi) {
      setDoiFetchError("Unable to find a valid DOI. Please check input or fill manually.");
      return;
    }

    setDoiFetching(true);
    setDoiFetchError(null);
    try {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      if (!res.ok) throw new Error("Not found");
      const json = (await res.json()) as {
        message: {
          title?: string[];
          author?: Array<{ given?: string; family?: string }>;
          published?: { "date-parts"?: number[][] };
          "container-title"?: string[];
          publisher?: string;
        };
      };
      const work = json.message;
      if (work.title?.[0]) setNewPaperTitle(work.title[0]);
      const authors = (work.author ?? []).map((a) => [a.given, a.family].filter(Boolean).join(" "));
      if (authors.length) setNewPaperAuthors(authors.join(", "));
      const year = work.published?.["date-parts"]?.[0]?.[0];
      if (year) setNewPaperYear(String(year));
      const journal = work["container-title"]?.[0] ?? work.publisher;
      if (journal) setNewPaperJournal(journal);
    } catch {
      setDoiFetchError("Failed to fetch by DOI. Please fill the fields manually.");
    } finally {
      setDoiFetching(false);
    }
  };

  const createEntryPaper = async (payload: {
    title: string;
    authors: string[];
    year?: number;
    journal?: string;
    url?: string;
    discoveryPath?: string;
    discoveryNote?: string;
  }) => {
    if (!projectIdFromUrl) {
      throw new Error("Project ID is required to add papers");
    }

    const created = await paperAPI.create({
      title: payload.title,
      authors: payload.authors,
      year: payload.year,
      journal: payload.journal,
      url: payload.url,
      discovery_path: payload.discoveryPath,
      discovery_note: payload.discoveryNote,
      project_id: projectIdFromUrl,
    });

    let nextPaper = created;
    try {
      nextPaper = await paperAPI.update(created.id, { is_entry_paper: true });
    } catch {
      nextPaper = { ...created, is_entry_paper: true };
    }

    setPaperTitleMap((prev) => ({ ...prev, [nextPaper.id]: nextPaper.title }));
    setArtifacts((prev) => {
      const nextArtifact = paperToArtifact(nextPaper);
      const deduped = Array.from(new Map([...prev, nextArtifact].map((artifact) => [artifact.id, artifact])).values());
      return deduped;
    });
  };

  const resetAddPaperForm = () => {
    setNewPaperTitle("");
    setNewPaperAuthors("");
    setNewPaperYear("");
    setNewPaperJournal("");
    setNewPaperDiscoveryPath("Academic Database");
    setNewPaperDiscoveryNote("");
    setNewPaperDoiUrl("");
    setDoiFetchError(null);
  };

  const handleAddEntryPaper = async () => {
    if (!newPaperTitle.trim()) return;
    try {
      await createEntryPaper({
        title: newPaperTitle.trim(),
        authors: newPaperAuthors.split(",").map((a) => a.trim()).filter(Boolean),
        year: parseInt(newPaperYear, 10) || undefined,
        journal: newPaperJournal.trim() || undefined,
        url: newPaperDoiUrl.trim() || undefined,
        discoveryPath: newPaperDiscoveryPath,
        discoveryNote: newPaperDiscoveryNote.trim() || undefined,
      });
      setShowAddPaperDialog(false);
      resetAddPaperForm();
      toast.success(isZh ? "入口文献已添加" : "Entry paper added");
    } catch {
      toast.error(isZh ? "添加入口文献失败" : "Failed to add entry paper");
    }
  };

  const handleAddMultipleEntryPapers = async () => {
    const lines = bulkDoiInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;

    setBulkImporting(true);
    let imported = 0;
    let failed = 0;

    for (const line of lines) {
      const doi = extractDoiFromText(line);
      if (!doi) {
        failed += 1;
        continue;
      }

      try {
        const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
        if (!res.ok) {
          failed += 1;
          continue;
        }

        const json = (await res.json()) as {
          message: {
            title?: string[];
            author?: Array<{ given?: string; family?: string }>;
            published?: { "date-parts"?: number[][] };
            "container-title"?: string[];
            publisher?: string;
          };
        };
        const work = json.message;
        const title = work.title?.[0]?.trim();
        if (!title) {
          failed += 1;
          continue;
        }

        const authors = (work.author ?? []).map((a) => [a.given, a.family].filter(Boolean).join(" ")).filter(Boolean);
        const year = work.published?.["date-parts"]?.[0]?.[0];
        const journal = work["container-title"]?.[0] ?? work.publisher;

        await createEntryPaper({
          title,
          authors,
          year,
          journal,
          url: `https://doi.org/${encodeURIComponent(doi)}`,
          discoveryPath: "Academic Database",
          discoveryNote: "Added from DOI in My Artifacts",
        });
        imported += 1;
      } catch {
        failed += 1;
      }
    }

    setBulkImporting(false);
    setShowAddMultiplePaperDialog(false);
    setBulkDoiInput("");

    if (imported > 0) {
      toast.success(`Added ${imported} entry paper(s)`);
    }
    if (failed > 0) {
      toast.error(`${failed} DOI row(s) failed`);
    }
  };

  const getArtifactPaperReadTarget = async (artifact: Artifact) => {
    if (artifact.type === "entry-paper") {
      const paperId = artifact.id.replace(/^entry-paper-/, "");
      if (!paperId || paperId === artifact.id) return null;
      return `/paper-read/${artifact.projectId}/${paperId}`;
    }

    if (artifact.type === "literature-note" || artifact.type === "permanent-note") {
      try {
        const note = await noteAPI.get(artifact.id);
        return `/paper-read/${note.project_id}/${note.paper_id}?noteId=${note.id}`;
      } catch (error) {
        console.error("Failed to resolve note artifact target:", error);
        return null;
      }
    }

    return null;
  };

  const handleOpenArtifactSource = async (artifact: Artifact) => {
    const target = await getArtifactPaperReadTarget(artifact);
    if (!target) {
      return;
    }
    navigate(target);
  };

  const togglePackSelect = (token: string) => {
    setSelectedForPack((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  };

  const selectAllVisibleForPack = () => {
    if (filter === "concepts") {
      setSelectedForPack(new Set(pagedVisibleConcepts.map((concept) => conceptPackToken(concept.id))));
      return;
    }
    setSelectedForPack(new Set(pagedFilteredArtifacts.map((artifact) => artifactPackToken(artifact.id))));
  };

  const toggleSelectTypeForPack = (type: ArtifactType) => {
    setSelectedForPack((prev) => {
      const next = new Set(prev);
      const ids = pagedFilteredArtifacts
        .filter((artifact) => artifact.type === type)
        .map((artifact) => artifactPackToken(artifact.id));
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectKeywordCategoryForPack = (category: string) => {
    setSelectedForPack((prev) => {
      const next = new Set(prev);
      const ids = pagedVisibleConcepts
        .filter((concept) => normalizeCategory(concept.category) === category)
        .map((concept) => conceptPackToken(concept.id));
      const allSelected = ids.every((id) => next.has(id));
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleCreatePackage = () => {
    if (!packName.trim() || selectedForPack.size === 0 || !user) return;
    const combinedArtifacts = Array.from(
      new Map([...artifacts, ...keywordArtifactsForAll].map((artifact) => [artifact.id, artifact])).values()
    );
    const selectedArtifacts = combinedArtifacts.filter((a) => selectedForPack.has(artifactPackToken(a.id)));
    const selectedConceptArtifacts = concepts
      .filter((concept) => selectedForPack.has(conceptPackToken(concept.id)))
      .map((concept) => conceptToArtifact(concept, projectIdFromUrl));
    const packArtifacts = [...selectedArtifacts, ...selectedConceptArtifacts];
    const pkg: ArtifactPackage = {
      id: `pkg-${Date.now()}`,
      name: packName.trim(),
      description: packDescription.trim(),
      artifacts: packArtifacts,
      createdAt: new Date().toISOString().split("T")[0],
      shared: true,
      ownerId: user.id,
      ownerName: user.name || user.email?.split("@")[0] || "User",
      type: "created",
    };
    savePackages([...myPackages, pkg]);
    setPackSaved(true);
    setTimeout(() => {
      setPackSaved(false);
      setShowPackDialog(false);
      setPackName("");
      setPackDescription("");
      setSelectedForPack(new Set());
      setPackMode(false);
    }, 1500);
  };

  const handleTogglePackageShare = (packageId: string) => {
    const next = myPackages.map((pkg) =>
      pkg.id === packageId ? { ...pkg, shared: !pkg.shared } : pkg
    );
    savePackages(next);
  };

  const handleDeletePackage = (packageId: string) => {
    savePackages(myPackages.filter((pkg) => pkg.id !== packageId));
  };

  const handleUnpackToMyArtifacts = (pkg: ArtifactPackage) => {
    const localArtifacts = loadLocalArtifacts();
    const unpacked = pkg.artifacts.map((artifact) => ({
      ...artifact,
      id: `${artifact.id}-unpack-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `${artifact.title} (from ${pkg.ownerName})`,
      projectId: "",
      updatedAt: new Date().toISOString().split("T")[0],
    }));
    saveLocalArtifacts([...localArtifacts, ...unpacked]);
    setArtifacts((prev) => {
      const merged = [...prev, ...unpacked];
      return Array.from(new Map(merged.map((artifact) => [artifact.id, artifact])).values());
    });
  };

  const getFilterCount = (filterValue: string) => {
    if (filterValue === "all") {
      return artifacts.length + concepts.length;
    }
    if (filterValue === "concepts") {
      return concepts.length;
    }
    return artifacts.filter((a) => FILTER_MAP[filterValue]?.includes(a.type)).length;
  };

  const filteredConcepts = concepts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  const keywordCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const concept of filteredConcepts) {
      const normalized = normalizeCategory(concept.category);
      counts[normalized] = (counts[normalized] || 0) + 1;
    }
    return counts;
  }, [filteredConcepts]);

  const keywordCategories = useMemo(() => {
    const available = Object.keys(keywordCategoryCounts);
    return CATEGORY_ORDER.filter((category) => available.includes(category));
  }, [keywordCategoryCounts]);

  const visibleConcepts = useMemo(() => {
    if (selectedKeywordCategory === "all") {
      return filteredConcepts;
    }
    return filteredConcepts.filter(
      (concept) => normalizeCategory(concept.category) === selectedKeywordCategory
    );
  }, [filteredConcepts, selectedKeywordCategory]);

  const totalCardItems = filter === "concepts" ? visibleConcepts.length : filteredArtifacts.length;
  const totalCardPages = cardPageSize === "all" ? 1 : Math.max(1, Math.ceil(totalCardItems / cardPageSize));
  const currentCardPage = Math.min(cardPage, totalCardPages);

  const pagedVisibleConcepts = useMemo(() => {
    if (cardPageSize === "all") return visibleConcepts;
    const start = (currentCardPage - 1) * cardPageSize;
    return visibleConcepts.slice(start, start + cardPageSize);
  }, [visibleConcepts, cardPageSize, currentCardPage]);

  const pagedFilteredArtifacts = useMemo(() => {
    if (cardPageSize === "all") return filteredArtifacts;
    const start = (currentCardPage - 1) * cardPageSize;
    return filteredArtifacts.slice(start, start + cardPageSize);
  }, [filteredArtifacts, cardPageSize, currentCardPage]);

  const artifactPackGroups = useMemo(() => {
    const groups = new Map<ArtifactType, Artifact[]>();
    for (const artifact of pagedFilteredArtifacts) {
      if (!groups.has(artifact.type)) {
        groups.set(artifact.type, []);
      }
      groups.get(artifact.type)?.push(artifact);
    }
    return Array.from(groups.entries());
  }, [pagedFilteredArtifacts]);

  useEffect(() => {
    setCardPage(1);
  }, [filter, searchQuery, selectedKeywordCategory, cardPageSize]);

  useEffect(() => {
    if (cardPage > totalCardPages) {
      setCardPage(totalCardPages);
    }
  }, [cardPage, totalCardPages]);

  const groupedVisibleConcepts = useMemo(() => {
    return keywordCategories
      .map((category) => ({
        category,
        items: pagedVisibleConcepts.filter((concept) => normalizeCategory(concept.category) === category),
      }))
      .filter((group) => group.items.length > 0);
  }, [keywordCategories, pagedVisibleConcepts]);

  const keywordPackGroups = useMemo(
    () =>
      groupedVisibleConcepts.map((group) => ({
        category: group.category,
        ids: group.items.map((concept) => concept.id),
      })),
    [groupedVisibleConcepts]
  );

  const totalPackSelectionCount = selectedForPack.size;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Archive className="w-7 h-7 text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-100">
                {isZh ? "我的产件" : "My Artifacts"}
              </h1>
              <p className="text-sm text-slate-500">
                {isZh ? "将所有研究产物集中于一处" : "All your research outputs in one place"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={packMode ? "default" : "outline"}
              className={cn("app-btn-xs", packMode && "app-btn-primary")}
              onClick={() => {
                setPackMode(!packMode);
                setSelectedForPack(new Set());
              }}
            >
              <Package className="w-3.5 h-3.5 mr-1.5" />
              {packMode ? (isZh ? "取消打包" : "Cancel Pack") : (isZh ? "打包与分享" : "Pack & Share")}
            </Button>
            <Link to="/community-artifacts">
              <Button size="sm" variant="outline" className="app-btn-xs">
                <Globe className="w-3.5 h-3.5 mr-1.5" />
                {isZh ? "社区" : "Community"}</Button>
            </Link>
          </div>
        </div>

        {/* Pack mode selection bar */}
        {packMode && (
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-400/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-cyan-200">
                <PackageCheck className="w-4 h-4" />
                <span>{isZh ? `已选 ${totalPackSelectionCount} 项` : `${totalPackSelectionCount} item${totalPackSelectionCount !== 1 ? "s" : ""} selected`}</span>
                {totalPackSelectionCount > 0 && (
                  <button
                    className="text-xs text-cyan-400 hover:underline ml-1"
                    onClick={() => setSelectedForPack(new Set())}
                  >
                    {isZh ? "清除" : "Clear"}</button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="outline" className="app-btn-compact" onClick={selectAllVisibleForPack}>
                  {isZh ? "选择当前可见项" : "Select Visible"}</Button>
                <Button
                  size="sm"
                  disabled={totalPackSelectionCount === 0}
                  className="app-btn-primary app-btn-xs"
                  onClick={() => setShowPackDialog(true)}
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  {isZh ? "创建产集" : "Create Package"}</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filter === "concepts"
                ? keywordPackGroups.map(({ category, ids }) => {
                  const allSelected = ids.length > 0 && ids.every((id) => selectedForPack.has(conceptPackToken(id)));
                  return (
                    <button
                      key={category}
                      type="button"
                      className={cn(
                        "workflow-filter-btn workflow-filter-btn--compact",
                        allSelected && "workflow-filter-btn--active"
                      )}
                      onClick={() => toggleSelectKeywordCategoryForPack(category)}
                    >
                      {category} ({ids.length})
                    </button>
                  );
                })
                : artifactPackGroups.map(([type, items]) => {
                const allSelected = items.every((item) => selectedForPack.has(artifactPackToken(item.id)));
                return (
                  <button
                    key={type}
                    type="button"
                    className={cn(
                      "workflow-filter-btn workflow-filter-btn--compact",
                      allSelected && "workflow-filter-btn--active"
                    )}
                    onClick={() => toggleSelectTypeForPack(type)}
                  >
                    {ARTIFACT_TYPE_META[type].label} ({items.length})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={filter === "concepts" ? "Search keywords, categories, description..." : "Search artifacts..."}
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={cn(
                  "workflow-filter-btn",
                  filter === opt.value && "workflow-filter-btn--active"
                )}
                onClick={() => setFilter(opt.value)}
              >
                {(isZh ? opt.zhLabel : opt.label)} ({getFilterCount(opt.value)})
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-800/20 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{isZh ? "每页卡片数" : "Cards per page"}</span>
            <Select
              value={String(cardPageSize)}
              onValueChange={(value) => setCardPageSize(value === "all" ? "all" : (Number(value) as 30 | 60))}
            >
              <SelectTrigger className="h-7 w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="60">60</SelectItem>
                <SelectItem value="all">{isZh ? "全部" : "All"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              {cardPageSize === "all"
                ? `Showing all ${totalCardItems} items`
                : `Page ${currentCardPage}/${totalCardPages} · ${totalCardItems} items`}
            </span>
            {cardPageSize !== "all" && totalCardPages > 1 ? (
              <>
                <Button size="sm" variant="outline" className="app-btn-compact" disabled={currentCardPage <= 1} onClick={() => setCardPage((prev) => Math.max(1, prev - 1))}>
                  {isZh ? "上一页" : "Prev"}</Button>
                <Button size="sm" variant="outline" className="app-btn-compact" disabled={currentCardPage >= totalCardPages} onClick={() => setCardPage((prev) => Math.min(totalCardPages, prev + 1))}>
                  {isZh ? "前进" : "Next"}</Button>
              </>
            ) : null}
          </div>
        </div>

        {(filter === "literature" || filter === "visual") && (
          <div className="space-y-3">
            <div className="flex items-center justify-end">
            {filter === "literature" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    disabled={!projectIdFromUrl}
                    title={projectIdFromUrl ? "Add paper to current project" : "Open a specific project to add papers"}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {isZh ? "添加论文" : "Add Paper"}<ChevronDown className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setShowAddPaperDialog(true)}>
                    {isZh ? "添加一篇" : "Add One"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAddMultiplePaperDialog(true)}>
                    {isZh ? "添加多篇" : "Add Multiple"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <input
                  ref={visualUploadInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleVisualUploadChange}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  disabled={!projectIdFromUrl}
                  title={projectIdFromUrl ? "Upload visual files to current project" : "Open a specific project to upload visuals"}
                  onClick={() => visualUploadInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  {isZh ? "上传文件" : "Upload File"}</Button>
              </>
            )}
            </div>
            {filter === "visual" && uploadedFiles.length > 0 ? (
              <div className="space-y-2 rounded-lg border border-slate-700/50 bg-slate-800/20 p-3">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 rounded-lg bg-slate-800/40 p-2">
                    <Archive className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{file.size} · {file.date}</p>
                      {file.uploading ? (
                        <div className="mt-1">
                          <div className="h-1.5 w-full overflow-hidden rounded bg-slate-700/60">
                            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${file.progress || 0}%` }} />
                          </div>
                          <p className="mt-0.5 text-[10px] text-cyan-300">{isZh ? "上传中..." : "Uploading..."} {file.progress || 0}%</p>
                        </div>
                      ) : null}
                      {file.failed ? (
                        <p className="mt-0.5 text-[10px] text-red-400">{file.errorMessage || "Upload failed"}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0">
                      {file.uploading ? (
                        <Badge className="badge-uploading text-[9px]">{isZh ? "正在上传" : "Uploading"}</Badge>
                      ) : file.failed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 border-red-300 px-2 text-[10px] text-red-600 hover:bg-red-50"
                          onClick={() => void handleRetryVisualUpload(file.id)}
                        >
                          {isZh ? "重试" : "Retry"}</Button>
                      ) : file.addedToVisual ? (
                        <Badge className="badge-success text-[9px]">
                          <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" />
                          {isZh ? "已保存到 Visuals" : "Saved to Visuals"}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* Artifact/Concept Grid */}
        {filter === "concepts" ? (
          (() => {
            if (visibleConcepts.length === 0 && selectedKeywordCategory !== "all") {
              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="workflow-filter-btn workflow-filter-btn--active"
                      onClick={() => setSelectedKeywordCategory("all")}
                    >
                      {isZh ? "全部（" : "All ("}{filteredConcepts.length})
                    </button>
                    {keywordCategories.map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={cn(
                          "workflow-filter-btn",
                          selectedKeywordCategory === category && "workflow-filter-btn--active"
                        )}
                        onClick={() => setSelectedKeywordCategory(category)}
                      >
                        {category} ({keywordCategoryCounts[category] || 0})
                      </button>
                    ))}
                  </div>
                  <div className="text-center py-12 border border-slate-700/50 rounded-lg bg-slate-800/30">
                    <p className="text-sm text-slate-400">{isZh ? "当前搜索中此类别下没有关键词。" : "No keywords in this category for current search."}</p>
                  </div>
                </div>
              );
            }

            if (filteredConcepts.length === 0) return null;

            return (
              <div className="space-y-6">
                <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/50 border-b-slate-500/70 bg-[#0d1b30]/95 p-2 shadow-sm backdrop-blur">
                  <button
                    type="button"
                    className={cn(
                      "workflow-filter-btn",
                      selectedKeywordCategory === "all" && "workflow-filter-btn--active"
                    )}
                    onClick={() => setSelectedKeywordCategory("all")}
                  >
                    {isZh ? "全部（" : "All ("}{filteredConcepts.length})
                  </button>
                  {keywordCategories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={cn(
                        "workflow-filter-btn",
                        selectedKeywordCategory === category && "workflow-filter-btn--active"
                      )}
                      onClick={() => setSelectedKeywordCategory(category)}
                    >
                      {category} ({keywordCategoryCounts[category] || 0})
                    </button>
                  ))}
                  <span className="ml-auto text-xs text-slate-500 px-2">
                  </span>
                </div>

                {groupedVisibleConcepts.map(({ category, items }) => {
                  const isExpanded = expandedKeywordCategories[category] || false;
                  const compactItems = isExpanded ? items : items.slice(0, 6);
                  const hiddenCount = Math.max(items.length - compactItems.length, 0);
                  return (
                    <div key={category}>
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <Lightbulb className="w-3.5 h-3.5" />
                        {category}
                        <span className="text-slate-600 font-normal normal-case tracking-normal">· {items.length}</span>
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {compactItems.map((concept) => (
                          <Card key={concept.id} className="border-slate-700/50 hover:shadow-md transition-all group">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {packMode && (
                                    <button
                                      type="button"
                                      className="text-cyan-400"
                                      onClick={() => togglePackSelect(conceptPackToken(concept.id))}
                                      title={isZh ? "选择并打包" : "Select for package"}
                                    >
                                      {selectedForPack.has(conceptPackToken(concept.id))
                                        ? <CheckSquare className="w-4 h-4" />
                                        : <Square className="w-4 h-4 text-slate-500" />}
                                    </button>
                                  )}
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] border"
                                    style={{
                                      color: concept.color,
                                      backgroundColor: `${concept.color}12`,
                                      borderColor: `${concept.color}66`,
                                    }}
                                  >
                                    <Lightbulb className="w-3 h-3 mr-1" />
                                    {normalizeCategory(concept.category)}
                                  </Badge>
                                </div>
                              </div>
                              <CardTitle className="text-sm mt-2">{concept.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-4">
                                {concept.description || "No description yet."}
                              </p>
                              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0"
                                  title={isZh ? "浏览" : "Browse"}
                                  onClick={() => openConceptDialog(concept.id, "view")}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0"
                                  title={isZh ? "编辑" : "Edit"}
                                  onClick={() => openConceptDialog(concept.id, "edit")}
                                >
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  title={isZh ? "删除" : "Delete"}
                                  onClick={() => handleDeleteConcept(concept.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      {hiddenCount > 0 ? (
                        <div className="pt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() =>
                              setExpandedKeywordCategories((prev) => ({
                                ...prev,
                                [category]: true,
                              }))
                            }
                          >
                            {isZh ? "显示" : "Show"}{hiddenCount} {isZh ? "个更多于" : "more in"}{category}
                          </Button>
                        </div>
                      ) : isExpanded && items.length > 6 ? (
                        <div className="pt-3">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs"
                            onClick={() =>
                              setExpandedKeywordCategories((prev) => ({
                                ...prev,
                                [category]: false,
                              }))
                            }
                          >
                            {isZh ? "折叠" : "Collapse"}{category}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedFilteredArtifacts.map((artifact) => {
            const typeMeta = ARTIFACT_TYPE_META[artifact.type];
            const stepMeta = STEP_META[artifact.sourceStep];
            const displayTitle = resolveDraftDisplayTitle(artifact);
            const literatureTags = deriveLiteratureTags(artifact);
            return (
              <Dialog key={artifact.id}>
                <DialogTrigger asChild>
                  <div
                    className={cn(
                      "artifact-card p-4 border rounded-xl transition-all cursor-pointer group",
                      packMode && selectedForPack.has(artifactPackToken(artifact.id)) && "border-cyan-400/60 bg-cyan-500/10"
                    )}
                    onClick={() => {
                      if (packMode) { togglePackSelect(artifactPackToken(artifact.id)); return; }
                      setSelectedArtifact(artifact.id);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {packMode && (
                          <span className="shrink-0 text-cyan-400">
                            {selectedForPack.has(artifactPackToken(artifact.id))
                              ? <CheckSquare className="w-4 h-4" />
                              : <Square className="w-4 h-4 text-slate-500" />}
                          </span>
                        )}
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-2 py-0.5",
                            typeMeta.bgColor,
                            typeMeta.color
                          )}
                        >
                          {typeMeta.label}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        {artifact.sourceStep === 1 && <Target className="w-3 h-3 inline mr-0.5" />}
                        {artifact.sourceStep === 2 && <Search className="w-3 h-3 inline mr-0.5" />}
                        {artifact.sourceStep === 3 && <BookOpen className="w-3 h-3 inline mr-0.5" />}
                        {artifact.sourceStep === 4 && <Network className="w-3 h-3 inline mr-0.5" />}
                        {artifact.sourceStep === 5 && <MapIcon className="w-3 h-3 inline mr-0.5" />}
                        {artifact.sourceStep === 6 && <PenLine className="w-3 h-3 inline mr-0.5" />}
                        {isZh ? "步骤" : "Step"}{artifact.sourceStep}
                      </span>
                    </div>
                    <h4 className="artifact-card-title text-sm font-medium text-slate-200 mb-1 transition-colors line-clamp-2">
                      {displayTitle}
                    </h4>
                    {artifact.type === "visualization" && visualThumbUrls[artifact.id] ? (
                      <a
                        href={visualThumbUrls[artifact.id]}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mb-3 block overflow-hidden rounded-md border border-slate-700/50 bg-slate-900/40"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img
                          src={visualThumbUrls[artifact.id]}
                          alt={displayTitle}
                          className="h-28 w-full object-cover"
                          loading="lazy"
                        />
                      </a>
                    ) : null}
                    {artifact.type === "entry-paper" && (literatureTags.isEntry || literatureTags.isExpanded) && (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {literatureTags.isEntry ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-500/60 text-emerald-300">
                            {isZh ? "入口文献" : "Entry"}</Badge>
                        ) : null}
                        {literatureTags.isExpanded ? (
                          <Badge variant="outline" className="text-[10px] border-cyan-500/60 text-cyan-300">
                            {isZh ? "扩展文献" : "Expanded"}</Badge>
                        ) : null}
                      </div>
                    )}
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {artifact.description}
                    </p>
                    {(artifact.type === "entry-paper" ||
                      artifact.type === "literature-note" ||
                      artifact.type === "permanent-note") && (
                      <button
                        type="button"
                        className="mb-3 text-xs text-cyan-300 hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleOpenArtifactSource(artifact);
                        }}
                      >
                        {artifact.type === "entry-paper"
                          ? "Open this paper in Paper Read"
                          : "Open corresponding note in Paper Read"}
                      </button>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {artifact.updatedAt}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title={isZh ? "查看" : "View"}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title={isZh ? "编辑" : "Edit"}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        {(artifact.type === "entry-paper" ||
                          artifact.type === "literature-note" ||
                          artifact.type === "permanent-note") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            title={isZh ? "在PDF阅读器中打开" : "Open in Paper Read"}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenArtifactSource(artifact);
                            }}
                          >
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          title={isZh ? "删除" : "Delete"}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteArtifact(artifact.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="artifact-preview-dialog max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      {displayTitle}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          typeMeta.bgColor,
                          typeMeta.color
                        )}
                      >
                        {typeMeta.label}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {isZh ? "步骤" : "Step"}{artifact.sourceStep}: {stepMeta.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {artifact.description}
                    </p>
                    {artifact.type === "visualization" && visualThumbUrls[artifact.id] ? (
                      <div className="space-y-2">
                        <a
                          href={visualThumbUrls[artifact.id]}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block overflow-hidden rounded-md border border-slate-700/50 bg-slate-900/40"
                        >
                          <img
                            src={visualThumbUrls[artifact.id]}
                            alt={displayTitle}
                            className="max-h-64 w-full object-contain"
                            loading="lazy"
                          />
                        </a>
                        <a
                          href={visualThumbUrls[artifact.id]}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex text-xs text-cyan-300 hover:underline break-all"
                        >
                          {visualThumbUrls[artifact.id]}
                        </a>
                      </div>
                    ) : null}
                    {artifact.content && (
                      <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700/50">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {artifact.content}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {isZh ? "最后编辑：" : "Last edited:"}{artifact.updatedAt}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
                      {(artifact.type === "entry-paper" ||
                        artifact.type === "literature-note" ||
                        artifact.type === "permanent-note") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="app-btn-compact"
                          onClick={() => void handleOpenArtifactSource(artifact)}
                        >
                          <ArrowRight className="w-3 h-3 mr-1" />
                          {artifact.type === "entry-paper"
                            ? "Open Paper Read Page"
                            : "Open Corresponding Note"}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" title={isZh ? "查看" : "View"}>
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" title={isZh ? "编辑" : "Edit"}>
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        title={isZh ? "删除" : "Delete"}
                        onClick={() => void handleDeleteArtifact(artifact.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
          </div>
        )}

        {((filter === "concepts" && filteredConcepts.length === 0) ||
          (filter !== "concepts" && filteredArtifacts.length === 0)) && (
          <div className="text-center py-16">
            <Archive className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {filter === "concepts"
                ? "No keywords found matching your criteria"
                : "No artifacts found matching your criteria"}
            </p>
          </div>
        )}

        <Dialog open={showPackDialog} onOpenChange={setShowPackDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">{isZh ? "创建产集" : "Create Artifact Package"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">{isZh ? "产集名称" : "Package Name"}</label>
                <Input
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  placeholder={isZh ? "例如 RL 起始套件" : "e.g. RL Draft Starter Kit"}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">{isZh ? "描述" : "Description"}</label>
                <Textarea
                  value={packDescription}
                  onChange={(e) => setPackDescription(e.target.value)}
                  placeholder={isZh ? "这个产集包含什么内容，其他人何时应该使用它？" : "What does this package contain and when should others use it?"}
                  className="text-sm min-h-[90px]"
                />
              </div>
              <div className="p-2 rounded border border-slate-700/50 bg-slate-900/40 text-xs text-slate-400">
                {isZh ? `已选项目：${totalPackSelectionCount}` : `Selected items: ${totalPackSelectionCount}`}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="app-btn-primary app-btn-xs"
                  disabled={!packName.trim() || totalPackSelectionCount === 0}
                  onClick={handleCreatePackage}
                >
                  <Share2 className="w-3 h-3 mr-1" />
                  {isZh ? "分享产集" : "Share Package"}</Button>
                <Button size="sm" variant="ghost" className="app-btn-xs" onClick={() => setShowPackDialog(false)}>
                  {isZh ? "取消" : "Cancel"}</Button>
                {packSaved && <span className="text-xs text-emerald-500">{isZh ? "产集已分享。" : "Package shared."}</span>}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showAddPaperDialog}
          onOpenChange={(open) => {
            setShowAddPaperDialog(open);
            if (!open) resetAddPaperForm();
          }}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{isZh ? "添加入口文献" : "Add Entry Paper"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{isZh ? "DOI 或 URL（可选）" : "DOI or URL (optional)"}</label>
                <div className="flex gap-2">
                  <Input value={newPaperDoiUrl} onChange={(e) => setNewPaperDoiUrl(e.target.value)} placeholder={isZh ? isZh ? isZh ? "https://doi.org/..." : "https://doi.org/..." : "https://doi.org/..." : "https://doi.org/..."} className="text-sm" />
                  <Button type="button" variant="outline" className="app-btn-xs" disabled={doiFetching || !newPaperDoiUrl.trim()} onClick={() => void handleFetchByDoiUrl()}>
                    <Sparkles className="w-3 h-3 mr-1" />
                    {doiFetching ? "Fetching..." : "Auto-fill"}
                  </Button>
                </div>
                {doiFetchError ? <p className="text-[11px] text-rose-500">{doiFetchError}</p> : null}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{isZh ? "标题" : "Title"}</label>
                <Input value={newPaperTitle} onChange={(e) => setNewPaperTitle(e.target.value)} placeholder={isZh ? "论文标题..." : "Paper title..."} className="text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{isZh ? "作者（逗号分隔）" : "Authors (comma-separated)"}</label>
                <Input value={newPaperAuthors} onChange={(e) => setNewPaperAuthors(e.target.value)} placeholder={isZh ? "作者1, 作者2..." : "Author 1, Author 2..."} className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{isZh ? "年份" : "Year"}</label>
                  <Input type="number" value={newPaperYear} onChange={(e) => setNewPaperYear(e.target.value)} placeholder="2024" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{isZh ? "期刊" : "Journal"}</label>
                  <Input value={newPaperJournal} onChange={(e) => setNewPaperJournal(e.target.value)} placeholder={isZh ? "期刊名称..." : "Journal name..."} className="text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{isZh ? "发现路径" : "Discovery Path"}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {DISCOVERY_PATH_OPTIONS.map((path) => (
                    <label
                      key={path}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all",
                        newPaperDiscoveryPath === path
                          ? "border-cyan-400 bg-cyan-50/50"
                          : "border-slate-700/50 hover:border-slate-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="new-paper-discovery-artifact-center"
                        checked={newPaperDiscoveryPath === path}
                        onChange={() => setNewPaperDiscoveryPath(path)}
                        className="accent-cyan-600"
                      />
                      {path}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{isZh ? "发现笔记" : "Discovery Note"}</label>
                <Textarea value={newPaperDiscoveryNote} onChange={(e) => setNewPaperDiscoveryNote(e.target.value)} rows={2} placeholder={isZh ? "你是如何找到这篇论文的？" : "How did you find this paper?"} className="text-xs" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button className="app-btn-primary app-btn-xs" onClick={() => void handleAddEntryPaper()}>
                  <Plus className="w-3 h-3 mr-1" />
                  {isZh ? "发现笔记" : "Add Paper"}</Button>
                <Button variant="ghost" className="app-btn-xs" onClick={() => setShowAddPaperDialog(false)}>
                  {isZh ? "取消" : "Cancel"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showAddMultiplePaperDialog}
          onOpenChange={(open) => {
            setShowAddMultiplePaperDialog(open);
            if (!open) setBulkDoiInput("");
          }}
        >
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{isZh ? "添加多篇入口文献" : "Add Multiple Entry Papers"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{isZh ? "DOI 链接（每行一个）" : "DOI links (one per line)"}</label>
                <Textarea
                  value={bulkDoiInput}
                  onChange={(e) => setBulkDoiInput(e.target.value)}
                  rows={8}
                  placeholder={"https://doi.org/10.xxxx/xxxx\n10.1145/1234567"}
                  className="text-xs font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="app-btn-primary app-btn-xs"
                  onClick={() => void handleAddMultipleEntryPapers()}
                  disabled={bulkImporting || !bulkDoiInput.trim()}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {bulkImporting ? "Importing..." : "Import by DOI"}
                </Button>
                <Button variant="ghost" className="app-btn-xs" onClick={() => setShowAddMultiplePaperDialog(false)}>
                  {isZh ? "取消" : "Cancel"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showConceptDialog} onOpenChange={setShowConceptDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">
                {conceptDialogMode === "edit" ? "Edit Keyword" : "Keyword Details"}
              </DialogTitle>
            </DialogHeader>
            {selectedConcept ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">{isZh ? "关键词名称" : "Keyword Name"}</label>
                  <Input
                    value={conceptForm.name}
                    onChange={(e) => setConceptForm((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={conceptDialogMode === "view"}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">{isZh ? "描述" : "Description"}</label>
                  <Input
                    value={conceptForm.description}
                    onChange={(e) => setConceptForm((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={conceptDialogMode === "view"}
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">{isZh ? "类别" : "Category"}</label>
                    <Input
                      value={conceptForm.category}
                      onChange={(e) => setConceptForm((prev) => ({ ...prev, category: e.target.value }))}
                      disabled={conceptDialogMode === "view"}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">{isZh ? "颜色" : "Color"}</label>
                    <input
                      type="color"
                      value={conceptForm.color}
                      onChange={(e) => setConceptForm((prev) => ({ ...prev, color: e.target.value }))}
                      disabled={conceptDialogMode === "view"}
                      className="w-full h-9 rounded border border-slate-300"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  {conceptDialogMode === "edit" ? (
                    <Button
                      className="app-btn-primary app-btn-xs"
                      onClick={handleSaveConcept}
                    >
                      {isZh ? "保存" : "Save"}</Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="app-btn-xs"
                    onClick={() => {
                      setShowConceptDialog(false);
                      setSelectedConceptId(null);
                    }}
                  >
                    {conceptDialogMode === "edit" ? "Cancel" : "Close"}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}