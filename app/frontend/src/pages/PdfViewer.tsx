import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Highlighter,
  Maximize2,
  Minimize2,
  PenTool,
  Plus,
  Save,
  Search,
  Tag,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { DUMMY_PAPERS } from "@/lib/data";
import { cn } from "@/lib/utils";

// Tag Input Component
function TagInput({
  tags,
  onTagsChange,
  placeholder = "Add tag...",
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
      setInput("");
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 cursor-pointer gap-1"
          >
            <Tag className="w-2.5 h-2.5" />
            {tag}
            <button
              onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
              className="ml-0.5 hover:text-red-500"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="text-xs h-7"
        />
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 shrink-0"
          onClick={addTag}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function PdfViewer() {
  const { paperId } = useParams<{ paperId: string }>();
  const paper = DUMMY_PAPERS.find((p) => p.id === paperId) || DUMMY_PAPERS[0];

  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 12;
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"highlights" | "lit-note" | "perm-note">("highlights");

  // Highlights
  const [highlights, setHighlights] = useState([
    {
      id: "h-1",
      text: "self-regulated learning remains underexplored",
      note: "This is the gap I want to investigate further",
      page: 3,
      color: "yellow" as const,
      tags: ["gap", "SRL"],
      citation: `${paper.authors[0]} (${paper.year})`,
    },
    {
      id: "h-2",
      text: "personalization algorithms",
      note: "Key mechanism — how does personalization affect SRL?",
      page: 5,
      color: "green" as const,
      tags: ["mechanism", "personalization"],
      citation: `${paper.authors[0]} (${paper.year})`,
    },
    {
      id: "h-3",
      text: "AI tutoring systems improve test scores by 0.3-0.5 SD on average",
      note: "Quantitative evidence of performance improvement",
      page: 8,
      color: "yellow" as const,
      tags: ["evidence", "performance"],
      citation: `${paper.authors[0]} (${paper.year})`,
    },
  ]);
  const [showNewHighlight, setShowNewHighlight] = useState(false);
  const [newHText, setNewHText] = useState("");
  const [newHNote, setNewHNote] = useState("");
  const [newHTags, setNewHTags] = useState<string[]>([]);
  const [newHColor, setNewHColor] = useState<"yellow" | "green">("yellow");

  // Literature Note
  const [litNoteTitle, setLitNoteTitle] = useState("");
  const [litNoteContent, setLitNoteContent] = useState("");
  const [litNoteTags, setLitNoteTags] = useState<string[]>([]);
  const [litNoteSaved, setLitNoteSaved] = useState(false);

  // Permanent Note
  const [permNoteTitle, setPermNoteTitle] = useState("");
  const [permNoteContent, setPermNoteContent] = useState("");
  const [permNoteTags, setPermNoteTags] = useState<string[]>([]);
  const [permNoteSaved, setPermNoteSaved] = useState(false);

  const citation = `${paper.authors[0]} (${paper.year})`;

  const handleAddHighlight = () => {
    if (newHText.trim()) {
      setHighlights([
        ...highlights,
        {
          id: `h-${Date.now()}`,
          text: newHText.trim(),
          note: newHNote.trim(),
          page: currentPage,
          color: newHColor,
          tags: newHTags,
          citation,
        },
      ]);
      setNewHText("");
      setNewHNote("");
      setNewHTags([]);
      setShowNewHighlight(false);
    }
  };

  // Simulated PDF content paragraphs for the demo
  const pdfContent: Record<number, string[]> = {
    1: [
      "Artificial Intelligence in Education: A Review of Adaptive Learning Systems",
      `${paper.authors.join(", ")}`,
      paper.journal,
      "Abstract",
      paper.abstract,
    ],
    2: [
      "1. Introduction",
      "The rapid advancement of artificial intelligence (AI) has led to significant innovations in educational technology. Among these, adaptive learning systems powered by AI have emerged as a promising approach to personalized education.",
      "These systems leverage machine learning algorithms to tailor instructional content, pacing, and feedback to individual learner needs, potentially transforming how students engage with educational material in higher education settings.",
      "Despite growing adoption, critical questions remain about the deeper impact of these systems on student learning processes, particularly self-regulated learning (SRL).",
    ],
    3: [
      "2. Literature Review",
      "2.1 AI-Powered Adaptive Learning Systems",
      "Adaptive learning systems use algorithms to analyze student performance data and adjust the learning experience accordingly. Key components include: (1) learner modeling, (2) content sequencing, (3) adaptive feedback, and (4) performance prediction.",
      "While these systems have shown promise in improving test scores, their impact on deeper learning processes such as self-regulated learning remains underexplored.",
      "2.2 Self-Regulated Learning Theory",
      "Self-regulated learning, as defined by Zimmerman (2002), encompasses the processes by which learners systematically direct their thoughts, feelings, and actions toward the attainment of their goals.",
    ],
  };

  const currentContent = pdfContent[currentPage] || [
    `Page ${currentPage}`,
    "This section continues the analysis of AI-powered adaptive learning systems and their relationship to self-regulated learning processes in higher education contexts.",
    "The evidence suggests that while technology scaffolds can support certain aspects of SRL, the mechanisms through which AI tutoring specifically influences metacognitive development remain unclear.",
    "Further empirical investigation is needed to understand the complex interplay between adaptive personalization features and students' capacity for self-regulation.",
  ];

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* PDF Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Link to="/workflow/3">
              <Button variant="ghost" size="sm" className="text-xs">
                <ArrowLeft className="w-3 h-3 mr-1" />
                Back to Read
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-1">
              <Badge className="text-[10px] bg-[#1E3A5F] text-white">
                PDF
              </Badge>
              <span className="text-xs text-slate-600 font-medium truncate max-w-[300px]">
                {paper.title}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Page Navigation */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-xs text-slate-600 px-1">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
            {/* Zoom */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
              >
                <ZoomOut className="w-3 h-3" />
              </Button>
              <span className="text-xs text-slate-600 px-1">{zoom}%</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setZoom(Math.min(200, zoom + 10))}
              >
                <ZoomIn className="w-3 h-3" />
              </Button>
            </div>
            {/* Search */}
            <Button variant="outline" size="sm" className="text-xs h-7">
              <Search className="w-3 h-3 mr-1" />
              Find
            </Button>
            {/* Download */}
            <Button variant="outline" size="sm" className="text-xs h-7">
              <Download className="w-3 h-3 mr-1" />
              Download
            </Button>
            {/* Toggle Sidebar */}
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <Minimize2 className="w-3 h-3" />
              ) : (
                <Maximize2 className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* PDF Content Area */}
          <div className="flex-1 overflow-auto bg-slate-100 p-6">
            <div
              className="max-w-[700px] mx-auto bg-white shadow-lg rounded-sm border border-slate-200 p-12 min-h-[900px]"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
            >
              {/* Simulated PDF Content */}
              <div className="space-y-4">
                {currentContent.map((paragraph, i) => {
                  const isTitle = i === 0 && currentPage === 1;
                  const isAuthor = i === 1 && currentPage === 1;
                  const isJournal = i === 2 && currentPage === 1;
                  const isHeading = paragraph.match(/^\d+\./) || paragraph === "Abstract";

                  // Check if any highlight matches this paragraph
                  const matchingHighlight = highlights.find(
                    (h) => h.page === currentPage && paragraph.includes(h.text)
                  );

                  return (
                    <div key={i}>
                      {isTitle ? (
                        <h1 className="text-xl font-bold text-slate-900 text-center mb-2">
                          {paragraph}
                        </h1>
                      ) : isAuthor ? (
                        <p className="text-sm text-slate-500 text-center">{paragraph}</p>
                      ) : isJournal ? (
                        <p className="text-xs text-slate-400 text-center italic mb-6">{paragraph}</p>
                      ) : isHeading ? (
                        <h2 className="text-base font-semibold text-slate-800 mt-6 mb-2">
                          {paragraph}
                        </h2>
                      ) : matchingHighlight ? (
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {paragraph.split(matchingHighlight.text).map((part, pi, arr) => (
                            <span key={pi}>
                              {part}
                              {pi < arr.length - 1 && (
                                <mark
                                  className={cn(
                                    "px-0.5 rounded cursor-pointer",
                                    matchingHighlight.color === "yellow"
                                      ? "bg-yellow-200 hover:bg-yellow-300"
                                      : "bg-green-200 hover:bg-green-300"
                                  )}
                                  title={matchingHighlight.note}
                                >
                                  {matchingHighlight.text}
                                </mark>
                              )}
                            </span>
                          ))}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-700 leading-relaxed">{paragraph}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Page footer */}
              <div className="mt-12 pt-4 border-t border-slate-100 text-center">
                <span className="text-xs text-slate-400">{currentPage}</span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {sidebarOpen && (
            <div className="w-[340px] border-l border-slate-200 bg-white flex flex-col shrink-0">
              {/* Sidebar Tabs */}
              <div className="flex border-b border-slate-200 shrink-0">
                <button
                  onClick={() => setSidebarTab("highlights")}
                  className={cn(
                    "flex-1 px-3 py-2.5 text-xs font-medium transition-colors",
                    sidebarTab === "highlights"
                      ? "text-[#1E3A5F] border-b-2 border-[#1E3A5F] bg-blue-50/30"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Highlighter className="w-3 h-3 inline mr-1" />
                  Highlights ({highlights.length})
                </button>
                <button
                  onClick={() => setSidebarTab("lit-note")}
                  className={cn(
                    "flex-1 px-3 py-2.5 text-xs font-medium transition-colors",
                    sidebarTab === "lit-note"
                      ? "text-[#1E3A5F] border-b-2 border-[#1E3A5F] bg-blue-50/30"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <FileText className="w-3 h-3 inline mr-1" />
                  Lit Note
                </button>
                <button
                  onClick={() => setSidebarTab("perm-note")}
                  className={cn(
                    "flex-1 px-3 py-2.5 text-xs font-medium transition-colors",
                    sidebarTab === "perm-note"
                      ? "text-rose-600 border-b-2 border-rose-600 bg-rose-50/30"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <BookOpen className="w-3 h-3 inline mr-1" />
                  Perm Note
                </button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {/* Highlights Tab */}
                  {sidebarTab === "highlights" && (
                    <>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="text-xs h-7 flex-1 bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                          onClick={() => setShowNewHighlight(true)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Highlight
                        </Button>
                      </div>

                      {showNewHighlight && (
                        <div className="p-3 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 space-y-2">
                          <Input
                            value={newHText}
                            onChange={(e) => setNewHText(e.target.value)}
                            placeholder="Select or type highlighted text..."
                            className="text-xs"
                          />
                          <Textarea
                            value={newHNote}
                            onChange={(e) => setNewHNote(e.target.value)}
                            placeholder="Your note..."
                            rows={2}
                            className="text-xs"
                          />
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-slate-500">Color:</span>
                            <button
                              onClick={() => setNewHColor("yellow")}
                              className={cn(
                                "w-5 h-5 rounded-full bg-yellow-300 border-2",
                                newHColor === "yellow" ? "border-yellow-600" : "border-transparent"
                              )}
                            />
                            <button
                              onClick={() => setNewHColor("green")}
                              className={cn(
                                "w-5 h-5 rounded-full bg-green-300 border-2",
                                newHColor === "green" ? "border-green-600" : "border-transparent"
                              )}
                            />
                          </div>
                          <TagInput
                            tags={newHTags}
                            onTagsChange={setNewHTags}
                            placeholder="Add tags..."
                          />
                          <div className="p-1.5 bg-slate-50 rounded text-[10px] text-slate-500">
                            📎 Auto-citation: {citation}
                          </div>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              className="text-xs h-7 bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                              onClick={handleAddHighlight}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7"
                              onClick={() => {
                                setShowNewHighlight(false);
                                setNewHText("");
                                setNewHNote("");
                                setNewHTags([]);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {highlights.map((h) => (
                        <div
                          key={h.id}
                          className="p-2.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all group"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div
                              className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded",
                                h.color === "yellow"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                              )}
                            >
                              p.{h.page}
                            </div>
                            <span className="text-[9px] text-slate-400">
                              📎 {h.citation}
                            </span>
                          </div>
                          <p className="text-xs text-slate-800 font-medium mb-1">
                            &ldquo;{h.text}&rdquo;
                          </p>
                          <p className="text-[11px] text-slate-500 mb-1.5">{h.note}</p>
                          {h.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {h.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-[8px] px-1 py-0 bg-slate-100 text-slate-500"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="outline" className="text-[9px] h-5 px-1.5">
                              <PenTool className="w-2.5 h-2.5 mr-0.5" />
                              Quote
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[9px] h-5 px-1.5"
                              onClick={() => setCurrentPage(h.page)}
                            >
                              Go to p.{h.page}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Literature Note Tab */}
                  {sidebarTab === "lit-note" && (
                    <div className="space-y-3">
                      <div className="p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                        <p className="text-[10px] text-slate-500 mb-0.5">Writing note for:</p>
                        <p className="text-xs font-medium text-slate-700 truncate">
                          {paper.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          📎 Auto-citation: {citation}
                        </p>
                      </div>
                      <Input
                        value={litNoteTitle}
                        onChange={(e) => setLitNoteTitle(e.target.value)}
                        placeholder="Note title..."
                        className="text-sm"
                      />
                      <Textarea
                        value={litNoteContent}
                        onChange={(e) => {
                          setLitNoteContent(e.target.value);
                          setLitNoteSaved(false);
                        }}
                        rows={10}
                        placeholder="Write your literature note here. Key takeaways, arguments, evidence..."
                        className="text-sm font-mono"
                      />
                      <TagInput
                        tags={litNoteTags}
                        onTagsChange={setLitNoteTags}
                        placeholder="Add tags..."
                      />
                      {litNoteSaved && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <Save className="w-3 h-3" />
                          Saved!
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="text-xs bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                          onClick={() => setLitNoteSaved(true)}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save Literature Note
                        </Button>
                        <Link to="/draft">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-[#2D6A4F]/30 text-[#2D6A4F]"
                          >
                            <PenTool className="w-3 h-3 mr-1" />
                            Quote to Draft
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Permanent Note Tab */}
                  {sidebarTab === "perm-note" && (
                    <div className="space-y-3">
                      <div className="p-2 bg-rose-50/50 rounded-lg border border-rose-100">
                        <p className="text-[10px] text-slate-500">
                          Permanent notes synthesize insights across multiple sources.
                        </p>
                      </div>
                      <Input
                        value={permNoteTitle}
                        onChange={(e) => setPermNoteTitle(e.target.value)}
                        placeholder="Permanent note title..."
                        className="text-sm"
                      />
                      <Textarea
                        value={permNoteContent}
                        onChange={(e) => {
                          setPermNoteContent(e.target.value);
                          setPermNoteSaved(false);
                        }}
                        rows={10}
                        placeholder="Synthesize your insight across multiple sources..."
                        className="text-sm font-mono"
                      />
                      <TagInput
                        tags={permNoteTags}
                        onTagsChange={setPermNoteTags}
                        placeholder="Add tags..."
                      />
                      {permNoteSaved && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600">
                          <Save className="w-3 h-3" />
                          Saved!
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                          onClick={() => setPermNoteSaved(true)}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save Permanent Note
                        </Button>
                        <Link to="/draft">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-[#2D6A4F]/30 text-[#2D6A4F]"
                          >
                            <PenTool className="w-3 h-3 mr-1" />
                            Quote to Draft
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}