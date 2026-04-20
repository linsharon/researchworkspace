/**
 * Paper Tools Area - Right side
 * Notes list + Highlights list + AI-related forms
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, Search } from "lucide-react";
import { highlightAPI, noteAPI } from "@/lib/manuscript-api";
import type { Highlight, Paper, Note } from "@/lib/manuscript-api";
import { cn } from "@/lib/utils";
import { LiteratureNoteForm } from "./LiteratureNoteForm";
import type { LiteratureNote } from "./LiteratureNoteForm";
import { PermanentNoteForm } from "./PermanentNoteForm";
import type { NoteOption, PermanentNote } from "./PermanentNoteForm";
import { useI18n } from "@/lib/i18n";

interface PaperToolsAreaProps {
  paper: Paper;
  projectId?: string;
  highlightPulse?: number;
  focusNoteId?: string;
  onChanged: () => void;
}

const NOTES_UPDATED_EVENT = "notes-updated";
const HIGHLIGHTS_UPDATED_EVENT = "highlights-updated";
const HIGHLIGHT_SUMMARY_FORM_TYPE = "HighlightSummaryNote";
const HIGHLIGHT_SUMMARY_TITLE = "Highlight Note";

function formatHighlightDate(value: string) {
  return value.includes("T") ? value.split("T")[0] : value;
}

function parseFormType(content?: string): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return typeof parsed?.formType === "string" ? parsed.formType : null;
  } catch {
    return null;
  }
}

function tryParseJson(content?: string): Record<string, unknown> | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function getHighlightTitle(item: Highlight) {
  const pageText = item.page ? `p.${item.page}` : "p.-";
  const snippet = item.text.trim().replace(/\s+/g, " ").slice(0, 56);
  return `${pageText} ${snippet}${item.text.trim().length > 56 ? "..." : ""}`;
}

export default function PaperToolsArea({
  paper,
  projectId = "proj-1",
  highlightPulse = 0,
  focusNoteId,
  onChanged,
}: PaperToolsAreaProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [highlightError, setHighlightError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "highlights">("notes");
  const [showAddLiteratureDialog, setShowAddLiteratureDialog] = useState(false);
  const [showAddPermanentDialog, setShowAddPermanentDialog] = useState(false);
  const [projectNotes, setProjectNotes] = useState<Note[]>([]);
  const [noteSearch, setNoteSearch] = useState("");
  const [highlightSearch, setHighlightSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);

  // For editing existing notes
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    content: "",
    page: "",
    keywords: "",
    note_type: "literature-note" as "literature-note" | "permanent-note",
  });

  const syncingSummaryRef = useRef(false);

  const loadNotes = useCallback(async () => {
    try {
      setNotesLoading(true);
      setNoteError(null);
      const [paperNotes, allProjectNotes] = await Promise.all([
        noteAPI.list(paper.id),
        noteAPI.listByProject(projectId).catch(() => []),
      ]);
      setNotes(paperNotes);
      setProjectNotes(allProjectNotes);
    } catch (error) {
      console.error("Failed to load notes:", error);
      setNoteError("Failed to load saved notes.");
    } finally {
      setNotesLoading(false);
    }
  }, [paper.id, projectId]);

  const loadHighlights = useCallback(async () => {
    try {
      setHighlightsLoading(true);
      setHighlightError(null);
      const saved = await highlightAPI.list(paper.id);
      const sorted = [...saved].sort((a, b) => {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      setHighlights(sorted);
    } catch (error) {
      console.error("Failed to load highlights:", error);
      setHighlightError("Failed to load highlights.");
    } finally {
      setHighlightsLoading(false);
    }
  }, [paper.id]);

  useEffect(() => {
    loadNotes();
    loadHighlights();
  }, [loadNotes, loadHighlights]);

  useEffect(() => {
    const handleNotesUpdated = () => {
      loadNotes();
    };

    const handleHighlightsUpdated = () => {
      loadHighlights();
      setActiveTab("highlights");
    };

    window.addEventListener(NOTES_UPDATED_EVENT, handleNotesUpdated);
    window.addEventListener(HIGHLIGHTS_UPDATED_EVENT, handleHighlightsUpdated);
    return () => {
      window.removeEventListener(NOTES_UPDATED_EVENT, handleNotesUpdated);
      window.removeEventListener(HIGHLIGHTS_UPDATED_EVENT, handleHighlightsUpdated);
    };
  }, [loadNotes, loadHighlights]);

  useEffect(() => {
    if (highlightPulse > 0) {
      setActiveTab("highlights");
      loadHighlights();
    }
  }, [highlightPulse, loadHighlights]);

  useEffect(() => {
    if (!focusNoteId) return;
    if (!notes.some((note) => note.id === focusNoteId)) return;

    setActiveTab("notes");
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`paper-note-${focusNoteId}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [focusNoteId, notes]);

  const findHighlightSummaryNote = useCallback(
    (items: Note[]) => {
      return items.find((note) => {
        if (note.title === HIGHLIGHT_SUMMARY_TITLE) return true;
        if ((note.keywords || []).includes("highlight-summary")) return true;
        return parseFormType(note.content) === HIGHLIGHT_SUMMARY_FORM_TYPE;
      });
    },
    []
  );

  const syncHighlightSummaryNote = useCallback(async () => {
    if (syncingSummaryRef.current || notesLoading || highlightsLoading) {
      return;
    }

    const existingSummary = findHighlightSummaryNote(notes);

    if (highlights.length === 0) {
      if (existingSummary) {
        syncingSummaryRef.current = true;
        try {
          await noteAPI.delete(existingSummary.id);
          window.dispatchEvent(new CustomEvent(NOTES_UPDATED_EVENT));
        } catch (error) {
          console.error("Failed to remove highlight summary note:", error);
        } finally {
          syncingSummaryRef.current = false;
        }
      }
      return;
    }

    const summaryLines = highlights.map((item, index) => {
      const pageText = item.page ? `p.${item.page}` : "p.-";
      return `${index + 1}. [${pageText}] ${item.text}`;
    });

    const summaryDescription = `${highlights.length} highlights from ${paper.title}`;
    const summaryPayload = {
      formType: HIGHLIGHT_SUMMARY_FORM_TYPE,
      title: HIGHLIGHT_SUMMARY_TITLE,
      paperId: paper.id,
      highlightCount: highlights.length,
      items: highlights.map((item) => ({
        id: item.id,
        text: item.text,
        page: item.page,
        color: item.color,
        created_at: item.created_at,
      })),
      mergedText: summaryLines.join("\n\n"),
    };
    const summaryContent = JSON.stringify(summaryPayload, null, 2);
    const summaryPage = highlights.find((item) => typeof item.page === "number")?.page;

    syncingSummaryRef.current = true;
    try {
      if (existingSummary) {
        const existingKeywords = existingSummary.keywords || [];
        const nextKeywords = Array.from(new Set(["highlights", "highlight-summary", ...existingKeywords]));
        const needsUpdate =
          existingSummary.description !== summaryDescription ||
          existingSummary.content !== summaryContent ||
          existingSummary.page !== summaryPage ||
          JSON.stringify(existingKeywords) !== JSON.stringify(nextKeywords);

        if (needsUpdate) {
          await noteAPI.update(existingSummary.id, {
            title: HIGHLIGHT_SUMMARY_TITLE,
            description: summaryDescription,
            content: summaryContent,
            page: summaryPage,
            keywords: nextKeywords,
            note_type: "literature-note",
          });
          window.dispatchEvent(new CustomEvent(NOTES_UPDATED_EVENT));
        }
      } else {
        await noteAPI.create({
          paper_id: paper.id,
          project_id: projectId,
          title: HIGHLIGHT_SUMMARY_TITLE,
          description: summaryDescription,
          content: summaryContent,
          page: summaryPage,
          keywords: ["highlights", "highlight-summary"],
          citations: [],
          note_type: "literature-note",
        });
        window.dispatchEvent(new CustomEvent(NOTES_UPDATED_EVENT));
      }
    } catch (error) {
      console.error("Failed to sync highlight summary note:", error);
    } finally {
      syncingSummaryRef.current = false;
    }
  }, [
    findHighlightSummaryNote,
    highlights,
    highlightsLoading,
    notes,
    notesLoading,
    paper.id,
    paper.title,
    projectId,
  ]);

  useEffect(() => {
    syncHighlightSummaryNote();
  }, [syncHighlightSummaryNote]);

  const handleAddLiteratureFormNote = async (note: LiteratureNote) => {
    try {
      setNoteError(null);
      const parsedPage = Number.parseInt(note.pageNumber, 10);

      await noteAPI.create({
        paper_id: paper.id,
        project_id: projectId,
        title: note.title.trim(),
        description: note.contentGist.trim(),
        note_type: "literature-note",
        page: Number.isNaN(parsedPage) ? undefined : parsedPage,
        keywords: [
          ...(paper.url?.trim() ? [paper.url.trim()] : []),
          ...note.keywords,
        ],
        citations: [],
        content: JSON.stringify(
          {
            formType: "LiteratureNoteForm",
            ...note,
          },
          null,
          2
        ),
      });

      await loadNotes();
      setShowAddLiteratureDialog(false);
      setActiveTab("notes");
      onChanged();
      window.dispatchEvent(new CustomEvent(NOTES_UPDATED_EVENT));
    } catch (error) {
      console.error("Failed to create literature note:", error);
      setNoteError("Failed to save literature note. Please try again.");
    }
  };

  const handleAddPermanentFormNote = async (note: PermanentNote) => {
    try {
      setNoteError(null);

      const citationIds = Array.from(
        new Set(
          [...note.links.map((link) => link.targetNoteId), note.evidenceLiteratureNoteId].filter(Boolean)
        )
      );

      await noteAPI.create({
        paper_id: paper.id,
        project_id: projectId,
        title: note.atomicTitle.trim(),
        description: note.retrievalTrigger.trim() || note.mainArgument.trim().slice(0, 180),
        note_type: "permanent-note",
        page: undefined,
        keywords: [
          ...(note.retrievalTrigger.trim() ? [note.retrievalTrigger.trim()] : []),
          ...note.keywords,
        ],
        citations: citationIds,
        content: JSON.stringify(
          {
            formType: "PermanentNoteForm",
            ...note,
          },
          null,
          2
        ),
      });

      await loadNotes();
      setShowAddPermanentDialog(false);
      setActiveTab("notes");
      onChanged();
      window.dispatchEvent(new CustomEvent(NOTES_UPDATED_EVENT));
    } catch (error) {
      console.error("Failed to create permanent note:", error);
      setNoteError("Failed to save permanent note. Please try again.");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      setNoteError(null);
      await noteAPI.delete(noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
      onChanged();
      window.dispatchEvent(new CustomEvent(NOTES_UPDATED_EVENT));
    } catch (error) {
      console.error("Failed to delete note:", error);
      setNoteError("Failed to delete note. Please try again.");
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    try {
      setHighlightError(null);
      await highlightAPI.delete(highlightId);
      setHighlights((prev) => prev.filter((item) => item.id !== highlightId));
      onChanged();
      window.dispatchEvent(new CustomEvent(HIGHLIGHTS_UPDATED_EVENT));
    } catch (error) {
      console.error("Failed to delete highlight:", error);
      setHighlightError("Failed to delete highlight. Please try again.");
    }
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setEditForm({
      title: note.title,
      description: note.description || "",
      content: note.content || "",
      page: note.page !== undefined ? String(note.page) : "",
      keywords: (note.keywords || []).join(", "),
      note_type: note.note_type,
    });
  };

  const handleEditNote = async () => {
    if (!editingNote || !editForm.title.trim()) return;
    try {
      setNoteError(null);
      const updated = await noteAPI.update(editingNote.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || undefined,
        content: editForm.content.trim() || undefined,
        page: editForm.page ? parseInt(editForm.page) : undefined,
        keywords: editForm.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        note_type: editForm.note_type,
      });
      setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
      setEditingNote(null);
      onChanged();
      window.dispatchEvent(new CustomEvent(NOTES_UPDATED_EVENT));
    } catch (error) {
      console.error("Failed to update note:", error);
      setNoteError("Failed to update note. Please try again.");
    }
  };

  const linkableNoteOptions: NoteOption[] = projectNotes.map((note) => ({
    id: note.id,
    label: `${note.id} - ${note.title}`,
  }));

  const evidenceNoteOptions: NoteOption[] = projectNotes
    .filter((note) => note.note_type === "literature-note")
    .map((note) => ({
      id: note.id,
      label: `${note.id} - ${note.title}`,
    }));

  const filteredNotes = notes.filter((note) => {
    const query = noteSearch.trim().toLowerCase();
    if (!query) return true;
    const haystack = [note.title, note.description || "", note.content || "", ...(note.keywords || [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  const filteredHighlights = highlights.filter((item) => {
    const query = highlightSearch.trim().toLowerCase();
    if (!query) return true;
    return `${getHighlightTitle(item)} ${item.text}`.toLowerCase().includes(query);
  });

  const selectedNoteContent = tryParseJson(selectedNote?.content);

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Tabs */}
      <div className="border-b bg-[#0d1b30] flex-shrink-0">
        <div className="flex divide-x">
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "notes"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-white hover:text-cyan-300 border-b-2 border-white/30"
            }`}
          >
            Notes ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab("highlights")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "highlights"
                ? "text-cyan-400 border-b-2 border-cyan-400"
                : "text-white hover:text-cyan-300 border-b-2 border-white/30"
            }`}
          >
            Highlights ({highlights.length})
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Notes Tab */}
        {activeTab === "notes" && (
          <div className="flex flex-col h-full">
            {/* Add Note Button */}
            <div className="p-3 border-b flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full gap-2 h-8 text-sm">
                    <Plus className="h-4 w-4" />
                    Add Note
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => setShowAddLiteratureDialog(true)}>
                    {isZh ? "文献笔记" : "Literature Note"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAddPermanentDialog(true)}>
                    {isZh ? "永久笔记" : "Permanent Note"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="p-3 border-b flex-shrink-0">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9 text-sm"
                  onChange={(e) => setNoteSearch(e.target.value)}
                  placeholder={isZh ? "搜索这篇论文的阅读笔记" : "Search notes for this paper"}
                  value={noteSearch}
                />
              </div>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {noteError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {noteError}
                </div>
              )}
              {notesLoading && (
                <div className="rounded-md bg-slate-800 border border-slate-700/50 p-2 text-xs text-slate-600">
                  Loading saved notes...
                </div>
              )}
              {!notesLoading && notes.length === 0 && !noteError && (
                <div className="rounded-md bg-slate-800 border border-slate-700/50 p-2 text-xs text-white">
                  No saved notes for this paper yet.
                </div>
              )}
              {!notesLoading && notes.length > 0 && filteredNotes.length === 0 && !noteError && (
                <div className="rounded-md bg-slate-800 border border-slate-700/50 p-2 text-xs text-white">
                  No matching notes.
                </div>
              )}
              {filteredNotes.map((note) => (
                <Card
                  key={note.id}
                  id={`paper-note-${note.id}`}
                  className={cn(
                    "border-slate-700/60 bg-[#0d1b30] text-white transition-all duration-200 hover:border-cyan-400/80 hover:shadow-sm",
                    (focusNoteId === note.id || selectedNote?.id === note.id) && "border-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
                  )}
                >
                  <button
                    className="block w-full text-left"
                    onClick={() => setSelectedNote(note)}
                    type="button"
                  >
                    <CardHeader className="py-3">
                      <CardTitle
                        className={cn(
                          "text-sm text-white transition-colors underline-offset-2",
                          (focusNoteId === note.id || selectedNote?.id === note.id) ? "text-cyan-400 underline" : "hover:text-cyan-400 hover:underline"
                        )}
                      >
                        {note.title}
                      </CardTitle>
                    </CardHeader>
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Highlights Tab */}
        {activeTab === "highlights" && (
          <div className="p-3 space-y-2 h-full flex flex-col">
            <div className="relative flex-shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 text-sm"
                onChange={(e) => setHighlightSearch(e.target.value)}
                placeholder={isZh ? "搜索这篇论文的高亮内容" : "Search highlights for this paper"}
                value={highlightSearch}
              />
            </div>
            <div className="space-y-2 overflow-auto">
            {highlightError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {highlightError}
              </div>
            )}
            {highlightsLoading && (
              <div className="rounded-md bg-slate-800 border border-slate-700/50 p-2 text-xs text-slate-600">
                Loading highlights...
              </div>
            )}
            {!highlightsLoading && highlights.length === 0 && !highlightError && (
              <div className="rounded-md bg-slate-800 border border-slate-700/50 p-2 text-xs text-white">
                No highlights yet. Select text in PDF and click Highlight.
              </div>
            )}
            {!highlightsLoading && highlights.length > 0 && filteredHighlights.length === 0 && !highlightError && (
              <div className="rounded-md bg-slate-800 border border-slate-700/50 p-2 text-xs text-white">
                No matching highlights.
              </div>
            )}
            {filteredHighlights.map((item) => (
              <Card
                key={item.id}
                className={cn(
                  "border-slate-700/60 bg-[#0d1b30] text-white transition-all duration-200 hover:border-cyan-400/80 hover:shadow-sm",
                  selectedHighlight?.id === item.id && "border-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
                )}
              >
                <button
                  className="block w-full text-left"
                  onClick={() => setSelectedHighlight(item)}
                  type="button"
                >
                  <CardHeader className="py-3">
                    <CardTitle
                      className={cn(
                        "text-sm text-white transition-colors underline-offset-2",
                        selectedHighlight?.id === item.id ? "text-cyan-400 underline" : "hover:text-cyan-400 hover:underline"
                      )}
                    >
                      {getHighlightTitle(item)}
                    </CardTitle>
                  </CardHeader>
                </button>
              </Card>
            ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isZh ? "阅读笔记" : "Read Note"}</DialogTitle>
          </DialogHeader>
          {selectedNote ? (
            <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedNote.title}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedNote.note_type === "literature-note" ? "Literature Note" : "Permanent Note"}</Badge>
                  {selectedNote.page ? <Badge variant="outline">p.{selectedNote.page}</Badge> : null}
                  <Badge variant="outline">Created {formatHighlightDate(selectedNote.created_at)}</Badge>
                  <Badge variant="outline">Updated {formatHighlightDate(selectedNote.updated_at)}</Badge>
                </div>
              </div>

              {selectedNote.description ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isZh ? "描述" : "Description"}</p>
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{selectedNote.description}</p>
                </div>
              ) : null}

              {selectedNote.keywords?.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isZh ? "关键词" : "Keywords"}</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedNote.keywords.map((keyword) => (
                      <Badge key={keyword} variant="outline">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedNoteContent ? (
                <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isZh ? "结构化内容" : "Structured Content"}</p>
                  {Object.entries(selectedNoteContent).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-xs font-medium text-slate-500">{key}</p>
                      <div className="whitespace-pre-wrap break-words text-sm text-slate-800">
                        {Array.isArray(value) ? value.join(", ") : typeof value === "object" && value !== null ? JSON.stringify(value, null, 2) : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedNote.content ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isZh ? "内容" : "Content"}</p>
                  <div className="rounded-lg border bg-slate-50 p-4 whitespace-pre-wrap break-words text-sm text-slate-800">
                    {selectedNote.content}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => {
                    setSelectedNote(null);
                    openEditNote(selectedNote);
                  }}
                  size="sm"
                  variant="outline"
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  onClick={async () => {
                    await handleDeleteNote(selectedNote.id);
                    setSelectedNote(null);
                  }}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedHighlight} onOpenChange={(open) => !open && setSelectedHighlight(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isZh ? "阅读高亮内容" : "Read Highlight"}</DialogTitle>
          </DialogHeader>
          {selectedHighlight ? (
            <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{getHighlightTitle(selectedHighlight)}</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">{selectedHighlight.page ? `p.${selectedHighlight.page}` : "p.-"}</Badge>
                  <Badge variant="secondary">{formatHighlightDate(selectedHighlight.created_at)}</Badge>
                  <Badge variant="outline">{selectedHighlight.color}</Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isZh ? "高亮文本" : "Highlighted Text"}</p>
                <div className="rounded-lg border bg-amber-50 p-4 whitespace-pre-wrap break-words text-sm text-slate-800">
                  {selectedHighlight.text}
                </div>
              </div>

              {selectedHighlight.note ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{isZh ? "附加笔记" : "Attached Note"}</p>
                  <div className="rounded-lg border bg-slate-50 p-4 whitespace-pre-wrap break-words text-sm text-slate-800">
                    {selectedHighlight.note}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={async () => {
                    await handleDeleteHighlight(selectedHighlight.id);
                    setSelectedHighlight(null);
                  }}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Add Literature Note Dialog */}
      <Dialog open={showAddLiteratureDialog} onOpenChange={setShowAddLiteratureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isZh ? "添加文献笔记" : "Add Literature Note"}</DialogTitle>
          </DialogHeader>
          <LiteratureNoteForm paper={paper} onSubmit={handleAddLiteratureFormNote} />
        </DialogContent>
      </Dialog>

      {/* Add Permanent Note Dialog */}
      <Dialog open={showAddPermanentDialog} onOpenChange={setShowAddPermanentDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{isZh ? "添加永久笔记" : "Add Permanent Note"}</DialogTitle>
          </DialogHeader>
          <PermanentNoteForm
            existingNoteOptions={linkableNoteOptions}
            literatureNoteOptions={evidenceNoteOptions}
            onSubmit={handleAddPermanentFormNote}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog
        open={!!editingNote}
        onOpenChange={(open) => {
          if (!open) setEditingNote(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isZh ? "编辑笔记" : "Edit Note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Title *</label>
              <Input
                placeholder={isZh ? "笔记标题" : "Note title"}
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">{isZh ? "描述" : "Description"}</label>
              <Textarea
                placeholder={isZh ? "笔记描述/引用" : "Note description / quote"}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="mt-1 h-16 text-xs"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">{isZh ? "内容/评论" : "Content / Comment"}</label>
              <Textarea
                placeholder={isZh ? "您的分析或想法" : "Your analysis or thoughts"}
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                className="mt-1 h-16 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">{isZh ? "页面" : "Page"}</label>
                <Input
                  type="number"
                  placeholder={isZh ? "页码" : "Page number"}
                  value={editForm.page}
                  onChange={(e) => setEditForm({ ...editForm, page: e.target.value })}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">{isZh ? "关键词" : "Keywords"}</label>
                <Input
                  placeholder={isZh ? "逗号分隔" : "Comma separated"}
                  value={editForm.keywords}
                  onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">{isZh ? "笔记类型" : "Note Type"}</label>
              <Select
                value={editForm.note_type}
                onValueChange={(v: any) => setEditForm({ ...editForm, note_type: v })}
              >
                <SelectTrigger className="text-sm mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="literature-note">Literature Note</SelectItem>
                  <SelectItem value="permanent-note">Permanent Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingNote(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleEditNote} disabled={!editForm.title.trim()}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
