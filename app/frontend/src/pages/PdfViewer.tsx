import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { pdfAPI } from "@/lib/pdf-api";
import {
  ArrowLeft,
  BookOpen,
  Download,
  Eye,
  FileText,
  Highlighter,
  Maximize2,
  Minimize2,
  PenTool,
  Plus,
  Save,
  Tag,
  X,
} from "lucide-react";
import { paperAPI, type Paper as ApiPaper } from "@/lib/manuscript-api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

// Tag Input Component
function TagInput({
  tags,
  onTagsChange,
  placeholder,
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const resolvedPlaceholder = placeholder || (isZh ? "添加标签..." : isZh ? "添加标签..." : isZh ? "添加标签..." : "Add tag...");
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
            className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-200 cursor-pointer gap-1"
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
          placeholder={resolvedPlaceholder}
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
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const { paperId } = useParams<{ paperId: string }>();
  const [paper, setPaper] = useState<ApiPaper | null>(null);
  const [loadingPaper, setLoadingPaper] = useState(true);

  useEffect(() => {
    const loadPaper = async () => {
      if (!paperId) {
        setPaper(null);
        setLoadingPaper(false);
        return;
      }
      try {
        const item = await paperAPI.get(paperId);
        setPaper(item);
      } catch {
        setPaper(null);
      } finally {
        setLoadingPaper(false);
      }
    };

    void loadPaper();
  }, [paperId]);

  const [currentPage, setCurrentPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"highlights" | "lit-note" | "perm-note">("highlights");

  // Highlights
  const [highlights, setHighlights] = useState([
    
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

  const citation = paper ? `${paper.authors?.[0] || "Unknown"} (${paper.year || "n.d."})` : "";

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

  if (loadingPaper) {
    return (
      <AppLayout>
        <div className="p-6 text-sm text-slate-400">{isZh ? "加载论文..." : "Loading paper..."}</div>
      </AppLayout>
    );
  }

  if (!paper) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="rounded-lg border border-slate-700/50 p-6 text-center">
            <h2 className="text-lg font-semibold text-slate-100">{isZh ? "未找到论文" : "Paper not found"}</h2>
            <p className="text-sm text-slate-400 mt-2">{isZh ? "此页面仅显示您项目数据中的真实论文记录。" : "This page only shows real paper records from your project data."}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-slate-700/50 bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2">
            <Link to="/workflow/3">
              <Button variant="ghost" size="sm" className="text-xs">
                <ArrowLeft className="w-3 h-3 mr-1" />
                Back to Read
              </Button>
            </Link>
            <div className="flex items-center gap-1">
              <Badge className="text-[10px] bg-cyan-600 text-white">
                PDF
              </Badge>
              <span className="text-xs text-slate-600 font-medium truncate max-w-[300px]">
                {paper.title}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
          <div className="flex-1 overflow-hidden bg-slate-800 p-4">
            <div className="h-full overflow-hidden rounded-md border border-slate-300 bg-[#0d1b30] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800 px-3 py-2">
                <div className="flex items-center gap-2 text-slate-700">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-medium">{isZh ? "PDF阅读器" : "PDF Viewer"}</span>
                </div>
                <Button
                  className="gap-2"
                  disabled={!paper.pdf_path}
                  onClick={() => {
                    if (!paper.pdf_path) return;
                    const url = pdfAPI.downloadUrl(paper.pdf_path);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = paper.pdf_path;
                    link.click();
                  }}
                  size="sm"
                  variant="outline"
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>

              <iframe
                src={paper.pdf_path ? pdfAPI.viewUrl(paper.pdf_path) + `#page=${currentPage}` : "about:blank"}
                title={`${paper.title} PDF`}
                className="h-full w-full border-0 flex-1 min-h-0"
              />
            </div>
          </div>

          {/* Sidebar */}
          {sidebarOpen && (
            <div className="w-[340px] border-l border-slate-700/50 bg-[#0d1b30] flex flex-col shrink-0">
              {/* Sidebar Tabs */}
              <div className="flex border-b border-slate-700/50 shrink-0">
                <button
                  onClick={() => setSidebarTab("highlights")}
                  className={cn(
                    "flex-1 px-3 py-2.5 text-xs font-medium transition-colors",
                    sidebarTab === "highlights"
                      ? "text-cyan-300 border-b-2 border-cyan-600 bg-blue-50/30"
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
                      ? "text-cyan-300 border-b-2 border-cyan-600 bg-blue-50/30"
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
                          className="text-xs h-7 flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
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
                            placeholder={isZh ? "选择或输入高亮显示的文本..." : isZh ? "选择或输入高亮显示的文本..." : isZh ? "选择或输入高亮显示的文本..." : "Select or type highlighted text..."}
                            className="text-xs"
                          />
                          <Textarea
                            value={newHNote}
                            onChange={(e) => setNewHNote(e.target.value)}
                            placeholder={isZh ? "你的笔记..." : isZh ? "你的笔记..." : isZh ? "你的笔记..." : "Your note..."}
                            rows={2}
                            className="text-xs"
                          />
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-slate-500">{isZh ? "颜色：" : "Color:"}</span>
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
                            placeholder={isZh ? "添加标签..." : isZh ? "添加标签..." : isZh ? "添加标签..." : isZh ? "添加标签..." : isZh ? "添加标签..." : isZh ? "添加标签..." : isZh ? "添加标签..." : "Add tags..."}
                          />
                          <div className="p-1.5 bg-slate-800/40 rounded text-[10px] text-slate-500">
                            📎 Auto-citation: {citation}
                          </div>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              className="text-xs h-7 bg-cyan-600 hover:bg-cyan-700 text-white"
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
                          className="p-2.5 rounded-lg border border-slate-700/50 hover:border-slate-300 transition-all group"
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
                          <p className="text-xs text-slate-200 font-medium mb-1">
                            &ldquo;{h.text}&rdquo;
                          </p>
                          <p className="text-[11px] text-slate-500 mb-1.5">{h.note}</p>
                          {h.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {h.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-[8px] px-1 py-0 bg-slate-800 text-slate-500"
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
                        <p className="text-[10px] text-slate-500 mb-0.5">{isZh ? "正在为：" : "Writing note for:"}</p>
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
                        placeholder={isZh ? "笔记标题..." : isZh ? "笔记标题..." : isZh ? "笔记标题..." : "Note title..."}
                        className="text-sm"
                      />
                      <Textarea
                        value={litNoteContent}
                        onChange={(e) => {
                          setLitNoteContent(e.target.value);
                          setLitNoteSaved(false);
                        }}
                        rows={10}
                        placeholder={isZh ? "在此处编写你的文献笔记。关键要点，论点，证据..." : isZh ? "在此处编写你的文献笔记。关键要点，论点，证据..." : isZh ? "在此处编写你的文献笔记。关键要点，论点，证据..." : "Write your literature note here. Key takeaways, arguments, evidence..."}
                        className="text-sm font-mono"
                      />
                      <TagInput
                        tags={litNoteTags}
                        onTagsChange={setLitNoteTags}
                        placeholder={isZh ? "添加标签..." : "Add tags..."}
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
                          className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
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
                        placeholder={isZh ? "永久笔记标题..." : isZh ? "永久笔记标题..." : isZh ? "永久笔记标题..." : "Permanent note title..."}
                        className="text-sm"
                      />
                      <Textarea
                        value={permNoteContent}
                        onChange={(e) => {
                          setPermNoteContent(e.target.value);
                          setPermNoteSaved(false);
                        }}
                        rows={10}
                        placeholder={isZh ? "在多个来源中综合你的见解..." : isZh ? "在多个来源中综合你的见解..." : isZh ? "在多个来源中综合你的见解..." : "Synthesize your insight across multiple sources..."}
                        className="text-sm font-mono"
                      />
                      <TagInput
                        tags={permNoteTags}
                        onTagsChange={setPermNoteTags}
                        placeholder={isZh ? "添加标签..." : "Add tags..."}
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