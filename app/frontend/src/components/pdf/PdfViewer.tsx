import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

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
}

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
}: PdfViewerProps) {
  const [internalPage, setInternalPage] = useState(Math.max(initialPage, 1));
  const [internalZoom, setInternalZoom] = useState(initialZoom);

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

  const viewerUrl = useMemo(() => {
    if (!pdfUrl) return "";
    return `${pdfUrl}#page=${resolvedPage}&zoom=${resolvedZoom}`;
  }, [pdfUrl, resolvedPage, resolvedZoom]);

  return (
    <section className={cn("flex h-full min-h-[420px] flex-col overflow-hidden rounded-md border border-slate-300 bg-white", className)}>
      {showTitleBar ? (
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          {title}
        </div>
      ) : null}

      <div className="relative flex-1 bg-slate-100">
        {pdfUrl ? (
          <iframe
            className="h-full w-full border-0"
            src={viewerUrl}
            title="PDF document"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
            No PDF source provided yet.
          </div>
        )}
      </div>
    </section>
  );
}
