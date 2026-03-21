/**
 * Paper Tools Area - Right side
 * Notes list, Highlighted text editor, and AI Chat functionality
 */

import { useState, useEffect, useRef } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Trash2, HelpCircle, BookOpen, Lightbulb, Send, X } from "lucide-react";
import { noteAPI } from "@/lib/manuscript-api";
import type { Paper, Note } from "@/lib/manuscript-api";

interface PaperToolsAreaProps {
  paper: Paper;
  projectId?: string;
  highlightedText?: string;
  onChanged: () => void;
  aiChatVisible?: boolean;
  onAiChatVisibleChange?: (visible: boolean) => void;
  aiChatInitialText?: string;
}

export default function PaperToolsArea({
  paper,
  projectId = "proj-1",
  highlightedText = "",
  onChanged,
  aiChatVisible = false,
  onAiChatVisibleChange,
  aiChatInitialText = "",
}: PaperToolsAreaProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "highlight" | "chat">("notes");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCitations, setSelectedCitations] = useState<string[]>([]);
  const [noteType, setNoteType] = useState<"literature-note" | "permanent-note">(
    "literature-note"
  );
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    page: "",
    keywords: "",
  });
  
  // For highlighted text note editing
  const [showHighlightNote, setShowHighlightNote] = useState(false);
  const [highlightNoteTitle, setHighlightNoteTitle] = useState("");
  const [highlightNoteContent, setHighlightNoteContent] = useState("");
  
  // For AI Chat
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([]);
  const [chatInput, setChatInput] = useState(aiChatInitialText);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Show highlight tab when text is selected
  useEffect(() => {
    if (highlightedText) {
      setActiveTab("highlight");
      setHighlightNoteContent("");
    }
  }, [highlightedText]);

  // Update chat input when initial text changes
  useEffect(() => {
    if (aiChatInitialText && aiChatVisible) {
      setChatInput(aiChatInitialText);
      setActiveTab("chat");
    }
  }, [aiChatInitialText, aiChatVisible]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    loadNotes();
  }, [paper.id]);

  const loadNotes = async () => {
    try {
      setNotesLoading(true);
      setNoteError(null);
      const data = await noteAPI.list(paper.id);
      setNotes(data);
    } catch (error) {
      console.error("Failed to load notes:", error);
      setNoteError("Failed to load saved notes.");
    } finally {
      setNotesLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!formData.title.trim()) return;

    try {
      setNoteError(null);
      await noteAPI.create({
        paper_id: paper.id,
        project_id: projectId,
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        content: formData.description.trim() || undefined,
        page: formData.page ? parseInt(formData.page) : undefined,
        keywords: formData.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        citations: selectedCitations,
        note_type: noteType,
      });

      await loadNotes();
      setShowAddDialog(false);
      resetForm();
      setActiveTab("notes");
      onChanged();
    } catch (error) {
      console.error("Failed to create note:", error);
      setNoteError("Failed to save note. Please try again.");
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
    } catch (error) {
      console.error("Failed to create note:", error);
      setNoteError("Failed to save note from highlight. Please try again.");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      setNoteError(null);
      await noteAPI.delete(noteId);
      setNotes(notes.filter((n) => n.id !== noteId));
      onChanged();
    } catch (error) {
      console.error("Failed to delete note:", error);
      setNoteError("Failed to delete note. Please try again.");
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    
    // Add user message
    setChatMessages([...chatMessages, { role: "user", content: chatInput }]);
    
    // Simulate AI response
    setTimeout(() => {
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "This is a demo response. In production, this would be connected to your AI assistant service."
      }]);
    }, 500);
    
    setChatInput("");
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      page: "",
      keywords: "",
    });
    setSelectedCitations([]);
    setNoteType("literature-note");
  };

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
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "chat"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            AI Chat
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
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full gap-2 h-8 text-sm">
                    <Plus className="h-4 w-4" />
                    Add Note
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Note</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="text-sm font-semibold">Title *</label>
                      <Input
                        placeholder="Note title"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-sm font-semibold">Description</label>
                      <Textarea
                        placeholder="Note content"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        className="mt-1 h-20 text-xs"
                      />
                    </div>

                    {/* Page & Keywords */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold">Page</label>
                        <Input
                          type="number"
                          placeholder="Page number"
                          value={formData.page}
                          onChange={(e) =>
                            setFormData({ ...formData, page: e.target.value })
                          }
                          className="mt-1 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold">Keywords</label>
                        <Input
                          placeholder="Comma separated"
                          value={formData.keywords}
                          onChange={(e) =>
                            setFormData({ ...formData, keywords: e.target.value })
                          }
                          className="mt-1 text-sm"
                        />
                      </div>
                    </div>

                    {/* Note Type */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-semibold">Note Type *</label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-gray-500 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="font-semibold mb-1">Literature Note:</p>
                              <p className="text-xs mb-3">Notes from this paper</p>
                              <p className="font-semibold mb-1">Permanent Note:</p>
                              <p className="text-xs">Synthesis from multiple sources</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Select value={noteType} onValueChange={(v: any) => setNoteType(v)}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="literature-note">Literature Note</SelectItem>
                          <SelectItem value="permanent-note">Permanent Note</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAddDialog(false);
                          resetForm();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!formData.title.trim()}
                      >
                        Save Note
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
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
                <li>✓ Translate - Check AI Chat tab</li>
                <li>✓ Explain - Send to AI Chat</li>
                <li>✓ Save Concept - Done via toolbar</li>
              </ul>
            </div>
          </div>
        )}

        {/* AI Chat Tab */}
        {activeTab === "chat" && (
          <div className="flex flex-col h-full">
            {/* Chat Messages */}
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {chatMessages.length === 0 && !chatInput ? (
                <div className="text-center py-6 text-gray-500">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">AI Chat initialized</p>
                  <p className="text-xs mt-1">Paste text or ask questions</p>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                          msg.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 text-gray-900"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Chat Input */}
            <div className="border-t p-3 flex-shrink-0 space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Ask AI..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                  className="text-sm h-8"
                />
                <Button
                  size="sm"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                  className="px-2"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                💡 Tip: Text from "Explain" tool will be auto-pasted here
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
