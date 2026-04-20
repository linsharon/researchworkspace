import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Map, ExternalLink } from "lucide-react";
import { conceptAPI, highlightAPI, noteAPI, paperAPI, projectAPI } from "@/lib/manuscript-api";
import type { Concept, Note, Paper, Project } from "@/lib/manuscript-api";
import { useI18n } from "@/lib/i18n";

const normalizeConceptCategory = (raw?: string) => {
  const value = (raw || "").trim().toLowerCase();
  if (["concept", "construct", "theory", "framework", "method", "variable", "other"].includes(value)) {
    return value;
  }
  return "concept";
};

export default function VisualizationBoard() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [highlightsCount, setHighlightsCount] = useState(0);
  const [loading, setLoading] = useState(true);

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
      setPapers([]);
      setNotes([]);
      setConcepts([]);
      setHighlightsCount(0);
      setLoading(false);
      return;
    }

    let disposed = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const [projectPapers, projectNotes, projectConcepts] = await Promise.all([
          paperAPI.list(projectId),
          noteAPI.listByProject(projectId),
          conceptAPI.list(projectId),
        ]);

        const readingPapers = projectPapers.filter((paper) => paper.is_entry_paper || paper.is_expanded_paper);
        const highlightGroups = await Promise.all(
          readingPapers.map((paper) => highlightAPI.list(paper.id).catch(() => []))
        );
        const totalHighlights = highlightGroups.reduce((sum, list) => sum + list.length, 0);

        if (!disposed) {
          setPapers(readingPapers);
          setNotes(projectNotes);
          setConcepts(projectConcepts);
          setHighlightsCount(totalHighlights);
        }
      } catch {
        if (!disposed) {
          setPapers([]);
          setNotes([]);
          setConcepts([]);
          setHighlightsCount(0);
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      disposed = true;
    };
  }, [projectId]);

  const conceptCounts = useMemo(() => {
    const counts: Record<string, number> = {
      concept: 0,
      theory: 0,
      construct: 0,
      variable: 0,
      framework: 0,
      method: 0,
      other: 0,
    };

    concepts.forEach((concept) => {
      try {
        const parsed = concept.definition ? (JSON.parse(concept.definition) as Record<string, unknown>) : null;
        const key = normalizeConceptCategory(typeof parsed?.category === "string" ? parsed.category : "");
        counts[key] = (counts[key] || 0) + 1;
      } catch {
        counts.concept += 1;
      }
    });

    return counts;
  }, [concepts]);

  const entryCount = papers.filter((paper) => paper.is_entry_paper).length;
  const expandedCount = papers.filter((paper) => paper.is_expanded_paper).length;
  const literatureNotesCount = notes.filter((note) => note.note_type === "literature-note").length;
  const permanentNotesCount = notes.filter((note) => note.note_type === "permanent-note").length;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Map className="w-6 h-6 text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-100">{isZh ? "可视化看板" : "Visualization Board"}</h1>
              <p className="text-sm text-slate-500">{isZh ? "项目级别的实时分析（无虚拟数据）" : "Project-level live analytics (no dummy data)"}</p>
            </div>
          </div>
          <div className="w-[280px]">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder={isZh ? "选择项目" : "Select project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <Card className="border-slate-700/50"><CardContent className="py-6 text-sm text-slate-400">{isZh ? "加载项目分析..." : "Loading project analytics..."}</CardContent></Card>
        ) : null}

        {!loading && !projectId ? (
          <Card className="border-slate-700/50"><CardContent className="py-6 text-sm text-slate-400">{isZh ? "没有可用的项目。请先创建一个项目。" : "No project available. Create a project first."}</CardContent></Card>
        ) : null}

        {!loading && projectId ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="border-slate-700/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-slate-200">{papers.length}</p><p className="text-[10px] text-slate-500 uppercase">Reading Papers</p></CardContent></Card>
              <Card className="border-slate-700/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-300">{entryCount}</p><p className="text-[10px] text-slate-500 uppercase">Entry Papers</p></CardContent></Card>
              <Card className="border-slate-700/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-cyan-300">{expandedCount}</p><p className="text-[10px] text-slate-500 uppercase">Expanded Papers</p></CardContent></Card>
              <Card className="border-slate-700/50"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-300">{highlightsCount}</p><p className="text-[10px] text-slate-500 uppercase">Highlights</p></CardContent></Card>
            </div>

            <Card className="border-slate-700/50">
              <CardHeader><CardTitle className="text-sm">{isZh ? "产件快照" : "Artifacts Snapshot"}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Badge variant="outline">Literature Notes: {literatureNotesCount}</Badge>
                  <Badge variant="outline">Permanent Notes: {permanentNotesCount}</Badge>
                  <Badge variant="outline">Concept: {conceptCounts.concept}</Badge>
                  <Badge variant="outline">Theory: {conceptCounts.theory}</Badge>
                  <Badge variant="outline">Construct: {conceptCounts.construct}</Badge>
                  <Badge variant="outline">Variable: {conceptCounts.variable}</Badge>
                  <Badge variant="outline">Framework: {conceptCounts.framework}</Badge>
                  <Badge variant="outline">Method: {conceptCounts.method}</Badge>
                  <Badge variant="outline">Other: {conceptCounts.other}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50">
              <CardHeader><CardTitle className="text-sm">{isZh ? "论文" : "Papers"}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {papers.length === 0 ? (
                  <p className="text-xs text-slate-400">{isZh ? "此项目中没有论文。" : "No reading papers in this project."}</p>
                ) : (
                  papers.map((paper) => (
                    <div key={paper.id} className="flex items-center justify-between rounded-md border border-slate-700/50 px-3 py-2">
                      <div>
                        <p className="text-sm text-slate-200">{paper.title}</p>
                        <p className="text-[11px] text-slate-500">{paper.authors.join(", ")} ({paper.year || "-"})</p>
                      </div>
                      <Link to={`/paper-read/${projectId}/${paper.id}`}>
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          Open
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
