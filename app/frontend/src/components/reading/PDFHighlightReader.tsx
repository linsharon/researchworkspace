/**
 * PDF Highlight Reader
 * Selection toolbar: highlight, add note, translate, explain, save concept
 */

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageCircle, Globe, Lightbulb, Sparkles, X } from "lucide-react";
import { highlightAPI, conceptAPI } from "@/lib/manuscript-api";
import type { Highlight } from "@/lib/manuscript-api";

interface PDFHighlightReaderProps {
  content: string;
  highlights: Highlight[];
  onAddHighlight: (highlight: Highlight) => void;
  paperId: string;
  projectId?: string;
  onNoteCreated?: () => void;
  onConceptCreated?: (concept: any) => void;
  onAskAI?: (text: string) => void;
  onTranslate?: (text: string) => void;
}

interface FloatingToolbarPosition {
  top: number;
  left: number;
}

const mockPdfContent = `
  <div class="space-y-4 p-8 text-base leading-relaxed">
    <h1 class="text-3xl font-bold mb-6">Machine Learning in Natural Language Processing</h1>
    <h2 class="text-2xl font-bold mt-8 mb-4">Abstract</h2>
    <p class="text-gray-700 leading-7">This paper presents a comprehensive study on machine learning in NLP and educational research contexts.</p>
    <h2 class="text-2xl font-bold mt-8 mb-4">1. Introduction</h2>
    <p class="text-gray-700 leading-7">Recent transformer-based architectures demonstrate strong performance improvements in semantic understanding, contextual retrieval, and reasoning-heavy tasks.</p>
    <p class="text-gray-700 leading-7 mt-4">Self-regulated learning in technology-enhanced environments remains a promising area for integrating AI support with pedagogical frameworks.</p>
    <h2 class="text-2xl font-bold mt-8 mb-4">2. Methodology</h2>
    <p class="text-gray-700 leading-7">Experiments were conducted on a benchmark dataset with cross-validation and ablation analysis to quantify model behavior.</p>
    <h2 class="text-2xl font-bold mt-8 mb-4">3. Results</h2>
    <p class="text-gray-700 leading-7">Results indicate better generalization, stronger retrieval precision, and improved explanatory consistency compared with baselines.</p>
    <h2 class="text-2xl font-bold mt-8 mb-4">4. Conclusion</h2>
    <p class="text-gray-700 leading-7">Future work should focus on explainability and practical integration in educational workflows.</p>
  </div>
`;

