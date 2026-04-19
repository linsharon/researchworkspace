import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ScrollMode, type Plugin, Viewer, Worker } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FloatingAnnotationMenu from "@/components/pdf/FloatingAnnotationMenu";
import { LiteratureNoteForm, type LiteratureNote } from "@/components/reading/LiteratureNoteForm";
import { conceptAPI, highlightAPI, noteAPI, type Concept, type Highlight, type Note, type Paper } from "@/lib/manuscript-api";

export interface PdfViewerProps {
  pdfUrl?: string;
  title?: string;
  totalPages?: number;
  showTitleBar?: boolean;
  showToolbar?: boolean;
  initialPage?: number;
  initialZoom?: number;
  currentPage?: number;
  zoom?: number;
  doi?: string;
  scholarUrl?: string;
  citationsText?: string;
  referencesText?: string;
  className?: string;
  paperId?: string;
  projectId?: string;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
  onReferencesClick?: () => void;
  onHighlightCreated?: (highlight: Highlight) => void;
  onNoteCreated?: () => void;
  onConceptCreated?: () => void;
  onAskAiSelection?: (text: string, page: number) => void;
  onSelectionChange?: (text: string, page: number) => void;
  paper?: Paper;
}

export type AnnotationMode = "idle" | "highlight" | "note" | "translate" | "explain" | "concept";

export interface PdfViewerState {
  currentPage: number;
  zoomLevel: number;
  selectedText: string;
  annotationMode: AnnotationMode;
}

interface SelectionRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface SelectionState {
  visible: boolean;
  text: string;
  page: number;
  x: number;
  y: number;
  rects: SelectionRect[];
}

const PDF_WORKER_URL = "/pdf.worker.min.js";
const CONCEPTS_STORAGE_KEY = "rw-concepts";
const CONCEPTS_UPDATED_EVENT = "concepts-updated";
const HIGHLIGHTS_UPDATED_EVENT = "highlights-updated";
const NOTES_UPDATED_EVENT = "notes-updated";

type AnnotationBandType = "highlight" | "note" | "concept";

interface AnnotationBandMarker {
  id: string;
  type: AnnotationBandType;
  page: number;
  label: string;
  color: string;
  text?: string;
  highlight?: Highlight;
  note?: Note;
  concept?: Concept;
}

interface ConceptDefinitionMeta {
  category?: string;
  color?: string;
  selectedText?: string;
  sourcePaper?: {
    id?: string;
  };
  sourcePaperId?: string;
  page?: number;
}

interface LiteratureNoteContentMeta {
  formType?: string;
  originalQuote?: string;
}

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();

const parseJsonObject = <T extends Record<string, unknown>>(value?: string): T | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as T) : null;
  } catch {
    return null;
  }
};

