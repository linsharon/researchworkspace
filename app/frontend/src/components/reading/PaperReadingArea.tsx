/**
 * Paper Reading Area - Left side
 * Title section (collapsible) + PDF reader area
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { Paper, Highlight } from "@/lib/manuscript-api";
import { paperAPI } from "@/lib/manuscript-api";
import PdfViewer from "@/components/pdf/PdfViewer";

interface PaperReadingAreaProps {
  paper: Paper;
  projectId?: string;
  onChanged: () => void;
  onTextSelected?: (text: string) => void;
  onHighlightCreated?: (highlight: Highlight) => void;
  onNoteCreated?: () => void;
  onConceptCreated?: () => void;
  onAskAI?: (text: string) => void;
}

export default function PaperReadingArea({
  paper,
  projectId = "proj-1",
  onChanged,
  onTextSelected,
  onHighlightCreated,
  onNoteCreated,
  onConceptCreated,
  onAskAI,
}: PaperReadingAreaProps) {
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string | null>(null);
  const [resolvingPdfUrl, setResolvingPdfUrl] = useState(false);

  useEffect(() => {
    setTitleExpanded(false);
  }, [paper.pdf_path]);

  useEffect(() => {
    let cancelled = false;
    let nextObjectUrl: string | null = null;

    const resolveUrl = async () => {
      if (!paper.pdf_path) {
        setResolvedPdfUrl(null);
        return;
      }

      try {
        setResolvingPdfUrl(true);
        const url = await paperAPI.getPdfBlobUrl(paper.id);
        nextObjectUrl = url;
        if (!cancelled) {
          setResolvedPdfUrl(url);
        }
      } catch (error) {
        console.error("Failed to resolve storage PDF URL:", error);
        if (!cancelled) {
          setResolvedPdfUrl(null);
        }
      } finally {
        if (!cancelled) {
          setResolvingPdfUrl(false);
        }
      }
    };

    void resolveUrl();

    return () => {
      cancelled = true;
      if (nextObjectUrl) {
        paperAPI.revokePdfObjectUrl(nextObjectUrl);
      }
    };
  }, [paper.id, paper.pdf_path]);

  const handleUploadPDF = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,application/pdf";
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        await paperAPI.uploadPdf(paper.id, file);
        onChanged();
      } catch (error) {
        console.error("PDF upload failed:", error);
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          "Failed to upload PDF. Please try again.";
        alert(message);
      }
    };
    input.click();
  };

  const handleReplacePDF = async () => {
    await handleUploadPDF();
  };

  const handleDeletePDF = async () => {
    if (!paper.pdf_path) return;
    const confirmed = window.confirm("Delete current PDF file from this paper?");
    if (!confirmed) return;

    try {
      await paperAPI.deletePdf(paper.id);
      onChanged();
    } catch (error) {
      console.error("Failed to delete PDF:", error);
      alert("Failed to delete PDF. Please try again.");
    }
  };

  return (
    <div className="h-full bg-[#0d1b30] flex flex-col">
      {/* Title section temporarily hidden to maximize PDF display area */}
      <>
        {/* Hidden title section - uncomment to restore */}
        {/* <div className="border-b bg-[#0d1b30] px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start rounded px-0 h-auto"
            onClick={() => setTitleExpanded(!titleExpanded)}
          >
            <div className="flex-1 text-left">
              <div className="font-medium text-slate-200 line-clamp-1">{paper.title}</div>
              {!titleExpanded ? (
                <div className="text-xs text-slate-500 mt-1">Show paper details</div>
              ) : null}
            </div>
            {titleExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {titleExpanded ? (
            <div className="mt-2 rounded border border-slate-700/50 bg-slate-800/40 p-3 text-xs text-slate-600 space-y-1.5">
              <p><span className="font-semibold">Authors:</span> {paper.authors?.join(", ") || "N/A"}</p>
              <p><span className="font-semibold">Year:</span> {paper.year || "N/A"}</p>
              <p><span className="font-semibold">Journal:</span> {paper.journal || "N/A"}</p>
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {paper.pdf_path ? (
              <>
                <Button
                  className="h-8 text-xs"
                  onClick={() => {
                    const url = pdfAPI.downloadUrl(paper.pdf_path!);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = paper.pdf_path!;
                    link.click();
                  }}
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>

                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleReplacePDF}>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Replace
                </Button>

                <Button size="sm" variant="outline" className="h-8 text-xs text-rose-600" onClick={handleDeletePDF}>
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              </>
            ) : (
              <Button className="gap-2 h-8 text-xs" onClick={handleUploadPDF}>
                <Upload className="h-3.5 w-3.5" />
                Upload PDF
              </Button>
            )}
          </div>
        </div> */}
      </>

      <div className="flex-1 overflow-hidden flex flex-col">
        {paper.pdf_path ? (
          <div className="flex-1 min-h-0 p-2">
            {resolvingPdfUrl ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Resolving PDF URL...
              </div>
            ) : resolvedPdfUrl ? (
              <PdfViewer
                className="h-full rounded-lg border border-slate-700/50"
                onAskAiSelection={text => {
                  onTextSelected?.(text);
                  onAskAI?.(text);
                }}
                onConceptCreated={() => {
                  onChanged();
                  onConceptCreated?.();
                }}
                onHighlightCreated={highlight => {
                  onChanged();
                  onTextSelected?.(highlight.text);
                  onHighlightCreated?.(highlight);
                }}
                onNoteCreated={() => {
                  onChanged();
                  onNoteCreated?.();
                }}
                onSelectionChange={text => onTextSelected?.(text)}
                paperId={paper.id}
                pdfUrl={resolvedPdfUrl}
                projectId={projectId}
                showTitleBar={false}
                showToolbar={false}
                title={paper.pdf_path}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-rose-400">
                Failed to resolve PDF preview URL.
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4 px-6">
              <FileText className="h-16 w-16 mx-auto text-gray-300" />
              <div>
                <h3 className="font-semibold text-gray-700">No PDF Available</h3>
                <p className="text-sm text-gray-600 mt-1">
                  This paper does not have an attached PDF yet. Upload one to start annotation.
                </p>
              </div>
              <Button className="gap-2 mt-4" onClick={handleUploadPDF}>
                <Upload className="h-4 w-4" />
                Upload PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
