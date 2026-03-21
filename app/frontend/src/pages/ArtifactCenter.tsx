import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Archive,
  Clock,
  Trash2,
  Edit,
  Eye,
  Lightbulb,
  Search,
} from "lucide-react";
import {
  DUMMY_ARTIFACTS,
  ARTIFACT_TYPE_META,
  STEP_META,
  type Artifact,
  type ArtifactType,
} from "@/lib/data";
import { noteAPI, projectAPI } from "@/lib/manuscript-api";
import type { Note } from "@/lib/manuscript-api";
import { cn } from "@/lib/utils";

const STATIC_ARTIFACTS = DUMMY_ARTIFACTS.filter(
  (artifact) =>
    artifact.type !== "literature-note" && artifact.type !== "permanent-note"
);

function formatArtifactDate(value: string) {
  return value.includes("T") ? value.split("T")[0] : value;
}

function noteToArtifact(note: Note): Artifact {
  return {
    id: note.id,
    title: note.title,
    type: note.note_type,
    projectId: note.project_id,
    sourceStep: 3,
    description: note.description || note.content || "Saved note",
    updatedAt: formatArtifactDate(note.updated_at),
    content: note.content || note.description,
  };
}

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "purpose", label: "Purposes" },
  { value: "concepts", label: "Concepts" },
  { value: "search", label: "Searches" },
  { value: "notes", label: "Notes" },
  { value: "visual", label: "Visuals" },
  { value: "drafts", label: "Drafts" },
];

const FILTER_MAP: Record<string, ArtifactType[]> = {
  all: [],
  purpose: ["purpose"],
  search: ["keyword", "search-log", "entry-paper"],
  notes: ["literature-note", "permanent-note"],
  visual: ["visualization"],
  drafts: ["rq-draft", "writing-block", "writing-draft"],
};

