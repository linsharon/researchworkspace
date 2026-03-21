import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { ScrollMode, type Plugin, Viewer, ViewMode, Worker } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { conceptAPI, highlightAPI, noteAPI, type Highlight } from "@/lib/manuscript-api";

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
}: PdfViewerProps) {
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

  const handlePageChange = (nextPage: number) => {
    const bounded =
      typeof totalPages === "number"
        ? Math.min(Math.max(nextPage, 1), totalPages)
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
      }, 0);
    },
    [closeSelectionMenu, resolvedPage]
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
      } catch (error) {
        console.error("Failed to save highlight:", error);
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

  const handleTranslate = () => {
    if (!selectionState.text.trim()) {
      return;
    }

    setViewerState(prev => ({ ...prev, annotationMode: "translate" }));
    setTranslatedText(`翻译结果（占位）\n\n${selectionState.text}\n\n这段文本的中文解释将在这里展示。`);
  };

  const handleExplain = () => {
    if (!selectionState.text.trim()) {
      return;
    }

    setViewerState(prev => ({ ...prev, annotationMode: "explain" }));
    const prompt = `Explain this text: ${selectionState.text}`;
    onAskAiSelection?.(prompt, selectionState.page);
    clearSelectionState();
  };

  const handleOpenConceptDialog = () => {
    if (!selectionState.text.trim()) {
      return;
    }

    setViewerState(prev => ({ ...prev, annotationMode: "concept" }));
    setConceptTitle(selectionState.text.slice(0, 60));
    setConceptDescription(selectionState.text);
    setShowConceptDialog(true);
  };

  const handleSaveConcept = async () => {
    if (!conceptTitle.trim()) {
      return;
    }

    try {
      await conceptAPI.create({
        title: conceptTitle.trim(),
        description: selectionState.text,
        definition: conceptDescription.trim() || undefined,
        project_id: projectId,
      });
    } catch (error) {
      console.error("Failed to persist concept to API:", error);
    }

    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(CONCEPTS_STORAGE_KEY);
      const concepts = saved ? JSON.parse(saved) : [];
      const next = [
        ...concepts,
        {
          id: `concept-${Date.now()}`,
          name: conceptTitle.trim(),
          description: conceptDescription.trim() || selectionState.text,
          category: "Concept",
          color: "#f59e0b",
        },
      ];
      window.localStorage.setItem(CONCEPTS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(CONCEPTS_UPDATED_EVENT));
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
      className={cn("flex h-full min-h-[420px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white", className)}
      ref={containerRef}
    >
      {showTitleBar ? (
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          {title}
        </div>
      ) : null}

      {showToolbar ? (
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Page {resolvedPage} / {typeof totalPages === "number" ? totalPages : "--"} · Zoom {resolvedZoom}% · {citationsText} · {referencesText}
        </div>
      ) : null}

      <div className="relative flex-1 bg-white">
        {pdfUrl ? (
          <div className="h-full min-h-0 overflow-y-auto overflow-x-auto bg-white p-2">
            <Worker workerUrl={PDF_WORKER_URL}>
              <Viewer
                fileUrl={viewerUrl}
                defaultScale={resolvedZoom / 100}
                pageLayout={pageLayout}
                plugins={[selectionPlugin]}
                scrollMode={ScrollMode.Vertical}
                viewMode={ViewMode.SinglePage}
                onDocumentLoad={() => {
                  setIsDocumentLoaded(true);
                  setLoadError(null);
                }}
                onPageChange={(event: any) => handlePageChange((event?.currentPage ?? 0) + 1)}
                onZoom={(event: any) => {
                  const scale = event?.scale ?? 1;
                  applyZoom(Math.round(scale * 100));
                }}
                renderLoader={(percentages: number) => (
                  <div className="flex h-full min-h-[420px] items-center justify-center bg-slate-50 px-6 text-center">
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-700">Loading PDF...</div>
                      <div className="text-xs text-slate-500">{Math.round(percentages)}%</div>
                    </div>
                  </div>
                )}
                renderError={() => {
                  window.setTimeout(() => setLoadError("Failed to render PDF preview."), 0);
                  return (
                    <div className="flex h-full min-h-[420px] items-center justify-center px-6 text-center text-sm text-slate-500">
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
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-slate-50/80 backdrop-blur-[1px]">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
              Loading PDF viewer...
            </div>
          </div>
        ) : null}

        {loadError ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-50 px-6 text-center">
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
          <div className="absolute bottom-4 right-4 z-20 max-w-sm rounded-xl border border-emerald-200 bg-white/95 p-4 shadow-xl backdrop-blur">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <Sparkles className="h-4 w-4" />
              Translate (EN -&gt; CN)
            </div>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{translatedText}</p>
            <div className="mt-3 flex justify-end">
              <Button onClick={() => setTranslatedText(null)} size="sm" type="button" variant="outline">
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={showNoteEditor} onOpenChange={setShowNoteEditor}>
        <DialogContent className="max-w-3xl bg-transparent p-0 shadow-none border-none">
          <LiteratureNoteForm
            initialValue={{
              title: "",
              doiOrUrl: doi || scholarUrl || "",
              pageNumber: String(selectionState.page || resolvedPage),
              contentGist: "",
              originalQuote: selectionState.text || viewerState.selectedText,
              keywords: [],
            }}
            onSubmit={handleSaveLiteratureNote}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showConceptDialog} onOpenChange={setShowConceptDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Save As Concept</DialogTitle>
            <DialogDescription>
              Placeholder save flow: this will add the concept to Artifact Center -&gt; Concepts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {selectionState.text || viewerState.selectedText}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Concept Title</label>
              <Input onChange={event => setConceptTitle(event.target.value)} value={conceptTitle} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Description</label>
              <Textarea
                className="min-h-[120px]"
                onChange={event => setConceptDescription(event.target.value)}
                value={conceptDescription}
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowConceptDialog(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveConcept} type="button">
              Save Concept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
