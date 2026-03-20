/**
 * Paper Reading Area - Left side
 * Title section (collapsible) + PDF reader area
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Upload, FileText } from "lucide-react";
import type { Paper, Highlight } from "@/lib/manuscript-api";
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

      <div className="flex-1 overflow-auto">
        {pdfContent ? (
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
              <Button className="gap-2 mt-4">
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
