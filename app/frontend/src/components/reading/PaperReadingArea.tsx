/**
 * Paper Reading Area - Left side
 * Title section (collapsible) + PDF reader area
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload,
  FileText,
  Download,
  Eye,
  X,
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
  const [viewerOpen, setViewerOpen] = useState(true);

  useEffect(() => {
    setViewerOpen(!!paper.pdf_path);
  }, [paper.pdf_path]);

  const handleUploadPDF = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,application/pdf";
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const uploadRes = await pdfAPI.upload(file);
        await paperAPI.update(paper.id, {
          pdf_path: uploadRes.filename,
        });
        setViewerOpen(true);
        onChanged();
      } catch (error) {
        console.error("PDF upload failed:", error);
        alert("Failed to upload PDF. Please try again.");
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
      setViewerOpen(false);
      onChanged();
    } catch (error) {
      console.error("Failed to delete PDF:", error);
      alert("Failed to delete PDF. Please try again.");
    }
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col">
        {paper.pdf_path ? (
          <Card className="flex-1 flex flex-col min-h-0 border-slate-200">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                <span className="truncate">{paper.pdf_path}</span>
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    className="h-7 text-xs"
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

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setViewerOpen(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7 px-2">
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
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-2 min-h-0">
              {viewerOpen ? (
                <iframe
                  key={paper.pdf_path}
                  src={pdfAPI.viewUrl(paper.pdf_path)}
                  title={paper.pdf_path}
                  className="w-full h-full rounded border border-slate-200 min-h-[500px]"
                  style={{ height: "calc(100vh - 260px)" }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20 border border-slate-200 rounded">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm">Select a file from the list to view it here</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4 h-8 text-xs"
                    onClick={() => setViewerOpen(true)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Open PDF
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
