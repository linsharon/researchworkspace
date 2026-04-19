/**
 * Step 3: Read Found Papers
 * Display entry papers and expanded papers for reading
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowUpDown, BookOpen, Clock, ExternalLink, ChevronDown, Plus, Sparkles } from "lucide-react";
import { paperAPI } from "@/lib/manuscript-api";
import type { Paper } from "@/lib/manuscript-api";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";

const PAPER_DECISIONS_KEY = "rw-paper-decisions";

interface PaperDecisionRecord {
  titleLower: string;
  title: string;
  decision: string;
  timestamp: string;
  projectId: string;
}

const recordPaperDecision = (title: string, decision: string, projectId: string) => {
  if (typeof window === "undefined") return;
  try {
    const saved = window.localStorage.getItem(PAPER_DECISIONS_KEY);
    const records: PaperDecisionRecord[] = saved
      ? (JSON.parse(saved) as PaperDecisionRecord[])
      : [];
    records.push({
      titleLower: title.trim().toLowerCase(),
      title,
      decision,
      timestamp: new Date().toISOString(),
      projectId,
    });
    window.localStorage.setItem(
      PAPER_DECISIONS_KEY,
      JSON.stringify(records.slice(-500))
    );
  } catch {
    // Storage failure is non-critical
  }
};

interface Step3Props {
  projectId: string;
}

export default function Step3ReadFoundPapers({ projectId }: Step3Props) {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const tr = (en: string, zh: string) => (isZh ? zh : en);
  const READING_STATUSES: Array<Paper["reading_status"]> = ["To Read", "Reading", "Completed"];
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"entry" | "expanded" | "all">(
    "all"
  );
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<"title" | "year" | "status" | "type">("year");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [paperDecisionMap, setPaperDecisionMap] = useState<Map<string, PaperDecisionRecord>>(new Map());
  const [showAddPaperDialog, setShowAddPaperDialog] = useState(false);
  const [showAddMultiplePaperDialog, setShowAddMultiplePaperDialog] = useState(false);
  const [newPaperTitle, setNewPaperTitle] = useState("");
  const [newPaperAuthors, setNewPaperAuthors] = useState("");
  const [newPaperYear, setNewPaperYear] = useState("");
  const [newPaperJournal, setNewPaperJournal] = useState("");
  const [newPaperDiscoveryPath, setNewPaperDiscoveryPath] = useState("Academic Database");
  const [newPaperDiscoveryNote, setNewPaperDiscoveryNote] = useState("");
  const [newPaperDoiUrl, setNewPaperDoiUrl] = useState("");
  const [doiFetching, setDoiFetching] = useState(false);
  const [doiFetchError, setDoiFetchError] = useState<string | null>(null);
  const [bulkDoiInput, setBulkDoiInput] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);

  const DISCOVERY_PATH_OPTIONS = [
    "Academic Database",
    "Google Scholar",
    "Reference Mining",
    "Citation Tracking",
    "Manual Add",
  ];

  const discoveryPathLabel = (value: string) => {
    if (!isZh) return value;
    const map: Record<string, string> = {
      "Academic Database": "学术数据库",
      "Google Scholar": "Google Scholar",
      "Reference Mining": "参考文献挖掘",
      "Citation Tracking": "引文追踪",
      "Manual Add": "手动添加",
    };
    return map[value] || value;
  };

  const readingStatusLabel = (value: Paper["reading_status"]) => {
    if (!isZh) return value;
    if (value === "To Read") return "待读";
    if (value === "Reading") return "阅读中";
    return "已完成";
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PAPER_DECISIONS_KEY);
      if (!saved) return;
      const all = JSON.parse(saved) as PaperDecisionRecord[];
      const map = new Map<string, PaperDecisionRecord>();
      for (const record of all) {
        const existing = map.get(record.titleLower);
        if (!existing || record.timestamp > existing.timestamp) {
          map.set(record.titleLower, record);
        }
      }
      setPaperDecisionMap(map);
    } catch {
      // Storage read failure is non-critical
    }
  }, [papers]);

  useEffect(() => {
    loadPapers();
  }, [projectId]);

  const loadPapers = async () => {
    try {
      setLoading(true);
      const allPapers = await paperAPI.list(projectId);
      const readingPapers = allPapers.filter(
        (paper) => paper.is_entry_paper || paper.is_expanded_paper
      );
      setPapers(readingPapers);
    } catch (error) {
      console.error("Failed to load papers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPapers = useMemo(
    () =>
      papers.filter((paper) => {
        if (selectedTab === "entry") return paper.is_entry_paper;
        if (selectedTab === "expanded") return paper.is_expanded_paper;
        return true;
      }),
    [papers, selectedTab]
  );

  const sortedFilteredPapers = useMemo(() => {
    const direction = sortOrder === "asc" ? 1 : -1;
    return [...filteredPapers].sort((a, b) => {
      if (sortKey === "title") {
        return a.title.localeCompare(b.title) * direction;
      }
      if (sortKey === "year") {
        return ((a.year ?? 0) - (b.year ?? 0)) * direction;
      }
      if (sortKey === "status") {
        return (a.reading_status || "").localeCompare(b.reading_status || "") * direction;
      }

      const getTypeRank = (paper: Paper) => {
        if (paper.is_entry_paper && paper.is_expanded_paper) return 0;
        if (paper.is_entry_paper) return 1;
        if (paper.is_expanded_paper) return 2;
        return 3;
      };
      return (getTypeRank(a) - getTypeRank(b)) * direction;
    });
  }, [filteredPapers, sortKey, sortOrder]);

  const allVisibleSelected =
    sortedFilteredPapers.length > 0 &&
    sortedFilteredPapers.every((paper) => selectedPaperIds.includes(paper.id));

  const handleReadPaper = (paperId: string) => {
    navigate(`/paper-read/${projectId}/${paperId}`);
  };

  const togglePaperSelection = (paperId: string) => {
    setSelectedPaperIds((prev) =>
      prev.includes(paperId)
        ? prev.filter((id) => id !== paperId)
        : [...prev, paperId]
    );
  };

  const handleToggleSelectAllVisible = () => {
    const visibleIds = sortedFilteredPapers.map((paper) => paper.id);
    if (allVisibleSelected) {
      setSelectedPaperIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }
    setSelectedPaperIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleNoteClick = (e: React.MouseEvent, paper: Paper) => {
    e.stopPropagation();
    const rawNote = (paper.discovery_note || "").trim();
    if (!rawNote) return;

    // Case 1: Explicit search record reference
    if (rawNote.startsWith("From Search Record:")) {
      const query = rawNote.replace("From Search Record:", "").trim();
      navigate(`/workflow/${projectId}/2?tab=search&searchQuery=${encodeURIComponent(query)}`);
      return;
    }

    // Case 2: Expanded from an entry paper — match common note prefixes
    const expandedMatch = rawNote.match(/^(?:expanded from|from entry paper|from paper|references|cited by|from ref)[:\s]+(.+)/i);
    if (expandedMatch) {
      const titleHint = expandedMatch[1].trim();
      const sourcePaper = papers.find(
        (p) =>
          p.title.toLowerCase().includes(titleHint.toLowerCase()) ||
          titleHint.toLowerCase().includes(p.title.toLowerCase())
      );
      if (sourcePaper) {
        navigate(`/paper-read/${projectId}/${sourcePaper.id}`);
        return;
      }
    }

    // Case 3: discovery_path holds the ID of the source entry paper
    if (paper.discovery_path) {
      const sourcePaper = papers.find((p) => p.id === paper.discovery_path);
      if (sourcePaper) {
        navigate(`/paper-read/${projectId}/${sourcePaper.id}`);
        return;
      }
      // Looks like a bare paper ID (no spaces, reasonable length)
      if (paper.discovery_path.length > 8 && !paper.discovery_path.includes(" ")) {
        navigate(`/paper-read/${projectId}/${paper.discovery_path}`);
        return;
      }
    }

    // Default: treat note as a search query and jump to Step 2 search
    navigate(`/workflow/${projectId}/2?tab=search&searchQuery=${encodeURIComponent(rawNote)}`);
  };

  const handleUpdateReadingStatus = async (
    paper: Paper,
    nextStatus: Paper["reading_status"]
  ) => {
    if (paper.reading_status === nextStatus) return;

    try {
      const updated = await paperAPI.update(paper.id, { reading_status: nextStatus });
      const nextPapers = papers.map((item) => (item.id === paper.id ? updated : item));
      setPapers(nextPapers);
      toast.success(
        isZh
          ? `阅读状态已更新为${readingStatusLabel(nextStatus)}`
          : `Reading status updated to ${nextStatus}`
      );
    } catch (error) {
      console.error("Failed to update reading status:", error);
      toast.error(tr("Failed to update reading status", "更新阅读状态失败"));
    }
  };

  const handleBulkRemoveSelected = async () => {
    if (!selectedPaperIds.length) return;

    const selectedSet = new Set(selectedPaperIds);
    const targets = papers.filter((paper) => selectedSet.has(paper.id));
    if (!targets.length) return;

    let patch: Partial<Pick<Paper, "is_entry_paper" | "is_expanded_paper">>;
    if (selectedTab === "entry") {
      patch = { is_entry_paper: false };
    } else if (selectedTab === "expanded") {
      patch = { is_expanded_paper: false };
    } else {
      patch = { is_entry_paper: false, is_expanded_paper: false };
    }

    const message =
      selectedTab === "entry"
        ? tr(
            `Remove ${targets.length} selected paper(s) from Entry?`,
            `确认从 Entry 中移除 ${targets.length} 篇已选文献吗？`
          )
        : selectedTab === "expanded"
          ? tr(
              `Remove ${targets.length} selected paper(s) from Expanded?`,
              `确认从 Expanded 中移除 ${targets.length} 篇已选文献吗？`
            )
          : tr(
              `Remove ${targets.length} selected paper(s) from the Step 3 reading list?`,
              `确认从 Step 3 阅读列表中移除 ${targets.length} 篇已选文献吗？`
            );

    if (!window.confirm(message)) return;

    try {
      const updates = await Promise.all(
        targets.map((paper) => paperAPI.update(paper.id, patch))
      );
      const updateMap = new Map(updates.map((paper) => [paper.id, paper]));
      const nextPapers = papers
        .map((paper) => updateMap.get(paper.id) ?? paper)
        .filter((paper) => paper.is_entry_paper || paper.is_expanded_paper);

      const decisionLabel =
        selectedTab === "entry"
          ? "Removed from Entry Papers (Step 3: Read)"
          : selectedTab === "expanded"
          ? "Removed from Expanded Papers (Step 3: Read)"
          : "Removed from Reading List (Step 3: Read)";
      targets.forEach((paper) =>
        recordPaperDecision(paper.title, decisionLabel, projectId)
      );

      setPapers(nextPapers);
      setSelectedPaperIds([]);
      toast.success(tr("Selected papers removed successfully", "已成功移除所选文献"));
    } catch (error) {
      console.error("Failed to remove selected papers:", error);
      toast.error(tr("Failed to remove selected papers", "移除所选文献失败"));
    }
  };

  const extractDoiFromText = (input: string) => {
    const doiMatch = input.match(/\b10\.\d{4,}\/[^\s]+/i);
    return doiMatch ? doiMatch[0].replace(/[.,;)>]+$/, "") : null;
  };

  const handleFetchByDoiUrl = async () => {
    const input = newPaperDoiUrl.trim();
    if (!input) return;
    const doi = extractDoiFromText(input);
    if (!doi) {
      setDoiFetchError(tr("Unable to find a valid DOI. Please check input or fill manually.", "未找到有效 DOI，请检查输入或手动填写。"));
      return;
    }

    setDoiFetching(true);
    setDoiFetchError(null);
    try {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      if (!res.ok) throw new Error("Not found");
      const json = (await res.json()) as {
        message: {
          title?: string[];
          author?: Array<{ given?: string; family?: string }>;
          published?: { "date-parts"?: number[][] };
          "container-title"?: string[];
          publisher?: string;
        };
      };
      const work = json.message;
      if (work.title?.[0]) setNewPaperTitle(work.title[0]);
      const authors = (work.author ?? []).map((a) => [a.given, a.family].filter(Boolean).join(" "));
      if (authors.length) setNewPaperAuthors(authors.join(", "));
      const year = work.published?.["date-parts"]?.[0]?.[0];
      if (year) setNewPaperYear(String(year));
      const journal = work["container-title"]?.[0] ?? work.publisher;
      if (journal) setNewPaperJournal(journal);
    } catch {
      setDoiFetchError(tr("Failed to fetch by DOI. Please fill the fields manually.", "DOI 自动获取失败，请手动填写。"));
    } finally {
      setDoiFetching(false);
    }
  };

  const createEntryPaper = async (payload: {
    title: string;
    authors: string[];
    year?: number;
    journal?: string;
    url?: string;
    discoveryPath?: string;
    discoveryNote?: string;
  }) => {
    const created = await paperAPI.create({
      title: payload.title,
      authors: payload.authors,
      year: payload.year,
      journal: payload.journal,
      url: payload.url,
      discovery_path: payload.discoveryPath,
      discovery_note: payload.discoveryNote,
      project_id: projectId,
    });

    try {
      const updated = await paperAPI.update(created.id, { is_entry_paper: true });
      return updated;
    } catch {
      return { ...created, is_entry_paper: true } as Paper;
    }
  };

  const handleAddEntryPaper = async () => {
    if (!newPaperTitle.trim()) return;
    try {
      const nextPaper = await createEntryPaper({
        title: newPaperTitle.trim(),
        authors: newPaperAuthors.split(",").map((a) => a.trim()).filter(Boolean),
        year: parseInt(newPaperYear, 10) || undefined,
        journal: newPaperJournal.trim() || undefined,
        url: newPaperDoiUrl.trim() || undefined,
        discoveryPath: newPaperDiscoveryPath,
        discoveryNote: newPaperDiscoveryNote.trim() || undefined,
      });
      setPapers((prev) => [...prev, nextPaper]);
      setShowAddPaperDialog(false);
      setNewPaperTitle("");
      setNewPaperAuthors("");
      setNewPaperYear("");
      setNewPaperJournal("");
      setNewPaperDiscoveryPath("Academic Database");
      setNewPaperDiscoveryNote("");
      setNewPaperDoiUrl("");
      setDoiFetchError(null);
      toast.success(tr("Entry paper added", "已添加入门文献"));
    } catch {
      toast.error(tr("Failed to add entry paper", "添加入门文献失败"));
    }
  };

  const handleAddMultipleEntryPapers = async () => {
    const lines = bulkDoiInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;

    setBulkImporting(true);
    let imported = 0;
    let failed = 0;

    for (const line of lines) {
      const doi = extractDoiFromText(line);
      if (!doi) {
        failed += 1;
        continue;
      }

      try {
        const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
        if (!res.ok) {
          failed += 1;
          continue;
        }

        const json = (await res.json()) as {
          message: {
            title?: string[];
            author?: Array<{ given?: string; family?: string }>;
            published?: { "date-parts"?: number[][] };
            "container-title"?: string[];
            publisher?: string;
          };
        };

        const work = json.message;
        const title = work.title?.[0]?.trim();
        if (!title) {
          failed += 1;
          continue;
        }

        const authors = (work.author ?? []).map((a) => [a.given, a.family].filter(Boolean).join(" ")).filter(Boolean);
        const year = work.published?.["date-parts"]?.[0]?.[0];
        const journal = work["container-title"]?.[0] ?? work.publisher;

        const nextPaper = await createEntryPaper({
          title,
          authors,
          year,
          journal,
          url: `https://doi.org/${encodeURIComponent(doi)}`,
          discoveryPath: "Academic Database",
          discoveryNote: tr("Added from DOI in Step 3: Read", "通过 Step 3 DOI 导入"),
        });

        setPapers((prev) => [...prev, nextPaper]);
        imported += 1;
      } catch {
        failed += 1;
      }
    }

    setBulkImporting(false);
    setShowAddMultiplePaperDialog(false);
    setBulkDoiInput("");
    if (imported > 0) {
      toast.success(isZh ? `已添加 ${imported} 篇入门文献` : `Added ${imported} entry paper(s)`);
    }
    if (failed > 0) {
      toast.error(isZh ? `${failed} 行 DOI 导入失败` : `${failed} DOI row(s) failed`);
    }
  };

  return (
    <div className="w-full space-y-6">
      {loading && (
        <Card>
          <CardContent className="pt-6 text-sm text-gray-600">
            {tr("Loading papers...", "正在加载文献...")}
          </CardContent>
        </Card>
      )}

      {/* Alert if no papers */}
      {!loading && papers.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">
              {tr("No papers marked as entry or expanded. Go back to Step 2 to mark papers.", "当前没有标记为 Entry 或 Expanded 的文献，请回到 Step 2 进行标记。")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Papers List */}
      {papers.length > 0 && (
        <Tabs
          value={selectedTab}
          onValueChange={(v) => {
            setSelectedTab(v as "entry" | "expanded" | "all");
            setSelectedPaperIds([]);
          }}
        >
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/20 px-3 pt-5 pb-2">
              <TabsList className="flex w-auto flex-wrap justify-start gap-2 bg-transparent p-0">
                <TabsTrigger
                  value="all"
                  className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                >
                  {tr("All", "全部")} ({papers.length})
                </TabsTrigger>
                <TabsTrigger
                  value="entry"
                  className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                >
                  {tr("Entry", "入口文献")} ({papers.filter((p) => p.is_entry_paper).length})
                </TabsTrigger>
                <TabsTrigger
                  value="expanded"
                  className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                >
                  {tr("Expanded", "扩展文献")} ({papers.filter((p) => p.is_expanded_paper).length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {selectedTab === "entry" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      {tr("Add Paper", "添加文献")}
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => setShowAddPaperDialog(true)}>
                      {tr("Add One", "添加单篇")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowAddMultiplePaperDialog(true)}>
                      {tr("Add Multiple", "批量添加")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Select
                value={sortKey}
                onValueChange={(value) =>
                  setSortKey(value as "title" | "year" | "status" | "type")
                }
              >
                <SelectTrigger className="h-7 text-xs w-[130px]" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder={tr("Sort by", "排序方式")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">{tr("Sort: Title", "按标题")}</SelectItem>
                  <SelectItem value="year">{tr("Sort: Year", "按年份")}</SelectItem>
                  <SelectItem value="status">{tr("Sort: Status", "按状态")}</SelectItem>
                  <SelectItem value="type">{tr("Sort: Type", "按类型")}</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                className="inline-flex items-center h-7 px-2 text-xs rounded-md border border-slate-700/50 hover:bg-slate-800/60"
                onClick={(e) => {
                  e.stopPropagation();
                  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                }}
                title={tr("Toggle sort order", "切换排序顺序")}
              >
                <ArrowUpDown className="w-3 h-3 mr-1" />
                {sortOrder === "asc" ? tr("Asc", "升序") : tr("Desc", "降序")}
              </button>
            </div>
          </div>

          <TabsContent value={selectedTab} className="space-y-4">
            {sortedFilteredPapers.length > 0 && (
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg border transition-all",
                  selectedPaperIds.length > 0
                    ? "bg-slate-800/40 border-slate-700/70"
                    : "border-transparent"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  id="select-all-step3-papers"
                  checked={allVisibleSelected}
                  onCheckedChange={handleToggleSelectAllVisible}
                />
                <label
                  htmlFor="select-all-step3-papers"
                  className="text-xs text-slate-400 cursor-pointer select-none"
                >
                  {selectedPaperIds.length === 0
                    ? tr("Select all", "全选")
                    : isZh
                      ? `已选 ${selectedPaperIds.length} 项`
                      : `${selectedPaperIds.length} selected`}
                </label>
                {selectedPaperIds.length > 0 && (
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      type="button"
                      className="inline-flex items-center h-7 px-2 text-xs rounded-md border border-rose-400/40 text-rose-400 hover:bg-rose-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleBulkRemoveSelected();
                      }}
                    >
                      {tr("Remove Selected", "移除所选")}
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center h-7 px-2 text-xs rounded-md border border-slate-700/50 hover:bg-slate-800/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPaperIds([]);
                      }}
                    >
                      {tr("Clear", "清空")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {sortedFilteredPapers.map((paper) => (
              <Card
                key={paper.id}
                data-selected={selectedPaperIds.includes(paper.id)}
                className={cn(
                  "record-item border border-slate-700/50 hover:shadow-lg transition-shadow cursor-pointer",
                  selectedPaperIds.includes(paper.id) && "border-cyan-600/50"
                )}
                onClick={() => handleReadPaper(paper.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div onClick={(e) => e.stopPropagation()} className="pt-0.5">
                          <Checkbox
                            checked={selectedPaperIds.includes(paper.id)}
                            onCheckedChange={() => togglePaperSelection(paper.id)}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CardTitle className="text-lg transition-colors min-w-0 truncate record-item-title">
                            {paper.title}
                          </CardTitle>
                          <a
                            href={`https://scholar.google.com/scholar?q=${encodeURIComponent(paper.title)}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 text-slate-400 hover:text-blue-500 transition-colors"
                            title={tr("Search on Google Scholar", "在 Google Scholar 中搜索")}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          {(() => {
                            const dec = paperDecisionMap.get(paper.title.trim().toLowerCase());
                            if (!dec) return null;
                            return (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                    className="shrink-0 text-amber-500 hover:text-amber-600 transition-colors"
                                    title={tr("Previously processed", "此前已处理")}
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-64 p-3 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <p className="font-semibold text-slate-200 mb-1">{tr("Previously Processed", "历史处理记录")}</p>
                                  <p className="text-slate-400">{dec.decision}</p>
                                  <p className="text-[10px] text-slate-500 mt-1.5">
                                    {new Date(dec.timestamp).toLocaleDateString()}{" "}
                                    {new Date(dec.timestamp).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                </PopoverContent>
                              </Popover>
                            );
                          })()}
                        </div>
                        {paper.is_entry_paper && (
                          <span className="inline-flex h-6 items-center rounded-full border border-cyan-400/70 px-2 text-[11px] font-medium text-cyan-200 pointer-events-none">
                            {isZh ? "入门" : "entry"}
                          </span>
                        )}
                        {paper.is_expanded_paper && (
                          <span className="inline-flex h-6 items-center rounded-full border border-blue-500/70 px-2 text-[11px] font-medium text-blue-300 pointer-events-none">
                            {isZh ? "扩展" : "expanded"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {paper.authors.join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={paper.reading_status}
                          onValueChange={(value) =>
                            void handleUpdateReadingStatus(
                              paper,
                              value as Paper["reading_status"]
                            )
                          }
                        >
                          <SelectTrigger
                            className={`h-7 min-w-[110px] text-xs border ${
                              paper.reading_status === "Completed"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : paper.reading_status === "Reading"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {READING_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {paper.year && <span>{paper.year}</span>}
                    {paper.journal && <span>{paper.journal}</span>}
                  </div>

                  {/* Abstract */}
                  {paper.abstract && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {paper.abstract}
                    </p>
                  )}

                  {/* Discovery Note */}
                  {paper.discovery_note && (
                    <button
                      type="button"
                      className="block w-full rounded bg-slate-800/40 p-3 text-left text-sm italic text-slate-400 hover:bg-cyan-600/10 hover:text-cyan-200 transition-colors"
                      onClick={(e) => handleNoteClick(e, paper)}
                    >
                      {tr("Note", "备注")}: {paper.discovery_note}
                    </button>
                  )}

                  {/* Relevance if completed */}
                  {paper.reading_status === "Completed" && paper.relevance && (
                    <div className="text-sm">
                      <span className="text-gray-600">{tr("Relevance", "相关性")}: </span>
                      <Badge
                        variant="outline"
                        className={`${
                          paper.relevance === "high"
                            ? "bg-red-50 text-red-700"
                            : paper.relevance === "medium"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {paper.relevance === "high"
                          ? tr("High (Core)", "高（核心）")
                          : paper.relevance === "medium"
                          ? tr("Medium (Useful)", "中（有用）")
                          : tr("Low (Peripheral)", "低（外围）")}
                      </Badge>
                    </div>
                  )}

                </CardContent>
              </Card>
            ))}

            {sortedFilteredPapers.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>{tr("No papers in this category", "该分类下暂无文献")}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={showAddPaperDialog} onOpenChange={setShowAddPaperDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{tr("Add Entry Paper", "添加入门文献")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{tr("DOI or URL (optional)", "DOI 或 URL（可选）")}</label>
              <div className="flex gap-2">
                <Input value={newPaperDoiUrl} onChange={(e) => setNewPaperDoiUrl(e.target.value)} placeholder="https://doi.org/..." className="text-sm" />
                <Button type="button" variant="outline" className="text-xs" disabled={doiFetching || !newPaperDoiUrl.trim()} onClick={() => void handleFetchByDoiUrl()}>
                  <Sparkles className="w-3 h-3 mr-1" />
                  {doiFetching ? tr("Fetching...", "获取中...") : tr("Auto-fill", "自动填充")}
                </Button>
              </div>
              {doiFetchError ? <p className="text-[11px] text-rose-500">{doiFetchError}</p> : null}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{tr("Title", "标题")}</label>
              <Input value={newPaperTitle} onChange={(e) => setNewPaperTitle(e.target.value)} placeholder={tr("Paper title...", "文献标题...")} className="text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{tr("Authors (comma-separated)", "作者（用逗号分隔）")}</label>
              <Input value={newPaperAuthors} onChange={(e) => setNewPaperAuthors(e.target.value)} placeholder={tr("Author 1, Author 2...", "作者1, 作者2...")} className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{tr("Year", "年份")}</label>
                <Input type="number" value={newPaperYear} onChange={(e) => setNewPaperYear(e.target.value)} placeholder="2024" className="text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{tr("Journal", "期刊")}</label>
                <Input value={newPaperJournal} onChange={(e) => setNewPaperJournal(e.target.value)} placeholder={tr("Journal name...", "期刊名称...")} className="text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{tr("Discovery Path", "发现路径")}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {DISCOVERY_PATH_OPTIONS.map((path) => (
                  <label
                    key={path}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all",
                      newPaperDiscoveryPath === path
                        ? "border-cyan-400 bg-cyan-50/50"
                        : "border-slate-700/50 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="new-paper-discovery-step3"
                      checked={newPaperDiscoveryPath === path}
                      onChange={() => setNewPaperDiscoveryPath(path)}
                      className="accent-cyan-600"
                    />
                    {discoveryPathLabel(path)}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{tr("Discovery Note", "发现备注")}</label>
              <Textarea value={newPaperDiscoveryNote} onChange={(e) => setNewPaperDiscoveryNote(e.target.value)} rows={2} placeholder={tr("How did you find this paper?", "你是如何发现这篇文献的？")} className="text-xs" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs" onClick={() => void handleAddEntryPaper()}>
                <Plus className="w-3 h-3 mr-1" />
                {tr("Add Paper", "添加文献")}
              </Button>
              <Button variant="ghost" className="text-xs" onClick={() => setShowAddPaperDialog(false)}>
                {tr("Cancel", "取消")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAddMultiplePaperDialog}
        onOpenChange={(open) => {
          setShowAddMultiplePaperDialog(open);
          if (!open) {
            setBulkDoiInput("");
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{tr("Add Multiple Entry Papers", "批量添加入门文献")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">{tr("DOI links (one per line)", "DOI 链接（每行一个）")}</label>
              <Textarea
                value={bulkDoiInput}
                onChange={(e) => setBulkDoiInput(e.target.value)}
                rows={8}
                placeholder={"https://doi.org/10.xxxx/xxxx\n10.1145/1234567"}
                className="text-xs font-mono"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                onClick={() => void handleAddMultipleEntryPapers()}
                disabled={bulkImporting || !bulkDoiInput.trim()}
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {bulkImporting ? tr("Importing...", "导入中...") : tr("Import by DOI", "按 DOI 导入")}
              </Button>
              <Button variant="ghost" className="text-xs" onClick={() => setShowAddMultiplePaperDialog(false)}>
                {tr("Cancel", "取消")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
