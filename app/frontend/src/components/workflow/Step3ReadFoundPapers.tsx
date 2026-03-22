/**
 * Step 3: Read Found Papers
 * Display entry papers and expanded papers for reading
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, ArrowRight, AlertCircle, Trash2 } from "lucide-react";
import { paperAPI, noteAPI, highlightAPI } from "@/lib/manuscript-api";
import type { Paper } from "@/lib/manuscript-api";
import type { Artifact } from "@/lib/data";

interface Step3Props {
  projectId: string;
}

export default function Step3ReadFoundPapers({ projectId }: Step3Props) {
  const ARTIFACTS_STORAGE_KEY = "rw-artifacts";
  const ARTIFACTS_UPDATED_EVENT = "artifacts-updated";
  const READING_STATUSES: Array<Paper["reading_status"]> = ["To Read", "Reading", "Completed"];
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"entry" | "expanded" | "all">(
    "all"
  );

  const getLiteratureArtifactId = (paperId: string) => `entry-paper-${paperId}`;

  const paperToLiteratureArtifact = (paper: Paper): Artifact => ({
    id: getLiteratureArtifactId(paper.id),
    title: paper.title,
    type: "entry-paper",
    projectId: paper.project_id,
    sourceStep: 3,
    description: [
      paper.is_entry_paper ? "Entry Paper" : null,
      paper.is_expanded_paper ? "Expanded Paper" : null,
      paper.journal,
      paper.year ? String(paper.year) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    updatedAt: new Date().toISOString().split("T")[0],
    content: JSON.stringify(
      {
        authors: paper.authors,
        journal: paper.journal,
        year: paper.year,
        discoveryPath: paper.discovery_path,
        discoveryNote: paper.discovery_note,
        readingStatus: paper.reading_status,
        paperKind: {
          entry: paper.is_entry_paper,
          expanded: paper.is_expanded_paper,
        },
      },
      null,
      2
    ),
  });

  const persistArtifacts = (updater: (prev: Artifact[]) => Artifact[]) => {
    if (typeof window === "undefined") return;

    let existing: Artifact[] = [];
    try {
      const saved = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      existing = Array.isArray(parsed) ? parsed : [];
    } catch {
      existing = [];
    }

    const next = updater(existing);
    window.localStorage.setItem(ARTIFACTS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(ARTIFACTS_UPDATED_EVENT));
  };

  const syncLiteratureArtifacts = (items: Paper[]) => {
    persistArtifacts((prev) => {
      const otherArtifacts = prev.filter(
        (artifact) =>
          artifact.type !== "entry-paper" || artifact.projectId !== projectId
      );
      const literatureArtifacts = items
        .filter((paper) => paper.is_entry_paper || paper.is_expanded_paper)
        .map(paperToLiteratureArtifact);
      return [...otherArtifacts, ...literatureArtifacts];
    });
  };

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
      syncLiteratureArtifacts(readingPapers);
    } catch (error) {
      console.error("Failed to load papers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPapers = papers.filter((paper) => {
    if (selectedTab === "entry") return paper.is_entry_paper;
    if (selectedTab === "expanded") return paper.is_expanded_paper;
    return true;
  });

  const handleReadPaper = (paperId: string) => {
    navigate(`/paper-read/${projectId}/${paperId}`);
  };

  const handleJumpToEntryArtifacts = () => {
    navigate("/artifacts?tab=literature");
  };

  const handleJumpToSearchRecord = (paper: Paper) => {
    const rawNote = (paper.discovery_note || "").trim();
    if (!rawNote) return;

    const query = rawNote.startsWith("From Search Record:")
      ? rawNote.replace("From Search Record:", "").trim()
      : rawNote;

    navigate(
      `/workflow/${projectId}/2?tab=search&searchQuery=${encodeURIComponent(query)}`
    );
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
      syncLiteratureArtifacts(nextPapers);
      toast.success(`Reading status updated to ${nextStatus}`);
    } catch (error) {
      console.error("Failed to update reading status:", error);
      toast.error("Failed to update reading status");
    }
  };

  const handleRemovePaperRole = async (
    paper: Paper,
    role: "entry" | "expanded"
  ) => {
    const nextPatch =
      role === "entry"
        ? { is_entry_paper: false }
        : { is_expanded_paper: false };

    let relatedNotesCount = 0;
    let relatedHighlightsCount = 0;
    let literatureArtifactExists = false;
    const hasPdfAttachment = Boolean(paper.pdf_path);

    try {
      const notes = await noteAPI.list(paper.id);
      relatedNotesCount = notes.length;
    } catch {
      relatedNotesCount = 0;
    }

    try {
      const highlights = await highlightAPI.list(paper.id);
      relatedHighlightsCount = highlights.length;
    } catch {
      relatedHighlightsCount = 0;
    }

    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        const artifacts = Array.isArray(parsed) ? parsed : [];
        literatureArtifactExists = artifacts.some(
          (artifact) => artifact.id === getLiteratureArtifactId(paper.id)
        );
      } catch {
        literatureArtifactExists = false;
      }
    }

    const warningDetails = [
      relatedHighlightsCount > 0 ? `${relatedHighlightsCount} highlight(s)` : null,
      relatedNotesCount > 0 ? `${relatedNotesCount} note(s)` : null,
      hasPdfAttachment ? "a PDF file" : null,
      literatureArtifactExists ? "a Literature artifact entry" : null,
    ].filter(Boolean);

    const confirmationMessage = warningDetails.length
      ? `This paper is connected to ${warningDetails.join(", ")}. Removing it from ${role} papers will remove it from this reading list, but the attached materials may still need your attention. Continue?`
      : `Remove this paper from ${role} papers? It will no longer appear in this reading list.`;

    const confirmed = window.confirm(confirmationMessage);
    if (!confirmed) return;

    try {
      const updated = await paperAPI.update(paper.id, nextPatch);
      const nextPapers = papers
        .map((item) => (item.id === paper.id ? updated : item))
        .filter((item) => item.is_entry_paper || item.is_expanded_paper);
      setPapers(nextPapers);
      syncLiteratureArtifacts(nextPapers);
      toast.success(
        role === "entry"
          ? "Removed from entry papers"
          : "Removed from expanded papers"
      );
    } catch (error) {
      console.error("Failed to update paper role:", error);
      toast.error("Failed to update paper status");
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Read Found Papers</h1>
            <p className="text-gray-600">
              Deep read and annotate your entry and expanded papers
            </p>
          </div>
        </div>
      </div>

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
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">
              All ({papers.length})
            </TabsTrigger>
            <TabsTrigger value="entry">
              Entry ({papers.filter((p) => p.is_entry_paper).length})
            </TabsTrigger>
            <TabsTrigger value="expanded">
              Expanded ({papers.filter((p) => p.is_expanded_paper).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4">
            {filteredPapers.map((paper) => (
              <Card
                key={paper.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleReadPaper(paper.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg hover:text-blue-600 transition-colors">
                        {paper.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-2">
                        {paper.authors.join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {paper.is_entry_paper && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJumpToEntryArtifacts();
                          }}
                          className="inline-flex"
                        >
                          <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 cursor-pointer">
                            Entry Paper
                          </Badge>
                        </button>
                      )}
                      {paper.is_expanded_paper && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Expanded
                        </Badge>
                      )}
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
                            className={`h-8 min-w-[128px] text-xs border ${
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
                      className="block w-full rounded bg-gray-50 p-3 text-left text-sm italic text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToSearchRecord(paper);
                      }}
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

                  {/* Read Button */}
                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    {paper.is_entry_paper && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-rose-600 hover:text-rose-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRemovePaperRole(paper, "entry");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove from Entry
                      </Button>
                    )}
                    {paper.is_expanded_paper && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-rose-600 hover:text-rose-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRemovePaperRole(paper, "expanded");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove from Expanded
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReadPaper(paper.id);
                      }}
                    >
                      Open for Reading <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredPapers.length === 0 && (
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