export default function ArtifactCenter() {
  const CONCEPTS_STORAGE_KEY = "rw-concepts";
  const NOTES_UPDATED_EVENT = "notes-updated";
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "all";
  const [filter, setFilter] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [artifacts, setArtifacts] = useState<Artifact[]>([...STATIC_ARTIFACTS]);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<
    Array<{ id: string; name: string; description: string; category: string; color: string }>
  >([]);
  const [showConceptDialog, setShowConceptDialog] = useState(false);
  const [conceptDialogMode, setConceptDialogMode] = useState<"view" | "edit">("view");
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [conceptForm, setConceptForm] = useState({
    name: "",
    description: "",
    category: "",
    color: "#6366f1",
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && FILTER_OPTIONS.some((o) => o.value === tab)) {
      setFilter(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadConcepts = () => {
      try {
        const saved = window.localStorage.getItem(CONCEPTS_STORAGE_KEY);
        if (!saved) {
          setConcepts([]);
          return;
        }
        const parsed = JSON.parse(saved);
        setConcepts(Array.isArray(parsed) ? parsed : []);
      } catch {
        setConcepts([]);
      }
    };

    loadConcepts();
    window.addEventListener("storage", loadConcepts);
    return () => window.removeEventListener("storage", loadConcepts);
  }, []);

  useEffect(() => {
    const loadSavedNotes = async () => {
      try {
        const projects = await projectAPI.list();
        if (projects.length === 0) {
          setArtifacts([...STATIC_ARTIFACTS]);
          return;
        }

        const notesByProject = await Promise.all(
          projects.map((project) => noteAPI.listByProject(project.id).catch(() => []))
        );
        const savedNoteArtifacts = notesByProject.flat().map(noteToArtifact);
        setArtifacts([...STATIC_ARTIFACTS, ...savedNoteArtifacts]);
      } catch (error) {
        console.error("Failed to load notes for Artifact Center:", error);
        setArtifacts([...STATIC_ARTIFACTS]);
      }
    };

    loadSavedNotes();

    if (typeof window !== "undefined") {
      const onNotesUpdated = () => {
        loadSavedNotes();
      };
      window.addEventListener(NOTES_UPDATED_EVENT, onNotesUpdated);
      return () => window.removeEventListener(NOTES_UPDATED_EVENT, onNotesUpdated);
    }
  }, []);

  const filteredArtifacts = artifacts.filter((a) => {
    const matchesFilter =
      filter === "all" || FILTER_MAP[filter]?.includes(a.type);
    const matchesSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selected = artifacts.find((a) => a.id === selectedArtifact);
  const selectedConcept = concepts.find((c) => c.id === selectedConceptId) || null;

  const persistConcepts = (
    updater:
      | Array<{ id: string; name: string; description: string; category: string; color: string }>
      | ((prev: Array<{ id: string; name: string; description: string; category: string; color: string }>) => Array<{ id: string; name: string; description: string; category: string; color: string }>)
  ) => {
    setConcepts((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(CONCEPTS_STORAGE_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const openConceptDialog = (conceptId: string, mode: "view" | "edit") => {
    const concept = concepts.find((c) => c.id === conceptId);
    if (!concept) return;
    setSelectedConceptId(conceptId);
    setConceptDialogMode(mode);
    setConceptForm({
      name: concept.name,
      description: concept.description,
      category: concept.category,
      color: concept.color,
    });
    setShowConceptDialog(true);
  };

  const handleDeleteConcept = (conceptId: string) => {
    persistConcepts((prev) => prev.filter((c) => c.id !== conceptId));
    if (selectedConceptId === conceptId) {
      setShowConceptDialog(false);
      setSelectedConceptId(null);
    }
  };

  const handleSaveConcept = () => {
    if (!selectedConceptId) return;
    const trimmedName = conceptForm.name.trim();
    if (!trimmedName) return;

    persistConcepts((prev) =>
      prev.map((c) =>
        c.id === selectedConceptId
          ? {
              ...c,
              name: trimmedName,
              description: conceptForm.description.trim(),
              category: conceptForm.category.trim() || "Concept",
              color: conceptForm.color,
            }
          : c
      )
    );
    setShowConceptDialog(false);
    setSelectedConceptId(null);
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    const artifact = artifacts.find((item) => item.id === artifactId);

    if (
      artifact &&
      (artifact.type === "literature-note" || artifact.type === "permanent-note")
    ) {
      try {
        await noteAPI.delete(artifactId);
      } catch (error) {
        console.error("Failed to delete note artifact:", error);
        return;
      }
    }

    setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
    if (selectedArtifact === artifactId) {
      setSelectedArtifact(null);
    }
  };

  const getFilterCount = (filterValue: string) => {
    if (filterValue === "all") {
      return artifacts.length + concepts.length;
    }
    if (filterValue === "concepts") {
      return concepts.length;
    }
    return artifacts.filter((a) => FILTER_MAP[filterValue]?.includes(a.type)).length;
  };

  const filteredConcepts = concepts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D6A4F] flex items-center justify-center">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Artifact Center
              </h1>
              <p className="text-sm text-slate-500">
                All your research outputs in one place
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {filter === "concepts" ? `${filteredConcepts.length} artifacts` : `${filteredArtifacts.length} artifacts`}
          </Badge>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artifacts..."
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={filter === opt.value ? "default" : "outline"}
                className={cn(
                  "text-xs",
                  filter === opt.value &&
                    "bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                )}
                onClick={() => setFilter(opt.value)}
              >
                {opt.label} ({getFilterCount(opt.value)})
              </Button>
            ))}
          </div>
        </div>

        {/* Artifact/Concept Grid */}
        {filter === "concepts" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConcepts.map((concept) => (
              <Card key={concept.id} className="border-slate-200 hover:shadow-md transition-all group">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="secondary"
                      className="text-[10px] border"
                      style={{
                        color: concept.color,
                        backgroundColor: `${concept.color}12`,
                        borderColor: `${concept.color}66`,
                      }}
                    >
                      <Lightbulb className="w-3 h-3 mr-1" />
                      {concept.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm mt-2">{concept.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-4">
                    {concept.description || "No description yet."}
                  </p>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      title="Browse"
                      onClick={() => openConceptDialog(concept.id, "view")}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      title="Edit"
                      onClick={() => openConceptDialog(concept.id, "edit")}
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                      title="Delete"
                      onClick={() => handleDeleteConcept(concept.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArtifacts.map((artifact) => {
            const typeMeta = ARTIFACT_TYPE_META[artifact.type];
            const stepMeta = STEP_META[artifact.sourceStep];
            return (
              <Dialog key={artifact.id}>
                <DialogTrigger asChild>
                  <div
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => setSelectedArtifact(artifact.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-2 py-0.5",
                          typeMeta.bgColor,
                          typeMeta.color
                        )}
                      >
                        {typeMeta.label}
                      </Badge>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        {stepMeta.icon} Step {artifact.sourceStep}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-800 mb-1 group-hover:text-[#1E3A5F] transition-colors line-clamp-2">
                      {artifact.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {artifact.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {artifact.updatedAt}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="View"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          title="Edit"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteArtifact(artifact.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      {artifact.title}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          typeMeta.bgColor,
                          typeMeta.color
                        )}
                      >
                        {typeMeta.label}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Step {artifact.sourceStep}: {stepMeta.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {artifact.description}
                    </p>
                    {artifact.content && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {artifact.content}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      Last edited: {artifact.updatedAt}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="View">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" title="Edit">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                        title="Delete"
                        onClick={() => void handleDeleteArtifact(artifact.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
          </div>
        )}

        {((filter === "concepts" && filteredConcepts.length === 0) ||
          (filter !== "concepts" && filteredArtifacts.length === 0)) && (
          <div className="text-center py-16">
            <Archive className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {filter === "concepts"
                ? "No concepts found matching your criteria"
                : "No artifacts found matching your criteria"}
            </p>
          </div>
        )}

        <Dialog open={showConceptDialog} onOpenChange={setShowConceptDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-base">
                {conceptDialogMode === "edit" ? "Edit Concept" : "Concept Details"}
              </DialogTitle>
            </DialogHeader>
            {selectedConcept ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Concept Name</label>
                  <Input
                    value={conceptForm.name}
                    onChange={(e) => setConceptForm((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={conceptDialogMode === "view"}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Description</label>
                  <Input
                    value={conceptForm.description}
                    onChange={(e) => setConceptForm((prev) => ({ ...prev, description: e.target.value }))}
                    disabled={conceptDialogMode === "view"}
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Category</label>
                    <Input
                      value={conceptForm.category}
                      onChange={(e) => setConceptForm((prev) => ({ ...prev, category: e.target.value }))}
                      disabled={conceptDialogMode === "view"}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">Color</label>
                    <input
                      type="color"
                      value={conceptForm.color}
                      onChange={(e) => setConceptForm((prev) => ({ ...prev, color: e.target.value }))}
                      disabled={conceptDialogMode === "view"}
                      className="w-full h-9 rounded border border-slate-300"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  {conceptDialogMode === "edit" ? (
                    <Button
                      className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-xs"
                      onClick={handleSaveConcept}
                    >
                      Save
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    className="text-xs"
                    onClick={() => {
                      setShowConceptDialog(false);
                      setSelectedConceptId(null);
                    }}
                  >
                    {conceptDialogMode === "edit" ? "Cancel" : "Close"}
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}