export default function PDFHighlightReader({
  content: externalContent,
  onAddHighlight,
  paperId,
  projectId = "proj-1",
  onNoteCreated,
  onConceptCreated,
  onAskAI,
  onTranslate,
}: PDFHighlightReaderProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [selectedText, setSelectedText] = useState("");
  const [toolbarPosition, setToolbarPosition] = useState<FloatingToolbarPosition | null>(null);
  const [showConceptDialog, setShowConceptDialog] = useState(false);
  const [conceptTitle, setConceptTitle] = useState("");
  const [conceptDescription, setConceptDescription] = useState("");
  const [conceptCategory, setConceptCategory] = useState("Concept");
  const [translation, setTranslation] = useState<string | null>(null);

  const displayContent = externalContent || mockPdfContent;

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selection.toString().trim()) {
      setToolbarPosition(null);
      setSelectedText("");
      return;
    }

    setSelectedText(selection.toString());

    try {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = contentRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setToolbarPosition({
        top: rect.top - containerRect.top - 56,
        left: Math.max(12, rect.left - containerRect.left + rect.width / 2 - 180),
      });
    } catch {
      // no-op
    }
  };

  const handleHighlight = async (color: "yellow" | "green" | "red" | "blue") => {
    if (!selectedText.trim()) return;
    try {
      const highlight = await highlightAPI.create({
        paper_id: paperId,
        text: selectedText,
        color,
      });
      onAddHighlight(highlight);
      clearSelection();
    } catch (error) {
      console.error("Failed to save highlight:", error);
    }
  };

  const handleAddNote = () => {
    if (!selectedText.trim()) return;
    onNoteCreated?.();
    clearSelection();
  };

  const handleTranslate = () => {
    const mock = `[中文翻译]\n\n选中内容:\n"${selectedText}"\n\n这是一条演示翻译结果。`;
    setTranslation(mock);
    onTranslate?.(selectedText);
  };

  const handleExplain = () => {
    onAskAI?.(selectedText);
  };

  const handleSaveConcept = async () => {
    if (!conceptTitle.trim() || !selectedText.trim()) return;
    try {
      const concept = await conceptAPI.create({
        title: conceptTitle,
        description: selectedText,
        definition: conceptDescription || undefined,
        project_id: projectId,
      });
      onConceptCreated?.(concept);
      setShowConceptDialog(false);
      setConceptTitle("");
      setConceptDescription("");
      setConceptCategory("Concept");
      clearSelection();
    } catch (error) {
      console.error("Failed to save concept:", error);
    }
  };

  const clearSelection = () => {
    setSelectedText("");
    setToolbarPosition(null);
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div className="h-full bg-[#0d1b30] relative">
      <div
        ref={contentRef}
        className="h-full overflow-auto select-text prose prose-sm max-w-none px-8 py-6"
        onMouseUp={handleTextSelection}
        dangerouslySetInnerHTML={{ __html: displayContent }}
      />

      {selectedText && toolbarPosition && (
        <div
          className="fixed bg-[#0d1b30] rounded-lg shadow-2xl border border-gray-300 p-2.5 flex gap-1 z-50"
          style={{
            top: `${toolbarPosition.top}px`,
            left: `${Math.min(toolbarPosition.left, window.innerWidth - 390)}px`,
          }}
        >
          <TooltipProvider>
            <div className="flex gap-1.5">
              {(["yellow", "green", "red", "blue"] as const).map((c) => (
                <Tooltip key={c}>
                  <TooltipTrigger asChild>
                    <button
                      className={`w-7 h-7 rounded border-2 hover:opacity-80 ${
                        c === "yellow"
                          ? "bg-yellow-300 border-yellow-500"
                          : c === "green"
                          ? "bg-green-300 border-green-500"
                          : c === "red"
                          ? "bg-red-300 border-red-500"
                          : "bg-blue-300 border-blue-500"
                      }`}
                      onClick={() => handleHighlight(c)}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{c}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            <div className="w-px bg-gray-200" />

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1.5 hover:bg-gray-100 rounded" onClick={handleAddNote}>
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Add Note</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1.5 hover:bg-gray-100 rounded" onClick={handleTranslate}>
                  <Globe className="h-4 w-4 text-green-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Translate</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1.5 hover:bg-gray-100 rounded" onClick={handleExplain}>
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Explain</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Dialog open={showConceptDialog} onOpenChange={setShowConceptDialog}>
                  <button className="p-1.5 hover:bg-gray-100 rounded" onClick={() => setShowConceptDialog(true)}>
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </button>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Add Concept</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="p-3 bg-violet-50 border border-violet-200 rounded text-sm italic text-violet-900">"{selectedText}"</div>
                      <Input value={conceptTitle} onChange={(e) => setConceptTitle(e.target.value)} placeholder="Concept title" />
                      <Select value={conceptCategory} onValueChange={setConceptCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Concept">Concept</SelectItem>
                          <SelectItem value="Theory">Theory</SelectItem>
                          <SelectItem value="Framework">Framework</SelectItem>
                          <SelectItem value="Method">Method</SelectItem>
                          <SelectItem value="Finding">Finding</SelectItem>
                          <SelectItem value="Variable">Variable</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        value={conceptDescription}
                        onChange={(e) => setConceptDescription(e.target.value)}
                        placeholder="Definition or description"
                        className="h-24"
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowConceptDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveConcept}>Save Concept</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </TooltipTrigger>
              <TooltipContent>Save as Concept</TooltipContent>
            </Tooltip>

            <div className="w-px bg-gray-200" />
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="p-1.5 hover:bg-gray-100 rounded" onClick={clearSelection}>
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Close</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {translation && (
        <div className="fixed bottom-4 right-4 bg-[#0d1b30] rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm z-40">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-sm">Translation</h3>
            <button onClick={() => setTranslation(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{translation}</p>
        </div>
      )}
    </div>
  );
}
