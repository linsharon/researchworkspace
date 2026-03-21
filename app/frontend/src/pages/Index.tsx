import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Clock, FileText, TrendingUp } from "lucide-react";
import {
  DUMMY_PROJECT,
  DUMMY_ARTIFACTS,
  ARTIFACT_TYPE_META,
  type Artifact,
  type WorkflowStep,
  type ArtifactType,
} from "@/lib/data";
import { noteAPI, paperAPI, type Note } from "@/lib/manuscript-api";
import { cn } from "@/lib/utils";

type MetricKey =
  | "purposes"
  | "keywords"
  | "concepts"
  | "searchRecords"
  | "candidatePapers"
  | "entryPapers"
  | "expandedPapers"
  | "visuals"
  | "notes"
  | "drafts";

type LatestArtifactItem = {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
  tab: string;
  badgeLabel: string;
  badgeClass: string;
};

const ARTIFACTS_STORAGE_KEY = "rw-artifacts";
const CONCEPTS_STORAGE_KEY = "rw-concepts";
const ARTIFACTS_UPDATED_EVENT = "artifacts-updated";
const CONCEPTS_UPDATED_EVENT = "concepts-updated";
const NOTES_UPDATED_EVENT = "notes-updated";
const LOGIN_KEY = "rw-current-login-at";
const ONLINE_TOTAL_KEY = "rw-online-total-seconds";

function formatDateOnly(value: string) {
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
    updatedAt: formatDateOnly(note.updated_at),
    content: note.content || note.description,
  };
}

function parseDateToMs(value: string) {
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDateTime(value: string | null) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString();
}

