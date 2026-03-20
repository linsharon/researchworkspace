/**
 * Paper Reading Page - Main component
 * 3:1 layout: 2/3 for reading area, 1/3 for tools area (collapsible)
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronRight, ChevronLeft } from "lucide-react";
import { paperAPI } from "@/lib/manuscript-api";
import type { Paper } from "@/lib/manuscript-api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import PaperReadingArea from "./PaperReadingArea";
import PaperToolsArea from "./PaperToolsArea";

export default function PaperReadPage() {
  const { projectId = "proj-1", paperId } = useParams<{ projectId: string; paperId: string }>();
  const navigate = useNavigate();

  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChanged, setHasChanged] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"Reading" | "Completed" | "To Read">("Reading");
  const [toolsExpanded, setToolsExpanded] = useState(true);
  const [highlightedText, setHighlightedText] = useState<string>("");
  const [highlights, setHighlights] = useState<any[]>([]);
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [aiChatText, setAiChatText] = useState<string>("");

  useEffect(() => {
    loadPaper();
  }, [paperId]);

  // Auto-set status to Reading when entering
  useEffect(() => {
    if (paper) {
      setSelectedStatus(paper.reading_status as any);
    }
  }, [paper]);

  const loadPaper = async () => {
    if (!paperId) return;
    try {
      setLoading(true);
      const data = await paperAPI.get(paperId);
      setPaper(data);
    } catch (error) {
      console.error("Failed to load paper:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    status: "Reading" | "Completed" | "To Read"
  ) => {
    if (!paper) return;

    if (status === "Completed") {
      // Show relevance dialog
      // This will be handled in a separate dialog component
      setSelectedStatus(status);
      return;
    }

    try {
      const updated = await paperAPI.update(paper.id, {
        reading_status: status,
      });
      setPaper(updated);
      setHasChanged(false);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleBack = () => {
    if (hasChanged) {
      setShowExitDialog(true);
    } else {
      navigate(`/workflow/${projectId}/3`);
    }
  };

  const handleExitConfirm = async () => {
    if (!paper) return;

    try {
      await paperAPI.update(paper.id, {
        reading_status: selectedStatus,
      });
    } catch (error) {
      console.error("Failed to save status:", error);
    }

    navigate(`/workflow/${projectId}/3`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Loading paper...</p>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600">Paper not found</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white flex-shrink-0">
        <div className="max-w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold line-clamp-1">{paper.title}</h1>
              <p className="text-sm text-gray-600">{paper.authors?.join(", ")}</p>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Status:</span>
            <Select value={selectedStatus} onValueChange={(value) => 
              handleStatusChange(value as "Reading" | "Completed" | "To Read")
            }>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Reading">Reading</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="To Read">To Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content - reader-first layout */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Reading Area (2/3 - 66.67%) */}
        <div className="flex-2 border-r overflow-auto flex flex-col">
          <PaperReadingArea
            paper={paper}
            projectId={projectId}
            onChanged={() => setHasChanged(true)}
            onHighlightCreated={(highlight) => {
              setHighlights([...highlights, highlight]);
              setHighlightedText(highlight.text);
            }}
            onNoteCreated={() => loadPaper()}
            onConceptCreated={() => loadPaper()}
            onAskAI={(text) => {
              setAiChatText(text);
              setAiChatVisible(true);
            }}
          />
        </div>

        {/* Right: Tools Area - narrower drawer */}
        <div className={`transition-all duration-300 overflow-hidden border-l bg-white flex flex-col ${toolsExpanded ? 'w-[360px]' : 'w-12'}`}>
          {/* Toggle Button */}
          <div className="flex-shrink-0 h-12 border-b flex items-center justify-start px-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setToolsExpanded(!toolsExpanded)}
              className="p-1 h-auto"
              title={toolsExpanded ? "Collapse" : "Expand"}
            >
              {toolsExpanded ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Tools Content */}
          {toolsExpanded && (
            <div className="flex-1 overflow-auto flex flex-col">
              <PaperToolsArea
                paper={paper}
                projectId={projectId}
                highlightedText={highlightedText}
                onChanged={() => setHasChanged(true)}
                aiChatVisible={aiChatVisible}
                onAiChatVisibleChange={setAiChatVisible}
                aiChatInitialText={aiChatText}
              />
            </div>
          )}
        </div>
      </div>

      {/* Exit Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Reading</AlertDialogTitle>
            <AlertDialogDescription>
              What's your reading status for this paper?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 my-4">
            {["Reading", "To Read", "Completed"].map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? "default" : "outline"}
                onClick={() => setSelectedStatus(status as any)}
              >
                {status}
              </Button>
            ))}
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleExitConfirm}>
              Save & Exit
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
