/**
 * Paper Reading Area - Left side
 * Title section (collapsible) + PDF reader area
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
  Download,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Paper, Highlight } from "@/lib/manuscript-api";
import { paperAPI } from "@/lib/manuscript-api";
import { pdfAPI } from "@/lib/pdf-api";
import PDFHighlightReader from "./PDFHighlightReader";

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
  onHighlightCreated,
  onNoteCreated,
  onConceptCreated,
  onAskAI,
}: PaperReadingAreaProps) {
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [pdfContent, setPdfContent] = useState<string>("");
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // Show demo PDF for papers that have pdf_path, otherwise show upload state.
  useEffect(() => {
    setPdfContent(paper.pdf_path ? "dummy" : "");
  }, [paper.pdf_path, paper.id]);

  const handleUploadPDF = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        // Upload PDF to server
        const uploadRes = await pdfAPI.upload(file);
        // Update paper with PDF path
        await paperAPI.update(paper.id, {
          pdf_path: uploadRes.filename,
        });
        // Signal that paper changed
        onChanged();
        // Update local state to show PDF
        setPdfContent("dummy");
      } catch (error) {
        console.error('PDF upload failed:', error);
        alert('Failed to upload PDF. Please try again.');
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
      await pdfAPI.delete(paper.pdf_path);
      await paperAPI.update(paper.id, {
        pdf_path: undefined,
      });
      onChanged();
      setPdfContent("");
    } catch (error) {
      console.error("Failed to delete PDF:", error);
      alert("Failed to delete PDF. Please try again.");
    }
  };

  const handleAddHighlight = (highlight: Highlight) => {
    setHighlights((prev) => [...prev, highlight]);
    onChanged();
    onHighlightCreated?.(highlight);
  };

  const handleNoteCreated = () => {
    onChanged();
    onNoteCreated?.();
  };

  const handleConceptCreated = () => {
    onChanged();
    onConceptCreated?.();
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="border-b">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-none px-6 py-4 h-auto"
          onClick={() => setTitleExpanded(!titleExpanded)}
        >
          <div className="flex-1 text-left">
            <div className="font-semibold">{paper.title}</div>
            {!titleExpanded && (
              <div className="text-xs text-gray-600 mt-1">Click to expand details</div>
            )}
          </div>
          {titleExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {titleExpanded && (
          <div className="px-6 py-4 space-y-3 bg-gray-50">
            <div>
              <p className="text-xs font-semibold text-gray-600">Authors</p>
              <p className="text-sm text-gray-900">{paper.authors?.join(", ") || "N/A"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600">Year</p>
                <p className="text-sm text-gray-900">{paper.year || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600">Journal</p>
                <p className="text-sm text-gray-900">{paper.journal || "N/A"}</p>
              </div>
            </div>

            {paper.discovery_path && (
              <div>
                <p className="text-xs font-semibold text-gray-600">Discovery Path</p>
                <Badge variant="outline" className="mt-1">
                  {paper.discovery_path}
                </Badge>
              </div>
            )}

            {paper.discovery_note && (
              <div>
                <p className="text-xs font-semibold text-gray-600">Discovery Note</p>
                <p className="text-sm text-gray-700 italic">{paper.discovery_note}</p>
              </div>
            )}

            {paper.abstract && (
              <div>
                <p className="text-xs font-semibold text-gray-600">Abstract</p>
                <p className="text-sm text-gray-700 line-clamp-4">{paper.abstract}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto flex flex-col">
        {pdfContent && paper.pdf_path ? (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-3 py-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Eye className="h-4 w-4" />
                <span className="text-sm font-medium">PDF Viewer</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  className="gap-2"
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
                  <Download className="h-4 w-4" />
                  Download
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={handleReplacePDF}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Replace PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={handleDeletePDF}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <iframe
                src={pdfAPI.viewUrl(paper.pdf_path)}
                title={`${paper.title} PDF`}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        ) : pdfContent ? (
          <PDFHighlightReader
            content={pdfContent}
            highlights={highlights}
            onAddHighlight={handleAddHighlight}
            paperId={paper.id}
            projectId={projectId}
            onNoteCreated={handleNoteCreated}
            onConceptCreated={handleConceptCreated}
            onAskAI={onAskAI}
          />
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
