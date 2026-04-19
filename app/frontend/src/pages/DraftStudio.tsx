import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Download, FileText, PenTool, Sparkles } from "lucide-react";
import { conceptAPI, noteAPI, paperAPI, projectAPI } from "@/lib/manuscript-api";
import { documentAPI } from "@/lib/document-api";
import type { Project } from "@/lib/manuscript-api";

interface DraftMaterial {
  id: string;
  title: string;
  content: string;
  type: "literature-note" | "permanent-note" | "concept";
}

export default function DraftStudio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [draftContent, setDraftContent] = useState("");
  const [insertedMaterialIds, setInsertedMaterialIds] = useState<string[]>([]);
  const [materials, setMaterials] = useState<DraftMaterial[]>([]);
  const [remoteDraftTitles, setRemoteDraftTitles] = useState<string[]>([]);

  useEffect(() => {
    let disposed = false;
    const loadProjects = async () => {
      try {
        const items = await projectAPI.list();
        if (!disposed) {
          setProjects(items);
          if (items.length > 0) {
            setProjectId(items[0].id);
          }
        }
      } catch {
        if (!disposed) {
          setProjects([]);
          setProjectId("");
        }
      }
    };
    void loadProjects();
    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!projectId) {
      setMaterials([]);
      setRemoteDraftTitles([]);
      setLoading(false);
      return;
    }

    let disposed = false;
    const loadDraftResources = async () => {
      setLoading(true);
      try {
        const [notes, concepts, docs] = await Promise.all([
          noteAPI.listByProject(projectId),
          conceptAPI.list(projectId),
          documentAPI.search({ tag: "writing-draft", limit: 100, offset: 0 }).catch(() => ({ items: [] })),
        ]);

        const noteMaterials: DraftMaterial[] = notes
          .filter((note) => note.note_type === "literature-note" || note.note_type === "permanent-note")
          .map((note) => ({
            id: `note-${note.id}`,
            title: note.title,
            content: note.description || note.content || "",
            type: note.note_type,
          }));

        const conceptMaterials: DraftMaterial[] = concepts.map((concept) => ({
          id: `concept-${concept.id}`,
          title: concept.title,
          content: concept.description || "",
          type: "concept",
        }));

        const projectDrafts = (docs.items || []).filter((item) => item.project_id === projectId);

        if (!disposed) {
          setMaterials([...noteMaterials, ...conceptMaterials]);
          setRemoteDraftTitles(projectDrafts.map((draft) => draft.title));
        }
      } catch {
        if (!disposed) {
          setMaterials([]);
          setRemoteDraftTitles([]);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void loadDraftResources();
    return () => {
      disposed = true;
    };
  }, [projectId]);

  const words = useMemo(() => draftContent.trim().split(/\s+/).filter(Boolean).length, [draftContent]);

  const insertMaterial = (material: DraftMaterial) => {
    if (insertedMaterialIds.includes(material.id)) {
      return;
    }
    const chunk = `\n\n---\n[Inserted from ${material.type}] ${material.title}\n${material.content}`;
    setDraftContent((prev) => `${prev}${chunk}`.trim());
    setInsertedMaterialIds((prev) => [...prev, material.id]);
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-0px)]">
        <div className="w-72 border-r border-slate-700/50 bg-slate-800/30 shrink-0 flex flex-col">
          <div className="p-4 border-b border-slate-700/50 space-y-2">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Materials Library</h3>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {loading ? <p className="text-xs text-slate-400">Loading materials...</p> : null}
              {!loading && materials.length === 0 ? (
                <p className="text-xs text-slate-400">No notes/concepts found for this project.</p>
              ) : null}
              {materials.map((material) => {
                const inserted = insertedMaterialIds.includes(material.id);
                return (
                  <button
                    key={material.id}
                    type="button"
                    onClick={() => insertMaterial(material)}
                    className="w-full text-left rounded-lg border border-slate-700/50 bg-[#0d1b30] p-3 hover:border-cyan-500/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Badge variant="outline" className="text-[10px] mb-1">{material.type}</Badge>
                        <p className="text-xs font-medium text-slate-200 line-clamp-2">{material.title}</p>
                      </div>
                      {inserted ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center">
                <PenTool className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">Draft Studio</h2>
                <p className="text-[10px] text-slate-400">Project-backed writing workspace (no dummy content)</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="text-xs h-7" disabled>
                <Sparkles className="w-3 h-3 mr-1" />
                AI Assist (coming soon)
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7" disabled>
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-auto space-y-4">
            {remoteDraftTitles.length > 0 ? (
              <Card className="border-slate-700/50">
                <CardHeader className="pb-2"><CardTitle className="text-xs">Existing Draft Documents</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {remoteDraftTitles.map((title) => (
                    <div key={title} className="text-xs text-slate-300">• {title}</div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Textarea
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              className="min-h-[560px] text-sm leading-relaxed font-mono"
              placeholder="Start writing your draft. Insert notes or concepts from the left panel..."
            />
          </div>

          <div className="flex items-center justify-between px-6 py-2 border-t border-slate-700/50 bg-slate-800/30">
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
              <span>{words} words</span>
              <span>{draftContent.split("\n").length} lines</span>
              <span>{insertedMaterialIds.length} inserted materials</span>
            </div>
            <div className="flex gap-2">
              <Link to={projectId ? `/workflow/${projectId}/3` : "/"}>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Reading
                </Button>
              </Link>
              <Link to={projectId ? `/workflow/${projectId}/5` : "/"}>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <FileText className="w-3 h-3 mr-1" />
                  Go to Visualize
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