const hexToRgba = (hexColor: string, alpha: number) => {
  const cleaned = hexColor.replace("#", "");
  const expanded = cleaned.length === 3
    ? cleaned.split("").map((char) => `${char}${char}`).join("")
    : cleaned;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  if ([red, green, blue].some((n) => Number.isNaN(n))) {
    return hexColor;
  }
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export default function PdfViewer({
  pdfUrl,
  title = "PDF Viewer",
  totalPages,
  showTitleBar = true,
  showToolbar = false,
  initialPage = 1,
  initialZoom = 100,
  currentPage,
  zoom,
  doi,
  scholarUrl,
  citationsText = "Citations: --",
  referencesText = "References: --",
  className,
  paperId,
  projectId = "proj-1",
  onPageChange: onPageChangeProp,
  onZoomChange,
  onReferencesClick,
  onHighlightCreated,
  onNoteCreated,
  onConceptCreated,
  onAskAiSelection,
  onSelectionChange,
  paper,
}: PdfViewerProps) {

  const CONCEPT_COLORS = [
    { value: "#22d3ee", label: "Cyan" },
    { value: "#6366f1", label: "Indigo" },
    { value: "#8b5cf6", label: "Violet" },
    { value: "#ec4899", label: "Pink" },
    { value: "#f97316", label: "Orange" },
    { value: "#10b981", label: "Emerald" },
    { value: "#0ea5e9", label: "Sky" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#ef4444", label: "Red" },
  ];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewerState, setViewerState] = useState<PdfViewerState>({
    currentPage: Math.max(initialPage, 1),
    zoomLevel: initialZoom,
    selectedText: "",
    annotationMode: "idle",
  });
  const [isDocumentLoaded, setIsDocumentLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    visible: false,
    text: "",
    page: 1,
    x: 0,
    y: 0,
    rects: [],
  });
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [showConceptDialog, setShowConceptDialog] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [conceptTitle, setConceptTitle] = useState("");
  const [conceptDescription, setConceptDescription] = useState("");
  const [conceptCategory, setConceptCategory] = useState("Concept");
  const [conceptColor, setConceptColor] = useState("#22d3ee");
  const [documentPageCount, setDocumentPageCount] = useState<number>(totalPages ?? 0);
  const [pageThumbnails, setPageThumbnails] = useState<Array<string | null>>([]);
  const [thumbnailsLoading, setThumbnailsLoading] = useState(false);
  const [highlightsForBands, setHighlightsForBands] = useState<Highlight[]>([]);
  const [notesForBands, setNotesForBands] = useState<Note[]>([]);
  const [conceptsForBands, setConceptsForBands] = useState<Concept[]>([]);
  const [selectedBand, setSelectedBand] = useState<AnnotationBandMarker | null>(null);

  const pageLayout = useMemo(
    () => ({
      buildPageStyles: () => ({
        margin: "0 auto 12px auto",
        boxShadow: "none",
      }),
    }),
    []
  );

  const resolvedPage = currentPage ?? viewerState.currentPage;
  const resolvedZoom = zoom ?? viewerState.zoomLevel;
  const resolvedTotalPages = totalPages ?? documentPageCount;
  const annotationMapRef = useRef(new Map<string, AnnotationBandMarker>());

  const conceptBands = useMemo<AnnotationBandMarker[]>(() => {
    return conceptsForBands
      .map((concept) => {
        const parsed = parseJsonObject<ConceptDefinitionMeta>(concept.definition);

        const sourcePaperId = parsed?.sourcePaper?.id || parsed?.sourcePaperId;
        if (!paperId || !sourcePaperId || sourcePaperId !== paperId) {
          return null;
        }

        const selectedText = (parsed?.selectedText || "").trim();
        const page = typeof parsed?.page === "number" && parsed.page > 0 ? parsed.page : null;
        if (!page || selectedText.length < 8) {
          return null;
        }

        return {
          id: `concept-${concept.id}`,
          type: "concept" as const,
          page,
          label: concept.title,
          color: parsed?.color || "#a78bfa",
          text: selectedText,
          concept,
        };
      })
      .filter((item): item is AnnotationBandMarker => Boolean(item));
  }, [conceptsForBands, paperId]);

  const noteBands = useMemo<AnnotationBandMarker[]>(() => {
    return notesForBands
      .map((note) => {
        const content = parseJsonObject<LiteratureNoteContentMeta>(note.content);
        const quote = (content?.originalQuote || "").trim();
        const page = typeof note.page === "number" && note.page > 0 ? note.page : null;
        if (note.note_type !== "literature-note" || !page || quote.length < 8) {
          return null;
        }

        return {
          id: `note-${note.id}`,
          type: "note" as const,
          page,
          label: note.title,
          color: "#38bdf8",
          text: quote,
          note,
        };
      })
      .filter((item): item is AnnotationBandMarker => Boolean(item));
  }, [notesForBands]);

  const highlightBands = useMemo<AnnotationBandMarker[]>(() => {
    return highlightsForBands
      .map((item) => {
        const page = typeof item.page === "number" && item.page > 0 ? item.page : null;
        const text = (item.text || "").trim();
        if (!page || text.length < 8) {
          return null;
        }

        return {
          id: `highlight-${item.id}`,
          type: "highlight" as const,
          page,
          label: text.slice(0, 42),
          color: "#facc15",
          text,
          highlight: item,
        };
      })
      .filter((item): item is AnnotationBandMarker => Boolean(item));
  }, [highlightsForBands]);

  const annotationBands = useMemo(() => {
    return [...highlightBands, ...noteBands, ...conceptBands].sort((left, right) => {
      if (left.page !== right.page) {
        return left.page - right.page;
      }
      const typeOrder: Record<AnnotationBandType, number> = {
        highlight: 0,
        note: 1,
        concept: 2,
      };
      return typeOrder[left.type] - typeOrder[right.type];
    });
  }, [conceptBands, highlightBands, noteBands]);

  useEffect(() => {
    annotationMapRef.current = new Map(annotationBands.map((item) => [item.id, item]));
  }, [annotationBands]);

  const handlePageChange = (nextPage: number) => {
    const bounded =
      typeof resolvedTotalPages === "number" && resolvedTotalPages > 0
        ? Math.min(Math.max(nextPage, 1), resolvedTotalPages)
        : Math.max(nextPage, 1);
    if (typeof onPageChangeProp === "function") {
      onPageChangeProp(bounded);
      return;
    }
    setViewerState(prev => ({ ...prev, currentPage: bounded }));
  };

  const jumpToPage = useCallback((page: number) => {
    const boundedPage = Math.max(1, Math.min(page, resolvedTotalPages || page));
    const target = containerRef.current?.querySelector(`[data-testid="core__page-layer-${boundedPage - 1}"]`);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    handlePageChange(boundedPage);
  }, [resolvedTotalPages]);

  const applyZoom = (nextZoom: number) => {
    const bounded = Math.min(Math.max(nextZoom, 30), 300);
    if (typeof onZoomChange === "function") {
      onZoomChange(bounded);
      return;
    }
    setViewerState(prev => ({ ...prev, zoomLevel: bounded }));
  };

  const closeSelectionMenu = useCallback(() => {
    setSelectionState(prev => ({ ...prev, visible: false }));
    setViewerState(prev => ({ ...prev, selectedText: "", annotationMode: "idle" }));
  }, []);

  const clearBrowserSelection = () => {
    window.getSelection()?.removeAllRanges();
  };

  const clearSelectionState = useCallback(() => {
    clearBrowserSelection();
    closeSelectionMenu();
  }, [closeSelectionMenu]);

  const handleSelectionEvent = useCallback(
    () => {
      window.setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim() ?? "";

        if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !selectedText) {
          closeSelectionMenu();
          return;
        }

        const range = selection.getRangeAt(0);
        const container = containerRef.current;
        if (!container || !container.contains(range.commonAncestorContainer)) {
          closeSelectionMenu();
          return;
        }

        const node =
          range.commonAncestorContainer instanceof Element
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement;
        const pageLayer = node?.closest("[data-testid^='core__page-layer-']");
        const pageMatch = pageLayer?.getAttribute("data-testid")?.match(/core__page-layer-(\d+)/);
        const detectedPage = pageMatch ? Number.parseInt(pageMatch[1], 10) + 1 : resolvedPage;

        const rect = range.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          closeSelectionMenu();
          return;
        }

        const rects = Array.from(range.getClientRects())
          .filter(clientRect => clientRect.width > 0 && clientRect.height > 0)
          .map(clientRect => ({
            left: clientRect.left - containerRect.left,
            top: clientRect.top - containerRect.top,
            width: clientRect.width,
            height: clientRect.height,
          }));

        const menuX = rect.left - containerRect.left + rect.width / 2;
        const menuY = rect.top - containerRect.top - 10;

        setSelectionState({
          visible: true,
          text: selectedText,
          page: detectedPage,
          x: menuX,
          y: menuY,
          rects,
        });
        setViewerState(prev => ({
          ...prev,
          selectedText: selectedText,
          annotationMode: "idle",
        }));
        onSelectionChange?.(selectedText, detectedPage);
      }, 0);
    },
    [closeSelectionMenu, onSelectionChange, resolvedPage]
  );

  const selectionPlugin = useMemo<Plugin>(
    () => ({
      onTextLayerRender: (props) => {
        const textLayerEle = props.ele;
        if (!textLayerEle || textLayerEle.getAttribute("data-selection-bound") === "true") {
          return;
        }

        textLayerEle.setAttribute("data-selection-bound", "true");
        textLayerEle.addEventListener("mouseup", handleSelectionEvent);
      },
    }),
    [handleSelectionEvent]
  );

  const handleHighlight = async () => {
    if (!selectionState.text.trim()) {
      return;
    }

    setViewerState(prev => ({ ...prev, annotationMode: "highlight" }));

    if (paperId) {
      try {
        const savedHighlight = await highlightAPI.create({
          paper_id: paperId,
          text: selectionState.text,
          page: selectionState.page,
          color: "yellow",
        });
        setHighlightsForBands((prev) => [...prev, savedHighlight]);
        onHighlightCreated?.(savedHighlight);
        window.dispatchEvent(new CustomEvent(HIGHLIGHTS_UPDATED_EVENT));
        toast.success("Highlight saved", {
          description: "Added to Highlights tab.",
        });
      } catch (error) {
        console.error("Failed to save highlight:", error);
        toast.error("Save failed", {
          description: "Unable to save this highlight.",
        });
      }
    }

    clearSelectionState();
  };

  const handleAddNote = () => {
    if (!selectionState.text.trim()) {
      return;
    }

    setViewerState(prev => ({ ...prev, annotationMode: "note" }));
    setShowNoteEditor(true);
  };

  const handleSaveLiteratureNote = async (note: LiteratureNote) => {
    if (!paperId) {
      setShowNoteEditor(false);
      clearSelectionState();
      return;
    }

    const parsedPage = Number.parseInt(note.pageNumber, 10);

    const savedNote = await noteAPI.create({
      paper_id: paperId,
      project_id: projectId,
      title: note.title.trim() || `Literature Note ${Date.now()}`,
      description: note.contentGist.trim() || note.originalQuote.trim().slice(0, 180),
      note_type: "literature-note",
      page: Number.isNaN(parsedPage) ? selectionState.page : parsedPage,
      keywords: note.keywords,
      citations: [],
      content: JSON.stringify(
        {
          formType: "LiteratureNoteForm",
          ...note,
        },
        null,
        2
      ),
    });

    setNotesForBands((prev) => [...prev, savedNote]);
    window.dispatchEvent(new CustomEvent("notes-updated"));
    onNoteCreated?.();
    setShowNoteEditor(false);
    clearSelectionState();
  };

  const handleTranslate = async () => {
    if (!selectionState.text.trim()) {
      return;
    }

    setViewerState(prev => ({ ...prev, annotationMode: "translate" }));
    setTranslatedText("正在翻译为中文...");

    const textToTranslate = selectionState.text;

    // Primary translator: Google Translate public endpoint (no API key required).
    const translateWithGoogle = async (text: string): Promise<string> => {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Google Translate HTTP ${res.status}`);
      const data = await res.json();
      // Response shape: [ [ ["translated", "original", ...], ... ], ... ]
      const segments: string[] = (data[0] as [string, string, unknown, unknown][])
        .map(seg => seg[0])
        .filter(Boolean);
      return segments.join("");
    };

    // Fallback translator: MyMemory public translation API (no API key required).
    const translateWithMyMemory = async (text: string): Promise<string> => {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|zh-CN`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

      const data = (await res.json()) as {
        responseData?: { translatedText?: string };
      };
      const translated = data.responseData?.translatedText?.trim() || "";
      if (!translated) {
        throw new Error("MyMemory returned empty translation");
      }
      return translated;
    };

    try {
      try {
        const translated = await translateWithGoogle(textToTranslate);
        setTranslatedText(translated || "翻译失败：未返回有效内容。");
      } catch (googleError) {
        console.warn("Google Translate unavailable, falling back to MyMemory:", googleError);
        const fallback = await translateWithMyMemory(textToTranslate);
        setTranslatedText(fallback || "翻译失败：未返回有效内容。");
      }
    } catch (error) {
      console.error("Failed to translate text with public translators:", error);
      setTranslatedText("翻译失败：当前公共翻译服务不可用，请稍后重试。");
    }

    clearSelectionState();
  };

  const handleExplain = () => {
    if (!selectionState.text.trim()) {
      return;
    }

    setViewerState(prev => ({ ...prev, annotationMode: "explain" }));
    onAskAiSelection?.(selectionState.text, selectionState.page);
    clearSelectionState();
  };

  const handleOpenConceptDialog = () => {
    if (!selectionState.text.trim()) {
      return;
    }

    setViewerState(prev => ({ ...prev, annotationMode: "concept" }));
    setConceptTitle(selectionState.text.slice(0, 60));
    setConceptDescription(selectionState.text);
    setConceptCategory("Concept");
    setConceptColor("#22d3ee");
    setShowConceptDialog(true);
  };

  const handleSaveConcept = async () => {
    if (!conceptTitle.trim()) {
      return;
    }

    const trimmedDescription = conceptDescription.trim();
    const sourceText = selectionState.text.trim();

    const keywordMeta = {
      category: conceptCategory,
      color: conceptColor,
      selectedText: sourceText,
      page: selectionState.page,
      note: trimmedDescription || undefined,
      sourcePaper: paper
        ? {
            id: paper.id,
            title: paper.title,
            authors: paper.authors,
            year: paper.year,
            journal: paper.journal,
            url: paper.url,
          }
        : undefined,
    };

    let savedConcept: Concept | null = null;

    try {
      savedConcept = await conceptAPI.create({
        title: conceptTitle.trim(),
        description: trimmedDescription || sourceText,
        definition: JSON.stringify(keywordMeta),
        project_id: projectId,
      });
    } catch (error) {
      console.error("Failed to persist concept to API:", error);
    }

    if (typeof window !== "undefined") {
      const savedGlobal = window.localStorage.getItem(CONCEPTS_STORAGE_KEY);
      const globalConcepts = savedGlobal ? JSON.parse(savedGlobal) : [];
      const savedProject = window.localStorage.getItem(`rw-concepts-${projectId}`);
      const projectConcepts = savedProject ? JSON.parse(savedProject) : [];

      const conceptItem = {
        id: savedConcept?.id || `concept-${Date.now()}`,
        name: conceptTitle.trim(),
        description: trimmedDescription || sourceText,
        category: conceptCategory,
        color: conceptColor,
        sourcePaperId: paper?.id,
        sourcePaperTitle: paper?.title,
        page: selectionState.page,
        selectedText: sourceText,
      };

      window.localStorage.setItem(CONCEPTS_STORAGE_KEY, JSON.stringify([...globalConcepts, conceptItem]));
      window.localStorage.setItem(`rw-concepts-${projectId}`, JSON.stringify([...projectConcepts, conceptItem]));
      window.dispatchEvent(new CustomEvent(CONCEPTS_UPDATED_EVENT));
      toast.success("Keyword saved", {
        description: "Added to Artifact Center keywords.",
      });
    }

    if (savedConcept) {
      setConceptsForBands((prev) => [...prev, savedConcept as Concept]);
    }

    onConceptCreated?.();
    setShowConceptDialog(false);
    clearSelectionState();
  };

  const viewerUrl = useMemo(() => {
    if (!pdfUrl) return "";
    return pdfUrl;
  }, [pdfUrl]);

  useEffect(() => {
    setIsDocumentLoaded(false);
    setLoadError(null);
  }, [pdfUrl]);

  useEffect(() => {
    if (!viewerUrl) {
      setPageThumbnails([]);
      setThumbnailsLoading(false);
      return;
    }

    let cancelled = false;
    let loadingTask: ReturnType<typeof getDocument> | null = null;

    const renderThumbnails = async () => {
      try {
        setThumbnailsLoading(true);
        GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
        loadingTask = getDocument(viewerUrl);
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setDocumentPageCount(pdf.numPages);
        setPageThumbnails(Array.from({ length: pdf.numPages }, () => null));

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 0.18 });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) {
            continue;
          }

          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: context, viewport }).promise;

          if (cancelled) {
            break;
          }

          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.72);
          setPageThumbnails((prev) => {
            const next = prev.length === pdf.numPages ? [...prev] : Array.from({ length: pdf.numPages }, () => null);
            next[pageNumber - 1] = thumbnailUrl;
            return next;
          });
        }
      } catch (error) {
        console.error("Failed to render PDF thumbnails:", error);
      } finally {
        if (!cancelled) {
          setThumbnailsLoading(false);
        }
      }
    };

    void renderThumbnails();

    return () => {
      cancelled = true;
      void loadingTask?.destroy();
    };
  }, [viewerUrl]);

  useEffect(() => {
    if (!paperId) {
      setHighlightsForBands([]);
      setNotesForBands([]);
      return;
    }

    let cancelled = false;

    const loadAnnotationData = async () => {
      try {
        const [highlights, notes] = await Promise.all([
          highlightAPI.list(paperId),
          noteAPI.list(paperId),
        ]);
        if (!cancelled) {
          setHighlightsForBands(highlights);
          setNotesForBands(notes);
        }
      } catch (error) {
        console.error("Failed to load annotation bands:", error);
      }
    };

    void loadAnnotationData();
    return () => {
      cancelled = true;
    };
  }, [paperId]);

  useEffect(() => {
    if (!projectId) {
      setConceptsForBands([]);
      return;
    }

    let cancelled = false;

    const loadConceptData = async () => {
      try {
        const concepts = await conceptAPI.list(projectId);
        if (!cancelled) {
          setConceptsForBands(concepts);
        }
      } catch (error) {
        console.error("Failed to load concept bands:", error);
      }
    };

    void loadConceptData();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!paperId) {
      return;
    }

    const refreshHighlightsAndNotes = async () => {
      try {
        const [highlights, notes] = await Promise.all([
          highlightAPI.list(paperId),
          noteAPI.list(paperId),
        ]);
        setHighlightsForBands(highlights);
        setNotesForBands(notes);
      } catch (error) {
        console.error("Failed to refresh note/highlight overlays:", error);
      }
    };

    window.addEventListener(HIGHLIGHTS_UPDATED_EVENT, refreshHighlightsAndNotes);
    window.addEventListener(NOTES_UPDATED_EVENT, refreshHighlightsAndNotes);
    return () => {
      window.removeEventListener(HIGHLIGHTS_UPDATED_EVENT, refreshHighlightsAndNotes);
      window.removeEventListener(NOTES_UPDATED_EVENT, refreshHighlightsAndNotes);
    };
  }, [paperId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const refreshConcepts = async () => {
      try {
        const concepts = await conceptAPI.list(projectId);
        setConceptsForBands(concepts);
      } catch (error) {
        console.error("Failed to refresh concept overlays:", error);
      }
    };

    window.addEventListener(CONCEPTS_UPDATED_EVENT, refreshConcepts);
    return () => {
      window.removeEventListener(CONCEPTS_UPDATED_EVENT, refreshConcepts);
    };
  }, [projectId]);

  useEffect(() => {
    if (!pdfUrl || isDocumentLoaded || loadError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLoadError("PDF loading is taking too long. Please refresh or retry.");
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [pdfUrl, isDocumentLoaded, loadError]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const markedNodes = Array.from(container.querySelectorAll("span[data-rw-annotation-mark='1']"));
    markedNodes.forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const originalBackground = node.dataset.rwAnnotationOriginalBackground;
      const originalRadius = node.dataset.rwAnnotationOriginalRadius;
      const originalShadow = node.dataset.rwAnnotationOriginalShadow;
      const originalCursor = node.dataset.rwAnnotationOriginalCursor;

      if (originalBackground !== undefined) node.style.backgroundColor = originalBackground;
      if (originalRadius !== undefined) node.style.borderRadius = originalRadius;
      if (originalShadow !== undefined) node.style.boxShadow = originalShadow;
      if (originalCursor !== undefined) node.style.cursor = originalCursor;

      delete node.dataset.rwAnnotationMark;
      delete node.dataset.rwAnnotationId;
      delete node.dataset.rwAnnotationOriginalBackground;
      delete node.dataset.rwAnnotationOriginalRadius;
      delete node.dataset.rwAnnotationOriginalShadow;
      delete node.dataset.rwAnnotationOriginalCursor;
    });

    if (!isDocumentLoaded || annotationBands.length === 0) {
      return;
    }

    const pageGroups = new Map<number, AnnotationBandMarker[]>();
    for (const marker of annotationBands) {
      const existing = pageGroups.get(marker.page) || [];
      existing.push(marker);
      pageGroups.set(marker.page, existing);
    }

    const findPageLayer = (page: number): HTMLElement | null => {
      const byTestId = container.querySelector(`[data-testid='core__page-layer-${page - 1}']`);
      if (byTestId instanceof HTMLElement) return byTestId;
      const fallbackLayers = Array.from(container.querySelectorAll("[data-testid^='core__page-layer-']"));
      const fallback = fallbackLayers[page - 1];
      return fallback instanceof HTMLElement ? fallback : null;
    };

    pageGroups.forEach((markers, page) => {
      const pageLayer = findPageLayer(page);
      if (!pageLayer) return;

      const textLayer = pageLayer.querySelector(".rpv-core__text-layer");
      if (!(textLayer instanceof HTMLElement)) return;

      const spans = Array.from(textLayer.querySelectorAll("span")).filter(
        (span) => span instanceof HTMLElement && normalizeText(span.textContent || "").length > 0
      ) as HTMLElement[];
      if (spans.length === 0) return;

      markers.forEach((marker) => {
        const source = normalizeText(marker.text || marker.label);
        if (source.length < 8) return;

        const anchorPrefix = source.slice(0, Math.min(28, source.length));
        const startIndex = spans.findIndex((span) => normalizeText(span.textContent || "").includes(anchorPrefix));
        if (startIndex < 0) return;

        const markCount = Math.min(4, Math.max(1, Math.ceil(source.length / 40)));
        const alpha = marker.type === "highlight" ? 0.45 : marker.type === "note" ? 0.34 : 0.30;
        const fillColor = hexToRgba(marker.color, alpha);

        for (let offset = 0; offset < markCount; offset += 1) {
          const span = spans[startIndex + offset];
          if (!span) break;
          if (span.dataset.rwAnnotationMark === "1") continue;

          span.dataset.rwAnnotationMark = "1";
          span.dataset.rwAnnotationId = marker.id;
          span.dataset.rwAnnotationOriginalBackground = span.style.backgroundColor || "";
          span.dataset.rwAnnotationOriginalRadius = span.style.borderRadius || "";
          span.dataset.rwAnnotationOriginalShadow = span.style.boxShadow || "";
          span.dataset.rwAnnotationOriginalCursor = span.style.cursor || "";

          span.style.backgroundColor = fillColor;
          span.style.borderRadius = "3px";
          span.style.boxShadow = `inset 0 -0.9em 0 ${fillColor}`;
          span.style.cursor = "pointer";
        }
      });
    });
  }, [annotationBands, isDocumentLoaded, resolvedPage, resolvedZoom, viewerUrl]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const hit = target?.closest("span[data-rw-annotation-id]") as HTMLElement | null;
      const annotationId = hit?.dataset.rwAnnotationId;
      if (!annotationId) return;
      const marker = annotationMapRef.current.get(annotationId);
      if (marker) {
        setSelectedBand(marker);
      }
    };

    container.addEventListener("click", onClick, true);
    return () => {
      container.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <section
      className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-slate-700/50 bg-[#0d1b30]", className)}
      ref={containerRef}
    >
      {showTitleBar ? (
        <div className="border-b border-slate-700/50 bg-slate-800/40 px-3 py-2 text-sm font-medium text-slate-700">
          {title}
        </div>
      ) : null}

      {showToolbar ? (
        <div className="border-b border-slate-700/50 bg-slate-800/40 px-3 py-2 text-xs text-slate-600">
          Page {resolvedPage} / {resolvedTotalPages || "--"} · Zoom {resolvedZoom}% · {citationsText} · {referencesText}
        </div>
      ) : null}

      <div className="relative flex flex-1 min-h-0 bg-[#0d1b30]">
        {resolvedTotalPages > 0 ? (
          <aside className="hidden w-28 shrink-0 border-r border-slate-700/50 bg-[#09111f] lg:flex lg:flex-col">
            <div className="border-b border-slate-700/50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Pages
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-3 [scrollbar-color:#06b6d4_#0f172a] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-900/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-500/70">
              <div className="space-y-2">
                {Array.from({ length: resolvedTotalPages }, (_, index) => {
                  const pageNumber = index + 1;
                  const isActive = pageNumber === resolvedPage;
                  const thumbnail = pageThumbnails[index];

                  return (
                    <button
                      key={pageNumber}
                      className={cn(
                        "group block w-full rounded-lg border p-2 text-left transition-all",
                        isActive
                          ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]"
                          : "border-slate-700/70 bg-[#0d1b30] hover:border-cyan-400/80 hover:bg-slate-900"
                      )}
                      onClick={() => jumpToPage(pageNumber)}
                      type="button"
                    >
                      <div className={cn(
                        "overflow-hidden rounded-md border transition-colors",
                        isActive ? "border-cyan-400/80" : "border-slate-700/60 group-hover:border-cyan-400/60"
                      )}>
                        {thumbnail ? (
                          <img alt={`Page ${pageNumber} preview`} className="block h-auto w-full bg-white" src={thumbnail} />
                        ) : (
                          <div className="flex aspect-[3/4] items-center justify-center bg-slate-950/70 text-[11px] font-medium text-slate-400">
                            {thumbnailsLoading ? "Loading..." : `Page ${pageNumber}`}
                          </div>
                        )}
                      </div>
                      <div className={cn("mt-2 text-center text-xs font-medium", isActive ? "text-cyan-400" : "text-white group-hover:text-cyan-300")}>
                        {pageNumber}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        ) : null}

        <div className="relative flex-1 min-h-0">
        {pdfUrl ? (
          <div className="pdf-scroll-host h-full min-h-0 overflow-hidden bg-[#0d1b30] p-2">
            <Worker workerUrl={PDF_WORKER_URL}>
              <Viewer
                key={resolvedZoom}
                fileUrl={viewerUrl}
                defaultScale={resolvedZoom / 100}
                pageLayout={pageLayout}
                plugins={[selectionPlugin]}
                scrollMode={ScrollMode.Vertical}
                onDocumentLoad={(event: any) => {
                  setIsDocumentLoaded(true);
                  setLoadError(null);
                  setDocumentPageCount(event?.doc?.numPages ?? totalPages ?? 0);
                }}
                onPageChange={(event: any) => handlePageChange((event?.currentPage ?? 0) + 1)}
                onZoom={(event: any) => {
                  const scale = event?.scale ?? 1;
                  applyZoom(Math.round(scale * 100));
                }}
                renderLoader={(percentages: number) => (
                  <div className="flex h-full min-h-0 items-center justify-center bg-slate-800/40 px-6 text-center">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-700">Loading PDF...</div>
                      <div className="text-xs text-slate-500">{Math.round(percentages)}%</div>
                    </div>
                  </div>
                )}
                renderError={() => {
                  window.setTimeout(() => setLoadError("Failed to render PDF preview."), 0);
                  return (
                    <div className="flex h-full min-h-0 items-center justify-center px-6 text-center text-sm text-slate-500">
                      Failed to render PDF preview.
                    </div>
                  );
                }}
              />
            </Worker>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
            No PDF source provided yet.
          </div>
        )}

        {!isDocumentLoaded && pdfUrl && !loadError ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-800/40/80 backdrop-blur-[1px]">
            <div className="rounded-lg border border-slate-700/50 bg-[#0d1b30] px-4 py-3 text-sm text-slate-600 shadow-sm">
              Loading PDF viewer...
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-800/40 px-6 text-center">
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-700">{loadError}</div>
              <Button
                onClick={() => {
                  setIsDocumentLoaded(false);
                  setLoadError(null);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : null}

        <FloatingAnnotationMenu
          isOpen={selectionState.visible}
          onAddNote={handleAddNote}
          onClose={clearSelectionState}
          onExplain={handleExplain}
          onHighlight={handleHighlight}
          onSaveConcept={handleOpenConceptDialog}
          onTranslate={handleTranslate}
          x={selectionState.x}
          y={selectionState.y}
        />

        {translatedText ? (
          <div className="absolute bottom-4 right-4 z-20 max-w-sm rounded-xl border border-cyan-500/40 bg-[#0d1b30]/95 p-4 shadow-xl backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-400">
              <Sparkles className="h-4 w-4" />
              Translate (EN -&gt; CN)
            </div>
            <p className="whitespace-pre-wrap text-sm text-white">{translatedText}</p>
            <div className="mt-3 flex justify-end">
              <Button onClick={() => setTranslatedText(null)} size="sm" type="button" variant="outline">
                Close
              </Button>
            </div>
          </div>
        ) : null}

        </div>

      </div>

      <Dialog open={showNoteEditor} onOpenChange={setShowNoteEditor}>
        <DialogContent className="max-w-3xl bg-transparent p-0 shadow-none border-none">
          <LiteratureNoteForm
            initialValue={{
              title: "",
              pageNumber: String(selectionState.page || resolvedPage),
              contentGist: "",
              originalQuote: selectionState.text || viewerState.selectedText,
              keywords: [],
            }}
            paper={paper}
            onSubmit={handleSaveLiteratureNote}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showConceptDialog} onOpenChange={setShowConceptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Keyword</DialogTitle>
            <DialogDescription className="sr-only">Save highlighted text as a keyword</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected text preview */}
            <div className="rounded-lg border border-amber-200/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              <p className="text-[10px] text-amber-400/70 mb-1 font-medium uppercase tracking-wide">Selected text</p>
              {selectionState.text || viewerState.selectedText}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">
                Keyword Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={conceptTitle}
                onChange={event => setConceptTitle(event.target.value)}
                placeholder="Enter keyword name..."
                className="text-sm"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleSaveConcept(); } }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Description</label>
              <Textarea
                value={conceptDescription}
                onChange={event => setConceptDescription(event.target.value)}
                placeholder="What does this keyword mean in your research context? Add details, definitions, or notes..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Category</label>
                <Select value={conceptCategory} onValueChange={setConceptCategory}>
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Concept">Concept</SelectItem>
                    <SelectItem value="Construct">Construct</SelectItem>
                    <SelectItem value="Theory">Theory</SelectItem>
                    <SelectItem value="Framework">Framework</SelectItem>
                    <SelectItem value="Method">Method</SelectItem>
                    <SelectItem value="Variable">Variable</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Color</label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {CONCEPT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => setConceptColor(c.value)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all",
                        conceptColor === c.value
                          ? "border-slate-300 scale-110"
                          : "border-transparent hover:border-slate-400"
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Paper metadata */}
            {paper && (
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 space-y-1">
                <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Source Paper</p>
                <p className="text-xs font-medium text-slate-200 line-clamp-2">{paper.title}</p>
                {paper.authors?.length > 0 && (
                  <p className="text-[11px] text-slate-400">{paper.authors.join(", ")}</p>
                )}
                <div className="flex gap-2 text-[11px] text-slate-500">
                  {paper.year && <span>{paper.year}</span>}
                  {paper.journal && <span>· {paper.journal}</span>}
                </div>
              </div>
            )}

            {conceptTitle.trim() && (
              <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Preview</p>
                <Badge
                  className="text-xs px-3 py-1 gap-1 border"
                  style={{ backgroundColor: `${conceptColor}18`, borderColor: `${conceptColor}55`, color: conceptColor }}
                >
                  <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                  {conceptTitle}
                  <span className="ml-1 text-[10px] opacity-70">{conceptCategory}</span>
                </Badge>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowConceptDialog(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveConcept()}
              type="button"
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
              disabled={!conceptTitle.trim()}
            >
              Save Keyword
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBand} onOpenChange={(open) => !open && setSelectedBand(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {selectedBand?.type === "highlight" && "Highlight Preview"}
              {selectedBand?.type === "note" && "Note Preview"}
              {selectedBand?.type === "concept" && "Keyword Preview"}
            </DialogTitle>
          </DialogHeader>
          {selectedBand ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Badge variant="outline">p.{selectedBand.page}</Badge>
                <Badge style={{ backgroundColor: `${selectedBand.color}22`, color: selectedBand.color }} variant="outline">
                  {selectedBand.type}
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-slate-900">{selectedBand.label}</h4>
              <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-wrap break-words">
                {selectedBand.text || selectedBand.note?.content || selectedBand.concept?.description || "No preview text available."}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