export default function Dashboard() {
  const { t } = useI18n();
  const project = DUMMY_PROJECT;
  const [counts, setCounts] = useState<Record<MetricKey, number>>({
    purposes: 0,
    keywords: 0,
    concepts: 0,
    searchRecords: 0,
    candidatePapers: 0,
    entryPapers: 0,
    expandedPapers: 0,
    visuals: 0,
    notes: 0,
    drafts: 0,
  });
  const [latestItems, setLatestItems] = useState<LatestArtifactItem[]>([]);
  const [onlineSeconds, setOnlineSeconds] = useState(0);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);

  const metricRows: Array<{ key: MetricKey; label: string; tab: string; color: string }> = [
    { key: "purposes", label: "Purposes", tab: "purpose", color: "bg-blue-500" },
    { key: "keywords", label: "Keywords", tab: "search", color: "bg-sky-500" },
    { key: "concepts", label: "Concepts", tab: "concepts", color: "bg-violet-500" },
    { key: "searchRecords", label: "Search Records", tab: "search", color: "bg-indigo-500" },
    { key: "candidatePapers", label: "Candidate Papers", tab: "literature", color: "bg-cyan-500" },
    { key: "entryPapers", label: "Entry Papers", tab: "literature", color: "bg-emerald-500" },
    { key: "expandedPapers", label: "Expanded Papers", tab: "literature", color: "bg-lime-500" },
    { key: "visuals", label: "Visuals", tab: "visual", color: "bg-fuchsia-500" },
    { key: "notes", label: "Notes", tab: "notes", color: "bg-amber-500" },
    { key: "drafts", label: "Drafts", tab: "drafts", color: "bg-rose-500" },
  ];

  const totalArtifacts = useMemo(
    () => metricRows.reduce((sum, row) => sum + counts[row.key], 0),
    [counts]
  );
  const maxMetricCount = useMemo(
    () => Math.max(...metricRows.map((row) => counts[row.key]), 1),
    [counts]
  );

  const stepShortLabels: Record<WorkflowStep, string> = {
    1: t("step.1.short"),
    2: t("step.2.short"),
    3: t("step.3.short"),
    4: t("step.4.short"),
    5: t("step.5.short"),
    6: t("step.6.short"),
  };

  const stepLabel = t(`step.${project.currentStep}.label`);

  const artifactTypeLabels: Record<ArtifactType, string> = {
    purpose: t("artifact.purpose"),
    keyword: t("artifact.keyword"),
    "search-log": t("artifact.searchLog"),
    "entry-paper": t("artifact.entryPaper"),
    "literature-note": t("artifact.litNote"),
    "permanent-note": t("artifact.permNote"),
    visualization: t("artifact.vizBoard"),
    "rq-draft": t("artifact.rqDraft"),
    "writing-block": t("artifact.writingBlock"),
    "writing-draft": t("artifact.writingDraft"),
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const previousLogin = window.localStorage.getItem(LOGIN_KEY);
    setLastLoginAt(previousLogin);
    const nowIso = new Date().toISOString();
    window.localStorage.setItem(LOGIN_KEY, nowIso);

    const baseOnline = Number(window.localStorage.getItem(ONLINE_TOTAL_KEY) || "0");
    const sessionStart = Date.now();

    const updateOnline = () => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      setOnlineSeconds(baseOnline + elapsed);
    };

    updateOnline();
    const timer = window.setInterval(updateOnline, 1000);

    const persistOnline = () => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      window.localStorage.setItem(ONLINE_TOTAL_KEY, String(baseOnline + elapsed));
    };

    window.addEventListener("beforeunload", persistOnline);

    return () => {
      window.clearInterval(timer);
      persistOnline();
      window.removeEventListener("beforeunload", persistOnline);
    };
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      let localArtifacts: Artifact[] = [];
      let conceptsCount = 0;
      let papers: Awaited<ReturnType<typeof paperAPI.list>> = [];
      let noteArtifacts: Artifact[] = [];

      if (typeof window !== "undefined") {
        try {
          const saved = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
          const parsed = saved ? JSON.parse(saved) : [];
          localArtifacts = Array.isArray(parsed) ? parsed : [];
        } catch {
          localArtifacts = [];
        }

        try {
          const conceptsGlobal = window.localStorage.getItem(CONCEPTS_STORAGE_KEY);
          const conceptsProject = window.localStorage.getItem(`rw-concepts-${project.id}`);
          const parsedGlobal = conceptsGlobal ? JSON.parse(conceptsGlobal) : [];
          const parsedProject = conceptsProject ? JSON.parse(conceptsProject) : [];
          const merged = [
            ...(Array.isArray(parsedGlobal) ? parsedGlobal : []),
            ...(Array.isArray(parsedProject) ? parsedProject : []),
          ];
          const keySet = new Set(
            merged.map((c: { id?: string; name?: string }) => c.id || c.name)
          );
          conceptsCount = keySet.size;
        } catch {
          conceptsCount = 0;
        }
      }

      try {
        const notes = await noteAPI.listByProject(project.id);
        noteArtifacts = notes.map(noteToArtifact);
      } catch {
        noteArtifacts = [];
      }

      try {
        papers = await paperAPI.list(project.id);
      } catch {
        papers = [];
      }

      const staticProjectArtifacts = DUMMY_ARTIFACTS.filter((a) => a.projectId === project.id);
      const mergedArtifacts = Array.from(
        new Map(
          [...staticProjectArtifacts, ...localArtifacts, ...noteArtifacts].map((artifact) => [artifact.id, artifact])
        ).values()
      );

      const draftCount = mergedArtifacts.filter(
        (a) => a.type === "rq-draft" || a.type === "writing-block" || a.type === "writing-draft"
      ).length;
      const noteCount = mergedArtifacts.filter(
        (a) => a.type === "literature-note" || a.type === "permanent-note"
      ).length;
      const entryCountFromArtifacts = mergedArtifacts.filter((a) => a.type === "entry-paper").length;
      const entryCountFromPapers = papers.filter((p) => p.is_entry_paper).length;

      setCounts({
        purposes: mergedArtifacts.filter((a) => a.type === "purpose").length,
        keywords: mergedArtifacts.filter((a) => a.type === "keyword").length,
        concepts: conceptsCount,
        searchRecords: mergedArtifacts.filter((a) => a.type === "search-log").length,
        candidatePapers: papers.length,
        entryPapers: Math.max(entryCountFromArtifacts, entryCountFromPapers),
        expandedPapers: papers.filter((p) => p.is_expanded_paper).length,
        visuals: mergedArtifacts.filter((a) => a.type === "visualization").length,
        notes: noteCount,
        drafts: draftCount,
      });

      const latestFromArtifacts: LatestArtifactItem[] = mergedArtifacts.map((artifact) => {
        const tabByType: Record<ArtifactType, string> = {
          purpose: "purpose",
          keyword: "search",
          "search-log": "search",
          "entry-paper": "literature",
          "literature-note": "notes",
          "permanent-note": "notes",
          visualization: "visual",
          "rq-draft": "drafts",
          "writing-block": "drafts",
          "writing-draft": "drafts",
        };
        const typeMeta = ARTIFACT_TYPE_META[artifact.type];
        return {
          id: artifact.id,
          title: artifact.title,
          description: artifact.description,
          updatedAt: artifact.updatedAt,
          tab: tabByType[artifact.type],
          badgeLabel: artifactTypeLabels[artifact.type],
          badgeClass: `${typeMeta.bgColor} ${typeMeta.color}`,
        };
      });

      const latestCombined = latestFromArtifacts
        .sort((a, b) => parseDateToMs(b.updatedAt) - parseDateToMs(a.updatedAt))
        .slice(0, 6);

      setLatestItems(latestCombined);
    };

    void loadDashboard();

    if (typeof window !== "undefined") {
      const reload = () => {
        void loadDashboard();
      };
      window.addEventListener(ARTIFACTS_UPDATED_EVENT, reload);
      window.addEventListener(CONCEPTS_UPDATED_EVENT, reload);
      window.addEventListener(NOTES_UPDATED_EVENT, reload);
      window.addEventListener("storage", reload);
      return () => {
        window.removeEventListener(ARTIFACTS_UPDATED_EVENT, reload);
        window.removeEventListener(CONCEPTS_UPDATED_EVENT, reload);
        window.removeEventListener(NOTES_UPDATED_EVENT, reload);
        window.removeEventListener("storage", reload);
      };
    }
  }, [project.id]);

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">{project.goal}</p>
          </div>
        </div>

        <Card className="border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">{t("dashboard.workflowProgress")}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("app.step")} {project.currentStep} {t("app.of")} 6 — {stepLabel}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 mb-2">
              {([1, 2, 3, 4, 5, 6] as WorkflowStep[]).map((step) => {
                const isCurrent = step === project.currentStep;
                return (
                  <Link key={step} to={`/workflow/${project.id}/${step}`} className="block">
                    <div className="relative group cursor-pointer">
                      <div className={cn("h-2 rounded-full transition-colors", isCurrent ? "bg-[#1E3A5F]" : "bg-slate-200")} />
                      <div className="flex items-center gap-1 mt-2">
                        <span className={cn("text-[10px] font-medium", isCurrent ? "text-[#1E3A5F]" : "text-slate-400")}>{step}</span>
                        <span className={cn("text-[10px] hidden sm:inline", isCurrent ? "text-[#1E3A5F] font-medium" : "text-slate-400")}>
                          {stepShortLabels[step]}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 mt-4 p-2 bg-slate-50 rounded-md">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[11px] text-slate-500">{t("dashboard.iterativeHint")}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: "Total Artifacts", value: totalArtifacts.toLocaleString(), icon: "📦" },
              { label: "Online Time", value: formatDuration(onlineSeconds), icon: "⏱️" },
              { label: "Last Login", value: formatDateTime(lastLoginAt), icon: "🕘" },
            ].map((stat) => (
              <Card key={stat.label} className="border-slate-200">
                <CardContent className="p-4 text-center">
                  <span className="text-2xl block mb-1">{stat.icon}</span>
                  <p className="text-sm md:text-xl font-bold text-slate-800 break-words">{stat.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Project Artifacts by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metricRows.map((row) => (
                  <Link key={row.key} to={`/artifacts?tab=${row.tab}`} className="block">
                    <div className="flex items-center gap-3 hover:bg-slate-50 rounded-md px-1 py-0.5">
                      <span className="text-xs text-slate-600 w-40 shrink-0">{row.label}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", row.color)}
                          style={{ width: `${(counts[row.key] / maxMetricCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-10 text-right">{counts[row.key]}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2D6A4F]" />
                {t("dashboard.latestArtifacts")}
              </CardTitle>
              <Link to="/artifacts">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  {t("dashboard.viewAll")} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {latestItems.map((item) => (
                <Link key={item.id} to={`/artifacts?tab=${item.tab}`}>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-1.5">
                      <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", item.badgeClass)}>
                        {item.badgeLabel}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-medium text-slate-800 mb-1 group-hover:text-[#1E3A5F] transition-colors line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      {item.updatedAt}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="relative rounded-xl overflow-hidden h-48">
          <img
            src="https://mgx-backend-cdn.metadl.com/generate/images/1012783/2026-03-09/7ac7d52d-7c9d-4f74-b291-3cc99fc97791.png"
            alt="Academic workspace"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/80 to-transparent flex items-center">
            <div className="p-6">
              <h2 className="text-white text-lg font-semibold mb-1">{t("dashboard.heroTitle")}</h2>
              <p className="text-white/80 text-xs max-w-md">{t("dashboard.heroDesc")}</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
