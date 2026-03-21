import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquarePlus, Highlighter, Bot } from "lucide-react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PdfViewerProps {
  pdfUrl?: string;
  title?: string;
  totalPages?: number;
  showTitleBar?: boolean;
  initialPage?: number;
  initialZoom?: number;
  currentPage?: number;
  zoom?: number;
  doi?: string;
  scholarUrl?: string;
  citationsText?: string;
  referencesText?: string;
  className?: string;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
  onReferencesClick?: () => void;
  onHighlightSelection?: (text: string, page: number) => void;
  onAddNoteSelection?: (text: string, page: number) => void;
  onAskAiSelection?: (text: string, page: number) => void;
}

interface SelectionMenuState {
  visible: boolean;
  text: string;
  page: number;
  x: number;
  y: number;
}

const PDF_WORKER_URL = "/pdf.worker.min.js";

export default function PdfViewer({
  pdfUrl,
  title = "PDF Viewer",
  totalPages,
  showTitleBar = true,
  initialPage = 1,
  initialZoom = 100,
  currentPage,
  zoom,
  doi,
  scholarUrl,
  citationsText = "Citations: --",
  referencesText = "References: --",
  className,
  onPageChange: onPageChangeProp,
  onZoomChange,
  onReferencesClick,
  onHighlightSelection,
  onAddNoteSelection,
  onAskAiSelection,
}: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [internalPage, setInternalPage] = useState(Math.max(initialPage, 1));
  const [internalZoom, setInternalZoom] = useState(initialZoom);
  const [isDocumentLoaded, setIsDocumentLoaded] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenuState>({
    visible: false,
    text: "",
    page: 1,
    x: 0,
    y: 0,
  });

  const resolvedPage = currentPage ?? internalPage;
  const resolvedZoom = zoom ?? internalZoom;

  const handlePageChange = (nextPage: number) => {
    const bounded =
      typeof totalPages === "number"
        ? Math.min(Math.max(nextPage, 1), totalPages)
        : Math.max(nextPage, 1);
    if (typeof onPageChangeProp === "function") {
      onPageChangeProp(bounded);
      return;
    }
    setInternalPage(bounded);
  };

  const applyZoom = (nextZoom: number) => {
    const bounded = Math.min(Math.max(nextZoom, 30), 300);
    if (typeof onZoomChange === "function") {
      onZoomChange(bounded);
      return;
    }
    setInternalZoom(bounded);
  };

  const closeSelectionMenu = useCallback(() => {
    setSelectionMenu(prev => ({ ...prev, visible: false }));
  }, []);

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

        const menuX = rect.left - containerRect.left + rect.width / 2;
        const menuY = rect.top - containerRect.top - 10;

        setSelectionMenu({
          visible: true,
          text: selectedText,
          page: detectedPage,
          x: menuX,
          y: menuY,
        });
      }, 0);
    },
    [closeSelectionMenu, resolvedPage]
  );

  const viewerUrl = useMemo(() => {
    if (!pdfUrl) return "";
    return pdfUrl;
  }, [pdfUrl]);

  const basePdfUrl = useMemo(() => {
    if (!pdfUrl) return "";
    return pdfUrl;
  }, [pdfUrl]);

  useEffect(() => {
    setIsDocumentLoaded(false);
    setUseIframeFallback(false);
  }, [pdfUrl]);

  useEffect(() => {
    if (!pdfUrl || isDocumentLoaded || useIframeFallback) {
      return;
    }

    const timer = window.setTimeout(() => {
      setUseIframeFallback(true);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [pdfUrl, isDocumentLoaded, useIframeFallback]);

  return (
    <section
      className={cn("flex h-full min-h-[420px] flex-col overflow-hidden rounded-md border border-slate-300 bg-white", className)}
      ref={containerRef}
    >
      {showTitleBar ? (
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          {title}
        </div>
      ) : null}

      <div className="relative flex-1 bg-slate-100">
        {pdfUrl && !useIframeFallback ? (
          <div className="h-full" onMouseUpCapture={handleSelectionEvent}>
            <Worker workerUrl={PDF_WORKER_URL}>
              <Viewer
                fileUrl={viewerUrl}
                onDocumentLoad={() => {
                  setIsDocumentLoaded(true);
                }}
                onPageChange={(event: any) => handlePageChange((event?.currentPage ?? 0) + 1)}
                onZoom={(event: any) => {
                  const scale = event?.scale ?? 1;
                  applyZoom(Math.round(scale * 100));
                }}
                renderError={() => {
                  window.setTimeout(() => setUseIframeFallback(true), 0);
                  return (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
                      PDF preview failed. Switching to native viewer...
                    </div>
                  );
                }}
              />
            </Worker>
          </div>
        ) : pdfUrl ? (
          <iframe
            className="h-full w-full border-0"
            src={basePdfUrl}
            title="PDF document"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
            No PDF source provided yet.
          </div>
        )}

        {selectionMenu.visible ? (
          <div
            className="absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-1.5 py-1 text-white shadow-lg"
            onMouseDown={event => event.preventDefault()}
            style={{ left: selectionMenu.x, top: selectionMenu.y }}
          >
            <Button
              className="h-7 gap-1 px-2 text-xs text-slate-100 hover:bg-slate-700"
              onClick={() => {
                onHighlightSelection?.(selectionMenu.text, selectionMenu.page);
                closeSelectionMenu();
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Highlighter className="h-3.5 w-3.5" />
              Highlight
            </Button>

            <Button
              className="h-7 gap-1 px-2 text-xs text-slate-100 hover:bg-slate-700"
              onClick={() => {
                onAddNoteSelection?.(selectionMenu.text, selectionMenu.page);
                closeSelectionMenu();
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Add Note
            </Button>

            <Button
              className="h-7 gap-1 px-2 text-xs text-slate-100 hover:bg-slate-700"
              onClick={() => {
                onAskAiSelection?.(selectionMenu.text, selectionMenu.page);
                closeSelectionMenu();
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Bot className="h-3.5 w-3.5" />
              Ask AI
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
