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
import { Plus, Trash2, Pencil } from "lucide-react";
import { highlightAPI, noteAPI } from "@/lib/manuscript-api";
import type { Highlight, Paper, Note } from "@/lib/manuscript-api";
import { cn } from "@/lib/utils";
import { LiteratureNoteForm } from "./LiteratureNoteForm";
import type { LiteratureNote } from "./LiteratureNoteForm";
import { PermanentNoteForm } from "./PermanentNoteForm";
import type { NoteOption, PermanentNote } from "./PermanentNoteForm";

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
  const [highlightsLoading, setHighlightsLoading] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [highlightError, setHighlightError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "highlights">("notes");
  const [showAddLiteratureDialog, setShowAddLiteratureDialog] = useState(false);
  const [showAddPermanentDialog, setShowAddPermanentDialog] = useState(false);
  const [projectNotes, setProjectNotes] = useState<Note[]>([]);

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
          ...(note.doiOrUrl.trim() ? [note.doiOrUrl.trim()] : []),
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

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* Tabs */}
      <div className="border-b bg-white flex-shrink-0">
        <div className="flex divide-x">
          <button
            onClick={() => setActiveTab("notes")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "notes"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Notes ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab("highlights")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "highlights"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
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
                    Literature Note
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAddPermanentDialog(true)}>
                    Permanent Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Notes List */}
            <div className="flex-1 overflow-auto p-3 space-y-2">
              {noteError && (
                <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                  {noteError}
                </div>
              )}
              {notesLoading && (
                <div className="rounded-md bg-slate-100 border border-slate-200 p-2 text-xs text-slate-600">
                  Loading saved notes...
                </div>
              )}
              {!notesLoading && notes.length === 0 && !noteError && (
                <div className="rounded-md bg-slate-100 border border-slate-200 p-2 text-xs text-slate-600">
                  No saved notes for this paper yet.
                </div>
              )}
              {notes.map((note) => (
                <Card
                  key={note.id}
                  id={`paper-note-${note.id}`}
                  className={cn(
                    "hover:shadow-sm transition-shadow",
                    focusNoteId === note.id && "border-blue-300 bg-blue-50/50"
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xs">{note.title}</CardTitle>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {note.note_type === "literature-note" ? "Lit" : "Perm"}
                          </Badge>
                          {note.page && (
                            <Badge variant="outline" className="text-xs">
                              p.{note.page}
                            </Badge>
                          )}
                          {(note.keywords || [])
                            .filter((keyword) => keyword.toLowerCase() === "highlights")
                            .map((keyword) => (
                              <Badge
                                key={`${note.id}-${keyword}`}
                                variant="default"
                                className="text-xs bg-amber-500 hover:bg-amber-500"
                              >
                                {keyword}
                              </Badge>
                            ))}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEditNote(note)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit note"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete note"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  {note.description && (
                    <CardContent className="pb-2">
                      <p className="text-xs text-gray-700 line-clamp-2">{note.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Highlights Tab */}
        {activeTab === "highlights" && (
          <div className="p-3 space-y-2">
            {highlightError && (
              <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {highlightError}
              </div>
            )}
            {highlightsLoading && (
              <div className="rounded-md bg-slate-100 border border-slate-200 p-2 text-xs text-slate-600">
                Loading highlights...
              </div>
            )}
            {!highlightsLoading && highlights.length === 0 && !highlightError && (
              <div className="rounded-md bg-slate-100 border border-slate-200 p-2 text-xs text-slate-600">
                No highlights yet. Select text in PDF and click Highlight.
              </div>
            )}
            {highlights.map((item) => (
              <Card key={item.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1 mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {item.page ? `p.${item.page}` : "p.-"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {formatHighlightDate(item.created_at)}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-700 line-clamp-5">{item.text}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteHighlight(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete highlight"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Literature Note Dialog */}
      <Dialog open={showAddLiteratureDialog} onOpenChange={setShowAddLiteratureDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Literature Note</DialogTitle>
          </DialogHeader>
          <LiteratureNoteForm onSubmit={handleAddLiteratureFormNote} />
        </DialogContent>
      </Dialog>

      {/* Add Permanent Note Dialog */}
      <Dialog open={showAddPermanentDialog} onOpenChange={setShowAddPermanentDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Permanent Note</DialogTitle>
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
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">Title *</label>
              <Input
                placeholder="Note title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Description</label>
              <Textarea
                placeholder="Note description / quote"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="mt-1 h-16 text-xs"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Content / Comment</label>
              <Textarea
                placeholder="Your analysis or thoughts"
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                className="mt-1 h-16 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Page</label>
                <Input
                  type="number"
                  placeholder="Page number"
                  value={editForm.page}
                  onChange={(e) => setEditForm({ ...editForm, page: e.target.value })}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Keywords</label>
                <Input
                  placeholder="Comma separated"
                  value={editForm.keywords}
                  onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold">Note Type</label>
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
