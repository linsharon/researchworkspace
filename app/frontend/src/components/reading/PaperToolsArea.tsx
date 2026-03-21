/**
 * Paper Tools Area - Right side
 * Notes list, Highlighted text editor, and AI Chat functionality
 */

import { useState, useEffect } from "react";
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
import { noteAPI } from "@/lib/manuscript-api";
import type { Paper, Note } from "@/lib/manuscript-api";
import { LiteratureNoteForm } from "./LiteratureNoteForm";
import type { LiteratureNote } from "./LiteratureNoteForm";
import { PermanentNoteForm } from "./PermanentNoteForm";
import type { NoteOption, PermanentNote } from "./PermanentNoteForm";

interface PaperToolsAreaProps {
  paper: Paper;
  projectId?: string;
  highlightedText?: string;
  onChanged: () => void;
}

export default function PaperToolsArea({
  paper,
  projectId = "proj-1",
  highlightedText = "",
  onChanged,
}: PaperToolsAreaProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "highlight">("notes");
  const [showAddLiteratureDialog, setShowAddLiteratureDialog] = useState(false);
  const [showAddPermanentDialog, setShowAddPermanentDialog] = useState(false);
  const [projectNotes, setProjectNotes] = useState<Note[]>([]);
  
  // For highlighted text note editing
  const [showHighlightNote, setShowHighlightNote] = useState(false);
  const [highlightNoteTitle, setHighlightNoteTitle] = useState("");
  const [highlightNoteContent, setHighlightNoteContent] = useState("");

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

  // Show highlight tab when text is selected
  useEffect(() => {
    if (highlightedText) {
      setActiveTab("highlight");
      setHighlightNoteContent("");
    }
  }, [highlightedText]);

  useEffect(() => {
    loadNotes();
  }, [paper.id]);

  const loadNotes = async () => {
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
  };

  const handleAddHighlightNote = async () => {
    if (!highlightNoteTitle.trim()) return;
    
    try {
      setNoteError(null);
      await noteAPI.create({
        paper_id: paper.id,
        project_id: projectId,
        title: highlightNoteTitle.trim(),
        description: highlightedText,
        content: highlightNoteContent.trim() || undefined,
        page: undefined,
        keywords: [],
        citations: [],
        note_type: "literature-note",
      });

      await loadNotes();
      setShowHighlightNote(false);
      setHighlightNoteTitle("");
      setHighlightNoteContent("");
      setActiveTab("notes");
      onChanged();
      window.dispatchEvent(new CustomEvent("notes-updated"));
    } catch (error) {
      console.error("Failed to create note:", error);
      setNoteError("Failed to save note from highlight. Please try again.");
    }
  };

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
        keywords: note.doiOrUrl.trim() ? [note.doiOrUrl.trim()] : [],
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
      window.dispatchEvent(new CustomEvent("notes-updated"));
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
          [...note.links.map(link => link.targetNoteId), note.evidenceLiteratureNoteId].filter(Boolean)
        )
      );

      await noteAPI.create({
        paper_id: paper.id,
        project_id: projectId,
        title: note.atomicTitle.trim(),
        description: note.retrievalTrigger.trim() || note.mainArgument.trim().slice(0, 180),
        note_type: "permanent-note",
        page: undefined,
        keywords: note.retrievalTrigger.trim() ? [note.retrievalTrigger.trim()] : [],
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
      window.dispatchEvent(new CustomEvent("notes-updated"));
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
      window.dispatchEvent(new CustomEvent("notes-updated"));
    } catch (error) {
      console.error("Failed to delete note:", error);
      setNoteError("Failed to delete note. Please try again.");
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
      window.dispatchEvent(new CustomEvent("notes-updated"));
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
          {highlightedText && (
            <button
              onClick={() => setActiveTab("highlight")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "highlight"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Highlight
            </button>
          )}
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
                  <Card key={note.id} className="hover:shadow-sm transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-xs">{note.title}</CardTitle>
                          <div className="flex gap-1 mt-1">
                            <Badge
                              variant="secondary"
                              className="text-xs"
                            >
                              {note.note_type === "literature-note" ? "Lit" : "Perm"}
                            </Badge>
                            {note.page && (
                              <Badge variant="outline" className="text-xs">
                                p.{note.page}
                              </Badge>
                            )}
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
                        <p className="text-xs text-gray-700 line-clamp-2">
                          {note.description}
                        </p>
                      </CardContent>
                    )}
                  </Card>
                ))}
            </div>
          </div>
        )}

        {/* Highlight Tab */}
        {activeTab === "highlight" && highlightedText && (
          <div className="p-4 space-y-3 h-full overflow-auto">
            {/* Selected Text Display */}
            <div className="p-3 bg-blue-50 rounded-lg border-2 border-blue-200">
              <p className="text-xs font-semibold text-blue-700 mb-2">Selected Text</p>
              <p className="text-sm text-blue-900 italic line-clamp-4">"{highlightedText}"</p>
            </div>

            {/* Save as Note */}
            <Dialog open={showHighlightNote} onOpenChange={setShowHighlightNote}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2 h-8 text-sm">
                  <Plus className="h-4 w-4" />
                  Save as Note
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Note from Highlight</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Quote:</p>
                    <p className="text-xs text-blue-900 italic">"{highlightedText}"</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Note Title *</label>
                    <Input
                      placeholder="Give this note a title"
                      value={highlightNoteTitle}
                      onChange={(e) => setHighlightNoteTitle(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Your Comment</label>
                    <Textarea
                      placeholder="Add your thoughts or commentary..."
                      value={highlightNoteContent}
                      onChange={(e) => setHighlightNoteContent(e.target.value)}
                      className="mt-1 h-16 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHighlightNote(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddHighlightNote}
                      disabled={!highlightNoteTitle.trim()}
                    >
                      Save Note
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Quick Actions */}
            <div className="text-xs text-gray-600 p-3 bg-gray-100 rounded-lg">
              <p className="font-semibold mb-2">Highlight tools used:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>✓ Add Note - Done! (above)</li>
                <li>✓ Translate - Use AI Assistant (bottom-right)</li>
                <li>✓ Explain - Use AI Assistant (bottom-right)</li>
                <li>✓ Save Concept - Done via toolbar</li>
              </ul>
            </div>
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
      <Dialog open={!!editingNote} onOpenChange={(open) => { if (!open) setEditingNote(null); }}>
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
              <Select value={editForm.note_type} onValueChange={(v: any) => setEditForm({ ...editForm, note_type: v })}>
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
              <Button variant="outline" size="sm" onClick={() => setEditingNote(null)}>Cancel</Button>
              <Button size="sm" onClick={handleEditNote} disabled={!editForm.title.trim()}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
