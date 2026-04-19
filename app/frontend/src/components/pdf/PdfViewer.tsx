import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ScrollMode, type Plugin, Viewer, Worker } from "@react-pdf-viewer/core";
import { thumbnailPlugin } from "@react-pdf-viewer/thumbnail";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/thumbnail/lib/styles/index.css";

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
import { conceptAPI, highlightAPI, noteAPI, type Highlight, type Paper } from "@/lib/manuscript-api";

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

  const thumbnailPluginInstance = useMemo(() => thumbnailPlugin(), []);
  const { Thumbnails } = thumbnailPluginInstance;

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

    await noteAPI.create({
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

    try {
      await conceptAPI.create({
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
        id: `concept-${Date.now()}`,
        name: conceptTitle.trim(),
        description: trimmedDescription || sourceText,
        category: conceptCategory,
        color: conceptColor,
        sourcePaperId: paper?.id,
        sourcePaperTitle: paper?.title,
      };

      window.localStorage.setItem(CONCEPTS_STORAGE_KEY, JSON.stringify([...globalConcepts, conceptItem]));
      window.localStorage.setItem(`rw-concepts-${projectId}`, JSON.stringify([...projectConcepts, conceptItem]));
      window.dispatchEvent(new CustomEvent(CONCEPTS_UPDATED_EVENT));
      toast.success("Keyword saved", {
        description: "Added to Artifact Center keywords.",
      });
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
    if (!pdfUrl || isDocumentLoaded || loadError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setLoadError("PDF loading is taking too long. Please refresh or retry.");
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [pdfUrl, isDocumentLoaded, loadError]);

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
              <Thumbnails />
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
                plugins={[selectionPlugin, thumbnailPluginInstance]}
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
    </section>
  );
}
