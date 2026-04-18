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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ArrowUpDown, BookOpen, Clock, ExternalLink } from "lucide-react";
import { paperAPI } from "@/lib/manuscript-api";
import type { Paper } from "@/lib/manuscript-api";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
      toast.success(`Reading status updated to ${nextStatus}`);
    } catch (error) {
      console.error("Failed to update reading status:", error);
      toast.error("Failed to update reading status");
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
        ? `Remove ${targets.length} selected paper(s) from Entry?`
        : selectedTab === "expanded"
          ? `Remove ${targets.length} selected paper(s) from Expanded?`
          : `Remove ${targets.length} selected paper(s) from the Step 3 reading list?`;

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
      toast.success("Selected papers removed successfully");
    } catch (error) {
      console.error("Failed to remove selected papers:", error);
      toast.error("Failed to remove selected papers");
    }
  };

  return (
    <div className="w-full space-y-6">
      {loading && (
        <Card>
          <CardContent className="pt-6 text-sm text-gray-600">
            Loading papers...
          </CardContent>
        </Card>
      )}

      {/* Alert if no papers */}
      {!loading && papers.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">
              No papers marked as entry or expanded. Go back to Step 2 to mark papers.
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
                  All ({papers.length})
                </TabsTrigger>
                <TabsTrigger
                  value="entry"
                  className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                >
                  Entry ({papers.filter((p) => p.is_entry_paper).length})
                </TabsTrigger>
                <TabsTrigger
                  value="expanded"
                  className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                >
                  Expanded ({papers.filter((p) => p.is_expanded_paper).length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Select
                value={sortKey}
                onValueChange={(value) =>
                  setSortKey(value as "title" | "year" | "status" | "type")
                }
              >
                <SelectTrigger className="h-7 text-xs w-[130px]" onClick={(e) => e.stopPropagation()}>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Sort: Title</SelectItem>
                  <SelectItem value="year">Sort: Year</SelectItem>
                  <SelectItem value="status">Sort: Status</SelectItem>
                  <SelectItem value="type">Sort: Type</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                className="inline-flex items-center h-7 px-2 text-xs rounded-md border border-slate-700/50 hover:bg-slate-800/60"
                onClick={(e) => {
                  e.stopPropagation();
                  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                }}
                title="Toggle sort order"
              >
                <ArrowUpDown className="w-3 h-3 mr-1" />
                {sortOrder === "asc" ? "Asc" : "Desc"}
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
                    ? "Select all"
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
                      Remove Selected
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center h-7 px-2 text-xs rounded-md border border-slate-700/50 hover:bg-slate-800/60"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPaperIds([]);
                      }}
                    >
                      Clear
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
                  selectedPaperIds.includes(paper.id) && "border-violet-600/50"
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
                            title="Search on Google Scholar"
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
                                    title="Previously processed"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-64 p-3 text-xs"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <p className="font-semibold text-slate-200 mb-1">Previously Processed</p>
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
                            entry
                          </span>
                        )}
                        {paper.is_expanded_paper && (
                          <span className="inline-flex h-6 items-center rounded-full border border-blue-500/70 px-2 text-[11px] font-medium text-blue-300 pointer-events-none">
                            expanded
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
                      className="block w-full rounded bg-slate-800/40 p-3 text-left text-sm italic text-slate-400 hover:bg-violet-600/10 hover:text-cyan-200 transition-colors"
                      onClick={(e) => handleNoteClick(e, paper)}
                    >
                      Note: {paper.discovery_note}
                    </button>
                  )}

                  {/* Relevance if completed */}
                  {paper.reading_status === "Completed" && paper.relevance && (
                    <div className="text-sm">
                      <span className="text-gray-600">Relevance: </span>
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
                          ? "High (Core)"
                          : paper.relevance === "medium"
                          ? "Medium (Useful)"
                          : "Low (Peripheral)"}
                      </Badge>
                    </div>
                  )}

                </CardContent>
              </Card>
            ))}

            {sortedFilteredPapers.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No papers in this category</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
