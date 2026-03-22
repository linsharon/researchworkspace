/**
 * Paper Reading Page - Main component
 * PDF-first layout: large reading area + collapsible notes panel + floating AI chat
 */

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, ChevronLeft, Bot, X, Minimize2, Send, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
  const [searchParams] = useSearchParams();
  const focusNoteId = searchParams.get("noteId") || undefined;

  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasChanged, setHasChanged] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<"Reading" | "Completed" | "To Read">("Reading");
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(0);

  // Floating AI chat
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([
    { id: "welcome", role: "assistant", content: "Hello! I'm the LitFlow AI Assistant. Ask me anything about this paper or your research." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat]);

  const handleSendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    const userMsg = { id: `msg-${Date.now()}`, role: "user" as const, content: trimmed };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setTimeout(() => {
      setChatMessages((prev) => [...prev, {
        id: `msg-${Date.now()}-ai`,
        role: "assistant" as const,
        content: "Thank you for your question! In a production environment I would analyze the paper and respond accordingly. For now, try refining your research question or exploring related concepts.",
      }]);
    }, 1000);
  };

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

  const extractDoi = (input?: string | null) => {
    if (!input) return null;
    const doiMatch = input.match(/\b10\.\d{4,9}\/[^\s"<>]+/i);
    return doiMatch ? doiMatch[0].replace(/[.,;)>]+$/, "") : null;
  };

  const buildAccessiblePaperLookupUrl = (title?: string, doi?: string | null) => {
    const raw = (doi || title || "").trim();
    if (!raw) return undefined;
    return `https://scholar.google.com/scholar?q=${encodeURIComponent(raw)}`;
  };

  const isRestrictedIndexerUrl = (url?: string | null) => {
    if (!url) return false;
    return /webofscience\.com|webofknowledge\.com|scopus\.com/i.test(url);
  };

  const resolveOriginalPaperUrl = (input?: string | null, title?: string) => {
    const normalizedInput = (input || "").trim();
    const doi = extractDoi(normalizedInput);
    if (doi) {
      return `https://doi.org/${encodeURIComponent(doi)}`;
    }

    if (/^https?:\/\//i.test(normalizedInput) && !isRestrictedIndexerUrl(normalizedInput)) {
      return normalizedInput;
    }

    return buildAccessiblePaperLookupUrl(title, doi);
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

  const originalPaperUrl = resolveOriginalPaperUrl(paper.url, paper.title);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b bg-[#0d1b30] flex-shrink-0">
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
              {originalPaperUrl ? (
                <a
                  href={originalPaperUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xl font-bold line-clamp-1 text-slate-100 hover:text-blue-700 hover:underline"
                >
                  <span className="line-clamp-1">{paper.title}</span>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              ) : (
                <h1 className="text-xl font-bold line-clamp-1">{paper.title}</h1>
              )}
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
        {/* Left: Reading Area - takes all remaining space */}
        <div className="flex-1 border-r overflow-hidden flex flex-col min-w-0 min-h-0">
          <PaperReadingArea
            paper={paper}
            projectId={projectId}
            onChanged={() => setHasChanged(true)}
            onHighlightCreated={() => setHighlightPulse((prev) => prev + 1)}
            onNoteCreated={() => loadPaper()}
            onConceptCreated={() => loadPaper()}
            onAskAI={text => {
              setChatInput(`Selected text:\n"${text}"\n\nQuestion: `);
              setShowChat(true);
            }}
          />
        </div>

        {/* Right: Notes panel - collapsible */}
        <div className={`transition-all duration-300 overflow-hidden border-l bg-[#0d1b30] flex flex-col ${toolsExpanded ? 'w-[300px]' : 'w-12'}`}>
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
                highlightPulse={highlightPulse}
                focusNoteId={focusNoteId}
                onChanged={() => setHasChanged(true)}
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

      {/* Floating AI Assistant */}
      {showChat && (
        <div className="fixed bottom-20 right-5 z-50 w-[380px] max-h-[520px] bg-[#0d1b30] rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-violet-700 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#0d1b30]/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI Assistant</p>
                <p className="text-[10px] text-white/60">LitFlow Literature Review</p>
              </div>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="w-7 h-7 rounded-full hover:bg-[#0d1b30]/10 flex items-center justify-center transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-violet-700 text-white rounded-br-md"
                        : "bg-slate-800 text-slate-700 rounded-bl-md"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-3 border-t border-slate-700/50 shrink-0 bg-[#0d1b30]">
            <div className="flex items-center gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about this paper..."
                className="text-sm h-9 rounded-full px-4 border-slate-700/50 focus-visible:ring-[#1E3A5F]"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendMessage(); } }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all",
                  chatInput.trim() ? "bg-violet-700 text-white hover:bg-violet-800" : "bg-slate-800 text-slate-300 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className={cn(
          "fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200",
          showChat ? "bg-slate-600 hover:bg-slate-700" : "bg-violet-700 hover:bg-violet-800 hover:scale-105"
        )}
        title="AI Assistant"
      >
        {showChat ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <Bot className="w-6 h-6 text-white" />
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
          </>
        )}
      </button>
    </div>
  );
}
