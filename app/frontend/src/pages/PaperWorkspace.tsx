import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  ExternalLink,
  Highlighter,
  PenTool,
  Plus,
  Save,
  Star,
  Tag,
  X,
} from "lucide-react";
import { paperAPI, projectAPI, type Paper as ApiPaper, type Project } from "@/lib/manuscript-api";
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

export default function PaperWorkspace() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const { paperId } = useParams<{ paperId: string }>();
  const [paper, setPaper] = useState<ApiPaper | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loadingPaper, setLoadingPaper] = useState(true);

  useEffect(() => {
    const loadPaper = async () => {
      if (!paperId) {
        setPaper(null);
        setLoadingPaper(false);
        return;
      }
      try {
        const nextPaper = await paperAPI.get(paperId);
        setPaper(nextPaper);
        if (nextPaper.project_id) {
          try {
            const nextProject = await projectAPI.get(nextPaper.project_id);
            setProject(nextProject);
          } catch {
            setProject(null);
          }
        }
      } catch {
        setPaper(null);
      } finally {
        setLoadingPaper(false);
      }
    };

    void loadPaper();
  }, [paperId]);

  // Annotations with tags
  const [annotations, setAnnotations] = useState<Array<{ id: string; text: string; note: string; color: "yellow" | "green"; tags: string[] }>>([]);
  const [showNewAnnotation, setShowNewAnnotation] = useState(false);
  const [newAnnText, setNewAnnText] = useState("");
  const [newAnnNote, setNewAnnNote] = useState("");
  const [newAnnColor, setNewAnnColor] = useState<"yellow" | "green">("yellow");
  const [newAnnTags, setNewAnnTags] = useState<string[]>([]);
  const [importedFromPdf, setImportedFromPdf] = useState(false);

  // Literature Notes
  const [litNotes, setLitNotes] = useState<Array<{ id: string; title: string; content: string; tags: string[]; createdAt: string }>>([]);
  const [showNewLitNote, setShowNewLitNote] = useState(false);
  const [newLitTitle, setNewLitTitle] = useState("");
  const [newLitContent, setNewLitContent] = useState("");
  const [newLitTags, setNewLitTags] = useState<string[]>([]);
  const [litNoteSaved, setLitNoteSaved] = useState(false);

  // Permanent Notes
  const [permNotes, setPermNotes] = useState<
    { id: string; title: string; content: string; tags: string[]; createdAt: string }[]
  >([]);
  const [showNewPermNote, setShowNewPermNote] = useState(false);
  const [newPermTitle, setNewPermTitle] = useState("");
  const [newPermContent, setNewPermContent] = useState("");
  const [newPermTags, setNewPermTags] = useState<string[]>([]);

  const handleAddAnnotation = () => {
    if (newAnnText.trim()) {
      setAnnotations([
        ...annotations,
        {
          id: `ann-${Date.now()}`,
          text: newAnnText.trim(),
          note: newAnnNote.trim(),
          color: newAnnColor,
          tags: newAnnTags,
        },
      ]);
      setNewAnnText("");
      setNewAnnNote("");
      setNewAnnTags([]);
      setShowNewAnnotation(false);
    }
  };

  const handleImportFromPdf = () => {
    setAnnotations((prev) => [...prev]);
    setImportedFromPdf(true);
  };

  const handleAddLitNote = () => {
    if (newLitTitle.trim() && newLitContent.trim()) {
      setLitNotes([
        ...litNotes,
        {
          id: `pln-${Date.now()}`,
          title: newLitTitle.trim(),
          content: newLitContent.trim(),
          tags: newLitTags,
          createdAt: "2026-03-09",
        },
      ]);
      setNewLitTitle("");
      setNewLitContent("");
      setNewLitTags([]);
      setShowNewLitNote(false);
    }
  };

  const handleAddPermNote = () => {
    if (newPermTitle.trim() && newPermContent.trim()) {
      setPermNotes([
        ...permNotes,
        {
          id: `ppn-${Date.now()}`,
          title: newPermTitle.trim(),
          content: newPermContent.trim(),
          tags: newPermTags,
          createdAt: "2026-03-09",
        },
      ]);
      setNewPermTitle("");
      setNewPermContent("");
      setNewPermTags([]);
      setShowNewPermNote(false);
    }
  };

  if (loadingPaper) {
    return (
      <AppLayout>
        <div className="p-6 text-sm text-slate-400">{isZh ? "加载文献..." : "Loading paper..."}</div>
      </AppLayout>
    );
  }

  if (!paper) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="rounded-lg border border-slate-700/50 p-6 text-center">
            <h2 className="text-lg font-semibold text-slate-100">{isZh ? "文献未找到" : "Paper not found"}</h2>
            <p className="text-sm text-slate-400 mt-2">{isZh ? "此页面仅显示来自您项目数据的真实文献记录。" : "This page only shows real paper records from your project data."}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Back Navigation */}
        <Link to="/workflow/3">
          <Button variant="ghost" size="sm" className="text-xs -ml-2">
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back to Reading
          </Button>
        </Link>

        {/* Paper Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {paper.is_entry_paper && (
              <Badge className="text-xs bg-cyan-600 text-white">
                Entry Paper
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                paper.relevance === "high" &&
                  "border-emerald-300 text-emerald-700",
                paper.relevance === "medium" &&
                  "border-amber-300 text-amber-700",
                paper.relevance === "low" &&
                  "border-slate-300 text-slate-500"
              )}
            >
              {paper.relevance || "unknown"} relevance
            </Badge>
          </div>
          <h1 className="text-xl font-bold text-slate-100">{paper.title}</h1>
          <p className="text-sm text-slate-500">
            {(paper.authors || []).join(", ")} ({paper.year || "n.d."}) — {paper.journal || ""}
          </p>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="text-xs">
              <ExternalLink className="w-3 h-3 mr-1" />
              Open Original
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Save className="w-3 h-3 mr-1" />
              Save Metadata
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Mark Relevance
            </Button>
            <Button
              size="sm"
              className="app-btn-primary app-btn-xs"
              onClick={() => {
                setShowNewLitNote(true);
                setShowNewPermNote(false);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Literature Note
            </Button>
            <Button
              size="sm"
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              onClick={() => {
                setShowNewPermNote(true);
                setShowNewLitNote(false);
              }}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Permanent Note
            </Button>
          </div>
        </div>

        <Separator />

        {/* Abstract */}
        <Card className="border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Abstract
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 leading-relaxed">
              {paper.abstract}
            </p>
          </CardContent>
        </Card>

        {/* Structured Blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Research Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700">
                {paper.researchQuestion}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-cyan-700 uppercase tracking-wider">
                Theory / Framework
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700">{paper.theory}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700">{paper.method}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Key Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700">{paper.findings}</p>
            </CardContent>
          </Card>
        </div>

        {/* Annotations & Highlights */}
        <Card className="border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Annotations & Highlights ({annotations.length})
              </CardTitle>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "app-btn-compact",
                    importedFromPdf && "bg-emerald-50 border-emerald-300 text-emerald-700"
                  )}
                  onClick={handleImportFromPdf}
                  disabled={importedFromPdf}
                >
                  <Download className="w-3 h-3 mr-1" />
                  {importedFromPdf ? "Imported ✓" : "Import All from PDF"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="app-btn-compact"
                  onClick={() => setShowNewAnnotation(!showNewAnnotation)}
                >
                  <Highlighter className="w-3 h-3 mr-1" />
                  Add Highlight
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* New Annotation Form */}
            {showNewAnnotation && (
              <div className="p-3 mb-3 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 space-y-2">
                <Input
                  value={newAnnText}
                  onChange={(e) => setNewAnnText(e.target.value)}
                  placeholder={isZh ? "粘贴或输入高亮显示的文本..." : isZh ? "粘贴或输入高亮文本..." : isZh ? "粘贴或输入高亮显示的文本..." : "Paste or type the highlighted text..."}
                  className="text-xs"
                />
                <Textarea
                  value={newAnnNote}
                  onChange={(e) => setNewAnnNote(e.target.value)}
                  placeholder={isZh ? "关于此高亮的笔记..." : isZh ? "你对这个高亮的笔记..." : isZh ? "关于此高亮的笔记..." : "Your note about this highlight..."}
                  rows={2}
                  className="text-xs"
                />
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-slate-500">{isZh ? "颜色:" : "Color:"}</span>
                  <button
                    onClick={() => setNewAnnColor("yellow")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-yellow-300 border-2",
                      newAnnColor === "yellow" ? "border-yellow-600" : "border-transparent"
                    )}
                  />
                  <button
                    onClick={() => setNewAnnColor("green")}
                    className={cn(
                      "w-5 h-5 rounded-full bg-green-300 border-2",
                      newAnnColor === "green" ? "border-green-600" : "border-transparent"
                    )}
                  />
                </div>
                <TagInput
                  tags={newAnnTags}
                  onTagsChange={setNewAnnTags}
                  placeholder={isZh ? "添加标签（例如，差距、方法、关键发现）..." : isZh ? "添加标签（例如，间隙、方法、关键发现）..." : isZh ? "添加标签（例如，差距、方法、关键发现）..." : "Add tags (e.g., gap, method, key-finding)..."}
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="app-btn-primary app-btn-compact"
                    onClick={handleAddAnnotation}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Save Highlight
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="app-btn-compact"
                    onClick={() => {
                      setShowNewAnnotation(false);
                      setNewAnnText("");
                      setNewAnnNote("");
                      setNewAnnTags([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {annotations.length > 0 ? (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {annotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3 rounded-lg border border-slate-700/50 hover:border-slate-300 transition-all group"
                    >
                      <div
                        className={cn(
                          "text-xs px-2 py-1 rounded mb-2 inline-block",
                          ann.color === "yellow"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        )}
                      >
                        &ldquo;{ann.text}&rdquo;
                      </div>
                      <p className="text-xs text-slate-600 mb-1.5">{ann.note}</p>
                      {ann.tags && ann.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {ann.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 bg-slate-800 text-slate-500"
                            >
                              <Tag className="w-2 h-2 mr-0.5" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" className="text-[10px] h-6 px-2">
                          <BookOpen className="w-3 h-3 mr-1" />
                          Link to Original
                        </Button>
                        <Link to="/draft">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6 px-2 border-[#2D6A4F]/30 text-[#2D6A4F]"
                          >
                            <PenTool className="w-3 h-3 mr-1" />
                            Quote to Draft
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Highlighter className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">
                  No annotations yet. Start highlighting key passages.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relationship to Project */}
        <Card className="border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Relationship to Current Project
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
              <p className="text-xs text-slate-600">
                <strong>Project:</strong> {project?.title || ""}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                <strong>{isZh ? "连接:" : "Connection:"}</strong> This paper provides a comprehensive
                overview of AI in education, identifying the SRL gap that forms
                the basis of our research question.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Literature Notes */}
        <Card className="border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Literature Notes ({litNotes.length})
              </CardTitle>
              <Button
                size="sm"
                className="app-btn-primary app-btn-compact"
                onClick={() => {
                  setShowNewLitNote(true);
                  setShowNewPermNote(false);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                New Literature Note
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showNewLitNote && (
              <div className="space-y-2 p-3 rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/30">
                <Input
                  value={newLitTitle}
                  onChange={(e) => setNewLitTitle(e.target.value)}
                  placeholder={isZh ? "笔记标题（例如，'关于SRL差距的关键发现'）" : isZh ? "笔记标题（例如，'关于SRL间隙的关键发现'）" : isZh ? "笔记标题（例如：'关于SRL差距的关键发现'）" : "Note title (e.g., 'Key finding about SRL gap')"}
                  className="text-sm"
                />
                <Textarea
                  value={newLitContent}
                  onChange={(e) => setNewLitContent(e.target.value)}
                  rows={5}
                  placeholder={isZh ? "在这里写您的文献笔记..." : isZh ? "在这里编写你的文献笔记..." : isZh ? "在这里写你的文献笔记..." : "Write your literature note here..."}
                  className="text-sm font-mono"
                />
                <TagInput
                  tags={newLitTags}
                  onTagsChange={setNewLitTags}
                  placeholder={isZh ? "添加标签（例如，差距，理论，方法）..." : isZh ? "添加标签（例如，间隙、理论、方法）..." : isZh ? "添加标签（例如，间隙、理论、方法）..." : "Add tags (e.g., gap, theory, method)..."}
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="app-btn-primary app-btn-xs"
                    onClick={handleAddLitNote}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save Literature Note
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      setShowNewLitNote(false);
                      setNewLitTitle("");
                      setNewLitContent("");
                      setNewLitTags([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {litNotes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg border border-slate-700/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-slate-200">
                    {note.title}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    {note.createdAt}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-2">{note.content}</p>
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 bg-slate-800 text-slate-500"
                      >
                        <Tag className="w-2 h-2 mr-0.5" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-6 px-2"
                    onClick={() => setLitNoteSaved(true)}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" className="text-[10px] h-6 px-2">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Link to Original
                  </Button>
                  <Link to="/draft">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 px-2 border-[#2D6A4F]/30 text-[#2D6A4F]"
                    >
                      <PenTool className="w-3 h-3 mr-1" />
                      Quote to Draft
                    </Button>
                  </Link>
                </div>
              </div>
            ))}

            {litNoteSaved && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Literature Note saved successfully
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permanent Notes */}
        <Card className="border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Permanent Notes ({permNotes.length})
              </CardTitle>
              <Button
                size="sm"
                className="text-xs h-7 bg-rose-600 hover:bg-rose-700 text-white"
                onClick={() => {
                  setShowNewPermNote(true);
                  setShowNewLitNote(false);
                }}
              >
                <Plus className="w-3 h-3 mr-1" />
                New Permanent Note
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showNewPermNote && (
              <div className="space-y-2 p-3 rounded-lg border-2 border-dashed border-rose-200 bg-rose-50/30">
                <Input
                  value={newPermTitle}
                  onChange={(e) => setNewPermTitle(e.target.value)}
                  placeholder={isZh ? "永久笔记标题（例如，'核心洞察：SRL差距'）" : isZh ? "永久笔记标题（例如，'核心见解：SRL间隙'）" : isZh ? "永久笔记标题（例如：'核心见解：SRL差距'）" : "Permanent note title (e.g., 'Core insight: SRL gap')"}
                  className="text-sm"
                />
                <Textarea
                  value={newPermContent}
                  onChange={(e) => setNewPermContent(e.target.value)}
                  rows={5}
                  placeholder="Write your permanent note — synthesize across sources..."
                  className="text-sm font-mono"
                />
                <TagInput
                  tags={newPermTags}
                  onTagsChange={setNewPermTags}
                  placeholder={isZh ? "添加标签（例如，综合，核心洞察）..." : isZh ? "添加标签（例如，综合、核心见解）..." : isZh ? "添加标签（例如，综合、核心见解）..." : "Add tags (e.g., synthesis, core-insight)..."}
                />
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={handleAddPermNote}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Save Permanent Note
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      setShowNewPermNote(false);
                      setNewPermTitle("");
                      setNewPermContent("");
                      setNewPermTags([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {permNotes.length > 0 ? (
              permNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-lg border border-rose-200 bg-rose-50/30"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-slate-200">
                      {note.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      {note.createdAt}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2">{note.content}</p>
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {note.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 bg-rose-100 text-rose-600"
                        >
                          <Tag className="w-2 h-2 mr-0.5" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="text-[10px] h-6 px-2">
                      <BookOpen className="w-3 h-3 mr-1" />
                      Link to Original
                    </Button>
                    <Link to="/draft">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2 border-[#2D6A4F]/30 text-[#2D6A4F]"
                      >
                        <PenTool className="w-3 h-3 mr-1" />
                        Quote to Draft
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : !showNewPermNote ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No permanent notes yet. Synthesize your literature notes into permanent insights.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}