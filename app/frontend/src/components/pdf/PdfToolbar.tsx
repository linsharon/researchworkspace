import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export interface PdfToolbarProps {
  currentPage: number;
  totalPages?: number;
  zoom: number;
  doi?: string;
  scholarUrl?: string;
  citationsText?: string;
  referencesText?: string;
  onPageChange: (page: number) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onReferencesClick?: () => void;
}

export default function PdfToolbar({
  currentPage,
  totalPages,
  zoom,
  doi,
  scholarUrl,
  citationsText = "Citations: --",
  referencesText = "References: --",
  onPageChange,
  onPrevPage,
  onNextPage,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onReferencesClick,
}: PdfToolbarProps) {
  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const submitPageInput = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(currentPage));
      return;
    }
    const bounded =
      typeof totalPages === "number"
        ? Math.min(Math.max(parsed, 1), totalPages)
        : Math.max(parsed, 1);
    onPageChange(bounded);
  };

  const resolvedScholarUrl =
    scholarUrl ??
    (doi
      ? `https://scholar.google.com/scholar?q=${encodeURIComponent(doi)}`
      : "#");

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-[#f1f3f4] px-3 py-2">
      <div className="flex items-center rounded-md border border-slate-300 bg-white">
        <Button
          className="h-8 w-8 p-0"
          disabled={currentPage <= 1}
          onClick={onPrevPage}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1 px-2">
          <Input
            className="h-7 w-14 text-center text-xs"
            onBlur={submitPageInput}
            onChange={event => setPageInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitPageInput();
              }
            }}
            value={pageInput}
          />
          <span className="text-xs text-slate-600">/ {typeof totalPages === "number" ? totalPages : "--"}</span>
        </div>

        <Button
          className="h-8 w-8 p-0"
          disabled={typeof totalPages === "number" ? currentPage >= totalPages : false}
          onClick={onNextPage}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center rounded-md border border-slate-300 bg-white px-1">
        <Button className="h-8 w-8 p-0" onClick={onZoomOut} size="sm" type="button" variant="ghost">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="w-14 text-center text-xs text-slate-700">{zoom}%</span>
        <Button className="h-8 w-8 p-0" onClick={onZoomIn} size="sm" type="button" variant="ghost">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button className="h-8 px-2 text-xs" onClick={onZoomReset} size="sm" type="button" variant="ghost">
          <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      <Separator className="mx-1 hidden h-6 md:block" orientation="vertical" />

      <a
        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        href={resolvedScholarUrl}
        rel="noreferrer"
        target="_blank"
      >
        <Search className="h-3.5 w-3.5" />
        Google Scholar
        <ExternalLink className="h-3 w-3" />
      </a>

      <div className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">
        {citationsText}
      </div>

      <Button
        className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700 hover:bg-slate-50"
        onClick={onReferencesClick}
        size="sm"
        type="button"
        variant="ghost"
      >
        {referencesText}
      </Button>
    </div>
  );
}
