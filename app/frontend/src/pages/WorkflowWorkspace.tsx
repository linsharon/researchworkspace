import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { paperAPI, conceptAPI, projectAPI, searchRecordAPI } from "@/lib/manuscript-api";
import type {
  Concept as ApiConcept,
  Paper as ApiPaper,
  SearchRecord as ApiSearchRecord,
} from "@/lib/manuscript-api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  ExternalLink,
  FileText,
  FolderUp,
  Hash,
  Lightbulb,
  List,
  Network,
  PenTool,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  RefreshCw,
  ArrowUpDown,
  CheckSquare,
  Trash2,
  Table2,
  Tag,
  Target,
  Upload,
  X,
  Zap,
  Map as MapIcon,
  PenLine,
  Atom,
} from "lucide-react";
import {
  STEP_META,
  ARTIFACT_TYPE_META,
  DUMMY_PAPERS,
  DUMMY_KEYWORDS,
  DUMMY_SEARCH_RECORDS,
  DUMMY_ARTIFACTS,
  PURPOSE_OPTIONS,
  VIZ_VIEWS,
  DISCOVERY_PATH_OPTIONS,
  DATABASE_OPTIONS,
  REPORTING_STYLES,
  MACRO_CHECKLIST,
  MESO_TOULMIN_CHECKLIST,
  MICRO_CHECKLIST_BASIC,
  MICRO_CHECKLIST_READABILITY,
  MICRO_CHECKLIST_CREDIBILITY,
  type WorkflowStep,
  type Artifact,
  type Paper,
  type Keyword,
  type SearchRecord,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import Step3ReadFoundPapers from "@/components/workflow/Step3ReadFoundPapers";

// Paper decision history — shared localStorage key with Step 3
const PAPER_DECISIONS_KEY = "rw-paper-decisions";
const ARTIFACTS_STORAGE_KEY = "rw-artifacts";
const ARTIFACTS_UPDATED_EVENT = "artifacts-updated";
const WORKFLOW_CACHE_META_KEY = "rw-workflow-cache-meta";
const WORKFLOW_CACHE_VERSION = "m3-2026-04-06";
const DISCOVER_KEYWORDS_STORAGE_KEY_PREFIX = "rw-discover-keywords";
const SEARCH_RECORD_PURPOSE_LINKS_KEY_PREFIX = "rw-search-record-purpose-links";
const WORKFLOW_AUX_CACHE_KEYS = [PAPER_DECISIONS_KEY, ARTIFACTS_STORAGE_KEY] as const;

type WorkflowCacheMeta = {
  marker: "workflow-aux-cache";
  version: string;
  lastCheckedAt: string;
  lastInvalidatedAt?: string;
  reason?: string;
  invalidatedKeys?: string[];
};

const writeWorkflowCacheMeta = (partial: Partial<WorkflowCacheMeta>) => {
  if (typeof window === "undefined") return;
  let previous: WorkflowCacheMeta | null = null;
  try {
    const raw = window.localStorage.getItem(WORKFLOW_CACHE_META_KEY);
    previous = raw ? (JSON.parse(raw) as WorkflowCacheMeta) : null;
  } catch {
    previous = null;
  }

  const next: WorkflowCacheMeta = {
    marker: "workflow-aux-cache",
    version: WORKFLOW_CACHE_VERSION,
    lastCheckedAt: new Date().toISOString(),
    lastInvalidatedAt: previous?.lastInvalidatedAt,
    reason: previous?.reason,
    invalidatedKeys: previous?.invalidatedKeys,
    ...partial,
  };
  window.localStorage.setItem(WORKFLOW_CACHE_META_KEY, JSON.stringify(next));
};

const clearWorkflowAuxCaches = (reason: string) => {
  if (typeof window === "undefined") return;

  WORKFLOW_AUX_CACHE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
  });
  window.dispatchEvent(new CustomEvent(ARTIFACTS_UPDATED_EVENT));
  writeWorkflowCacheMeta({
    lastInvalidatedAt: new Date().toISOString(),
    reason,
    invalidatedKeys: [...WORKFLOW_AUX_CACHE_KEYS],
  });
};

const ensureWorkflowAuxCacheVersion = () => {
  if (typeof window === "undefined") return;

  let meta: WorkflowCacheMeta | null = null;
  try {
    const raw = window.localStorage.getItem(WORKFLOW_CACHE_META_KEY);
    meta = raw ? (JSON.parse(raw) as WorkflowCacheMeta) : null;
  } catch {
    meta = null;
  }

  if (!meta) {
    writeWorkflowCacheMeta({ reason: "initialized", invalidatedKeys: [] });
    return;
  }

  if (meta.version !== WORKFLOW_CACHE_VERSION) {
    clearWorkflowAuxCaches(`version-mismatch:${meta.version}->${WORKFLOW_CACHE_VERSION}`);
    return;
  }

  writeWorkflowCacheMeta({});
};

const recordPaperDecision = (title: string, decision: string, projectId: string) => {
  if (typeof window === "undefined") return;
  try {
    const saved = window.localStorage.getItem(PAPER_DECISIONS_KEY);
    const records = saved
      ? (JSON.parse(saved) as Array<{ titleLower: string; title: string; decision: string; timestamp: string; projectId: string }>)
      : [];
    records.push({
      titleLower: title.trim().toLowerCase(),
      title,
      decision,
      timestamp: new Date().toISOString(),
      projectId,
    });
    window.localStorage.setItem(PAPER_DECISIONS_KEY, JSON.stringify(records.slice(-500)));
  } catch {
    // Storage failure is non-critical
  }
};

const getBlockedPaperTitlesFromDecisionHistory = (projectId: string) => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const saved = window.localStorage.getItem(PAPER_DECISIONS_KEY);
    if (!saved) return new Set<string>();
    const records = JSON.parse(saved) as Array<{
      titleLower?: string;
      title?: string;
      decision?: string;
      projectId?: string;
    }>;
    const blocked = new Set<string>();
    records.forEach((record) => {
      if (record.projectId !== projectId) return;
      const decision = (record.decision || "").toLowerCase();
      const isDeleted = decision.includes("delete") || decision.includes("remove");
      const isToEntry = decision.includes("entry");
      if (!isDeleted && !isToEntry) return;
      const key = (record.titleLower || record.title || "").trim().toLowerCase();
      if (key) blocked.add(key);
    });
    return blocked;
  } catch {
    return new Set<string>();
  }
};

export default function WorkflowWorkspace() {
  const { projectId = "proj-1", step } = useParams<{ projectId: string; step: string }>();
  const currentStep = (parseInt(step || "1") as WorkflowStep) || 1;
  const stepMeta = STEP_META[currentStep];
  const prevStep = currentStep > 1 ? ((currentStep - 1) as WorkflowStep) : null;
  const prevStepMeta = prevStep ? STEP_META[prevStep] : null;
  const nextStep = currentStep < 6 ? ((currentStep + 1) as WorkflowStep) : null;
  const nextStepMeta = nextStep ? STEP_META[nextStep] : null;

  // Ensure the project row exists in DB on first visit
  useEffect(() => {
    if (!projectId) return;
    const ensureProject = async () => {
      try {
        const existing = await projectAPI.get(projectId);
        await projectAPI.ensure({
          id: projectId,
          title: existing.title || "Untitled Project",
          description: existing.description || "",
        });
      } catch {
        await projectAPI.ensure({ id: projectId, title: "Untitled Project", description: "" });
      }
    };

    void ensureProject();
  }, [projectId]);

  useEffect(() => {
    ensureWorkflowAuxCacheVersion();
  }, []);

  const handleClearWorkflowCaches = () => {
    clearWorkflowAuxCaches("manual-clear");
    toast.success("Workflow 辅助缓存已清理", {
      description: "已清除决策历史和 Artifact 本地缓存。",
    });
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Step Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center">
              {currentStep === 1 && <Target className="w-7 h-7 text-cyan-400" />}
              {currentStep === 2 && <Search className="w-7 h-7 text-cyan-400" />}
              {currentStep === 3 && <BookOpen className="w-7 h-7 text-cyan-400" />}
              {currentStep === 4 && <Network className="w-7 h-7 text-cyan-400" />}
              {currentStep === 5 && <MapIcon className="w-7 h-7 text-cyan-400" />}
              {currentStep === 6 && <PenLine className="w-7 h-7 text-cyan-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100">
                  {`Step ${currentStep}: ${stepMeta.label}`}
                </h1>
              </div>
              <p className="text-sm text-slate-500">
                {stepMeta.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClearWorkflowCaches}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              清理缓存
            </Button>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && <PurposeWorkspace projectId={projectId} />}
        {currentStep === 2 && <EntryPaperWorkspace projectId={projectId} />}
        {currentStep === 3 && <Step3ReadFoundPapers projectId={projectId} />}
        {currentStep === 4 && <ExpandWorkspace projectId={projectId} />}
        {currentStep === 5 && <VisualizeWorkspace />}
        {currentStep === 6 && <DraftWorkspaceInline />}

        <div className="border border-slate-700/50 rounded-xl bg-[#0d1b30] p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-slate-400">{nextStep ? "Next Step" : "Workflow Complete"}</p>
            <p className="text-sm text-slate-200 font-medium">
              {nextStepMeta ? `Step ${nextStep}: ${nextStepMeta.label}` : "You are at the final step."}
            </p>
            {prevStepMeta ? (
              <p className="text-xs text-slate-500 mt-1">{`Last Step: Step ${prevStep} ${prevStepMeta.label}`}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {prevStep ? (
              <Link to={`/workflow/${projectId}/${prevStep}`}>
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  {`Go to Step ${prevStep}`}
                </Button>
              </Link>
            ) : null}
            {nextStep ? (
              <Link to={`/workflow/${projectId}/${nextStep}`}>
                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  {`Go to Step ${nextStep}`}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </Link>
            ) : (
              <Link to="/">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

// ============================================================
// Modal Overlay Component
// ============================================================
function ModalOverlay({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#0d1b30] rounded-xl shadow-2xl border border-slate-700/50 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/40">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-700/60 rounded">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// ============================================================
// Step 1: Purpose Workspace
// ============================================================
function PurposeWorkspace({ projectId }: { projectId: string }) {
  const [selected, setSelected] = useState<string[]>(["Find research questions"]);
  const [customPurposes, setCustomPurposes] = useState<string[]>([]);
  const [newCustomPurpose, setNewCustomPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [cardGenerated, setCardGenerated] = useState(false);

  const allPurposes = [...PURPOSE_OPTIONS, ...customPurposes];

  const handleAddCustomPurpose = () => {
    const trimmed = newCustomPurpose.trim();
    if (trimmed && !allPurposes.includes(trimmed)) {
      setCustomPurposes([...customPurposes, trimmed]);
      setSelected([...selected, trimmed]);
      setNewCustomPurpose("");
    }
  };

  const handleGeneratePurposeCard = () => {
    const title =
      selected.length
        ? `Research Purpose: ${selected.slice(0, 2).join(", ")}${selected.length > 2 ? "..." : ""}`
        : "Research Purpose";
    const card: Artifact = {
      id: `purpose-${Date.now()}`,
      title,
      type: "purpose",
      projectId,
      sourceStep: 1,
      description: notes.trim() || selected.join(", ") || "Reading purpose",
      updatedAt: new Date().toISOString().split("T")[0],
      content: `Goals: ${selected.join(", ")}${notes.trim() ? `\n\nFocus: ${notes.trim()}` : ""}`,
    };
    try {
      const saved = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
      const existing: Artifact[] = saved ? (JSON.parse(saved) as Artifact[]) : [];
      window.localStorage.setItem(
        ARTIFACTS_STORAGE_KEY,
        JSON.stringify([...existing, card])
      );
      window.dispatchEvent(new CustomEvent("artifacts-updated"));
    } catch {
      // ignore storage errors
    }
    toast.success("Purpose Card 已生成", {
      description: "已保存到 Artifact Center › Purposes",
      duration: 3000,
    });
    // Reset page
    setSelected([]);
    setCustomPurposes([]);
    setNewCustomPurpose("");
    setNotes("");
    setCardGenerated(false);
  };

  return (
    <div className="space-y-5">
      <Card className="border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            What is your reading purpose?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">Predefined Purposes</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {allPurposes.map((option) => (
                  <label
                    key={option}
                    data-selected={selected.includes(option) ? "true" : undefined}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm record-item",
                      selected.includes(option)
                        ? "border-cyan-600 bg-cyan-950/30"
                        : "border-slate-700/50"
                    )}
                  >
                    <Checkbox
                      checked={selected.includes(option)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelected([...selected, option]);
                        else setSelected(selected.filter((s) => s !== option));
                      }}
                    />
                    <span className="record-item-title">{option}</span>
                    {customPurposes.includes(option) && (
                      <Badge variant="outline" className="text-[9px] ml-auto text-blue-500 border-blue-300">
                        Custom
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">Add Custom Purpose</p>
              <div className="flex gap-2">
                <Input
                  value={newCustomPurpose}
                  onChange={(e) => setNewCustomPurpose(e.target.value)}
                  placeholder="Enter a custom reading purpose..."
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomPurpose();
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleAddCustomPurpose}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Purpose
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Added custom purposes will appear in the predefined list on the left.
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-100">Additional Notes</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Describe your specific research interest..."
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {cardGenerated && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Purpose Card Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-[#0d1b30] rounded-lg border border-emerald-200">
              <h4 className="font-medium text-sm text-slate-200 mb-2">
                Research Purpose: AI & SRL in Higher Ed
              </h4>
              <p className="text-xs text-slate-600 mb-2">
                <strong>Goals:</strong> {selected.join(", ")}
              </p>
              <p className="text-xs text-slate-600">
                <strong>Focus:</strong> {notes}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handleGeneratePurposeCard}
          disabled={!selected.length && !notes.trim()}
          className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Purpose Card
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Step 2: Entry Paper Workspace
// ============================================================
function EntryPaperWorkspace({ projectId }: { projectId: string }) {
  const BOOLEAN_CONNECTORS = ["AND", "OR", "NOT"] as const;
  type BooleanConnector = (typeof BOOLEAN_CONNECTORS)[number];

  type CandidatePaper = Omit<Paper, "relevance"> & {
    relevance?: "high" | "medium" | "low";
    discoveryPath?: string;
    discoveryNote?: string;
    searchRecordId?: string;
    doi?: string;
    doiUrl?: string;
    externalSourceUrl?: string;
  };

  type ConceptItem = {
    id: string;
    name: string;
    description: string;
    category: string;
    color: string;
  };

  const defaultConceptColor = "#22d3ee";
  const defaultConceptCategory = "Construct";

  const parseConceptDefinition = (definition?: string): { category: string; color: string } => {
    if (!definition) {
      return { category: defaultConceptCategory, color: defaultConceptColor };
    }

    try {
      const parsed = JSON.parse(definition) as { category?: string; color?: string };
      return {
        category: parsed.category || defaultConceptCategory,
        color: parsed.color || defaultConceptColor,
      };
    } catch {
      return { category: defaultConceptCategory, color: defaultConceptColor };
    }
  };

  const toApiConceptPayload = (concept: { name: string; description: string; category: string; color: string }) => ({
    title: concept.name,
    description: concept.description,
    definition: JSON.stringify({ category: concept.category, color: concept.color }),
  });

  const apiConceptToLocal = (concept: ApiConcept): ConceptItem => {
    const meta = parseConceptDefinition(concept.definition);
    return {
      id: concept.id,
      name: concept.title,
      description: concept.description || "",
      category: meta.category,
      color: meta.color,
    };
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const [addedToCenterIds, setAddedToCenterIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set<string>();
    try {
      const saved = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
      const parsed: Artifact[] = saved ? JSON.parse(saved) : [];
      return new Set(
        (Array.isArray(parsed) ? parsed : [])
          .filter((a) => a.type === "entry-paper")
          .map((a) => a.id.replace("entry-paper-", ""))
      );
    } catch {
      return new Set<string>();
    }
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [searchRecords, setSearchRecords] = useState<SearchRecord[]>([]);
  const [entryPapers, setEntryPapers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"keywords" | "search" | "candidates">(() => {
    const tab = searchParams.get("tab");
    return tab === "search" || tab === "candidates" || tab === "keywords" ? tab : "keywords";
  });

  // Concepts state
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [showConceptDialog, setShowConceptDialog] = useState(false);
  const [conceptName, setConceptName] = useState("");
  const [conceptDescription, setConceptDescription] = useState("");
  const [conceptCategory, setConceptCategory] = useState("Keyword");
  const [conceptColor, setConceptColor] = useState("#22d3ee");
  const [conceptPurposeCardId, setConceptPurposeCardId] = useState("");
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [showConceptDetailDialog, setShowConceptDetailDialog] = useState(false);
  const [keywordsHydrated, setKeywordsHydrated] = useState(false);

  const CONCEPT_COLORS = [
    { value: "#22d3ee", label: "Cyan" },
    { value: "#6366f1", label: "Indigo" },
    { value: "#8b5cf6", label: "Violet" },
    { value: "#ec4899", label: "Pink" },
    { value: "#f97316", label: "Orange" },
    { value: "#10b981", label: "Emerald" },
    { value: "#0ea5e9", label: "Sky" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#ef4444", label: "Red" },
  ];

  const handleAddConcept = async () => {
    if (purposeCards.length === 0) {
      toast.error("请先在 Step 1 创建至少一个 Purpose Card");
      return;
    }
    if (!conceptPurposeCardId) {
      toast.error("请先选择要关联的 Purpose Card");
      return;
    }
    if (!conceptName.trim()) return;
    const trimmed = conceptName.trim();
    const existing = conceptByNameMap.get(trimmed.toLowerCase());

    if (existing) {
      const updatedLocal = {
        ...existing,
        description: conceptDescription.trim() || existing.description,
        category: conceptCategory,
        color: conceptColor,
      };
      setConcepts((prev) => prev.map((c) => (c.id === existing.id ? updatedLocal : c)));
      try {
        await conceptAPI.update(
          existing.id,
          toApiConceptPayload(updatedLocal)
        );
      } catch {
        toast.error("更新概念失败");
      }
    } else {
      try {
        const created = await conceptAPI.create({
          ...toApiConceptPayload({
            name: trimmed,
            description: conceptDescription.trim(),
            category: conceptCategory,
            color: conceptColor,
          }),
          project_id: projectId,
        });
        setConcepts((prev) => [...prev, apiConceptToLocal(created)]);
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401) {
          toast.error("请先登录后再添加概念");
        } else {
          toast.error("创建概念失败");
        }
      }
    }

    if (!srKeywords.includes(trimmed)) {
      setSrKeywords((prev) => [...prev, trimmed]);
    }
    setKeywords((prev) => {
      const exists = prev.some((item) => normalizeKeywordTerm(item.term) === normalizeKeywordTerm(trimmed));
      if (exists) {
        return prev.map((item) =>
          normalizeKeywordTerm(item.term) === normalizeKeywordTerm(trimmed)
            ? { ...item, purposeCardId: conceptPurposeCardId }
            : item
        );
      }
      return [
        ...prev,
        {
          id: `kw-${Date.now()}`,
          term: trimmed,
          category: conceptCategory,
          purposeCardId: conceptPurposeCardId,
        },
      ];
    });
    setNewKeyword("");
    setShowConceptDialog(false);
    setConceptName("");
    setConceptDescription("");
    setConceptCategory("Keyword");
    setConceptColor("#22d3ee");
    setConceptPurposeCardId("");
  };

  // Candidate papers state
  const [papersLoading, setPapersLoading] = useState(false);
  const [candidatePapers, setCandidatePapers] = useState<CandidatePaper[]>([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]); 
  const [candidateSortKey, setCandidateSortKey] = useState<"title" | "year" | "type" | "relevance">("relevance");
  const [candidateSortOrder, setCandidateSortOrder] = useState<"asc" | "desc">("desc");

  // Search Record - purpose card association
  const [srPurposeCardId, setSrPurposeCardId] = useState("");
  const [purposeCards, setPurposeCards] = useState<Artifact[]>([]);

  // Load purpose cards from localStorage
  useEffect(() => {
    const load = () => {
      try {
        const saved = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
        const all: Artifact[] = saved ? JSON.parse(saved) : [];
        setPurposeCards(all.filter((a) => a.type === "purpose" && (!a.projectId || a.projectId === projectId)));
      } catch { /* ignore */ }
    };
    load();
    window.addEventListener("artifacts-updated", load);
    return () => window.removeEventListener("artifacts-updated", load);
  }, [projectId]);

  // Add Search Record Dialog
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showEditSearchDialog, setShowEditSearchDialog] = useState(false);
  const [editingSearchRecordId, setEditingSearchRecordId] = useState<string | null>(null);
  const [srKeywords, setSrKeywords] = useState<string[]>([]);
  const PURPOSE_CARD_NONE = "__none__";
  const [srDatabase, setSrDatabase] = useState("Web of Science");
  const [srCustomDb, setSrCustomDb] = useState("");
  const [srBooleanString, setSrBooleanString] = useState("");
  const [srConnector, setSrConnector] = useState<BooleanConnector>("AND");
  const [srTotalResults, setSrTotalResults] = useState("");
  const [srRelevantResults, setSrRelevantResults] = useState("");
  const [pullingSearchRecordId, setPullingSearchRecordId] = useState<string | null>(null);
  const [searchRecordOffsets, setSearchRecordOffsets] = useState<Record<string, number>>({});

  // Mark Relevant Dialog
  const [showRelevanceDialog, setShowRelevanceDialog] = useState(false);
  const [relevancePaperId, setRelevancePaperId] = useState<string | null>(null);

  // Add Candidate Paper Dialog
  const [showAddPaperDialog, setShowAddPaperDialog] = useState(false);
  const [showAddMultiplePaperDialog, setShowAddMultiplePaperDialog] = useState(false);
  const [showEditPaperDialog, setShowEditPaperDialog] = useState(false);
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [newPaperTitle, setNewPaperTitle] = useState("");
  const [newPaperAuthors, setNewPaperAuthors] = useState("");
  const [newPaperYear, setNewPaperYear] = useState("");
  const [newPaperJournal, setNewPaperJournal] = useState("");
  const [newPaperDiscoveryPath, setNewPaperDiscoveryPath] = useState("Academic Database");
  const [newPaperDiscoveryNote, setNewPaperDiscoveryNote] = useState("");
  const [newPaperDoiUrl, setNewPaperDoiUrl] = useState("");
  const [doiFetching, setDoiFetching] = useState(false);
  const [doiFetchError, setDoiFetchError] = useState<string | null>(null);
  const [newPaperSearchRecordId, setNewPaperSearchRecordId] = useState("");
  const [bulkDoiInput, setBulkDoiInput] = useState("");
  const [bulkSearchRecordId, setBulkSearchRecordId] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [showCandidateRefreshDialog, setShowCandidateRefreshDialog] = useState(false);
  const [candidateRefreshMode, setCandidateRefreshMode] = useState<"select" | "random">("select");
  const [candidateRefreshRecordId, setCandidateRefreshRecordId] = useState("");

  // Discovery Path Dialog
  const [showDiscoveryDialog, setShowDiscoveryDialog] = useState(false);
  const [discoveryPaperId, setDiscoveryPaperId] = useState<string | null>(null);
  const [discoveryPathValue, setDiscoveryPathValue] = useState("Academic Database");
  const [discoveryNoteValue, setDiscoveryNoteValue] = useState("");
  const highlightedSearchQuery = (searchParams.get("searchQuery") || "").trim();

  const keywordsStorageKey = `${DISCOVER_KEYWORDS_STORAGE_KEY_PREFIX}:${projectId}`;
  const searchRecordPurposeLinksKey = `${SEARCH_RECORD_PURPOSE_LINKS_KEY_PREFIX}:${projectId}`;

  const normalizeKeywordTerm = (value: string) => value.trim().toLowerCase();

  const loadSearchRecordPurposeLinks = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(searchRecordPurposeLinksKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const saveSearchRecordPurposeLinks = (next: Record<string, string>) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(searchRecordPurposeLinksKey, JSON.stringify(next));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(keywordsStorageKey);
      if (!raw) {
        setKeywords([...DUMMY_KEYWORDS]);
        setKeywordsHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as Keyword[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setKeywords(parsed);
        setKeywordsHydrated(true);
        return;
      }
      setKeywords([...DUMMY_KEYWORDS]);
      setKeywordsHydrated(true);
    } catch {
      setKeywords([...DUMMY_KEYWORDS]);
      setKeywordsHydrated(true);
    }
  }, [keywordsStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!keywordsHydrated) return;
    window.localStorage.setItem(keywordsStorageKey, JSON.stringify(keywords));
  }, [keywordsStorageKey, keywords, keywordsHydrated]);

  useEffect(() => {
    if (!projectId) return;
    conceptAPI
      .list(projectId)
      .then((items) => {
        setConcepts(items.map(apiConceptToLocal));
      })
      .catch(() => {
        setConcepts([]);
      });
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    searchRecordAPI
      .list(projectId)
      .then((items) => {
        const purposeMap = loadSearchRecordPurposeLinks();
        setSearchRecords(
          items.map((item: ApiSearchRecord) => ({
            id: item.id,
            database: item.database,
            query: item.query,
            results: item.results,
            relevant: item.relevant,
            date: item.searched_at.includes("T") ? item.searched_at.split("T")[0] : item.searched_at,
            purposeCardId: purposeMap[item.id],
          }))
        );
      })
      .catch(() => {
        setSearchRecords([]);
      });
  }, [projectId, searchRecordPurposeLinksKey]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "search" || tab === "candidates" || tab === "keywords") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== "search" || !highlightedSearchQuery) return;
    const timer = window.setTimeout(() => {
      const target = document.getElementById(`search-record-${encodeURIComponent(highlightedSearchQuery)}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);

    return () => window.clearTimeout(timer);
  }, [activeTab, highlightedSearchQuery, searchRecords]);

  // Helper: map API paper to local Paper type
  const apiPaperToLocal = (p: ApiPaper): CandidatePaper => ({
    id: p.id,
    title: p.title,
    authors: p.authors,
    year: p.year ?? new Date().getFullYear(),
    journal: p.journal ?? "Unknown",
    abstract: p.abstract ?? "",
    researchQuestion: "",
    theory: "",
    method: "",
    findings: "",
    relevance: p.relevance,
    isEntryPaper: p.is_entry_paper,
    annotations: [],
    discoveryPath: p.discovery_path,
    discoveryNote: p.discovery_note,
    doi: undefined,
    doiUrl: undefined,
    externalSourceUrl: undefined,
  });

  const mergePersistedCandidatePaper = (
    previous: CandidatePaper,
    persisted: ApiPaper
  ): CandidatePaper => ({
    ...apiPaperToLocal(persisted),
    searchRecordId: previous.searchRecordId,
    doi: previous.doi,
    doiUrl: previous.doiUrl,
    externalSourceUrl: previous.externalSourceUrl,
  });

  const replaceCandidatePaper = (previousId: string, nextPaper: CandidatePaper) => {
    setCandidatePapers((prev) =>
      prev.map((paper) => (paper.id === previousId ? nextPaper : paper))
    );
    setEntryPapers((prev) => prev.map((id) => (id === previousId ? nextPaper.id : id)));
    setSelectedPaperIds((prev) => prev.map((id) => (id === previousId ? nextPaper.id : id)));
    setAddedToCenterIds((prev) => {
      if (!prev.has(previousId)) return prev;
      const next = new Set(prev);
      next.delete(previousId);
      next.add(nextPaper.id);
      return next;
    });
    persistArtifacts((prev) =>
      prev.map((artifact) =>
        artifact.id === `entry-paper-${previousId}` ? candidatePaperToArtifact(nextPaper) : artifact
      )
    );
  };

  const formatApiErrorDetail = (error: unknown) => {
    const err = error as {
      message?: string;
      response?: {
        status?: number;
        data?: unknown;
      };
    };

    const status = err?.response?.status;
    const data = err?.response?.data;

    let detail = "Unknown error";
    if (typeof data === "string") {
      detail = data;
    } else if (data && typeof data === "object") {
      const payload = data as { detail?: string; message?: string };
      detail = payload.detail || payload.message || err?.message || "Unknown error";
    } else if (err?.message) {
      detail = err.message;
    }

    if (status) {
      return `HTTP ${status}: ${detail}`;
    }

    return detail;
  };

  const persistCandidatePaper = async (
    paper: CandidatePaper,
    patch: Partial<ApiPaper>
  ): Promise<CandidatePaper> => {
    const isTemporaryPaper = paper.id.startsWith("paper-");

    if (!isTemporaryPaper) {
      const updated = await paperAPI.update(paper.id, patch);
      const nextPaper = mergePersistedCandidatePaper(paper, updated);
      setCandidatePapers((prev) =>
        prev.map((item) => (item.id === paper.id ? nextPaper : item))
      );
      return nextPaper;
    }

    const created = await paperAPI.create({
      title: patch.title ?? paper.title,
      authors: patch.authors ?? paper.authors,
      year: patch.year ?? paper.year,
      journal:
        patch.journal ?? (paper.journal && paper.journal !== "Unknown" ? paper.journal : undefined),
      abstract: patch.abstract ?? paper.abstract ?? undefined,
      url: patch.url ?? paper.doiUrl ?? paper.externalSourceUrl,
      discovery_path: patch.discovery_path ?? paper.discoveryPath,
      discovery_note: patch.discovery_note ?? paper.discoveryNote,
      project_id: projectId,
    });

    const updated = await paperAPI.update(created.id, patch);
    const nextPaper = mergePersistedCandidatePaper(paper, updated);
    replaceCandidatePaper(paper.id, nextPaper);
    return nextPaper;
  };

  const persistArtifacts = (updater: (prev: Artifact[]) => Artifact[]) => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    const next = updater(Array.isArray(parsed) ? parsed : []);
    window.localStorage.setItem(ARTIFACTS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(ARTIFACTS_UPDATED_EVENT));
  };

  const candidatePaperToArtifact = (paper: CandidatePaper): Artifact => ({
    id: `entry-paper-${paper.id}`,
    title: paper.title,
    type: "entry-paper",
    projectId,
    sourceStep: 2,
    description: paper.abstract || `${paper.authors.join(", ")} (${paper.year}) - ${paper.journal}`,
    updatedAt: new Date().toISOString().split("T")[0],
    content: JSON.stringify(
      {
        authors: paper.authors,
        year: paper.year,
        journal: paper.journal,
        abstract: paper.abstract,
        relevance: paper.relevance,
        discoveryPath: paper.discoveryPath,
        discoveryNote: paper.discoveryNote,
        doi: paper.doi,
        doiUrl: paper.doiUrl,
        externalSourceUrl: paper.externalSourceUrl,
      },
      null,
      2
    ),
  });

  // Load papers from backend on mount
  useEffect(() => {
    if (!projectId) return;
    setPapersLoading(true);
    paperAPI
      .list(projectId)
      .then((apiPapers) => {
        setCandidatePapers(apiPapers.map(apiPaperToLocal));
        setEntryPapers(apiPapers.filter((p) => p.is_entry_paper).map((p) => p.id));
      })
      .catch(() => {})
      .finally(() => setPapersLoading(false));
  }, [projectId]);

  const handleOpenAddConceptDialog = (prefill?: string) => {
    if (purposeCards.length === 0) {
      toast.error("请先在 Step 1 创建至少一个 Purpose Card");
      return;
    }
    setConceptName(prefill?.trim() || "");
    setConceptDescription("");
    setConceptCategory("Keyword");
    setConceptColor("#22d3ee");
    setConceptPurposeCardId(purposeCards[0]?.id || "");
    setShowConceptDialog(true);
  };

  const openConceptDetail = (conceptId: string) => {
    setEditingConceptId(conceptId);
    setShowConceptDetailDialog(true);
  };

  const currentEditingConcept = concepts.find((c) => c.id === editingConceptId) || null;

  const updateEditingConcept = (
    patch: Partial<{ name: string; description: string; category: string; color: string }>
  ) => {
    if (!editingConceptId) return;
    setConcepts((prev) =>
      prev.map((c) => (c.id === editingConceptId ? { ...c, ...patch } : c))
    );
  };

  const handleDeleteConcept = async (conceptId: string) => {
    const next = concepts.filter((c) => c.id !== conceptId);
    setConcepts(next);
    if (editingConceptId === conceptId) {
      setShowConceptDetailDialog(false);
      setEditingConceptId(null);
    }
    try {
      await conceptAPI.delete(conceptId);
    } catch {
      toast.error("删除概念失败");
    }
  };

  const handleSaveConceptDetails = async () => {
    if (!editingConceptId) return;
    const concept = concepts.find((c) => c.id === editingConceptId);
    if (!concept) return;

    try {
      await conceptAPI.update(editingConceptId, toApiConceptPayload(concept));
      setShowConceptDetailDialog(false);
      setEditingConceptId(null);
      toast.success("概念已保存");
    } catch {
      toast.error("保存概念失败");
    }
  };

  const conceptByNameMap = new Map(concepts.map((c) => [c.name.toLowerCase(), c]));

  const renderQueryWithConceptLinks = (query: string) => {
    const sortedConcepts = [...concepts].sort((a, b) => b.name.length - a.name.length);
    if (!sortedConcepts.length || !query.trim()) {
      return <span>{query}</span>;
    }

    let remaining = query;
    const nodes: React.ReactNode[] = [];
    let key = 0;

    while (remaining.length > 0) {
      let matchedConcept: (typeof sortedConcepts)[number] | null = null;
      let matchedIndex = -1;

      for (const concept of sortedConcepts) {
        const idx = remaining.toLowerCase().indexOf(concept.name.toLowerCase());
        if (idx !== -1 && (matchedIndex === -1 || idx < matchedIndex)) {
          matchedConcept = concept;
          matchedIndex = idx;
        }
      }

      if (!matchedConcept || matchedIndex === -1) {
        nodes.push(<span key={`q-${key++}`}>{remaining}</span>);
        break;
      }

      if (matchedIndex > 0) {
        nodes.push(
          <span key={`q-${key++}`}>{remaining.slice(0, matchedIndex)}</span>
        );
      }

      const matchedText = remaining.slice(
        matchedIndex,
        matchedIndex + matchedConcept.name.length
      );
      nodes.push(
        <button
          key={`q-${key++}`}
          type="button"
          onClick={() => openConceptDetail(matchedConcept.id)}
          title={`${matchedConcept.name} (${matchedConcept.category})${matchedConcept.description ? `\n${matchedConcept.description}` : ""}`}
          className="underline underline-offset-2 decoration-dotted hover:opacity-80"
          style={{ color: matchedConcept.color }}
        >
          {matchedText}
        </button>
      );

      remaining = remaining.slice(matchedIndex + matchedConcept.name.length);
    }

    return <>{nodes}</>;
  };

  const resetSearchRecordForm = () => {
    setSrKeywords([]);
    setSrDatabase("Web of Science");
    setSrCustomDb("");
    setSrBooleanString("");
    setSrConnector("AND");
    setSrTotalResults("");
    setSrRelevantResults("");
    setSrPurposeCardId("");
  };

  const openAddSearchRecordDialog = () => {
    if (purposeCards.length === 0) {
      toast.error("请先在 Step 1 创建至少一个 Purpose Card");
      return;
    }
    resetSearchRecordForm();
    setSrPurposeCardId(purposeCards[0]?.id || "");
    setShowSearchDialog(true);
  };

  const openEditSearchRecordDialog = (record: SearchRecord) => {
    setEditingSearchRecordId(record.id);
    setSrBooleanString(record.query || "");
    setSrTotalResults(String(record.results || ""));
    setSrRelevantResults(String(record.relevant || ""));
    setSrPurposeCardId(record.purposeCardId || "");
    if (DATABASE_OPTIONS.includes(record.database as (typeof DATABASE_OPTIONS)[number])) {
      setSrDatabase(record.database);
      setSrCustomDb("");
    } else {
      setSrDatabase("Other");
      setSrCustomDb(record.database);
    }
    setSrKeywords([]);
    setShowEditSearchDialog(true);
  };

  const linkedCandidateCount = (searchRecordId: string) =>
    candidatePapers.filter((paper) => paper.searchRecordId === searchRecordId).length;

  const quoteBooleanTerm = (term: string) => {
    const normalized = term.trim().replace(/"/g, "");
    if (!normalized) return "";
    return `"${normalized}"`;
  };

  const buildBooleanStringFromSelected = (
    terms: string[],
    connector: BooleanConnector
  ) => {
    const tokens = terms.map((term) => quoteBooleanTerm(term)).filter(Boolean);
    return tokens.join(` ${connector} `);
  };

  const handleGenerateBooleanString = () => {
    if (!srKeywords.length) {
      toast.error("请至少选择一个关键词或概念");
      return;
    }
    setSrBooleanString(buildBooleanStringFromSelected(srKeywords, srConnector));
  };

  const appendBooleanToken = (token: string) => {
    setSrBooleanString((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${token}` : token;
    });
  };

  const buildDatabaseSearchUrl = (
    database: string,
    query: string,
    doi?: string,
    title?: string
  ) => {
    const raw = doi || title || query;
    const encoded = encodeURIComponent(raw);
    const db = database.toLowerCase();

    if (db.includes("web of science")) return `https://www.webofscience.com/wos/woscc/basic-search?value(input1)=${encoded}`;
    if (db.includes("scopus")) return `https://www.scopus.com/results/results.uri?query=${encoded}`;
    if (db.includes("google scholar")) return `https://scholar.google.com/scholar?q=${encoded}`;
    if (db.includes("cnki")) return `https://kns.cnki.net/kns8s/defaultresult/index?kw=${encoded}`;
    if (db.includes("vip")) return `https://www.cqvip.com/`;
    if (db.includes("pubmed")) return `https://pubmed.ncbi.nlm.nih.gov/?term=${encoded}`;
    if (db.includes("ieee")) return `https://ieeexplore.ieee.org/search/searchresult.jsp?queryText=${encoded}`;
    if (db.includes("eric")) return `https://eric.ed.gov/?q=${encoded}`;

    return `https://scholar.google.com/scholar?q=${encoded}`;
  };

  const buildAccessiblePaperLookupUrl = (title?: string, doi?: string) => {
    const raw = (doi || title || "").trim();
    if (!raw) return undefined;
    return `https://scholar.google.com/scholar?q=${encodeURIComponent(raw)}`;
  };

  const isRestrictedIndexerUrl = (url?: string) => {
    if (!url) return false;
    return /webofscience\.com|webofknowledge\.com|scopus\.com/i.test(url);
  };

  const resolveCandidateExternalUrl = (paper: CandidatePaper) => {
    if (paper.doiUrl) return paper.doiUrl;
    if (paper.doi) return `https://doi.org/${encodeURIComponent(paper.doi)}`;
    if (paper.externalSourceUrl && !isRestrictedIndexerUrl(paper.externalSourceUrl)) {
      return paper.externalSourceUrl;
    }
    return buildAccessiblePaperLookupUrl(paper.title, paper.doi) || paper.externalSourceUrl;
  };

  const getCrossrefYear = (item: {
    published?: { "date-parts"?: number[][] };
    issued?: { "date-parts"?: number[][] };
    created?: { "date-parts"?: number[][] };
  }) => {
    return (
      item.published?.["date-parts"]?.[0]?.[0] ||
      item.issued?.["date-parts"]?.[0]?.[0] ||
      item.created?.["date-parts"]?.[0]?.[0] ||
      new Date().getFullYear()
    );
  };

  const navigateToCandidatesTab = () => {
    setActiveTab("candidates");
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", "candidates");
    nextParams.delete("searchQuery");
    setSearchParams(nextParams, { replace: true });
  };

  const pullReferencesForSearchRecord = async (
    record: SearchRecord,
    mode: "first" | "next" = "first"
  ) => {
    const normalizedQuery = (record.query || "").trim();
    if (!normalizedQuery) {
      toast.error("Search string 为空，无法拉取参考文献");
      return false;
    }

    const currentOffset = mode === "first" ? 0 : searchRecordOffsets[record.id] ?? 10;
    setPullingSearchRecordId(record.id);

    try {
      const endpoint = new URL("https://api.crossref.org/works");
      endpoint.searchParams.set("query.bibliographic", normalizedQuery);
      endpoint.searchParams.set("rows", "10");
      endpoint.searchParams.set("offset", String(currentOffset));

      const response = await fetch(endpoint.toString());
      if (!response.ok) {
        throw new Error("crossref fetch failed");
      }

      const json = (await response.json()) as {
        message?: {
          [key: string]: unknown;
          items?: Array<{
            DOI?: string;
            title?: string[];
            author?: Array<{ given?: string; family?: string }>;
            published?: { "date-parts"?: number[][] };
            issued?: { "date-parts"?: number[][] };
            created?: { "date-parts"?: number[][] };
            "container-title"?: string[];
            URL?: string;
          }>;
        };
      };

      const totalResults = Number(json.message?.["total-results"] ?? record.results ?? 0);
      const items = Array.isArray(json.message?.items) ? json.message?.items : [];

      if (!items.length) {
        toast.info("没有拉取到新的参考文献");
        return true;
      }

      const existingByDoi = new Set(
        candidatePapers
          .map((paper) => (paper.doi || "").trim().toLowerCase())
          .filter(Boolean)
      );
      const existingByTitle = new Set(candidatePapers.map((paper) => paper.title.trim().toLowerCase()));
      const blockedByHistoryTitle = getBlockedPaperTitlesFromDecisionHistory(projectId);

      const imported: CandidatePaper[] = [];
      let duplicateCount = 0;

      for (const item of items) {
        const title = item.title?.[0]?.trim();
        if (!title) continue;

        const doi = (item.DOI || "").trim();
        const doiLower = doi.toLowerCase();
        const titleLower = title.toLowerCase();

        if (
          (doiLower && existingByDoi.has(doiLower)) ||
          existingByTitle.has(titleLower) ||
          blockedByHistoryTitle.has(titleLower)
        ) {
          duplicateCount += 1;
          continue;
        }

        const authors = (item.author || [])
          .map((a) => [a.given, a.family].filter(Boolean).join(" "))
          .filter(Boolean);
        const year = getCrossrefYear(item);
        const journal = item["container-title"]?.[0] || "Unknown";
        const doiUrl = doi ? `https://doi.org/${encodeURIComponent(doi)}` : undefined;
        const externalSourceUrl = buildDatabaseSearchUrl(record.database, normalizedQuery, doi, title);

        try {
          const created = await paperAPI.create({
            title,
            authors,
            year,
            journal,
            discovery_path: record.database,
            discovery_note: `From Search Log: ${normalizedQuery}`,
            project_id: projectId,
          });
          imported.push({
            ...apiPaperToLocal(created),
            searchRecordId: record.id,
            doi,
            doiUrl,
            externalSourceUrl: item.URL || externalSourceUrl,
          });
        } catch {
          failedCount += 1;
        }

        if (doiLower) existingByDoi.add(doiLower);
        existingByTitle.add(titleLower);
      }

      if (!imported.length) {
        if (failedCount > 0) {
          toast.error("候选文献写入失败，未新增数据", {
            description: `${failedCount} 篇写入后端失败`,
          });
        } else {
          toast.info("本次结果全部是重复文献，未新增 candidate papers");
        }
        return true;
      }

      setCandidatePapers((prev) => [...prev, ...imported]);

      setSearchRecordOffsets((prev) => ({ ...prev, [record.id]: currentOffset + 10 }));
      const nextResults = totalResults || record.results;
      const nextRelevant = Math.max(record.relevant, imported.length);
      setSearchRecords((prev) =>
        prev.map((r) =>
          r.id === record.id
            ? {
                ...r,
                results: nextResults,
                relevant: nextRelevant,
              }
            : r
        )
      );
      try {
        await searchRecordAPI.update(record.id, {
          results: nextResults,
          relevant: nextRelevant,
        });
      } catch {
        toast.error("更新 Search Log 统计失败");
      }

      toast.success(`已导入 ${imported.length} 篇候选文献`, {
        description:
          failedCount > 0
            ? `${failedCount} 篇写入后端失败，已跳过`
            : duplicateCount > 0
              ? `跳过重复文献 ${duplicateCount} 篇`
              : `来自 ${record.database}`,
      });
      return true;
    } catch {
      toast.error("拉取参考文献失败，请稍后重试");
      return false;
    } finally {
      setPullingSearchRecordId(null);
    }
  };

  const buildSearchRecordFromCurrentForm = () => {
    if (purposeCards.length === 0) {
      toast.error("请先在 Step 1 创建至少一个 Purpose Card");
      return null;
    }
    if (!srPurposeCardId) {
      toast.error("请为该 Search Log 选择关联的 Purpose Card");
      return null;
    }
    const db = srDatabase === "Other" ? srCustomDb || "Other" : srDatabase;
    const query = srBooleanString.trim() || buildBooleanStringFromSelected(srKeywords, srConnector).trim();

    if (!query) {
      toast.error("请先构建 Boolean Search String");
      return null;
    }

    const nextRecord: SearchRecord = {
      id: `sr-${Date.now()}`,
      database: db,
      query,
      results: parseInt(srTotalResults) || 0,
      relevant: parseInt(srRelevantResults) || 0,
      date: new Date().toISOString().split("T")[0],
      purposeCardId: srPurposeCardId || undefined,
    };

    return nextRecord;
  };

  const handleDeleteSearchRecord = async (searchRecordId: string) => {
    const linkedCount = linkedCandidateCount(searchRecordId);
    if (linkedCount > 0) {
      toast.error("无法删除该 Search Record", {
        description: `已关联 ${linkedCount} 篇 candidate paper，请先解除关联。`,
      });
      return;
    }
    setSearchRecords((prev) => prev.filter((r) => r.id !== searchRecordId));
    setSearchRecordOffsets((prev) => {
      const next = { ...prev };
      delete next[searchRecordId];
      return next;
    });
    const nextPurposeMap = loadSearchRecordPurposeLinks();
    delete nextPurposeMap[searchRecordId];
    saveSearchRecordPurposeLinks(nextPurposeMap);
    try {
      await searchRecordAPI.delete(searchRecordId);
    } catch {
      toast.error("删除 Search Log 失败");
    }
    toast.success("Search Record 已删除");
  };

  const handleAddSearchRecord = async () => {
    const newRecord = buildSearchRecordFromCurrentForm();
    if (!newRecord) return;

    // Add any new keywords to the global keywords list
    setKeywords((prev) => {
      let next = prev;
      srKeywords.forEach((kw) => {
        const exists = next.some((k) => normalizeKeywordTerm(k.term) === normalizeKeywordTerm(kw));
        if (!exists) {
          next = [
            ...next,
            {
              id: `kw-${Date.now()}-${Math.random()}`,
              term: kw,
              category: "Custom",
              purposeCardId: srPurposeCardId || undefined,
            },
          ];
        }
      });
      return next;
    });

    try {
      const created = await searchRecordAPI.create({
        project_id: projectId,
        database: newRecord.database,
        query: newRecord.query,
        results: newRecord.results,
        relevant: newRecord.relevant,
      });
      const localRecord = {
        id: created.id,
        database: created.database,
        query: created.query,
        results: created.results,
        relevant: created.relevant,
        date: created.searched_at.includes("T") ? created.searched_at.split("T")[0] : created.searched_at,
        purposeCardId: newRecord.purposeCardId,
      };
      if (newRecord.purposeCardId) {
        const nextPurposeMap = loadSearchRecordPurposeLinks();
        nextPurposeMap[created.id] = newRecord.purposeCardId;
        saveSearchRecordPurposeLinks(nextPurposeMap);
      }
      setSearchRecords((prev) => [...prev, localRecord]);
      setSearchRecordOffsets((prev) => ({ ...prev, [localRecord.id]: 0 }));
    } catch {
      toast.error("创建 Search Log 失败");
      return;
    }
    setShowSearchDialog(false);
    resetSearchRecordForm();
  };

  const handleAddSearchRecordAndPull = async () => {
    const newRecord = buildSearchRecordFromCurrentForm();
    if (!newRecord) return;

    setKeywords((prev) => {
      let next = prev;
      srKeywords.forEach((kw) => {
        const exists = next.some((k) => normalizeKeywordTerm(k.term) === normalizeKeywordTerm(kw));
        if (!exists) {
          next = [
            ...next,
            {
              id: `kw-${Date.now()}-${Math.random()}`,
              term: kw,
              category: "Custom",
              purposeCardId: srPurposeCardId || undefined,
            },
          ];
        }
      });
      return next;
    });

    let createdRecord: SearchRecord;
    try {
      const created = await searchRecordAPI.create({
        project_id: projectId,
        database: newRecord.database,
        query: newRecord.query,
        results: newRecord.results,
        relevant: newRecord.relevant,
      });
      createdRecord = {
        id: created.id,
        database: created.database,
        query: created.query,
        results: created.results,
        relevant: created.relevant,
        date: created.searched_at.includes("T") ? created.searched_at.split("T")[0] : created.searched_at,
        purposeCardId: newRecord.purposeCardId,
      };
      if (newRecord.purposeCardId) {
        const nextPurposeMap = loadSearchRecordPurposeLinks();
        nextPurposeMap[created.id] = newRecord.purposeCardId;
        saveSearchRecordPurposeLinks(nextPurposeMap);
      }
      setSearchRecords((prev) => [...prev, createdRecord]);
      setSearchRecordOffsets((prev) => ({ ...prev, [createdRecord.id]: 0 }));
    } catch {
      toast.error("创建 Search Log 失败");
      return;
    }
    setShowSearchDialog(false);
    resetSearchRecordForm();
    const pullSucceeded = await pullReferencesForSearchRecord(createdRecord, "first");
    if (pullSucceeded) {
      navigateToCandidatesTab();
    }
  };

  const handleOpenCandidateRefreshDialog = () => {
    if (!searchRecords.length) {
      toast.info("请先在 Search Log 中创建记录");
      return;
    }
    setCandidateRefreshMode("select");
    setCandidateRefreshRecordId(searchRecords[0]?.id ?? "");
    setShowCandidateRefreshDialog(true);
  };

  const handleCandidateRefreshPull = async () => {
    if (!searchRecords.length) {
      setShowCandidateRefreshDialog(false);
      toast.info("没有可用的 Search Log");
      return;
    }

    let targetRecord: SearchRecord | undefined;
    if (candidateRefreshMode === "random") {
      const randomIndex = Math.floor(Math.random() * searchRecords.length);
      targetRecord = searchRecords[randomIndex];
    } else {
      targetRecord = searchRecords.find((record) => record.id === candidateRefreshRecordId);
      if (!targetRecord) {
        toast.error("请选择一个 Search Log");
        return;
      }
    }

    setShowCandidateRefreshDialog(false);
    const pullSucceeded = await pullReferencesForSearchRecord(targetRecord, "next");
    if (pullSucceeded) {
      toast.success(`已从 ${targetRecord.database} 拉取新的 10 篇候选论文`);
    }
  };

  const handleSaveEditedSearchRecord = async () => {
    if (!editingSearchRecordId) return;
    const db = srDatabase === "Other" ? srCustomDb || "Other" : srDatabase;
    const nextQuery = srBooleanString.trim();
    const nextResults = parseInt(srTotalResults) || 0;
    const nextRelevant = parseInt(srRelevantResults) || 0;
    const nextPurposeCardId = srPurposeCardId || undefined;
    setSearchRecords((prev) =>
      prev.map((record) =>
        record.id === editingSearchRecordId
          ? {
              ...record,
              database: db,
              query: nextQuery || record.query,
              results: nextResults,
              relevant: nextRelevant,
              purposeCardId: nextPurposeCardId,
            }
          : record
      )
    );
    try {
      await searchRecordAPI.update(editingSearchRecordId, {
        database: db,
        query: nextQuery || undefined,
        results: nextResults,
        relevant: nextRelevant,
      });
      const nextPurposeMap = loadSearchRecordPurposeLinks();
      if (nextPurposeCardId) {
        nextPurposeMap[editingSearchRecordId] = nextPurposeCardId;
      } else {
        delete nextPurposeMap[editingSearchRecordId];
      }
      saveSearchRecordPurposeLinks(nextPurposeMap);
    } catch {
      toast.error("保存 Search Log 失败");
      return;
    }
    setShowEditSearchDialog(false);
    setEditingSearchRecordId(null);
    resetSearchRecordForm();
  };

  const extractDoiFromText = (input: string) => {
    const doiMatch = input.match(/\b10\.\d{4,}\/[^\s]+/i);
    return doiMatch ? doiMatch[0].replace(/[.,;)>]+$/, "") : null;
  };

  const handleFetchByDoiUrl = async () => {
    const input = newPaperDoiUrl.trim();
    if (!input) return;
    const doi = extractDoiFromText(input);
    if (!doi) {
      setDoiFetchError("未找到有效的 DOI，请检查输入或手动填写");
      return;
    }
    setDoiFetching(true);
    setDoiFetchError(null);
    try {
      const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
      if (!res.ok) throw new Error("Not found");
      const json = (await res.json()) as {
        message: {
          title?: string[];
          author?: Array<{ given?: string; family?: string }>;
          published?: { "date-parts"?: number[][] };
          "container-title"?: string[];
          publisher?: string;
        };
      };
      const work = json.message;
      if (work.title?.[0]) setNewPaperTitle(work.title[0]);
      const authors = (work.author ?? []).map((a) =>
        [a.given, a.family].filter(Boolean).join(" ")
      );
      if (authors.length) setNewPaperAuthors(authors.join(", "));
      const year = work.published?.["date-parts"]?.[0]?.[0];
      if (year) setNewPaperYear(String(year));
      const journal = work["container-title"]?.[0] ?? work.publisher;
      if (journal) setNewPaperJournal(journal);
      setDoiFetchError(null);
    } catch {
      setDoiFetchError("获取信息失败，请检查 DOI 是否正确或手动填写");
    } finally {
      setDoiFetching(false);
    }
  };

  const handleMarkRelevance = (level: "high" | "medium" | "low") => {
    if (relevancePaperId) {
      paperAPI.update(relevancePaperId, { relevance: level }).catch(() => {});
      setCandidatePapers(
        candidatePapers.map((p) =>
          p.id === relevancePaperId ? { ...p, relevance: level } : p
        )
      );
    }
    setShowRelevanceDialog(false);
    setRelevancePaperId(null);
  };

  const handleAddCandidatePaper = async () => {
    if (!newPaperTitle.trim()) return;
    const selectedRecord = searchRecords.find((r) => r.id === newPaperSearchRecordId);
    const resolvedDiscoveryPath = selectedRecord?.database || newPaperDiscoveryPath;
    const resolvedDiscoveryNote = newPaperDiscoveryNote || (selectedRecord ? `From Search Record: ${selectedRecord.query}` : undefined);

    try {
      const created = await paperAPI.create({
        title: newPaperTitle.trim(),
        authors: newPaperAuthors.split(",").map((a) => a.trim()).filter(Boolean),
        year: parseInt(newPaperYear) || undefined,
        journal: newPaperJournal.trim() || undefined,
        discovery_path: resolvedDiscoveryPath,
        discovery_note: resolvedDiscoveryNote,
        project_id: projectId,
      });
      const localPaper = apiPaperToLocal(created);
      setCandidatePapers((prev) => [...prev, { ...localPaper, searchRecordId: newPaperSearchRecordId || undefined }]);
    } catch {
      toast.error("新增论文失败，请稍后重试");
      return;
    }
    setShowAddPaperDialog(false);
    setNewPaperTitle("");
    setNewPaperAuthors("");
    setNewPaperYear("");
    setNewPaperJournal("");
    setNewPaperDiscoveryPath("Academic Database");
    setNewPaperDiscoveryNote("");
    setNewPaperDoiUrl("");
    setDoiFetchError(null);
    setNewPaperSearchRecordId("");
  };

  const handleAddMultipleCandidatePapers = async () => {
    const lines = bulkDoiInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;

    const selectedRecord = searchRecords.find((r) => r.id === bulkSearchRecordId);
    const resolvedDiscoveryPath = selectedRecord?.database || "Academic Database";
    const resolvedDiscoveryNote = selectedRecord ? `From Search Record: ${selectedRecord.query}` : undefined;

    setBulkImporting(true);
    const imported: CandidatePaper[] = [];
    let failedCount = 0;

    for (const line of lines) {
      const doi = extractDoiFromText(line);
      if (!doi) {
        failedCount += 1;
        continue;
      }

      try {
        const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
        if (!res.ok) {
          failedCount += 1;
          continue;
        }
        const json = (await res.json()) as {
          message: {
            title?: string[];
            author?: Array<{ given?: string; family?: string }>;
            published?: { "date-parts"?: number[][] };
            "container-title"?: string[];
            publisher?: string;
          };
        };
        const work = json.message;
        const title = work.title?.[0]?.trim();
        if (!title) {
          failedCount += 1;
          continue;
        }
        const authors = (work.author ?? []).map((a) => [a.given, a.family].filter(Boolean).join(" ")).filter(Boolean);
        const year = work.published?.["date-parts"]?.[0]?.[0];
        const journal = work["container-title"]?.[0] ?? work.publisher;

        try {
          const created = await paperAPI.create({
            title,
            authors,
            year: year || undefined,
            journal: journal || undefined,
            discovery_path: resolvedDiscoveryPath,
            discovery_note: resolvedDiscoveryNote,
            project_id: projectId,
          });
          imported.push({
            ...apiPaperToLocal(created),
            searchRecordId: bulkSearchRecordId || undefined,
          });
        } catch {
          failedCount += 1;
        }
      } catch {
        failedCount += 1;
      }
    }

    if (imported.length > 0) {
      setCandidatePapers((prev) => [...prev, ...imported]);
    }

    setBulkImporting(false);
    if (imported.length > 0) {
      toast.success(`已导入 ${imported.length} 篇 candidate papers`, {
        description: failedCount > 0 ? `${failedCount} 条 DOI 识别失败` : undefined,
      });
      setShowAddMultiplePaperDialog(false);
      setBulkDoiInput("");
      setBulkSearchRecordId("");
    } else {
      toast.error("未能导入论文，请检查 DOI 链接格式");
    }
  };

  const openEditPaperDialog = (paper: CandidatePaper) => {
    setEditingPaperId(paper.id);
    setNewPaperTitle(paper.title);
    setNewPaperAuthors(paper.authors.join(", "));
    setNewPaperYear(String(paper.year || ""));
    setNewPaperJournal(paper.journal || "");
    setNewPaperDiscoveryPath(paper.discoveryPath || "Academic Database");
    setNewPaperDiscoveryNote(paper.discoveryNote || "");
    setShowEditPaperDialog(true);
  };

  const handleSaveEditedPaper = async () => {
    if (!editingPaperId || !newPaperTitle.trim()) return;

    const nextPatch = {
      title: newPaperTitle.trim(),
      authors: newPaperAuthors.split(",").map((a) => a.trim()).filter(Boolean),
      year: parseInt(newPaperYear) || undefined,
      journal: newPaperJournal.trim() || undefined,
      discovery_path: newPaperDiscoveryPath,
      discovery_note: newPaperDiscoveryNote || undefined,
    };

    try {
      const updated = await paperAPI.update(editingPaperId, nextPatch);
      setCandidatePapers((prev) => prev.map((paper) => (paper.id === editingPaperId ? apiPaperToLocal(updated) : paper)));
    } catch {
      setCandidatePapers((prev) =>
        prev.map((paper) =>
          paper.id === editingPaperId
            ? {
                ...paper,
                title: nextPatch.title,
                authors: nextPatch.authors || [],
                year: nextPatch.year || paper.year,
                journal: nextPatch.journal || "Unknown",
                discoveryPath: nextPatch.discovery_path,
                discoveryNote: nextPatch.discovery_note,
              }
            : paper
        )
      );
    }

    setShowEditPaperDialog(false);
    setEditingPaperId(null);
    setNewPaperTitle("");
    setNewPaperAuthors("");
    setNewPaperYear("");
    setNewPaperJournal("");
    setNewPaperDiscoveryPath("Academic Database");
    setNewPaperDiscoveryNote("");
  };

  const handleDeleteCandidatePaper = async (paperId: string) => {
    const paperToDelete = candidatePapers.find((p) => p.id === paperId);
    try {
      await paperAPI.delete(paperId);
    } catch {
      // Allow local removal if backend delete fails for temporary items.
    }

    if (paperToDelete) {
      recordPaperDecision(
        paperToDelete.title,
        "Deleted from Candidate Papers (Step 2: Discover)",
        projectId
      );
    }

    setCandidatePapers((prev) => prev.filter((paper) => paper.id !== paperId));
    setEntryPapers((prev) => prev.filter((id) => id !== paperId));
    setSelectedPaperIds((prev) => prev.filter((id) => id !== paperId));
    setAddedToCenterIds((prev) => { const next = new Set(prev); next.delete(paperId); return next; });

    persistArtifacts((prev) => prev.filter((artifact) => artifact.id !== `entry-paper-${paperId}`));
  };

  const handleTogglePaperArtifact = (paper: CandidatePaper) => {
    if (addedToCenterIds.has(paper.id)) {
      persistArtifacts((prev) => prev.filter((a) => a.id !== `entry-paper-${paper.id}`));
      setAddedToCenterIds((prev) => {
        const next = new Set(prev);
        next.delete(paper.id);
        return next;
      });
      toast.success("已从 Artifact Center 移除", { description: paper.title, duration: 2000 });
    } else {
      const artifact = candidatePaperToArtifact(paper);
      persistArtifacts((prev) => {
        const filtered = prev.filter((item) => item.id !== artifact.id);
        return [...filtered, artifact];
      });
      setAddedToCenterIds((prev) => new Set([...prev, paper.id]));
      toast.success("已添加到 Artifact Center", { description: paper.title, duration: 2500 });
    }
  };

  const handleToggleEntryPaper = async (paperId: string) => {
    const isEntry = entryPapers.includes(paperId);
    if (isEntry) {
      toast.info("该论文已在 Entry Papers 中，可在后续环节删除");
      return;
    }
    const targetPaper = candidatePapers.find((paper) => paper.id === paperId);
    if (!targetPaper) return;

    try {
      const persistedPaper = await persistCandidatePaper(targetPaper, { is_entry_paper: true });
      setEntryPapers((prev) => {
        if (prev.includes(persistedPaper.id)) return prev;
        return [...prev.filter((id) => id !== paperId), persistedPaper.id];
      });
      recordPaperDecision(targetPaper.title, "Moved to Entry Papers (Step 2: Discover)", projectId);
    } catch (error) {
      toast.error("移动到 Entry Papers 失败", {
        description: formatApiErrorDetail(error),
      });
    }
  };

  const handleSaveDiscoveryPath = () => {
    if (discoveryPaperId) {
      paperAPI
        .update(discoveryPaperId, {
          discovery_path: discoveryPathValue,
          discovery_note: discoveryNoteValue || undefined,
        })
        .catch(() => {});
      setCandidatePapers(
        candidatePapers.map((p) =>
          p.id === discoveryPaperId
            ? { ...p, discoveryPath: discoveryPathValue, discoveryNote: discoveryNoteValue }
            : p
        )
      );
    }
    setShowDiscoveryDialog(false);
    setDiscoveryPaperId(null);
  };

  const togglePaperSelection = (id: string) => {
    setSelectedPaperIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const inferPublicationType = (paper: CandidatePaper) => {
    const source = `${paper.journal || ""} ${paper.title || ""}`.toLowerCase();
    if (/proceedings|conference|symposium|workshop|acm|ieee/.test(source)) return "conference";
    if (/book|handbook|monograph|press/.test(source)) return "book";
    if (/arxiv|preprint|biorxiv|medrxiv/.test(source)) return "preprint";
    if (/journal|transactions|letters|review/.test(source)) return "journal article";
    return "other";
  };

  const relevanceRank = (level: CandidatePaper["relevance"]) => {
    if (!level) return 0;
    if (level === "high") return 3;
    if (level === "medium") return 2;
    return 1;
  };

  const sortedCandidatePapers = [...candidatePapers].sort((a, b) => {
    const direction = candidateSortOrder === "asc" ? 1 : -1;

    if (candidateSortKey === "title") {
      return direction * a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    }
    if (candidateSortKey === "year") {
      return direction * ((a.year || 0) - (b.year || 0));
    }
    if (candidateSortKey === "type") {
      return direction * inferPublicationType(a).localeCompare(inferPublicationType(b));
    }

    return direction * (relevanceRank(a.relevance) - relevanceRank(b.relevance));
  });

  const sortedSearchRecords = [...searchRecords].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.id.localeCompare(a.id);
  });

  const activePullingRecord = pullingSearchRecordId
    ? searchRecords.find((record) => record.id === pullingSearchRecordId)
    : null;

  const allVisibleSelected =
    sortedCandidatePapers.length > 0 &&
    sortedCandidatePapers.every((paper) => selectedPaperIds.includes(paper.id));

  const handleToggleSelectAllVisible = () => {
    const visibleIds = sortedCandidatePapers.map((paper) => paper.id);
    if (allVisibleSelected) {
      setSelectedPaperIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      return;
    }

    setSelectedPaperIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleBatchDeleteSelected = async () => {
    if (!selectedPaperIds.length) return;

    const idsToDelete = [...selectedPaperIds];
    const papersToDelete = candidatePapers.filter((paper) => idsToDelete.includes(paper.id));
    await Promise.allSettled(
      idsToDelete.map(async (paperId) => {
        try {
          await paperAPI.delete(paperId);
        } catch {
          // Keep local removal for temporary papers.
        }
      })
    );

    papersToDelete.forEach((paper) => {
      recordPaperDecision(
        paper.title,
        "Batch deleted from Candidate Papers (Step 2: Discover)",
        projectId
      );
    });

    setCandidatePapers((prev) => prev.filter((paper) => !idsToDelete.includes(paper.id)));
    setEntryPapers((prev) => prev.filter((id) => !idsToDelete.includes(id)));
    setAddedToCenterIds((prev) => {
      const next = new Set(prev);
      idsToDelete.forEach((id) => next.delete(id));
      return next;
    });
    setSelectedPaperIds([]);

    persistArtifacts((prev) =>
      prev.filter((artifact) => !idsToDelete.some((paperId) => artifact.id === `entry-paper-${paperId}`))
    );

    toast.success(`Deleted ${idsToDelete.length} candidate paper(s)`);
  };

  const handleBatchToEntry = async () => {
    const selectedPapers = candidatePapers.filter((paper) => selectedPaperIds.includes(paper.id));
    if (!selectedPapers.length) return;

    const results = await Promise.allSettled(
      selectedPapers.map((paper) => persistCandidatePaper(paper, { is_entry_paper: true }))
    );

    const movedPapers = results
      .filter((result): result is PromiseFulfilledResult<CandidatePaper> => result.status === "fulfilled")
      .map((result) => result.value);

    const failureDetails = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => formatApiErrorDetail(result.reason));

    if (!movedPapers.length) {
      toast.error("移动到 Entry Papers 失败", {
        description: failureDetails[0] || "Unknown error",
      });
      return;
    }

    movedPapers.forEach((paper) => {
      recordPaperDecision(paper.title, "Moved to Entry Papers (Step 2: Discover)", projectId);
    });

    setEntryPapers((prev) => {
      const next = new Set(prev);
      selectedPapers.forEach((paper) => next.delete(paper.id));
      movedPapers.forEach((paper) => next.add(paper.id));
      return Array.from(next);
    });

    if (failureDetails.length) {
      toast.error(`其中 ${failureDetails.length} 篇发送失败`, {
        description: failureDetails[0],
      });
    }

    toast.success(`已将 ${movedPapers.length} 篇论文移动到 Entry Papers`);
    setSelectedPaperIds([]);
  };

  return (
    <div className="space-y-5">
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const nextTab = value as "keywords" | "search" | "candidates";
          setActiveTab(nextTab);
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set("tab", nextTab);
          if (nextTab !== "search") {
            nextParams.delete("searchQuery");
          }
          setSearchParams(nextParams, { replace: true });
        }}
        className="w-full"
      >
        <div className="mb-4 rounded-xl border border-slate-700/50 bg-slate-900/20 px-3 pt-5 pb-2">
          <TabsList className="flex w-auto flex-wrap justify-start gap-2 bg-transparent p-0">
            <TabsTrigger
              value="keywords"
              className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              Keywords
            </TabsTrigger>
            <TabsTrigger
              value="search"
              className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              Search Log
            </TabsTrigger>
            <TabsTrigger
              value="candidates"
              className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
            >
              Candidate Papers
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="keywords" className="mt-4 space-y-4">
          {purposeCards.length === 0 && (
            <div className="rounded-lg border border-amber-300/40 bg-amber-50/10 p-3 text-xs text-amber-300">
              请先在 Step 1 创建至少一个 Purpose Card，之后才能新增并关联 keyword。
            </div>
          )}
          <Card className="border-slate-700/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Keyword Builder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add a keyword..."
                  className="text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleOpenAddConceptDialog(newKeyword);
                    }
                  }}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
                      onClick={() => handleOpenAddConceptDialog(newKeyword)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </DropdownMenuTrigger>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <Badge
                    key={kw.id}
                    variant="secondary"
                    className="text-xs px-3 py-1 bg-slate-800 gap-1"
                  >
                    {kw.term}
                    <span className="ml-1.5 text-[10px] text-slate-400">
                      {kw.category}
                    </span>
                    <button
                      onClick={() => setKeywords((prev) => prev.filter((k) => k.id !== kw.id))}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
                {concepts.map((concept) => (
                  <Badge
                    key={concept.id}
                    variant="secondary"
                    className="text-xs px-3 py-1 gap-1 border"
                    style={{ backgroundColor: `${concept.color}18`, borderColor: `${concept.color}55`, color: concept.color }}
                  >
                    <Lightbulb className="w-2.5 h-2.5 mr-0.5" />
                    {concept.name}
                    <span className="ml-1 text-[10px] opacity-70">{concept.category}</span>
                    <button
                      onClick={() => void handleDeleteConcept(concept.id)}
                      className="ml-1 hover:opacity-60"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="mt-4 space-y-4">
          {purposeCards.length === 0 && (
            <div className="rounded-lg border border-amber-300/40 bg-amber-50/10 p-3 text-xs text-amber-300">
              请先在 Step 1 创建至少一个 Purpose Card，之后才能新增并关联 Search Log。
            </div>
          )}
          <Card className="border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Search Logs
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={openAddSearchRecordDialog}
                  >
                    <PenTool className="w-3 h-3 mr-1" />
                    Advanced Form
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-700/50 p-3 bg-slate-800/40/70 space-y-3">
                  <p className="text-xs font-semibold text-slate-700">Build Boolean Search String</p>
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-500">Select existing keywords:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {keywords.map((kw) => (
                        <Badge
                          key={kw.id}
                          variant={srKeywords.includes(kw.term) ? "default" : "outline"}
                          className={cn(
                            "text-[10px] cursor-pointer transition-all",
                            srKeywords.includes(kw.term)
                              ? "bg-cyan-600 text-white"
                              : "hover:bg-slate-800"
                          )}
                          onClick={() => {
                            if (srKeywords.includes(kw.term)) {
                              setSrKeywords(srKeywords.filter((k) => k !== kw.term));
                            } else {
                              setSrKeywords([...srKeywords, kw.term]);
                            }
                          }}
                        >
                          {kw.term}
                        </Badge>
                      ))}
                      {concepts.map((concept) => (
                        <Badge
                          key={concept.id}
                          variant={srKeywords.includes(concept.name) ? "default" : "outline"}
                          className={cn(
                            "text-[10px] cursor-pointer transition-all border",
                            srKeywords.includes(concept.name)
                              ? "text-white"
                              : "hover:opacity-80"
                          )}
                          style={
                            srKeywords.includes(concept.name)
                              ? { backgroundColor: concept.color, borderColor: concept.color }
                              : { color: concept.color, borderColor: `${concept.color}66`, backgroundColor: `${concept.color}12` }
                          }
                          onClick={() => {
                            if (srKeywords.includes(concept.name)) {
                              setSrKeywords(srKeywords.filter((k) => k !== concept.name));
                            } else {
                              setSrKeywords([...srKeywords, concept.name]);
                            }
                          }}
                        >
                          <Lightbulb className="w-2.5 h-2.5 mr-1" />
                          {concept.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-500">Boolean connectors:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {BOOLEAN_CONNECTORS.map((connector) => (
                        <Button
                          key={connector}
                          size="sm"
                          variant={srConnector === connector ? "default" : "outline"}
                          className={cn(
                            "h-7 text-[11px]",
                            srConnector === connector ? "bg-cyan-600 hover:bg-cyan-700 text-white" : ""
                          )}
                          onClick={() => setSrConnector(connector)}
                        >
                          {connector}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px]"
                        onClick={handleGenerateBooleanString}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Build Query
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-500">Boolean Search String</label>
                    <Textarea
                      value={srBooleanString}
                      onChange={(e) => setSrBooleanString(e.target.value)}
                      rows={3}
                      placeholder='e.g., "AI tutoring" AND "self-regulated learning" NOT "K-12"'
                      className="text-xs font-mono"
                    />
                    <div className="flex gap-1.5">
                      {BOOLEAN_CONNECTORS.map((connector) => (
                        <Button
                          key={`append-${connector}`}
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px]"
                          onClick={() => appendBooleanToken(connector)}
                        >
                          + {connector}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-500">Academic Database</label>
                      <Select value={srDatabase} onValueChange={setSrDatabase}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[...DATABASE_OPTIONS, "Other" as const].map((db) => (
                            <SelectItem key={db} value={db}>{db}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {srDatabase === "Other" && (
                        <Input
                          value={srCustomDb}
                          onChange={(e) => setSrCustomDb(e.target.value)}
                          placeholder="Enter database name..."
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-500">Total Results</label>
                        <Input
                          type="number"
                          value={srTotalResults}
                          onChange={(e) => setSrTotalResults(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-500">Relevant</label>
                        <Input
                          type="number"
                          value={srRelevantResults}
                          onChange={(e) => setSrRelevantResults(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                      onClick={handleAddSearchRecord}
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Save Search Log
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => void handleAddSearchRecordAndPull()}
                    >
                      <Search className="w-3 h-3 mr-1" />
                      Save + Pull Top 10
                    </Button>
                  </div>
                </div>

                {activePullingRecord && (
                  <div className="rounded-lg border border-blue-300/40 bg-blue-50/50 p-3 text-xs text-blue-700">
                    正在 pulling "{activePullingRecord.query}" 的文献，请稍候...
                  </div>
                )}

                <div className="space-y-3">
                {sortedSearchRecords.map((record) => {
                  const linkedCount = linkedCandidateCount(record.id);
                  const cannotDeleteReason = linkedCount > 0
                    ? `已关联 ${linkedCount} 篇 candidate paper，无法删除`
                    : null;

                  return (
                    <div
                      key={record.id}
                      id={`search-record-${encodeURIComponent(record.query)}`}
                      className={cn(
                        "p-3 bg-slate-800/40 rounded-lg border border-slate-700/50",
                        highlightedSearchQuery && record.query === highlightedSearchQuery
                          ? "border-cyan-600 bg-blue-50/40 shadow-sm"
                          : ""
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {record.database}
                        </Badge>
                        <span className="text-[10px] text-slate-400">
                          {record.date}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-slate-700 mb-2">
                        {renderQueryWithConceptLinks(record.query)}
                      </p>
                      <div className="flex gap-4 text-[11px] text-slate-500">
                        <span>{record.results} results</span>
                        <span>{record.relevant} relevant</span>
                      </div>
                      {cannotDeleteReason && (
                        <p className="text-[11px] text-amber-600 mt-1.5">{cannotDeleteReason}</p>
                      )}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={async () => {
                            const pullSucceeded = await pullReferencesForSearchRecord(record, "first");
                            if (pullSucceeded) {
                              navigateToCandidatesTab();
                            }
                          }}
                          disabled={pullingSearchRecordId === record.id}
                        >
                          <Search className="w-3 h-3 mr-1" />
                          {pullingSearchRecordId === record.id ? "Pulling..." : "Pull Top 10"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={async () => {
                            const pullSucceeded = await pullReferencesForSearchRecord(record, "next");
                            if (pullSucceeded) {
                              navigateToCandidatesTab();
                            }
                          }}
                          disabled={pullingSearchRecordId === record.id}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Refresh +10
                        </Button>
                        <a
                          href={buildDatabaseSearchUrl(record.database, record.query)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button size="sm" variant="outline" className="text-xs h-7" type="button">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Open in {record.database}
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => openEditSearchRecordDialog(record)}
                        >
                          <PenTool className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 text-rose-600 hover:text-rose-700 disabled:opacity-50"
                          onClick={() => handleDeleteSearchRecord(record.id)}
                          disabled={Boolean(cannotDeleteReason)}
                          title={cannotDeleteReason || "Delete search record"}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="mt-4 space-y-4">
          <Card className="border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Candidate Papers ({candidatePapers.length})
                </CardTitle>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={handleOpenCandidateRefreshDialog}
                    disabled={Boolean(pullingSearchRecordId)}
                    title="Choose a search log or random pull"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh +10
                  </Button>
                  <Select
                    value={candidateSortKey}
                    onValueChange={(value) => setCandidateSortKey(value as "title" | "year" | "type" | "relevance")}
                  >
                    <SelectTrigger className="h-7 text-xs w-[140px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Sort: Title</SelectItem>
                      <SelectItem value="year">Sort: Year</SelectItem>
                      <SelectItem value="type">Sort: Type</SelectItem>
                      <SelectItem value="relevance">Sort: Relevance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setCandidateSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                    title="Toggle sort order"
                  >
                    <ArrowUpDown className="w-3 h-3 mr-1" />
                    {candidateSortOrder === "asc" ? "Asc" : "Desc"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Paper
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => {
                          setShowAddPaperDialog(true);
                        }}
                      >
                        Add One
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setShowAddMultiplePaperDialog(true);
                        }}
                      >
                        Add Multiple
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Select-all bar — only rendered when there are papers */}
              {sortedCandidatePapers.length > 0 && (
                <div className={cn(
                  "flex items-center gap-3 mb-3 px-3 py-2 rounded-lg border transition-all",
                  selectedPaperIds.length > 0
                    ? "bg-slate-800/40 border-slate-300"
                    : "border-transparent"
                )}>
                  <Checkbox
                    id="select-all-candidates"
                    checked={allVisibleSelected}
                    onCheckedChange={handleToggleSelectAllVisible}
                  />
                  <label
                    htmlFor="select-all-candidates"
                    className="text-xs text-slate-500 cursor-pointer select-none"
                  >
                    {selectedPaperIds.length === 0
                      ? "Select all"
                      : `${selectedPaperIds.length} selected`}
                  </label>
                  {selectedPaperIds.length > 0 && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Button
                        size="sm"
                        className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleBatchToEntry}
                      >
                        <Target className="w-3 h-3 mr-1" />
                        To Entry
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-rose-600 hover:text-rose-700 border-rose-200"
                        onClick={() => void handleBatchDeleteSelected()}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 text-slate-400 hover:text-slate-600"
                        onClick={() => setSelectedPaperIds([])}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-3">
                {sortedCandidatePapers.map((paper) => (
                  <div
                    key={paper.id}
                    data-selected={entryPapers.includes(paper.id) || selectedPaperIds.includes(paper.id) ? "true" : undefined}
                    className={cn(
                      "p-4 rounded-lg border transition-all record-item",
                      entryPapers.includes(paper.id)
                        ? "border-cyan-600 bg-blue-50/30"
                        : selectedPaperIds.includes(paper.id)
                          ? "border-cyan-500/60 bg-cyan-950/20"
                          : "border-slate-700/50"
                    )}
                  >
                    <div>
                      <div className="flex items-start gap-2 mb-3">
                        {/* Multi-select checkbox */}
                        <div className="pt-1">
                          <Checkbox
                            checked={selectedPaperIds.includes(paper.id)}
                            onCheckedChange={() => togglePaperSelection(paper.id)}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {entryPapers.includes(paper.id) && (
                              <Badge className="text-[10px] bg-cyan-600 text-white">
                                Entry Paper
                              </Badge>
                            )}
                            {paper.relevance && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  paper.relevance === "high" &&
                                    "border-emerald-300 text-emerald-700",
                                  paper.relevance === "medium" &&
                                    "border-amber-300 text-amber-700",
                                  paper.relevance === "low" &&
                                    "border-slate-300 text-slate-500"
                                )}
                              >
                                {paper.relevance} relevance
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                              {inferPublicationType(paper)}
                            </Badge>
                            {paper.discoveryPath && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-cyan-300 text-cyan-600"
                              >
                                via {paper.discoveryPath}
                              </Badge>
                            )}
                          </div>
                          {/* Title opens the original external page for quick vetting */}
                          <a
                            href={resolveCandidateExternalUrl(paper)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-center gap-1 mb-1 text-sm font-medium text-slate-100 hover:underline record-item-title"
                          >
                            <span className="min-w-0 truncate">{paper.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          <p className="text-xs text-slate-500 mb-2">
                            {paper.authors.join(", ")} ({paper.year}) —{" "}
                            {paper.journal}
                          </p>
                          {(paper.doi || paper.doiUrl || paper.externalSourceUrl) && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              {paper.doi && (
                                <Badge variant="outline" className="text-[10px] border-cyan-300 text-cyan-700">
                                  DOI: {paper.doi}
                                </Badge>
                              )}
                              {paper.doiUrl && (
                                <a href={paper.doiUrl} target="_blank" rel="noreferrer" className="inline-flex">
                                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" type="button">
                                    <ExternalLink className="w-2.5 h-2.5 mr-1" />
                                    DOI Link
                                  </Button>
                                </a>
                              )}
                              {paper.externalSourceUrl && (
                                <a href={paper.externalSourceUrl} target="_blank" rel="noreferrer" className="inline-flex">
                                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" type="button">
                                    <Eye className="w-2.5 h-2.5 mr-1" />
                                    Open Original Page
                                  </Button>
                                </a>
                              )}
                            </div>
                          )}
                          {paper.abstract && (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {paper.abstract}
                            </p>
                          )}
                          {paper.discoveryNote && (
                            <p className="text-[10px] text-cyan-500 mt-1 italic">
                              📝 {paper.discoveryNote}
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Action buttons — horizontal row below paper info */}
                      <div className="flex flex-wrap gap-1.5 pl-6">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => openEditPaperDialog(paper)}
                        >
                          <PenTool className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 text-rose-600 hover:text-rose-700"
                          onClick={() => handleDeleteCandidatePaper(paper.id)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => {
                            setRelevancePaperId(paper.id);
                            setShowRelevanceDialog(true);
                          }}
                        >
                          <Star className="w-3 h-3 mr-1" />
                          Mark Relevant
                        </Button>
                        <Button
                          size="sm"
                          className={cn(
                            "text-xs h-7",
                            entryPapers.includes(paper.id)
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-cyan-600 hover:bg-cyan-700 text-white"
                          )}
                          onClick={() => handleToggleEntryPaper(paper.id)}
                          disabled={entryPapers.includes(paper.id)}
                        >
                          {entryPapers.includes(paper.id) ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Entry Paper
                            </>
                          ) : (
                            <>
                              <Target className="w-3 h-3 mr-1" />
                              To Entry
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Concept Dialog */}
      <ModalOverlay
        open={showConceptDialog}
        onClose={() => {
          setShowConceptDialog(false);
          setConceptName("");
          setConceptDescription("");
          setConceptCategory("Keyword");
          setConceptColor("#22d3ee");
          setConceptPurposeCardId("");
        }}
        title="Add a new keyword"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">
              Concept Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={conceptName}
              onChange={(e) => setConceptName(e.target.value)}
              placeholder="Enter concept name..."
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddConcept();
                }
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Description</label>
            <Textarea
              value={conceptDescription}
              onChange={(e) => setConceptDescription(e.target.value)}
              placeholder="What does this concept mean in your research context? Add details, definitions, or notes..."
              rows={4}
              className="text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Category</label>
              <Select value={conceptCategory} onValueChange={setConceptCategory}>
                <SelectTrigger className="text-sm h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Keyword">Keyword</SelectItem>
                  <SelectItem value="Construct">Construct</SelectItem>
                  <SelectItem value="Theory">Theory</SelectItem>
                  <SelectItem value="Framework">Framework</SelectItem>
                  <SelectItem value="Method">Method</SelectItem>
                  <SelectItem value="Finding">Finding</SelectItem>
                  <SelectItem value="Variable">Variable</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Color</label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CONCEPT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setConceptColor(c.value)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      conceptColor === c.value
                        ? "border-slate-700 scale-110"
                        : "border-transparent hover:border-slate-400"
                    )}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700">Associate to Purpose Card</label>
            <Select
              value={conceptPurposeCardId || PURPOSE_CARD_NONE}
              onValueChange={(value) => setConceptPurposeCardId(value === PURPOSE_CARD_NONE ? "" : value)}
            >
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Select a purpose card..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PURPOSE_CARD_NONE}>Select...</SelectItem>
                {purposeCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>{card.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {conceptName.trim() && (
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <p className="text-[10px] text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Preview</p>
              <Badge
                className="text-xs px-3 py-1 gap-1 border"
                style={{ backgroundColor: `${conceptColor}18`, borderColor: `${conceptColor}55`, color: conceptColor }}
              >
                <Lightbulb className="w-2.5 h-2.5 mr-0.5" />
                {conceptName}
                <span className="ml-1 text-[10px] opacity-70">{conceptCategory}</span>
              </Badge>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
              onClick={() => void handleAddConcept()}
              disabled={!conceptName.trim()}
            >
              <Lightbulb className="w-3 h-3 mr-1" />
              Add Concept
            </Button>
            <Button
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setShowConceptDialog(false);
                setConceptName("");
                setConceptDescription("");
                setConceptCategory("Keyword");
                setConceptColor("#22d3ee");
                setConceptPurposeCardId("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

      <ModalOverlay
        open={showEditPaperDialog}
        onClose={() => {
          setShowEditPaperDialog(false);
          setEditingPaperId(null);
        }}
        title="Edit Candidate Paper"
      >
        <div className="space-y-3">
          <Input value={newPaperTitle} onChange={(e) => setNewPaperTitle(e.target.value)} placeholder="Paper title" />
          <Input value={newPaperAuthors} onChange={(e) => setNewPaperAuthors(e.target.value)} placeholder="Authors (comma separated)" />
          <div className="grid grid-cols-2 gap-3">
            <Input value={newPaperYear} onChange={(e) => setNewPaperYear(e.target.value)} placeholder="Year" />
            <Input value={newPaperJournal} onChange={(e) => setNewPaperJournal(e.target.value)} placeholder="Journal" />
          </div>
          <Select value={newPaperDiscoveryPath} onValueChange={setNewPaperDiscoveryPath}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DISCOVERY_PATH_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea value={newPaperDiscoveryNote} onChange={(e) => setNewPaperDiscoveryNote(e.target.value)} placeholder="Discovery note" rows={3} />
          <div className="flex justify-end gap-2">
            <Button onClick={() => setShowEditPaperDialog(false)} type="button" variant="outline">Cancel</Button>
            <Button onClick={handleSaveEditedPaper} type="button">Save Changes</Button>
          </div>
        </div>
      </ModalOverlay>

      {/* Add Search Record Dialog */}
      <ModalOverlay
        open={showSearchDialog}
        onClose={() => setShowSearchDialog(false)}
        title="Add Search Record"
      >
        <div className="space-y-4">
          {/* Keywords & Concepts selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Keywords / Concepts</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {keywords.map((kw) => (
                <Badge
                  key={kw.id}
                  variant={srKeywords.includes(kw.term) ? "default" : "outline"}
                  className={cn(
                    "text-[10px] cursor-pointer transition-all",
                    srKeywords.includes(kw.term)
                      ? "bg-cyan-600 text-white"
                      : "hover:bg-slate-800"
                  )}
                  onClick={() => {
                    if (srKeywords.includes(kw.term)) {
                      setSrKeywords(srKeywords.filter((k) => k !== kw.term));
                    } else {
                      setSrKeywords([...srKeywords, kw.term]);
                    }
                  }}
                >
                  {kw.term}
                </Badge>
              ))}
              {concepts.map((concept) => (
                <Badge
                  key={concept.id}
                  variant={srKeywords.includes(concept.name) ? "default" : "outline"}
                  className={cn(
                    "text-[10px] cursor-pointer transition-all border",
                    srKeywords.includes(concept.name)
                      ? "text-white"
                      : "hover:opacity-80"
                  )}
                  style={
                    srKeywords.includes(concept.name)
                      ? { backgroundColor: concept.color, borderColor: concept.color }
                      : { color: concept.color, borderColor: `${concept.color}66`, backgroundColor: `${concept.color}12` }
                  }
                  title={`${concept.name} (${concept.category})${concept.description ? `\n${concept.description}` : ""}`}
                  onClick={() => {
                    if (srKeywords.includes(concept.name)) {
                      setSrKeywords(srKeywords.filter((k) => k !== concept.name));
                    } else {
                      setSrKeywords([...srKeywords, concept.name]);
                    }
                  }}
                >
                  <Lightbulb className="w-2.5 h-2.5 mr-1" />
                  {concept.name}
                </Badge>
              ))}
            </div>
            {srKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="text-[10px] text-slate-400">Selected:</span>
                {srKeywords.map((kw) => (
                  <Badge
                    key={kw}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 gap-1"
                  >
                    {kw}
                    <button onClick={() => setSrKeywords(srKeywords.filter((k) => k !== kw))}>
                      <X className="w-2 h-2" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Purpose Card Association */}
          {purposeCards.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600">Associated Purpose Card (optional)</label>
              <Select
                value={srPurposeCardId || PURPOSE_CARD_NONE}
                onValueChange={(value) => setSrPurposeCardId(value === PURPOSE_CARD_NONE ? "" : value)}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="Select a purpose card..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PURPOSE_CARD_NONE}>None</SelectItem>
                  {purposeCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>{card.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Database selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Academic Database</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[...DATABASE_OPTIONS, "Other" as const].map((db) => (
                <label
                  key={db}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all",
                    srDatabase === db
                      ? "border-cyan-600 bg-blue-50/50"
                      : "border-slate-700/50 hover:border-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="sr-database"
                    checked={srDatabase === db}
                    onChange={() => setSrDatabase(db)}
                    className="accent-[#1E3A5F]"
                  />
                  {db}
                </label>
              ))}
            </div>
            {srDatabase === "Other" && (
              <Input
                value={srCustomDb}
                onChange={(e) => setSrCustomDb(e.target.value)}
                placeholder="Enter database name..."
                className="text-xs h-7 mt-1"
              />
            )}
          </div>

          {/* Boolean Search String */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">
              Boolean Search String
            </label>
            <Textarea
              value={srBooleanString}
              onChange={(e) => setSrBooleanString(e.target.value)}
              rows={3}
              placeholder='e.g., "AI tutoring" AND "self-regulated learning" AND "higher education"'
              className="text-xs font-mono"
            />
          </div>

          {/* Search Results */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Total Results</label>
              <Input
                type="number"
                value={srTotalResults}
                onChange={(e) => setSrTotalResults(e.target.value)}
                placeholder="e.g., 234"
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Relevant Results</label>
              <Input
                type="number"
                value={srRelevantResults}
                onChange={(e) => setSrRelevantResults(e.target.value)}
                placeholder="e.g., 18"
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
              onClick={handleAddSearchRecord}
            >
              <Save className="w-3 h-3 mr-1" />
              Save Search Record
            </Button>
            <Button
              variant="ghost"
              className="text-xs"
              onClick={() => setShowSearchDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

      <ModalOverlay
        open={showEditSearchDialog}
        onClose={() => {
          setShowEditSearchDialog(false);
          setEditingSearchRecordId(null);
        }}
        title="Edit Search Record"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Academic Database</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[...DATABASE_OPTIONS, "Other" as const].map((db) => (
                <label
                  key={db}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all",
                    srDatabase === db
                      ? "border-cyan-600 bg-blue-50/50"
                      : "border-slate-700/50 hover:border-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="edit-sr-database"
                    checked={srDatabase === db}
                    onChange={() => setSrDatabase(db)}
                    className="accent-[#1E3A5F]"
                  />
                  {db}
                </label>
              ))}
            </div>
            {srDatabase === "Other" && (
              <Input
                value={srCustomDb}
                onChange={(e) => setSrCustomDb(e.target.value)}
                placeholder="Enter database name..."
                className="text-xs h-7 mt-1"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Boolean Search String</label>
            <Textarea
              value={srBooleanString}
              onChange={(e) => setSrBooleanString(e.target.value)}
              rows={3}
              className="text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Total Results</label>
              <Input
                type="number"
                value={srTotalResults}
                onChange={(e) => setSrTotalResults(e.target.value)}
                className="text-xs h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Relevant Results</label>
              <Input
                type="number"
                value={srRelevantResults}
                onChange={(e) => setSrRelevantResults(e.target.value)}
                className="text-xs h-8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600">Associated Purpose Card (optional)</label>
            <Select
              value={srPurposeCardId || PURPOSE_CARD_NONE}
              onValueChange={(value) => setSrPurposeCardId(value === PURPOSE_CARD_NONE ? "" : value)}
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Select a purpose card..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PURPOSE_CARD_NONE}>None</SelectItem>
                {purposeCards.length > 0 ? (
                  purposeCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>{card.title}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="__empty__" disabled>No purpose cards yet</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
              onClick={handleSaveEditedSearchRecord}
            >
              <Save className="w-3 h-3 mr-1" />
              Save Changes
            </Button>
            <Button
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setShowEditSearchDialog(false);
                setEditingSearchRecordId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

      {/* Mark Relevance Dialog */}
      <ModalOverlay
        open={showRelevanceDialog}
        onClose={() => {
          setShowRelevanceDialog(false);
          setRelevancePaperId(null);
        }}
        title="Mark Relevance Level"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Select the relevance level for this paper:
          </p>
          {(["high", "medium", "low"] as const).map((level) => (
            <button
              key={level}
              onClick={() => handleMarkRelevance(level)}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-all text-sm",
                level === "high" && "border-emerald-300 hover:bg-emerald-50",
                level === "medium" && "border-amber-300 hover:bg-amber-50",
                level === "low" && "border-slate-300 hover:bg-slate-800/40"
              )}
            >
              <span
                className={cn(
                  "font-medium capitalize",
                  level === "high" && "text-emerald-700",
                  level === "medium" && "text-amber-700",
                  level === "low" && "text-slate-500"
                )}
              >
                {level}
              </span>
              <span className="text-xs text-slate-400 ml-2">
                {level === "high" && "— Core to my research"}
                {level === "medium" && "— Useful context"}
                {level === "low" && "— Peripheral"}
              </span>
            </button>
          ))}
        </div>
      </ModalOverlay>

      <ModalOverlay
        open={showCandidateRefreshDialog}
        onClose={() => setShowCandidateRefreshDialog(false)}
        title="Refresh +10 Candidate Papers"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            请选择一个 Search Log 拉取下一批，或随机使用已有 Search Log。
          </p>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={candidateRefreshMode === "select" ? "default" : "outline"}
              className={cn(
                "h-8 text-xs",
                candidateRefreshMode === "select" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : ""
              )}
              onClick={() => setCandidateRefreshMode("select")}
            >
              Use Selected Log
            </Button>
            <Button
              size="sm"
              variant={candidateRefreshMode === "random" ? "default" : "outline"}
              className={cn(
                "h-8 text-xs",
                candidateRefreshMode === "random" ? "bg-cyan-600 hover:bg-cyan-700 text-white" : ""
              )}
              onClick={() => setCandidateRefreshMode("random")}
            >
              Random
            </Button>
          </div>

          {candidateRefreshMode === "select" && (
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Search Log</label>
              <Select value={candidateRefreshRecordId} onValueChange={setCandidateRefreshRecordId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose search log" />
                </SelectTrigger>
                <SelectContent>
                  {searchRecords.map((record) => (
                    <SelectItem key={record.id} value={record.id}>
                      {record.database} - {record.query}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setShowCandidateRefreshDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
              onClick={() => void handleCandidateRefreshPull()}
              disabled={Boolean(pullingSearchRecordId)}
            >
              Pull +10
            </Button>
          </div>
        </div>
      </ModalOverlay>

      {/* Concept Detail Dialog */}
      <ModalOverlay
        open={showConceptDetailDialog}
        onClose={() => {
          setShowConceptDetailDialog(false);
          setEditingConceptId(null);
        }}
        title="Concept Details"
      >
        {currentEditingConcept ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Concept Name</label>
              <Input
                value={currentEditingConcept.name}
                onChange={(e) => updateEditingConcept({ name: e.target.value })}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Description</label>
              <Textarea
                value={currentEditingConcept.description}
                onChange={(e) => updateEditingConcept({ description: e.target.value })}
                rows={4}
                className="text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Category</label>
                <Select
                  value={currentEditingConcept.category}
                  onValueChange={(value) => updateEditingConcept({ category: value })}
                >
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Construct">Construct</SelectItem>
                    <SelectItem value="Theory">Theory</SelectItem>
                    <SelectItem value="Framework">Framework</SelectItem>
                    <SelectItem value="Method">Method</SelectItem>
                    <SelectItem value="Finding">Finding</SelectItem>
                    <SelectItem value="Variable">Variable</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Color</label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {CONCEPT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      onClick={() => updateEditingConcept({ color: c.value })}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all",
                        currentEditingConcept.color === c.value
                          ? "border-slate-700 scale-110"
                          : "border-transparent hover:border-slate-400"
                      )}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                onClick={() => void handleSaveConceptDetails()}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                className="text-xs"
                onClick={() => {
                  setShowConceptDetailDialog(false);
                  setEditingConceptId(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </ModalOverlay>

      {/* Add Candidate Paper Dialog */}
      <ModalOverlay
        open={showAddPaperDialog}
        onClose={() => {
          setShowAddPaperDialog(false);
          setNewPaperDoiUrl("");
          setDoiFetchError(null);
          setNewPaperSearchRecordId("");
        }}
        title="Add Candidate Paper"
      >
        <div className="space-y-3">
          {/* DOI / URL Auto-extract */}
          <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50 space-y-2">
            <label className="text-xs font-semibold text-slate-700">通过 DOI 或 URL 自动提取信息</label>
            <div className="flex gap-2">
              <Input
                value={newPaperDoiUrl}
                onChange={(e) => { setNewPaperDoiUrl(e.target.value); setDoiFetchError(null); }}
                placeholder="例如：10.1145/1234567 或 https://doi.org/10.xxxx/xxxx"
                className="text-xs h-8 flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleFetchByDoiUrl(); } }}
              />
              <Button
                size="sm"
                className="h-8 text-xs bg-cyan-600 hover:bg-cyan-700 text-white shrink-0"
                onClick={() => void handleFetchByDoiUrl()}
                disabled={doiFetching || !newPaperDoiUrl.trim()}
              >
                {doiFetching ? (
                  <span className="flex items-center gap-1"><span className="animate-spin">⟳</span> 提取中</span>
                ) : (
                  <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> 提取信息</span>
                )}
              </Button>
            </div>
            {doiFetchError && (
              <p className="text-xs text-red-500">{doiFetchError}</p>
            )}
          </div>

          {/* Source Search Record */}
          {searchRecords.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">来自 Search Log（可选）</label>
              <Select
                value={newPaperSearchRecordId || "__none__"}
                onValueChange={(v) => {
                  const id = v === "__none__" ? "" : v;
                  setNewPaperSearchRecordId(id);
                  if (id) {
                    const rec = searchRecords.find((r) => r.id === id);
                    if (rec) setNewPaperDiscoveryPath(rec.database);
                  }
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="选择对应的 Search Record..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— 不关联 Search Record —</SelectItem>
                  {searchRecords.map((rec) => (
                    <SelectItem key={rec.id} value={rec.id}>
                      <span className="font-medium">{rec.database}</span>
                      <span className="text-slate-400 ml-2 text-[10px]">{rec.date} · {rec.results} results</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newPaperSearchRecordId && (() => {
                const rec = searchRecords.find((r) => r.id === newPaperSearchRecordId);
                return rec ? (
                  <p className="text-[10px] text-slate-500 font-mono bg-slate-800/40 p-1.5 rounded border">
                    {rec.query}
                  </p>
                ) : null;
              })()}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Title *</label>
            <Input
              value={newPaperTitle}
              onChange={(e) => setNewPaperTitle(e.target.value)}
              placeholder="Paper title..."
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Authors (comma-separated)</label>
            <Input
              value={newPaperAuthors}
              onChange={(e) => setNewPaperAuthors(e.target.value)}
              placeholder="Author 1, Author 2..."
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Year</label>
              <Input
                type="number"
                value={newPaperYear}
                onChange={(e) => setNewPaperYear(e.target.value)}
                placeholder="2024"
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Journal</label>
              <Input
                value={newPaperJournal}
                onChange={(e) => setNewPaperJournal(e.target.value)}
                placeholder="Journal name..."
                className="text-sm"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Discovery Path</label>
            <div className="grid grid-cols-2 gap-1.5">
              {DISCOVERY_PATH_OPTIONS.map((path) => (
                <label
                  key={path}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all",
                    newPaperDiscoveryPath === path
                      ? "border-cyan-400 bg-cyan-50/50"
                      : "border-slate-700/50 hover:border-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="new-paper-discovery"
                    checked={newPaperDiscoveryPath === path}
                    onChange={() => setNewPaperDiscoveryPath(path)}
                    className="accent-cyan-600"
                  />
                  {path}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Discovery Note</label>
            <Textarea
              value={newPaperDiscoveryNote}
              onChange={(e) => setNewPaperDiscoveryNote(e.target.value)}
              rows={2}
              placeholder="How did you find this paper? Any additional details..."
              className="text-xs"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
              onClick={handleAddCandidatePaper}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Paper
            </Button>
            <Button
              variant="ghost"
              className="text-xs"
              onClick={() => setShowAddPaperDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

      <ModalOverlay
        open={showAddMultiplePaperDialog}
        onClose={() => {
          setShowAddMultiplePaperDialog(false);
          setBulkDoiInput("");
          setBulkSearchRecordId("");
        }}
        title="Add Multiple Candidate Papers"
      >
        <div className="space-y-3">
          {searchRecords.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">关联 Search Record（可选）</label>
              <Select value={bulkSearchRecordId || "__none__"} onValueChange={(v) => setBulkSearchRecordId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder="选择对应的 Search Record..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— 不关联 Search Record —</SelectItem>
                  {searchRecords.map((rec) => (
                    <SelectItem key={rec.id} value={rec.id}>
                      {rec.database} · {rec.date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">DOI 链接（每行一个）</label>
            <Textarea
              value={bulkDoiInput}
              onChange={(e) => setBulkDoiInput(e.target.value)}
              rows={8}
              placeholder={"https://doi.org/10.xxxx/xxxx\n10.1145/1234567\nhttps://example.org/path/10.1000/xyz"}
              className="text-xs font-mono"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
              onClick={() => void handleAddMultipleCandidatePapers()}
              disabled={bulkImporting || !bulkDoiInput.trim()}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {bulkImporting ? "Importing..." : "Import All"}
            </Button>
            <Button
              variant="ghost"
              className="text-xs"
              onClick={() => setShowAddMultiplePaperDialog(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

      {/* Discovery Path Dialog */}
      <ModalOverlay
        open={showDiscoveryDialog}
        onClose={() => {
          setShowDiscoveryDialog(false);
          setDiscoveryPaperId(null);
        }}
        title="Set Discovery Path"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-1.5">
            {DISCOVERY_PATH_OPTIONS.map((path) => (
              <label
                key={path}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs transition-all",
                  discoveryPathValue === path
                    ? "border-cyan-400 bg-cyan-50/50"
                    : "border-slate-700/50 hover:border-slate-300"
                )}
              >
                <input
                  type="radio"
                  name="discovery-path"
                  checked={discoveryPathValue === path}
                  onChange={() => setDiscoveryPathValue(path)}
                  className="accent-cyan-600"
                />
                {path}
              </label>
            ))}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Note</label>
            <Textarea
              value={discoveryNoteValue}
              onChange={(e) => setDiscoveryNoteValue(e.target.value)}
              rows={2}
              placeholder="Describe how you found this paper..."
              className="text-xs"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
              onClick={handleSaveDiscoveryPath}
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button
              variant="ghost"
              className="text-xs"
              onClick={() => {
                setShowDiscoveryDialog(false);
                setDiscoveryPaperId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </ModalOverlay>

    </div>
  );
}

// ============================================================
// Tag Input Component
// ============================================================
function TagInput({
  tags,
  onTagsChange,
  placeholder = "Add tag...",
}: {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
      setInput("");
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-200 cursor-pointer gap-1"
          >
            <Tag className="w-2.5 h-2.5" />
            {tag}
            <button
              onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
              className="ml-0.5 hover:text-red-500"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="text-xs h-7"
        />
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 shrink-0"
          onClick={addTag}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Step 3: Read Workspace
// ============================================================
function ReadWorkspace() {
  const paper = DUMMY_PAPERS[0];

  const [litNotes, setLitNotes] = useState([
    {
      id: "ln-1",
      title: "Key Gap: SRL underexplored",
      content:
        "Key takeaway: AI tutoring improves test scores but SRL impact is underexplored. The gap between performance outcomes and process outcomes is significant.",
      tags: ["gap", "SRL", "key-finding"],
      citation: `${paper.authors[0]} (${paper.year})`,
      createdAt: "2026-03-02",
    },
    {
      id: "ln-2",
      title: "Personalization as mechanism",
      content:
        "Personalization algorithms are the key mechanism connecting AI tutoring to learning outcomes, but their effect on metacognition and self-regulation is unclear. Need to investigate whether personalization bypasses or supports SRL.",
      tags: ["mechanism", "personalization", "metacognition"],
      citation: `${paper.authors[0]} (${paper.year})`,
      createdAt: "2026-03-04",
    },
  ]);
  const [activeNoteId, setActiveNoteId] = useState("ln-1");
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const [noteSaved, setNoteSaved] = useState(false);
  const [quotedToDraft, setQuotedToDraft] = useState<string | null>(null);

  const [permNotes, setPermNotes] = useState([
    {
      id: "pn-1",
      title: "The SRL Gap in AI Education Research",
      content:
        "Current AI education research focuses heavily on performance outcomes (test scores, completion rates) while neglecting process outcomes (self-regulation, metacognition, learning strategies).",
      tags: ["synthesis", "gap", "core-insight"],
      citations: [`${paper.authors[0]} (${paper.year})`, "Zimmerman (2002)", "Winne & Hadwin (1998)"],
      createdAt: "2026-03-05",
    },
  ]);
  const [showNewPermNote, setShowNewPermNote] = useState(false);
  const [newPermTitle, setNewPermTitle] = useState("");
  const [newPermContent, setNewPermContent] = useState("");
  const [newPermTags, setNewPermTags] = useState<string[]>([]);

  const citation = `${paper.authors[0]} (${paper.year})`;

  const [annotations, setAnnotations] = useState([
    {
      ...paper.annotations[0],
      tags: ["gap", "SRL"],
      citation: `${paper.authors[0]} (${paper.year})`,
    },
    {
      ...paper.annotations[1],
      tags: ["mechanism", "personalization"],
      citation: `${paper.authors[0]} (${paper.year})`,
    },
    {
      id: "ann-3",
      text: "limited evidence on self-regulated learning outcomes",
      note: "This confirms the gap — most studies focus on performance, not process",
      color: "yellow",
      tags: ["evidence", "gap"],
      citation: `${paper.authors[0]} (${paper.year})`,
    },
  ]);
  const [showNewAnnotation, setShowNewAnnotation] = useState(false);
  const [newAnnText, setNewAnnText] = useState("");
  const [newAnnNote, setNewAnnNote] = useState("");
  const [newAnnTags, setNewAnnTags] = useState<string[]>([]);
  const [importedFromPdf, setImportedFromPdf] = useState(false);

  const [newPermCitations, setNewPermCitations] = useState<string[]>([citation]);

  const [noteTab, setNoteTab] = useState<"literature" | "permanent">("literature");

  const activeNote = litNotes.find((n) => n.id === activeNoteId);

  const handleAddNote = () => {
    if (newNoteTitle.trim() && newNoteContent.trim()) {
      const newNote = {
        id: `ln-${Date.now()}`,
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        tags: newNoteTags,
        citation,
        createdAt: "2026-03-09",
      };
      setLitNotes([...litNotes, newNote]);
      setActiveNoteId(newNote.id);
      setNewNoteTitle("");
      setNewNoteContent("");
      setNewNoteTags([]);
      setShowNewNote(false);
    }
  };

  const handleAddPermNote = () => {
    if (newPermTitle.trim() && newPermContent.trim()) {
      const newNote = {
        id: `pn-${Date.now()}`,
        title: newPermTitle.trim(),
        content: newPermContent.trim(),
        tags: newPermTags,
        citations: [...newPermCitations],
        createdAt: "2026-03-09",
      };
      setPermNotes([...permNotes, newNote]);
      setNewPermTitle("");
      setNewPermContent("");
      setNewPermTags([]);
      setNewPermCitations([citation]);
      setShowNewPermNote(false);
    }
  };

  const handleAddAnnotation = () => {
    if (newAnnText.trim()) {
      setAnnotations([
        ...annotations,
        {
          id: `ann-${Date.now()}`,
          text: newAnnText.trim(),
          note: newAnnNote.trim(),
          color: "yellow",
          tags: newAnnTags,
          citation,
        },
      ]);
      setNewAnnText("");
      setNewAnnNote("");
      setNewAnnTags([]);
      setShowNewAnnotation(false);
    }
  };

  const handleImportFromPdf = () => {
    const pdfHighlights = [
      {
        id: `ann-import-${Date.now()}-1`,
        text: "AI-powered adaptive learning systems show promise in improving test scores",
        note: "(Imported from PDF) — Performance improvement claim",
        color: "yellow" as const,
        tags: ["imported", "performance"],
        citation,
      },
      {
        id: `ann-import-${Date.now()}-2`,
        text: "personalization algorithms, student engagement metrics, and learning outcome measurements",
        note: "(Imported from PDF) — Three key themes identified",
        color: "green" as const,
        tags: ["imported", "themes"],
        citation,
      },
    ];
    setAnnotations([...annotations, ...pdfHighlights]);
    setImportedFromPdf(true);
  };

  return (
    <div className="space-y-5">
      {/* Paper Metadata */}
      <Card className="border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Badge className="text-[10px] bg-cyan-600 text-white mb-2">
                Entry Paper
              </Badge>
              <h3 className="text-base font-semibold text-slate-200 mb-1">
                {paper.title}
              </h3>
              <p className="text-xs text-slate-500">
                {paper.authors.join(", ")} ({paper.year}) — {paper.journal}
              </p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Link to={`/pdf/${paper.id}`}>
                <Button variant="outline" size="sm" className="text-xs h-7">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Open PDF
                </Button>
              </Link>
              <Link to={`/paper/${paper.id}`}>
                <Button variant="outline" size="sm" className="text-xs h-7">
                  Full View
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Annotations & Highlights */}
        <Card className="border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Annotations & Highlights ({annotations.length})
              </CardTitle>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn(
                    "text-xs h-7",
                    importedFromPdf && "bg-emerald-50 border-emerald-300 text-emerald-700"
                  )}
                  onClick={handleImportFromPdf}
                  disabled={importedFromPdf}
                >
                  <Download className="w-3 h-3 mr-1" />
                  {importedFromPdf ? "Imported ✓" : "Import from PDF"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setShowNewAnnotation(!showNewAnnotation)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {showNewAnnotation && (
              <div className="p-3 mb-3 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 space-y-2">
                <Input
                  value={newAnnText}
                  onChange={(e) => setNewAnnText(e.target.value)}
                  placeholder="Paste or type the highlighted text..."
                  className="text-xs"
                />
                <Textarea
                  value={newAnnNote}
                  onChange={(e) => setNewAnnNote(e.target.value)}
                  placeholder="Your note about this highlight..."
                  rows={2}
                  className="text-xs"
                />
                <TagInput
                  tags={newAnnTags}
                  onTagsChange={setNewAnnTags}
                  placeholder="Add tags (e.g., gap, method, key-finding)..."
                />
                <div className="p-1.5 bg-slate-800/40 rounded text-[10px] text-slate-500">
                  📎 Auto-citation: {citation}
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={handleAddAnnotation}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Save Annotation
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                    onClick={() => {
                      setShowNewAnnotation(false);
                      setNewAnnText("");
                      setNewAnnNote("");
                      setNewAnnTags([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {annotations.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-3 rounded-lg border border-slate-700/50 hover:border-slate-300 transition-all group"
                  >
                    <div
                      className={cn(
                        "text-xs px-2 py-1 rounded mb-2 inline-block",
                        ann.color === "yellow"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      )}
                    >
                      &ldquo;{ann.text}&rdquo;
                    </div>
                    <p className="text-xs text-slate-600 mb-1">{ann.note}</p>
                    {ann.citation && (
                      <p className="text-[10px] text-slate-400 mb-1.5">📎 {ann.citation}</p>
                    )}
                    {ann.tags && ann.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {ann.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 bg-slate-800 text-slate-500"
                          >
                            <Tag className="w-2 h-2 mr-0.5" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2"
                      >
                        <BookOpen className="w-3 h-3 mr-1" />
                        Link to Original
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "text-[10px] h-6 px-2",
                          quotedToDraft === ann.id &&
                            "bg-emerald-50 border-emerald-300 text-emerald-700"
                        )}
                        onClick={() => setQuotedToDraft(ann.id)}
                      >
                        <PenTool className="w-3 h-3 mr-1" />
                        {quotedToDraft === ann.id
                          ? "Quoted ✓"
                          : "Quote to Draft"}
                      </Button>
                    </div>
                  </div>
                ))}
                {annotations.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No annotations yet. Start highlighting key passages.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Notes Panel */}
        <Card className="border-slate-700/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <button
                  onClick={() => setNoteTab("literature")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all",
                    noteTab === "literature"
                      ? "bg-cyan-600 text-white"
                      : "text-slate-500 hover:bg-slate-800"
                  )}
                >
                  Literature Notes ({litNotes.length})
                </button>
                <button
                  onClick={() => setNoteTab("permanent")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all",
                    noteTab === "permanent"
                      ? "bg-rose-600 text-white"
                      : "text-slate-500 hover:bg-slate-800"
                  )}
                >
                  Permanent Notes ({permNotes.length})
                </button>
              </div>
              {noteTab === "literature" ? (
                <Button
                  size="sm"
                  className="text-xs h-7 bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => {
                    setShowNewNote(true);
                    setShowNewPermNote(false);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  New Lit Note
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="text-xs h-7 bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => {
                    setShowNewPermNote(true);
                    setShowNewNote(false);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  New Perm Note
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {noteTab === "literature" ? (
              <>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {litNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => {
                        setActiveNoteId(note.id);
                        setShowNewNote(false);
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all border",
                        activeNoteId === note.id && !showNewNote
                          ? "bg-cyan-600 text-white border-cyan-600"
                          : "bg-[#0d1b30] text-slate-600 border-slate-700/50 hover:border-slate-300"
                      )}
                    >
                      {note.title}
                    </button>
                  ))}
                  {showNewNote && (
                    <span className="px-3 py-1.5 rounded-md text-xs bg-amber-100 text-amber-700 border border-amber-300">
                      ✦ New Note
                    </span>
                  )}
                </div>

                {showNewNote ? (
                  <div className="space-y-2 p-3 rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/30">
                    <Input
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      placeholder="Note title (e.g., 'Key finding about SRL gap')"
                      className="text-sm"
                    />
                    <Textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={5}
                      placeholder="Write your literature note here..."
                      className="text-sm font-mono"
                    />
                    <TagInput
                      tags={newNoteTags}
                      onTagsChange={setNewNoteTags}
                      placeholder="Add tags (e.g., gap, theory, method)..."
                    />
                    <div className="p-1.5 bg-slate-800/40 rounded text-[10px] text-slate-500">
                      📎 Auto-citation: {citation}
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                        onClick={handleAddNote}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Save Literature Note
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => {
                          setShowNewNote(false);
                          setNewNoteTitle("");
                          setNewNoteContent("");
                          setNewNoteTags([]);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : activeNote ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-200">
                        {activeNote.title}
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {activeNote.createdAt}
                      </span>
                    </div>
                    <Textarea
                      value={activeNote.content}
                      onChange={(e) => {
                        setLitNotes(
                          litNotes.map((n) =>
                            n.id === activeNoteId
                              ? { ...n, content: e.target.value }
                              : n
                          )
                        );
                        setNoteSaved(false);
                      }}
                      rows={5}
                      className="text-sm font-mono"
                    />
                    <div className="flex flex-wrap gap-1">
                      {activeNote.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-[10px] px-2 py-0.5 bg-slate-800"
                        >
                          <Tag className="w-2.5 h-2.5 mr-0.5" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {activeNote.citation && (
                      <p className="text-[10px] text-slate-400">📎 {activeNote.citation}</p>
                    )}
                    {noteSaved && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Literature Note saved
                      </div>
                    )}
                    <div className="flex gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => setNoteSaved(true)}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                      >
                        <BookOpen className="w-3 h-3 mr-1" />
                        Link to Original
                      </Button>
                      <Link to="/draft">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-[#2D6A4F]/30 text-[#2D6A4F] hover:bg-emerald-50"
                        >
                          <PenTool className="w-3 h-3 mr-1" />
                          Quote to Draft
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {showNewPermNote ? (
                  <div className="space-y-2 p-3 rounded-lg border-2 border-dashed border-rose-200 bg-rose-50/30">
                    <Input
                      value={newPermTitle}
                      onChange={(e) => setNewPermTitle(e.target.value)}
                      placeholder="Permanent note title (e.g., 'Core insight: SRL gap')"
                      className="text-sm"
                    />
                    <Textarea
                      value={newPermContent}
                      onChange={(e) => setNewPermContent(e.target.value)}
                      rows={5}
                      placeholder="Write your permanent note — synthesize across sources..."
                      className="text-sm font-mono"
                    />
                    <TagInput
                      tags={newPermTags}
                      onTagsChange={setNewPermTags}
                      placeholder="Add tags (e.g., synthesis, core-insight)..."
                    />
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        📎 Citations (add multiple sources)
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {newPermCitations.map((c, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 gap-1"
                          >
                            📎 {c}
                            <button
                              onClick={() =>
                                setNewPermCitations(newPermCitations.filter((_, idx) => idx !== i))
                              }
                              className="ml-0.5 hover:text-red-500"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="Add citation (e.g., Author (Year))..."
                          className="text-xs h-7"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val && !newPermCitations.includes(val)) {
                                setNewPermCitations([...newPermCitations, val]);
                                (e.target as HTMLInputElement).value = "";
                              }
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 shrink-0"
                          onClick={() => {
                            const input = document.querySelector<HTMLInputElement>(
                              'input[placeholder="Add citation (e.g., Author (Year))..."]'
                            );
                            if (input) {
                              const val = input.value.trim();
                              if (val && !newPermCitations.includes(val)) {
                                setNewPermCitations([...newPermCitations, val]);
                                input.value = "";
                              }
                            }
                          }}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                        onClick={handleAddPermNote}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Save Permanent Note
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs"
                        onClick={() => {
                          setShowNewPermNote(false);
                          setNewPermTitle("");
                          setNewPermContent("");
                          setNewPermTags([]);
                          setNewPermCitations([citation]);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[350px]">
                    <div className="space-y-3">
                      {permNotes.map((note) => (
                        <div
                          key={note.id}
                          className="p-3 rounded-lg border border-rose-200 bg-rose-50/30"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-sm font-medium text-slate-200">
                              {note.title}
                            </h4>
                            <span className="text-[10px] text-slate-400">
                              {note.createdAt}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mb-2">
                            {note.content}
                          </p>
                          {note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {note.tags.map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="secondary"
                                  className="text-[9px] px-1.5 py-0 bg-rose-100 text-rose-600"
                                >
                                  <Tag className="w-2 h-2 mr-0.5" />
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {note.citations && note.citations.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {note.citations.map((c, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 border-rose-300 text-rose-500"
                                >
                                  📎 {c}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" className="text-[10px] h-6 px-2">
                              <BookOpen className="w-3 h-3 mr-1" />
                              Link to Original
                            </Button>
                            <Link to="/draft">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] h-6 px-2 border-[#2D6A4F]/30 text-[#2D6A4F]"
                              >
                                <PenTool className="w-3 h-3 mr-1" />
                                Quote to Draft
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                      {permNotes.length === 0 && (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          No permanent notes yet. Synthesize your literature notes into permanent insights.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Relevance & Value */}
      <Card className="border-slate-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Relevance & Value Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {["High — Core to my research", "Medium — Useful context", "Low — Peripheral"].map(
              (level, i) => (
                <label
                  key={level}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-xs",
                    i === 0
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-700/50 hover:border-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="relevance"
                    defaultChecked={i === 0}
                    className="accent-emerald-600"
                  />
                  {level}
                </label>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Add to Compare Queue
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// Step 4: Expand Workspace
// ============================================================
interface ExpandRecord {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  source: "auto" | "manual";
  direction: "references" | "citations";
  url?: string;
}

interface ManualRecordForm {
  title: string;
  authors: string;
  year: string;
  journal: string;
  url: string;
}

type ExpandMode = "entry-paper" | "doi-url" | "manual";

function ExpandWorkspace({ projectId }: { projectId: string }) {
  const [projectPapers, setProjectPapers] = useState<ApiPaper[]>([]);
  const [loadingPapers, setLoadingPapers] = useState(false);
  const [expandMode, setExpandMode] = useState<ExpandMode>("entry-paper");
  const [selectedPaperId, setSelectedPaperId] = useState("");
  const [activePath, setActivePath] = useState<"references" | "citations">("references");
  const [recordBuckets, setRecordBuckets] = useState<
    Record<ExpandMode, { references: ExpandRecord[]; citations: ExpandRecord[] }>
  >({
    "entry-paper": { references: [], citations: [] },
    "doi-url": { references: [], citations: [] },
    manual: { references: [], citations: [] },
  });
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);
  const [showManualReferences, setShowManualReferences] = useState(false);
  const [showManualCitations, setShowManualCitations] = useState(false);
  const [referenceLookupInput, setReferenceLookupInput] = useState("");
  const [citationLookupInput, setCitationLookupInput] = useState("");
  const [manualReferenceForm, setManualReferenceForm] = useState<ManualRecordForm>({
    title: "",
    authors: "",
    year: "",
    journal: "",
    url: "",
  });
  const [manualCitationForm, setManualCitationForm] = useState<ManualRecordForm>({
    title: "",
    authors: "",
    year: "",
    journal: "",
    url: "",
  });

  const entryPapers = projectPapers.filter((paper) => paper.is_entry_paper);
  const selectedPaper = entryPapers.find((paper) => paper.id === selectedPaperId) ?? null;

  interface OpenAlexWork {
    id?: string;
    display_name?: string;
    publication_year?: number;
    authorships?: Array<{ author?: { display_name?: string } }>;
    primary_location?: { source?: { display_name?: string } };
    host_venue?: { display_name?: string };
    doi?: string;
    ids?: { doi?: string; openalex?: string };
    referenced_works?: string[];
    cited_by_api_url?: string;
  }

  useEffect(() => {
    if (!projectId) return;
    setLoadingPapers(true);
    paperAPI
      .list(projectId)
      .then((papers) => {
        setProjectPapers(papers);
        const existingEntryPapers = papers.filter((paper) => paper.is_entry_paper);
        if (existingEntryPapers.length > 0) {
          setSelectedPaperId((prev) => prev || existingEntryPapers[0].id);
        }
      })
      .catch(() => {
        toast.error("Failed to load entry papers");
      })
      .finally(() => setLoadingPapers(false));
  }, [projectId]);

  useEffect(() => {
    if (!entryPapers.length) {
      setSelectedPaperId("");
      return;
    }
    if (!selectedPaperId || !entryPapers.some((paper) => paper.id === selectedPaperId)) {
      setSelectedPaperId(entryPapers[0].id);
    }
  }, [entryPapers, selectedPaperId]);

  const extractDoi = (input?: string | null) => {
    if (!input) return null;
    const doiMatch = input.match(/\b10\.\d{4,9}\/[^\s"<>]+/i);
    return doiMatch ? doiMatch[0].replace(/[.,;)>]+$/, "") : null;
  };

  const normalize = (value?: string | null) => (value || "").trim().toLowerCase();
  const buildAccessibleExternalLookupUrl = (title?: string, doi?: string | null) => {
    const raw = (doi || title || "").trim();
    if (!raw) return undefined;
    return `https://scholar.google.com/scholar?q=${encodeURIComponent(raw)}`;
  };

  const isRestrictedExternalUrl = (url?: string | null) => {
    if (!url) return false;
    return /webofscience\.com|webofknowledge\.com|scopus\.com/i.test(url);
  };

  const resolveExternalPaperUrl = (input?: string | null, title?: string) => {
    const normalizedInput = (input || "").trim();
    const doi = extractDoi(normalizedInput);
    if (doi) {
      return `https://doi.org/${encodeURIComponent(doi)}`;
    }

    if (/^https?:\/\//i.test(normalizedInput) && !isRestrictedExternalUrl(normalizedInput)) {
      return normalizedInput;
    }

    return buildAccessibleExternalLookupUrl(title, doi);
  };

  const buildOpenAlexUrl = (workId?: string) => {
    if (!workId) return undefined;
    const normalized = workId.replace("https://openalex.org/", "");
    return `https://openalex.org/${encodeURIComponent(normalized)}`;
  };

  const getOpenAlexWork = async (identifier: string): Promise<OpenAlexWork> => {
    const response = await fetch(`https://api.openalex.org/works/${encodeURIComponent(identifier)}`);
    if (!response.ok) {
      throw new Error("openalex lookup failed");
    }
    return (await response.json()) as OpenAlexWork;
  };

  const resolveOpenAlexWork = async (
    sourceInput: string,
    fallbackTitle?: string
  ): Promise<OpenAlexWork> => {
    const normalizedInput = sourceInput.trim();
    const doi = extractDoi(normalizedInput);

    if (doi) {
      try {
        return await getOpenAlexWork(`https://doi.org/${doi.trim().toLowerCase()}`);
      } catch {
        const byDoiResponse = await fetch(
          `https://api.openalex.org/works?filter=doi:${encodeURIComponent(doi.trim().toLowerCase())}&per-page=1`
        );
        if (byDoiResponse.ok) {
          const payload = (await byDoiResponse.json()) as { results?: OpenAlexWork[] };
          const first = payload.results?.[0];
          if (first) return first;
        }
      }
    }

    const query = (fallbackTitle || normalizedInput).trim();
    if (!query) {
      throw new Error("missing source query");
    }

    const response = await fetch(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=1`
    );
    if (!response.ok) {
      throw new Error("openalex title search failed");
    }
    const payload = (await response.json()) as { results?: OpenAlexWork[] };
    const first = payload.results?.[0];
    if (!first) {
      throw new Error("openalex title search returned empty");
    }
    return first;
  };

  const mapOpenAlexToRecord = (
    work: OpenAlexWork,
    direction: "references" | "citations"
  ): ExpandRecord | null => {
    if (!work.display_name) return null;

    const doi = work.ids?.doi || work.doi;
    const resolvedUrl = doi
      ? `https://doi.org/${encodeURIComponent(doi.replace("https://doi.org/", ""))}`
      : buildOpenAlexUrl(work.id);

    return {
      id: work.id || `${direction}-${Date.now()}-${Math.random()}`,
      title: work.display_name,
      authors: (work.authorships || [])
        .map((entry) => entry.author?.display_name)
        .filter((name): name is string => Boolean(name)),
      year: work.publication_year,
      journal: work.primary_location?.source?.display_name || work.host_venue?.display_name,
      source: "auto",
      direction,
      url: resolvedUrl,
    };
  };

  const setRecordsForMode = (
    mode: ExpandMode,
    direction: "references" | "citations",
    records: ExpandRecord[]
  ) => {
    setRecordBuckets((prev) => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [direction]: records,
      },
    }));
  };
  const fetchOpenAlexRecords = async (
    sourceWork: OpenAlexWork,
    direction: "references" | "citations"
  ) => {
    if (direction === "references") {
      const referencedIds = (sourceWork.referenced_works || [])
        .slice(0, 20)
        .map((item) => item.split("/").pop() || item);

      const works = await Promise.all(
        referencedIds.map(async (workId) => {
          try {
            return await getOpenAlexWork(workId);
          } catch {
            return null;
          }
        })
      );

      return works
        .map((work) => (work ? mapOpenAlexToRecord(work, direction) : null))
        .filter((record): record is ExpandRecord => Boolean(record));
    }

    const openAlexId = sourceWork.id?.split("/").pop();
    const citedByUrl = openAlexId
      ? `https://api.openalex.org/works?filter=cites:${encodeURIComponent(openAlexId)}&per-page=20`
      : sourceWork.cited_by_api_url
        ? `${sourceWork.cited_by_api_url}&per-page=20`
        : null;

    if (!citedByUrl) {
      throw new Error("openalex cited-by url unavailable");
    }

    const response = await fetch(citedByUrl);
    if (!response.ok) {
      throw new Error("openalex citations lookup failed");
    }

    const payload = (await response.json()) as { results?: OpenAlexWork[] };
    return (payload.results || [])
      .map((work) => mapOpenAlexToRecord(work, direction))
      .filter((record): record is ExpandRecord => Boolean(record));
  };

  const loadExpandRecordsFromPaper = async (paper: ApiPaper) => {
    setLoadingRecords(true);
    setExpandError(null);

    try {
      const sourceWork = await resolveOpenAlexWork(paper.url || "", paper.title);
      const [references, citations] = await Promise.all([
        fetchOpenAlexRecords(sourceWork, "references"),
        fetchOpenAlexRecords(sourceWork, "citations"),
      ]);
      setRecordsForMode("entry-paper", "references", references);
      setRecordsForMode("entry-paper", "citations", citations);
    } catch {
      setRecordsForMode("entry-paper", "references", []);
      setRecordsForMode("entry-paper", "citations", []);
      setExpandError(
        "Unable to pull references or citations from OpenAlex for this entry paper. You can still use the DOI/URL pull inside each tab or add records manually."
      );
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadDirectionRecordsByInput = async (
    direction: "references" | "citations",
    sourceInput: string
  ) => {
    const normalizedInput = sourceInput.trim();
    if (!normalizedInput) {
      setExpandError(`Please enter a DOI or URL to pull ${direction}.`);
      return;
    }

    setLoadingRecords(true);
    setExpandError(null);

    try {
      const sourceWork = await resolveOpenAlexWork(normalizedInput, selectedPaper?.title);
      const records = await fetchOpenAlexRecords(sourceWork, direction);
      const targetMode: ExpandMode = expandMode === "entry-paper" ? "doi-url" : expandMode;
      setRecordsForMode(targetMode, direction, records);
    } catch {
      setExpandError(`Unable to pull ${direction} from OpenAlex with the provided DOI/URL.`);
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    if (!selectedPaper) return;
    void loadExpandRecordsFromPaper(selectedPaper);
  }, [selectedPaperId, selectedPaper?.title, selectedPaper?.url]);

  const addManualRecord = (direction: "references" | "citations") => {
    const form = direction === "references" ? manualReferenceForm : manualCitationForm;
    if (!form.title.trim()) return;

    const record: ExpandRecord = {
      id: `${direction}-manual-${Date.now()}`,
      title: form.title.trim(),
      authors: form.authors
        .split(",")
        .map((author) => author.trim())
        .filter(Boolean),
      year: form.year ? parseInt(form.year, 10) || undefined : undefined,
      journal: form.journal.trim() || undefined,
      source: "manual",
      direction,
      url: form.url.trim() || undefined,
    };

    if (direction === "references") {
      setRecordBuckets((prev) => ({
        ...prev,
        manual: {
          ...prev.manual,
          references: [record, ...prev.manual.references],
        },
      }));
      setManualReferenceForm({ title: "", authors: "", year: "", journal: "", url: "" });
      setShowManualReferences(false);
      return;
    }

    setRecordBuckets((prev) => ({
      ...prev,
      manual: {
        ...prev.manual,
        citations: [record, ...prev.manual.citations],
      },
    }));
    setManualCitationForm({ title: "", authors: "", year: "", journal: "", url: "" });
    setShowManualCitations(false);
  };

  const findExistingProjectPaper = (record: ExpandRecord) => {
    const recordDoi = extractDoi(record.url);
    return projectPapers.find((paper) => {
      const paperUrl = (paper as ApiPaper & { url?: string }).url;
      const paperDoi = extractDoi(paperUrl);
      if (recordDoi && paperDoi && recordDoi === paperDoi) return true;
      if (record.url && paperUrl && normalize(record.url) === normalize(paperUrl)) return true;
      return normalize(paper.title) === normalize(record.title) && (paper.year || null) === (record.year || null);
    });
  };

  const toggleExpandedPaper = async (record: ExpandRecord) => {
    const existing = findExistingProjectPaper(record);

    if (existing) {
      try {
        const nextExpandedValue = !existing.is_expanded_paper;
        const updated = await paperAPI.update(existing.id, {
          is_expanded_paper: nextExpandedValue,
          url: existing.url || record.url,
          discovery_path: existing.discovery_path || "OpenAlex",
          discovery_note:
            existing.discovery_note ||
            (selectedPaper ? `Expanded from: ${selectedPaper.title}` : "Expanded from Step 4"),
        });
        setProjectPapers((prev) => prev.map((paper) => (paper.id === existing.id ? updated : paper)));
        toast.success(nextExpandedValue ? "Added to expanded papers" : "Removed from expanded papers");
      } catch {
        toast.error("Failed to update this paper in expanded papers");
      }
      return;
    }

    try {
      const created = await paperAPI.create({
        title: record.title,
        authors: record.authors,
        year: record.year,
        journal: record.journal,
        url: record.url,
        discovery_path: "OpenAlex",
        discovery_note: selectedPaper ? `Expanded from: ${selectedPaper.title}` : "Expanded from Step 4",
        project_id: projectId,
      });

      try {
        const updated = await paperAPI.update(created.id, { is_expanded_paper: true });
        setProjectPapers((prev) => [...prev, updated]);
      } catch {
        setProjectPapers((prev) => [...prev, created]);
      }
      toast.success("Added to expanded papers");
    } catch {
      toast.error("Failed to add this record to expanded papers");
    }
  };

  const renderManualForm = (direction: "references" | "citations") => {
    const form = direction === "references" ? manualReferenceForm : manualCitationForm;
    const setForm = direction === "references" ? setManualReferenceForm : setManualCitationForm;

    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-800/40 p-3 space-y-2">
        <Input
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          placeholder="Paper title"
          className="text-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={form.authors}
            onChange={(event) => setForm((prev) => ({ ...prev, authors: event.target.value }))}
            placeholder="Authors (comma separated)"
            className="text-sm"
          />
          <Input
            value={form.year}
            onChange={(event) => setForm((prev) => ({ ...prev, year: event.target.value }))}
            placeholder="Year"
            type="number"
            className="text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={form.journal}
            onChange={(event) => setForm((prev) => ({ ...prev, journal: event.target.value }))}
            placeholder="Journal"
            className="text-sm"
          />
          <Input
            value={form.url}
            onChange={(event) => setForm((prev) => ({ ...prev, url: event.target.value }))}
            placeholder="DOI or URL"
            className="text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => addManualRecord(direction)} className="bg-cyan-600 hover:bg-cyan-700 text-white">
            <Plus className="w-3 h-3 mr-1" />
            Add record
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (direction === "references") setShowManualReferences(false);
              else setShowManualCitations(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  const renderRecordList = (direction: "references" | "citations", records: ExpandRecord[]) => (
    <div className="space-y-3">
      {records.map((record) => {
        const existing = findExistingProjectPaper(record);
        const isExpanded = Boolean(existing?.is_expanded_paper);
        const externalUrl = resolveExternalPaperUrl(record.url, record.title);
        return (
          <div key={record.id} className="rounded-lg border border-slate-700/50 p-3 record-item">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="inline-flex items-center gap-1">
                  {externalUrl ? (
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-slate-100 hover:underline record-item-title"
                    >
                      {record.title}
                    </a>
                  ) : (
                    <h4 className="text-sm font-semibold text-slate-100 record-item-title">{record.title}</h4>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-4 px-1 text-[9px] leading-none align-middle",
                      record.source === "auto"
                        ? "border-blue-300 text-blue-600"
                        : "border-cyan-300 text-cyan-600"
                    )}
                  >
                    {record.source === "auto" ? "Auto" : "Manual"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {record.authors.length ? record.authors.join(", ") : "Unknown authors"}
                  {record.year ? ` (${record.year})` : ""}
                </p>
                {record.journal ? <p className="text-xs text-slate-500">{record.journal}</p> : null}
                {record.url ? <p className="text-xs text-slate-400 break-all">{record.url}</p> : null}
              </div>
              <Button
                size="sm"
                variant={isExpanded ? "outline" : "default"}
                className={cn(
                  "h-5 px-2 text-[10px]",
                  isExpanded
                    ? "border-rose-300 text-rose-700"
                    : "bg-cyan-600 hover:bg-cyan-700 text-white"
                )}
                onClick={() => void toggleExpandedPaper(record)}
              >
                {isExpanded ? (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    Remove from expanded papers
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3 mr-1" />
                    To Expanded
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      })}
      {records.length === 0 && !loadingRecords ? (
        <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-lg">
          No records yet. Pull from OpenAlex or add manually.
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-5">
      <Card className="border-slate-700/50">
        <CardContent className="space-y-4">
          <Tabs value={expandMode} onValueChange={(value) => { setExpandMode(value as ExpandMode); setExpandError(null); }}>
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/20 px-3 pt-5 pb-2">
              <TabsList className="flex w-auto flex-wrap justify-start gap-2 bg-transparent p-0">
                <TabsTrigger
                  value="entry-paper"
                  className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                >
                  Expand by Entry Paper
                </TabsTrigger>
                <TabsTrigger
                  value="doi-url"
                  className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                >
                  Expand by DOI/URL
                </TabsTrigger>
                <TabsTrigger
                  value="manual"
                  className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                >
                  Expand Manually
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="entry-paper" className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3">
                <p className="text-xs text-slate-500">
                  Select one entry paper, then pull both references and citations from OpenAlex.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">1. Select one entry paper to expand</p>
                <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                  {entryPapers.map((paper) => {
                    const paperUrl = (paper as ApiPaper & { url?: string }).url;
                    const externalUrl = resolveExternalPaperUrl(paperUrl, paper.title);
                    return (
                      <div
                        key={paper.id}
                        onClick={() => setSelectedPaperId(paper.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedPaperId(paper.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        data-selected={selectedPaperId === paper.id ? "true" : undefined}
                        className={cn(
                          "w-full text-left rounded-lg border p-3 transition-all record-item",
                          selectedPaperId === paper.id
                            ? "border-cyan-600 bg-blue-950/40"
                            : "border-slate-700/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/paper-read/${projectId}/${paper.id}`}
                                onClick={(event) => event.stopPropagation()}
                                className="text-sm font-semibold text-slate-100 hover:underline record-item-title"
                              >
                                {paper.title}
                              </Link>
                              {externalUrl ? (
                                <a
                                  href={externalUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex items-center rounded-md border border-slate-700/50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700"
                                >
                                  <ExternalLink className="mr-1 h-3 w-3" />
                                  Open original
                                </a>
                              ) : null}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {paper.authors.join(", ") || "Unknown authors"}
                              {paper.year ? ` (${paper.year})` : ""}
                            </p>
                          </div>
                          {selectedPaperId === paper.id ? (
                            <Badge variant="outline" className="text-[10px] border-cyan-600 text-cyan-300">
                              Selected
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                  {!loadingPapers && entryPapers.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-lg">
                      No entry papers in this project.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">2. Pulled Expansion Results</p>
                <Tabs value={activePath} onValueChange={(value) => setActivePath(value as "references" | "citations")}>
                  <TabsList className="flex w-full flex-wrap gap-2 bg-transparent p-0">
                    <TabsTrigger
                      value="references"
                      className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                    >
                      References
                    </TabsTrigger>
                    <TabsTrigger
                      value="citations"
                      className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                    >
                      Citations
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-3 rounded-lg border border-slate-700/50 p-3 bg-slate-800/40/40">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-600">
                        {selectedPaper ? `Selected: ${selectedPaper.title}` : "Please select an entry paper first."}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (selectedPaper) void loadExpandRecordsFromPaper(selectedPaper);
                        }}
                        disabled={!selectedPaper || loadingRecords}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        {loadingRecords ? "Pulling..." : "Pull from OpenAlex"}
                      </Button>
                    </div>
                    {expandError ? (
                      <p className="text-xs text-amber-700 mt-2">{expandError}</p>
                    ) : null}
                  </div>

                  <TabsContent value="references" className="mt-4 space-y-3">
                    {renderRecordList("references", recordBuckets["entry-paper"].references)}
                  </TabsContent>

                  <TabsContent value="citations" className="mt-4 space-y-3">
                    {renderRecordList("citations", recordBuckets["entry-paper"].citations)}
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            <TabsContent value="doi-url" className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3">
                <p className="text-xs text-slate-500">
                  Use a DOI or URL as the seed source when you do not want to start from an existing entry paper.
                </p>
              </div>

              <Tabs value={activePath} onValueChange={(value) => setActivePath(value as "references" | "citations")}>
                <TabsList className="flex w-full flex-wrap gap-2 bg-transparent p-0">
                  <TabsTrigger
                    value="references"
                    className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                  >
                    References
                  </TabsTrigger>
                  <TabsTrigger
                    value="citations"
                    className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                  >
                    Citations
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="references" className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <Input
                      value={referenceLookupInput}
                      onChange={(event) => setReferenceLookupInput(event.target.value)}
                      placeholder="Provide a DOI or URL to pull references"
                      className="text-sm"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void loadDirectionRecordsByInput("references", referenceLookupInput);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void loadDirectionRecordsByInput("references", referenceLookupInput)}
                      disabled={loadingRecords || !referenceLookupInput.trim()}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Pull References
                    </Button>
                  </div>
                  {expandError ? <p className="text-xs text-amber-700">{expandError}</p> : null}
                  {renderRecordList("references", recordBuckets["doi-url"].references)}
                </TabsContent>

                <TabsContent value="citations" className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <Input
                      value={citationLookupInput}
                      onChange={(event) => setCitationLookupInput(event.target.value)}
                      placeholder="Provide a DOI or URL to pull citations"
                      className="text-sm"
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void loadDirectionRecordsByInput("citations", citationLookupInput);
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void loadDirectionRecordsByInput("citations", citationLookupInput)}
                      disabled={loadingRecords || !citationLookupInput.trim()}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      Pull Citations
                    </Button>
                  </div>
                  {expandError ? <p className="text-xs text-amber-700">{expandError}</p> : null}
                  {renderRecordList("citations", recordBuckets["doi-url"].citations)}
                </TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="manual" className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-3">
                <p className="text-xs text-slate-500">
                  Manually add papers when automatic expansion cannot find them or when you want to curate results yourself.
                </p>
              </div>

              <Tabs value={activePath} onValueChange={(value) => setActivePath(value as "references" | "citations")}>
                <TabsList className="flex w-full flex-wrap gap-2 bg-transparent p-0">
                  <TabsTrigger
                    value="references"
                    className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                  >
                    References
                  </TabsTrigger>
                  <TabsTrigger
                    value="citations"
                    className="h-8 px-3 text-xs text-slate-500 hover:bg-slate-800 hover:text-slate-200 data-[state=active]:bg-cyan-600 data-[state=active]:text-white"
                  >
                    Citations
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="references" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowManualReferences((prev) => !prev)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {showManualReferences ? "Hide manual form" : "Add manually"}
                    </Button>
                  </div>
                  {showManualReferences ? renderManualForm("references") : null}
                  {renderRecordList("references", recordBuckets.manual.references)}
                </TabsContent>

                <TabsContent value="citations" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowManualCitations((prev) => !prev)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {showManualCitations ? "Hide manual form" : "Add manually"}
                    </Button>
                  </div>
                  {showManualCitations ? renderManualForm("citations") : null}
                  {renderRecordList("citations", recordBuckets.manual.citations)}
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>

        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Step 5: Visualize Workspace
// ============================================================
function VisualizeWorkspace() {
  const [vizSection, setVizSection] = useState<"research" | "viztools">("research");
  const [researchSubTab, setResearchSubTab] = useState<"papers" | "files" | "ai-summary" | "perm-notes" | "synthesis">("papers");

  // Research content stats
  const papers = DUMMY_PAPERS;
  const readPapers = papers.filter((p) => p.annotations.length > 0);

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: string; date: string; addedToVisual?: boolean }>>([]);
  const [showUploadArea, setShowUploadArea] = useState(false);

  // AI summary
  const [aiSummaryResult, setAiSummaryResult] = useState<string | null>(null);
  const [aiSummarizing, setAiSummarizing] = useState(false);

  // Add permanent note
  const [showAddPermNote, setShowAddPermNote] = useState(false);
  const [permNoteTitle, setPermNoteTitle] = useState("");
  const [permNoteContent, setPermNoteContent] = useState("");
  const [addedPermNotes, setAddedPermNotes] = useState<Array<{ id: string; title: string; content: string; date: string }>>([]);

  // Synthesis tables (multiple)
  interface SynthesisTable {
    id: string;
    name: string;
    columns: string[];
    selectedPapers: string[];
    data: Record<string, Record<string, string>>;
    createdAt: string;
  }
  const [synthTables, setSynthTables] = useState<SynthesisTable[]>([
    {
      id: "st-1",
      name: "Main Synthesis Table",
      columns: ["Research Question", "Method", "Key Finding"],
      selectedPapers: papers.slice(0, 2).map((p) => p.id),
      data: {},
      createdAt: "2026-03-09",
    },
  ]);
  const [activeSynthTableId, setActiveSynthTableId] = useState("st-1");
  const activeSynthTable = synthTables.find((t) => t.id === activeSynthTableId) || synthTables[0];

  const [showSynthesisTable, setShowSynthesisTable] = useState(true);
  const synthColumns = activeSynthTable?.columns || [];
  const synthSelectedPapers = activeSynthTable?.selectedPapers || [];
  const synthData = activeSynthTable?.data || {};
  const [newSynthCol, setNewSynthCol] = useState("");
  const [aiSearching, setAiSearching] = useState(false);

  const updateActiveSynthTable = (updates: Partial<SynthesisTable>) => {
    setSynthTables((prev) =>
      prev.map((t) => (t.id === activeSynthTableId ? { ...t, ...updates } : t))
    );
  };

  const setSynthColumns = (cols: string[]) => updateActiveSynthTable({ columns: cols });
  const setSynthSelectedPapers = (pids: string[]) => updateActiveSynthTable({ selectedPapers: pids });
  const setSynthData = (data: Record<string, Record<string, string>>) => updateActiveSynthTable({ data });

  const handleCreateNewSynthTable = () => {
    const newTable: SynthesisTable = {
      id: `st-${Date.now()}`,
      name: `Synthesis Table ${synthTables.length + 1}`,
      columns: ["Research Question", "Method", "Key Finding"],
      selectedPapers: [],
      data: {},
      createdAt: new Date().toISOString().split("T")[0],
    };
    setSynthTables([...synthTables, newTable]);
    setActiveSynthTableId(newTable.id);
    setShowSynthesisTable(true);
  };

  const handleExportSynthTable = () => {
    if (!activeSynthTable) return;
    const headers = ["Paper", ...activeSynthTable.columns];
    const rows = activeSynthTable.selectedPapers.map((pid) => {
      const paper = papers.find((p) => p.id === pid);
      const paperLabel = paper ? `${paper.authors[0]} (${paper.year})` : pid;
      return [paperLabel, ...activeSynthTable.columns.map((col) => activeSynthTable.data[pid]?.[col] || "")];
    });
    const csvContent = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeSynthTable.name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sort papers
  const [paperSort, setPaperSort] = useState<"year" | "access">("year");
  const sortedPapers = [...papers].sort((a, b) =>
    paperSort === "year" ? b.year - a.year : 0
  );

  const handleAiSummarize = () => {
    setAiSummarizing(true);
    setTimeout(() => {
      setAiSummaryResult(
        "📝 AI Summary of Notes & Highlights:\n\n" +
        "Key Themes Identified:\n" +
        "1. AI tutoring systems improve performance metrics but their effect on self-regulated learning (SRL) remains underexplored.\n" +
        "2. Personalization algorithms are the primary mechanism connecting AI tutoring to outcomes, but metacognitive impacts are unclear.\n" +
        "3. A significant gap exists between performance outcomes and process outcomes in AI education research.\n\n" +
        "Insight Note (Auto-generated):\n" +
        "The literature converges on a critical tension: while AI tutoring systems demonstrate measurable improvements in test scores and completion rates, they may inadvertently bypass the self-regulatory processes that lead to deeper, transferable learning. Future research should investigate design features that explicitly scaffold SRL within adaptive systems."
      );
      setAiSummarizing(false);
    }, 2000);
  };

  const handleAddPermNote = () => {
    if (!permNoteTitle.trim() || !permNoteContent.trim()) return;
    setAddedPermNotes([
      ...addedPermNotes,
      {
        id: `vpn-${Date.now()}`,
        title: permNoteTitle.trim(),
        content: permNoteContent.trim(),
        date: new Date().toISOString().split("T")[0],
      },
    ]);
    setPermNoteTitle("");
    setPermNoteContent("");
    setShowAddPermNote(false);
  };

  const handleUploadFile = () => {
    setUploadedFiles([
      ...uploadedFiles,
      { name: `external_data_${uploadedFiles.length + 1}.pdf`, size: "2.4 MB", date: new Date().toISOString().split("T")[0] },
    ]);
    setShowUploadArea(false);
  };

  const handleAddFileToVisualArtifacts = (index: number) => {
    setUploadedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, addedToVisual: true } : f))
    );
  };

  const handleAiSearchSynthesis = () => {
    if (!activeSynthTable) return;
    setAiSearching(true);
    setTimeout(() => {
      const newData: Record<string, Record<string, string>> = { ...activeSynthTable.data };
      activeSynthTable.selectedPapers.forEach((pid) => {
        const paper = papers.find((p) => p.id === pid);
        if (paper) {
          newData[pid] = {
            "Research Question": paper.researchQuestion || "How does AI tutoring affect learning outcomes?",
            "Method": paper.method || "Systematic review / Meta-analysis",
            "Key Finding": paper.findings || "AI tutoring improves test scores but SRL impact is unclear.",
            ...activeSynthTable.columns.reduce((acc, col) => {
              if (!["Research Question", "Method", "Key Finding"].includes(col)) {
                acc[col] = newData[pid]?.[col] || "(AI: Data not found for this attribute)";
              }
              return acc;
            }, {} as Record<string, string>),
          };
        }
      });
      updateActiveSynthTable({ data: newData });
      setAiSearching(false);
    }, 1500);
  };

  // Visualization Tools state
  interface VizTool {
    id: string;
    name: string;
    url: string;
    description: string;
    pricing: "free" | "paid" | "freemium";
    price: string;
    source: "built-in" | "user";
  }
  const [vizTools, setVizTools] = useState<VizTool[]>([
    { id: "vt-1", name: "VOSviewer", url: "https://www.vosviewer.com", description: "Constructing and visualizing bibliometric networks (co-citation, co-authorship, keyword co-occurrence).", pricing: "free", price: "", source: "built-in" },
    { id: "vt-2", name: "CiteSpace", url: "http://cluster.cis.drexel.edu/~cchen/citespace/", description: "Visualizing and analyzing trends and patterns in scientific literature. Detects research fronts and intellectual bases.", pricing: "free", price: "", source: "built-in" },
    { id: "vt-3", name: "Gephi", url: "https://gephi.org", description: "Open-source network analysis and visualization software. Great for large-scale citation networks and co-authorship graphs.", pricing: "free", price: "", source: "built-in" },
    { id: "vt-4", name: "Tableau", url: "https://www.tableau.com", description: "Powerful data visualization platform for creating interactive dashboards and charts from research data.", pricing: "freemium", price: "$70/user/month (Creator)", source: "built-in" },
    { id: "vt-5", name: "Connected Papers", url: "https://www.connectedpapers.com", description: "Visual tool to explore academic papers in a graph format. Find related papers and build a visual overview of a research field.", pricing: "freemium", price: "Free (5 graphs/month), $3/month (Pro)", source: "built-in" },
    { id: "vt-6", name: "Litmaps", url: "https://www.litmaps.com", description: "Discover and visualize relevant literature using citation-based maps. Track new papers in your field.", pricing: "freemium", price: "Free (basic), $10/month (Pro)", source: "built-in" },
    { id: "vt-7", name: "Bibliometrix (R package)", url: "https://www.bibliometrix.org", description: "Comprehensive R-tool for quantitative research in scientometrics and bibliometrics. Includes Biblioshiny web interface.", pricing: "free", price: "", source: "built-in" },
    { id: "vt-8", name: "RAWGraphs", url: "https://rawgraphs.io", description: "Open-source data visualization framework for creating custom vector-based visualizations from tabular data.", pricing: "free", price: "", source: "built-in" },
    { id: "vt-9", name: "Flourish", url: "https://flourish.studio", description: "Create interactive data visualizations and storytelling. Supports many chart types and animated transitions.", pricing: "freemium", price: "Free (public), $63/month (Business)", source: "built-in" },
    { id: "vt-10", name: "Miro", url: "https://miro.com", description: "Online whiteboard for concept mapping, mind mapping, and collaborative visual brainstorming of research themes.", pricing: "freemium", price: "Free (basic), $8/member/month (Starter)", source: "built-in" },
  ]);
  const [showAddVizTool, setShowAddVizTool] = useState(false);
  const [newVizToolName, setNewVizToolName] = useState("");
  const [newVizToolUrl, setNewVizToolUrl] = useState("");
  const [newVizToolDesc, setNewVizToolDesc] = useState("");
  const [newVizToolPricing, setNewVizToolPricing] = useState<"free" | "paid" | "freemium">("free");
  const [newVizToolPrice, setNewVizToolPrice] = useState("");

  const handleAddVizTool = () => {
    if (!newVizToolName.trim()) return;
    const newTool: VizTool = {
      id: `vt-${Date.now()}`,
      name: newVizToolName.trim(),
      url: newVizToolUrl.trim(),
      description: newVizToolDesc.trim(),
      pricing: newVizToolPricing,
      price: newVizToolPrice.trim(),
      source: "user",
    };
    setVizTools([...vizTools, newTool]);
    setNewVizToolName("");
    setNewVizToolUrl("");
    setNewVizToolDesc("");
    setNewVizToolPricing("free");
    setNewVizToolPrice("");
    setShowAddVizTool(false);
  };

  return (
    <div className="space-y-5">
      {/* Section Tabs */}
      <Card className="border-slate-700/50">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={vizSection === "research" ? "default" : "outline"}
              className={cn("text-xs", vizSection === "research" && "bg-cyan-600 hover:bg-cyan-700 text-white")}
              onClick={() => setVizSection("research")}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              Research Content
            </Button>
            <Button
              size="sm"
              variant={vizSection === "viztools" ? "default" : "outline"}
              className={cn("text-xs", vizSection === "viztools" && "bg-cyan-600 hover:bg-cyan-700 text-white")}
              onClick={() => setVizSection("viztools")}
            >
              <Zap className="w-3 h-3 mr-1" />
              Visualization Tools
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== RESEARCH CONTENT with Sub-Tabs ===== */}
      {vizSection === "research" && (
        <div className="space-y-5">
          {/* Paper Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="border-slate-700/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-200">{papers.length}</p>
                <p className="text-[10px] text-slate-500 uppercase">Total Papers</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{readPapers.length}</p>
                <p className="text-[10px] text-slate-500 uppercase">Papers Read</p>
              </CardContent>
            </Card>
            <Card className="border-slate-700/50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{papers.length - readPapers.length}</p>
                <p className="text-[10px] text-slate-500 uppercase">Unread</p>
              </CardContent>
            </Card>
          </div>

          {/* Research Content Sub-Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {([
              { key: "papers" as const, label: "Papers Overview", icon: "📄" },
              { key: "files" as const, label: "External Files", icon: "📁" },
              { key: "ai-summary" as const, label: "AI Summarize Notes (Premium)", icon: "✨" },
              { key: "perm-notes" as const, label: "Permanent Notes", icon: "📝" },
              { key: "synthesis" as const, label: "Synthesis Tables", icon: "📊" },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setResearchSubTab(tab.key)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all border whitespace-nowrap",
                  researchSubTab === tab.key
                    ? "bg-cyan-600 text-white border-cyan-600"
                    : "bg-[#0d1b30] text-slate-600 border-slate-700/50 hover:border-slate-300"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-Tab: Papers Overview */}
          {researchSubTab === "papers" && (
            <Card className="border-slate-700/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Papers Overview</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={paperSort === "year" ? "default" : "outline"}
                      className={cn("text-[10px] h-6", paperSort === "year" && "bg-cyan-600 text-white")}
                      onClick={() => setPaperSort("year")}
                    >
                      <Clock className="w-2.5 h-2.5 mr-0.5" />
                      By Year
                    </Button>
                    <Button
                      size="sm"
                      variant={paperSort === "access" ? "default" : "outline"}
                      className={cn("text-[10px] h-6", paperSort === "access" && "bg-cyan-600 text-white")}
                      onClick={() => setPaperSort("access")}
                    >
                      <Eye className="w-2.5 h-2.5 mr-0.5" />
                      By Access
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {sortedPapers.map((paper) => (
                      <div key={paper.id} className="p-3 rounded-lg border border-slate-700/50 transition-all record-item">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium text-slate-200 line-clamp-1 record-item-title">{paper.title}</h4>
                            <p className="text-[10px] text-slate-500">{paper.authors.join(", ")} ({paper.year})</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <div className="text-center">
                              <p className="text-xs font-bold text-yellow-600">{paper.annotations.length}</p>
                              <p className="text-[8px] text-slate-400">Highlights</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-blue-600">{Math.max(1, paper.annotations.length - 1)}</p>
                              <p className="text-[8px] text-slate-400">Lit Notes</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-rose-600">{paper.annotations.length > 1 ? 1 : 0}</p>
                              <p className="text-[8px] text-slate-400">Perm Notes</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Sub-Tab: External Files */}
          {researchSubTab === "files" && (
            <Card className="border-slate-700/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Upload className="w-4 h-4" />
                    External Files
                  </CardTitle>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowUploadArea(!showUploadArea)}>
                    <FolderUp className="w-3 h-3 mr-1" />
                    Upload File
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showUploadArea && (
                  <div className="p-4 mb-3 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 text-center">
                    <Upload className="w-8 h-8 text-blue-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 mb-2">Drag & drop files here, or click to browse</p>
                    <Button size="sm" className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white" onClick={handleUploadFile}>
                      <Plus className="w-3 h-3 mr-1" />
                      Simulate Upload
                    </Button>
                  </div>
                )}
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-slate-800/40 rounded-lg">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{file.size} · {file.date}</p>
                        </div>
                        <div className="shrink-0">
                          {file.addedToVisual ? (
                            <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />
                              Added to Visual
                            </Badge>
                          ) : (
                            <Link to="/artifacts?tab=visual">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] h-6 px-2 border-cyan-300 text-cyan-600 hover:bg-cyan-50"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleAddFileToVisualArtifacts(i);
                                }}
                              >
                                <Eye className="w-2.5 h-2.5 mr-0.5" />
                                Add to Visual Artifacts
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-3">No external files uploaded yet.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sub-Tab: AI Summarize Notes */}
          {researchSubTab === "ai-summary" && (
            <Card className="border-slate-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  AI Summarize Notes (Premium)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500 mb-3">
                  Automatically summarize your literature notes, highlights, and permanent notes. Generate insight notes from patterns found across your materials.
                </p>
                <Button
                  size="sm"
                  className="w-full text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={handleAiSummarize}
                  disabled={aiSummarizing}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {aiSummarizing ? "Summarizing..." : "Generate AI Summary & Insights"}
                </Button>
                {aiSummaryResult && (
                  <div className="mt-3 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-cyan-700 uppercase">AI Result</span>
                      <button onClick={() => setAiSummaryResult(null)} className="hover:bg-cyan-100 rounded p-0.5">
                        <X className="w-3 h-3 text-cyan-400" />
                      </button>
                    </div>
                    <pre className="text-[10px] text-cyan-800 whitespace-pre-wrap leading-relaxed">{aiSummaryResult}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sub-Tab: Permanent Notes */}
          {researchSubTab === "perm-notes" && (
            <Card className="border-slate-700/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-rose-500" />
                    Permanent Notes
                  </CardTitle>
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-rose-600 hover:bg-rose-700 text-white"
                    onClick={() => setShowAddPermNote(!showAddPermNote)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Note
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showAddPermNote && (
                  <div className="p-3 mb-3 rounded-lg border-2 border-dashed border-rose-200 bg-rose-50/30 space-y-2">
                    <Input
                      value={permNoteTitle}
                      onChange={(e) => setPermNoteTitle(e.target.value)}
                      placeholder="Note title..."
                      className="text-xs"
                    />
                    <Textarea
                      value={permNoteContent}
                      onChange={(e) => setPermNoteContent(e.target.value)}
                      rows={4}
                      placeholder="Write your permanent note — synthesize insights across sources..."
                      className="text-xs"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" className="text-xs h-7 bg-rose-600 hover:bg-rose-700 text-white" onClick={handleAddPermNote}>
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowAddPermNote(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {addedPermNotes.map((note) => (
                      <div key={note.id} className="p-2 rounded-lg border border-rose-200 bg-rose-50/20">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-xs font-medium text-slate-200">{note.title}</h4>
                          <span className="text-[9px] text-slate-400">{note.date}</span>
                        </div>
                        <p className="text-[10px] text-slate-600 line-clamp-2">{note.content}</p>
                      </div>
                    ))}
                    {addedPermNotes.length === 0 && !showAddPermNote && (
                      <p className="text-xs text-slate-400 text-center py-3">No permanent notes added from this page yet.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Sub-Tab: Synthesis Tables */}
          {researchSubTab === "synthesis" && (
            <Card className="border-slate-700/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Table2 className="w-4 h-4" />
                    Synthesis Tables ({synthTables.length})
                  </CardTitle>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleExportSynthTable}>
                      <Download className="w-3 h-3 mr-1" />
                      Export CSV
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleCreateNewSynthTable}>
                      <Plus className="w-3 h-3 mr-1" />
                      New Table
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {showSynthesisTable && (
                <CardContent className="space-y-4">
                  {/* Table Switcher */}
                  {synthTables.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {synthTables.map((table) => (
                        <button
                          key={table.id}
                          onClick={() => setActiveSynthTableId(table.id)}
                          className={cn(
                            "px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-all border",
                            activeSynthTableId === table.id
                              ? "bg-cyan-600 text-white border-cyan-600"
                              : "bg-[#0d1b30] text-slate-600 border-slate-700/50 hover:border-slate-300"
                          )}
                        >
                          {table.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Select Papers (Rows) */}
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-2">Select Papers (Rows):</p>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {papers.map((paper) => (
                        <label key={paper.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800/40 cursor-pointer">
                          <Checkbox
                            checked={synthSelectedPapers.includes(paper.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSynthSelectedPapers([...synthSelectedPapers, paper.id]);
                              else setSynthSelectedPapers(synthSelectedPapers.filter((id) => id !== paper.id));
                            }}
                          />
                          <span className="text-xs text-slate-700 truncate">{paper.title} ({paper.year})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Custom Columns */}
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-2">Columns (Attributes):</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {synthColumns.map((col) => (
                        <Badge key={col} variant="secondary" className="text-[10px] px-2 py-0.5 bg-slate-800 gap-1">
                          {col}
                          <button onClick={() => setSynthColumns(synthColumns.filter((c) => c !== col))} className="hover:text-red-500">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        value={newSynthCol}
                        onChange={(e) => setNewSynthCol(e.target.value)}
                        placeholder="Add column (e.g., Sample Size, Theory)..."
                        className="text-xs h-7"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = newSynthCol.trim();
                            if (val && !synthColumns.includes(val)) {
                              setSynthColumns([...synthColumns, val]);
                              setNewSynthCol("");
                            }
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 shrink-0"
                        onClick={() => {
                          const val = newSynthCol.trim();
                          if (val && !synthColumns.includes(val)) {
                            setSynthColumns([...synthColumns, val]);
                            setNewSynthCol("");
                          }
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* AI Auto-fill Button */}
                  <Button
                    size="sm"
                    className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={handleAiSearchSynthesis}
                    disabled={aiSearching || synthSelectedPapers.length === 0}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {aiSearching ? "AI Searching..." : "AI Auto-fill Data (Premium)"}
                  </Button>

                  {/* Table */}
                  {synthSelectedPapers.length > 0 && synthColumns.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left p-2 border border-slate-700/50 bg-slate-800/40 font-semibold text-slate-600 min-w-[150px]">
                              Paper
                            </th>
                            {synthColumns.map((col) => (
                              <th key={col} className="text-left p-2 border border-slate-700/50 bg-slate-800/40 font-semibold text-slate-600 min-w-[120px]">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {synthSelectedPapers.map((pid) => {
                            const paper = papers.find((p) => p.id === pid);
                            if (!paper) return null;
                            return (
                              <tr key={pid}>
                                <td className="p-2 border border-slate-700/50 font-medium text-slate-700">
                                  {paper.authors[0]} ({paper.year})
                                </td>
                                {synthColumns.map((col) => (
                                  <td key={col} className="p-2 border border-slate-700/50">
                                    <input
                                      type="text"
                                      value={synthData[pid]?.[col] || ""}
                                      onChange={(e) => {
                                        setSynthData({
                                          ...synthData,
                                          [pid]: { ...(synthData[pid] || {}), [col]: e.target.value },
                                        });
                                      }}
                                      placeholder="Enter data..."
                                      className="w-full text-[10px] text-slate-600 bg-transparent outline-none"
                                    />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ===== VISUALIZATION TOOLS ===== */}
      {vizSection === "viztools" && (
        <div className="space-y-5">
          <Card className="border-slate-700/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Visualization Tools Directory
                  </CardTitle>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Common software and apps for research visualization, bibliometrics, and data presentation.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="text-xs h-7 bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => setShowAddVizTool(!showAddVizTool)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Tool
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Tool Form */}
              {showAddVizTool && (
                <div className="p-4 rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/30 space-y-3">
                  <p className="text-xs font-semibold text-amber-700">➕ Add a New Visualization Tool</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-600">Name *</label>
                      <Input
                        value={newVizToolName}
                        onChange={(e) => setNewVizToolName(e.target.value)}
                        placeholder="Tool name..."
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-600">URL</label>
                      <Input
                        value={newVizToolUrl}
                        onChange={(e) => setNewVizToolUrl(e.target.value)}
                        placeholder="https://..."
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-600">Description</label>
                    <Textarea
                      value={newVizToolDesc}
                      onChange={(e) => setNewVizToolDesc(e.target.value)}
                      rows={2}
                      placeholder="What does this tool do? What is it best for?"
                      className="text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-600">Pricing</label>
                      <div className="flex gap-1.5">
                        {(["free", "freemium", "paid"] as const).map((p) => (
                          <button
                            key={p}
                            onClick={() => setNewVizToolPricing(p)}
                            className={cn(
                              "px-2.5 py-1 rounded text-[10px] border capitalize transition-all",
                              newVizToolPricing === p
                                ? p === "free" ? "bg-emerald-500 text-white border-emerald-500"
                                  : p === "freemium" ? "bg-amber-500 text-white border-amber-500"
                                  : "bg-red-500 text-white border-red-500"
                                : "bg-[#0d1b30] text-slate-600 border-slate-700/50 hover:border-slate-300"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-600">Price Details</label>
                      <Input
                        value={newVizToolPrice}
                        onChange={(e) => setNewVizToolPrice(e.target.value)}
                        placeholder="e.g., $10/month, Free tier available..."
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" className="text-xs h-7 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleAddVizTool}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add Tool
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowAddVizTool(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Tools Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {vizTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="p-3 rounded-lg border border-slate-700/50 hover:border-slate-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-slate-200">{tool.name}</h4>
                        {tool.source === "user" && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-cyan-300 text-cyan-600">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <Badge
                        className={cn(
                          "text-[9px] px-1.5 py-0",
                          tool.pricing === "free" && "bg-emerald-100 text-emerald-700 border-emerald-200",
                          tool.pricing === "freemium" && "bg-amber-100 text-amber-700 border-amber-200",
                          tool.pricing === "paid" && "bg-red-100 text-red-700 border-red-200"
                        )}
                      >
                        {tool.pricing === "free" ? "Free" : tool.pricing === "freemium" ? "Freemium" : "Paid"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-600 mb-2 line-clamp-2">{tool.description}</p>
                    {tool.price && (
                      <p className="text-[9px] text-slate-400 mb-2">💰 {tool.price}</p>
                    )}
                    <div className="flex items-center justify-between">
                      {tool.url && (
                        <a
                          href={tool.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                        >
                          🔗 Visit Website
                        </a>
                      )}
                      {tool.source === "user" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[9px] h-5 px-1.5 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setVizTools(vizTools.filter((t) => t.id !== tool.id))}
                        >
                          <X className="w-2.5 h-2.5 mr-0.5" />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Step 6: Draft Workspace (Inline version)
// ============================================================
function DraftWorkspaceInline() {
  // Reporting style
  const [selectedStyle, setSelectedStyle] = useState("apa");
  const activeStyle = REPORTING_STYLES.find((s) => s.id === selectedStyle) || REPORTING_STYLES[0];

  // Component contents keyed by style-component id
  const [componentContents, setComponentContents] = useState<Record<string, string>>({
    "apa-introduction":
      "The integration of artificial intelligence in educational settings has garnered significant attention in recent years. AI-powered tutoring systems, in particular, have shown promise in improving student learning outcomes through personalized instruction and adaptive feedback mechanisms.\n\nHowever, a critical gap exists in our understanding of how these systems affect deeper learning processes. While studies consistently demonstrate improvements in test scores and completion rates (Chen et al., 2024), the impact on self-regulated learning (SRL) — the ability of students to plan, monitor, and evaluate their own learning — remains largely unexplored.",
    "apa-literature-review": "",
    "apa-method": "",
    "apa-results": "",
    "apa-discussion": "",
    "apa-abstract":
      "This study investigates how AI-powered adaptive tutoring systems influence self-regulated learning strategies among graduate students.",
  });

  // Active component being edited
  const [activeComponentId, setActiveComponentId] = useState(activeStyle.components[0]?.id || "");

  // Auto-save indicator
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Preview mode
  const [showPreview, setShowPreview] = useState(false);

  // Artifact preview
  const [previewArtifactId, setPreviewArtifactId] = useState<string | null>(null);

  // Insert position
  const [insertTarget, setInsertTarget] = useState<string | null>(null);

  // Structure check state
  const [checkTab, setCheckTab] = useState<"macro" | "meso" | "micro">("macro");
  const [macroChecked, setMacroChecked] = useState<Record<string, boolean>>({});
  const [mesoChecked, setMesoChecked] = useState<Record<string, boolean>>({});
  const [microBasicChecked, setMicroBasicChecked] = useState<Record<string, boolean>>({});
  const [microReadChecked, setMicroReadChecked] = useState<Record<string, boolean>>({});
  const [microCredChecked, setMicroCredChecked] = useState<Record<string, boolean>>({});
  const [aiCheckResult, setAiCheckResult] = useState<string | null>(null);
  const [aiChecking, setAiChecking] = useState(false);

  const allArtifacts = DUMMY_ARTIFACTS;

  const getContentKey = (compId: string) => `${selectedStyle}-${compId}`;

  const handleContentChange = (compId: string, value: string) => {
    const key = getContentKey(compId);
    setComponentContents((prev) => ({ ...prev, [key]: value }));
    // Auto-save after 2 seconds of inactivity
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      setLastSaved(new Date().toLocaleTimeString());
    }, 2000);
    setAutoSaveTimer(timer);
  };

  const handleManualSave = () => {
    setLastSaved(new Date().toLocaleTimeString());
  };

  const handleInsertArtifact = (artifactId: string) => {
    const artifact = allArtifacts.find((a) => a.id === artifactId);
    if (!artifact || !insertTarget) return;
    const key = getContentKey(insertTarget);
    const existing = componentContents[key] || "";
    const insertText = `\n\n[Inserted from: ${artifact.title}]\n${artifact.content || artifact.description}\n`;
    setComponentContents((prev) => ({ ...prev, [key]: existing + insertText }));
    setInsertTarget(null);
  };

  const handleAiCheck = () => {
    setAiChecking(true);
    setTimeout(() => {
      setAiCheckResult(
        "AI Analysis Complete:\n\n" +
        "✅ Macro: Introduction and abstract are well-structured. Literature review section needs more content.\n" +
        "⚠️ Meso (Toulmin): Claims are stated but warrants need strengthening. Consider adding more explicit logical connections between evidence and claims. Rebuttals are missing in 2 paragraphs.\n" +
        "⚠️ Micro: 3 potential grammar issues detected. Signposting could be improved in paragraphs 2-3. Citation recency is good (80% within 5 years)."
      );
      setAiChecking(false);
    }, 1500);
  };

  const getFullText = () => {
    return activeStyle.components
      .map((comp) => {
        const content = componentContents[getContentKey(comp.id)] || "";
        return content ? `## ${comp.label}\n\n${content}` : "";
      })
      .filter(Boolean)
      .join("\n\n---\n\n");
  };

  // Pre-writing state
  const [preWriteTab, setPreWriteTab] = useState<"brainstorming" | "listing" | "clustering" | "freewriting">("brainstorming");
  const [preWriteNotes, setPreWriteNotes] = useState<Record<string, Array<{ id: string; title: string; content: string; date: string }>>>({
    brainstorming: [
      { id: "pw-1", title: "Initial Ideas on AI & SRL", content: "What if AI tutoring actually hinders SRL by doing too much for students? Need to explore the 'scaffolding paradox' — support vs. dependency.", date: "2026-03-08" },
    ],
    listing: [],
    clustering: [],
    freewriting: [],
  });
  const [showNewPreWrite, setShowNewPreWrite] = useState(false);
  const [newPreWriteTitle, setNewPreWriteTitle] = useState("");
  const [newPreWriteContent, setNewPreWriteContent] = useState("");
  const [preWriteCollapsed, setPreWriteCollapsed] = useState(false);

  // Tool & upload state for pre-writing notes
  const [newPreWriteTool, setNewPreWriteTool] = useState("");
  const [newPreWriteUploads, setNewPreWriteUploads] = useState<Array<{ name: string; type: string }>>([]);

  const preWriteStrategies = {
    brainstorming: {
      icon: "💡",
      label: "Brainstorming",
      description: "Generate ideas freely without judgment. Write down every thought related to your research topic. Quantity over quality at this stage.",
      tips: ["Set a timer (10-15 min)", "No idea is too wild", "Build on previous ideas", "Don't edit or filter yet"],
      tools: [
        { name: "Miro", url: "https://miro.com", desc: "Online whiteboard for visual brainstorming" },
        { name: "MindMeister", url: "https://www.mindmeister.com", desc: "Mind mapping tool" },
        { name: "Padlet", url: "https://padlet.com", desc: "Collaborative idea board" },
        { name: "Google Jamboard", url: "https://jamboard.google.com", desc: "Digital whiteboard" },
      ],
    },
    listing: {
      icon: "📋",
      label: "Listing",
      description: "Create organized lists of key concepts, arguments, evidence, and questions. Group related items together.",
      tips: ["List main arguments", "List supporting evidence for each", "List counter-arguments", "List unanswered questions"],
      tools: [
        { name: "Notion", url: "https://notion.so", desc: "Structured note-taking & databases" },
        { name: "Workflowy", url: "https://workflowy.com", desc: "Infinite nested lists" },
        { name: "Dynalist", url: "https://dynalist.io", desc: "Outliner with rich formatting" },
        { name: "Google Docs", url: "https://docs.google.com", desc: "Collaborative document editing" },
      ],
    },
    clustering: {
      icon: "🕸️",
      label: "Clustering",
      description: "Start with a central concept and branch out to related ideas. Draw connections between clusters to find unexpected relationships.",
      tips: ["Put main topic in center", "Branch to sub-topics", "Connect related branches", "Identify gaps between clusters"],
      tools: [
        { name: "XMind", url: "https://xmind.app", desc: "Professional mind mapping" },
        { name: "Coggle", url: "https://coggle.it", desc: "Collaborative mind maps" },
        { name: "Whimsical", url: "https://whimsical.com", desc: "Flowcharts & mind maps" },
        { name: "Scapple", url: "https://www.literatureandlatte.com/scapple", desc: "Freeform concept mapping" },
      ],
    },
    freewriting: {
      icon: "✍️",
      label: "Free Writing",
      description: "Write continuously for a set period without stopping. Don't worry about grammar, spelling, or structure. Let your thoughts flow.",
      tips: ["Write for 10-20 minutes non-stop", "Don't delete anything", "Follow tangents freely", "Highlight key insights after"],
      tools: [],
    },
  };

  const handleAddPreWriteNote = () => {
    if (!newPreWriteTitle.trim() || !newPreWriteContent.trim()) return;
    const toolInfo = newPreWriteTool ? ` [Tool: ${newPreWriteTool}]` : "";
    const uploadInfo = newPreWriteUploads.length > 0
      ? `\n📎 Attachments: ${newPreWriteUploads.map((u) => u.name).join(", ")}`
      : "";
    const newNote = {
      id: `pw-${Date.now()}`,
      title: newPreWriteTitle.trim() + toolInfo,
      content: newPreWriteContent.trim() + uploadInfo,
      date: new Date().toISOString().split("T")[0],
    };
    setPreWriteNotes((prev) => ({
      ...prev,
      [preWriteTab]: [...(prev[preWriteTab] || []), newNote],
    }));
    setNewPreWriteTitle("");
    setNewPreWriteContent("");
    setNewPreWriteTool("");
    setNewPreWriteUploads([]);
    setShowNewPreWrite(false);
  };

  const handleSimulateUpload = () => {
    const fakeFiles = [
      { name: `${preWriteTab}_result_${Date.now()}.png`, type: "image/png" },
    ];
    setNewPreWriteUploads([...newPreWriteUploads, ...fakeFiles]);
  };

  // Writing draft versioning
  interface WritingDraftVersion {
    id: string;
    content: Record<string, string>;
    savedAt: string;
  }
  interface WritingDraft {
    id: string;
    name: string;
    styleId: string;
    versions: WritingDraftVersion[];
    createdAt: string;
  }
  const [writingDrafts, setWritingDrafts] = useState<WritingDraft[]>([]);
  const [showDraftBrowser, setShowDraftBrowser] = useState(false);
  const [showArtifactBrowser, setShowArtifactBrowser] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [draftSaveMsg, setDraftSaveMsg] = useState<string | null>(null);

  const handleSaveAsWritingDraft = () => {
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toLocaleTimeString();
    const currentContent = { ...componentContents };

    // Check if we have a selected draft to save a new version to
    if (selectedDraftId) {
      setWritingDrafts((prev) =>
        prev.map((d) =>
          d.id === selectedDraftId
            ? {
                ...d,
                versions: [
                  ...d.versions,
                  { id: `v-${Date.now()}`, content: currentContent, savedAt: `${dateStr} ${timeStr}` },
                ],
              }
            : d
        )
      );
      setDraftSaveMsg(`New version saved to "${writingDrafts.find((d) => d.id === selectedDraftId)?.name}" at ${timeStr}`);
    } else {
      const newDraft: WritingDraft = {
        id: `wd-${Date.now()}`,
        name: `Draft — ${activeStyle.name} — ${dateStr}`,
        styleId: selectedStyle,
        versions: [{ id: `v-${Date.now()}`, content: currentContent, savedAt: `${dateStr} ${timeStr}` }],
        createdAt: dateStr,
      };
      setWritingDrafts([...writingDrafts, newDraft]);
      setSelectedDraftId(newDraft.id);
      setDraftSaveMsg(`Writing draft "${newDraft.name}" saved at ${timeStr}`);
    }
    setTimeout(() => setDraftSaveMsg(null), 3000);
  };

  const handleLoadDraftVersion = (draftId: string, versionId: string) => {
    const draft = writingDrafts.find((d) => d.id === draftId);
    const version = draft?.versions.find((v) => v.id === versionId);
    if (version) {
      setComponentContents(version.content);
      setSelectedDraftId(draftId);
      setSelectedVersionId(versionId);
      setShowDraftBrowser(false);
    }
  };

  const previewArtifact = allArtifacts.find((a) => a.id === previewArtifactId);

  return (
    <div className="space-y-5">
      {/* Pre-Writing Block */}
      <Card className="border-slate-700/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Pre-Writing Strategies
            </CardTitle>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-7"
              onClick={() => setPreWriteCollapsed(!preWriteCollapsed)}
            >
              {preWriteCollapsed ? "Expand" : "Collapse"}
            </Button>
          </div>
        </CardHeader>
        {!preWriteCollapsed && (
          <CardContent className="space-y-3">
            {/* Strategy Tabs */}
            <div className="flex gap-1.5">
              {(Object.keys(preWriteStrategies) as Array<keyof typeof preWriteStrategies>).map((key) => {
                const strategy = preWriteStrategies[key];
                return (
                  <button
                    key={key}
                    onClick={() => { setPreWriteTab(key); setShowNewPreWrite(false); }}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                      preWriteTab === key
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-[#0d1b30] text-slate-600 border-slate-700/50 hover:border-amber-300"
                    )}
                  >
                    {strategy.icon} {strategy.label}
                  </button>
                );
              })}
            </div>

            {/* Strategy Description & Tips */}
            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
              <p className="text-xs text-slate-700 mb-2">{preWriteStrategies[preWriteTab].description}</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {preWriteStrategies[preWriteTab].tips.map((tip, i) => (
                  <Badge key={i} variant="outline" className="text-[9px] border-amber-200 text-amber-700">
                    💡 {tip}
                  </Badge>
                ))}
              </div>
              {preWriteStrategies[preWriteTab].tools.length > 0 && (
                <div className="mt-2 pt-2 border-t border-amber-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    🛠️ Recommended Tools
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {preWriteStrategies[preWriteTab].tools.map((tool) => (
                      <a
                        key={tool.name}
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-700/50 bg-[#0d1b30] hover:border-amber-300 hover:bg-amber-50 transition-all text-[10px] text-slate-600 hover:text-amber-700"
                        title={tool.desc}
                      >
                        🔗 {tool.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notes for this strategy */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Notes ({(preWriteNotes[preWriteTab] || []).length})
              </span>
              <Button
                size="sm"
                className="text-xs h-7 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => setShowNewPreWrite(!showNewPreWrite)}
              >
                <Plus className="w-3 h-3 mr-1" />
                New Note
              </Button>
            </div>

            {showNewPreWrite && (
              <div className="p-3 rounded-lg border-2 border-dashed border-amber-200 bg-amber-50/30 space-y-2">
                <Input
                  value={newPreWriteTitle}
                  onChange={(e) => setNewPreWriteTitle(e.target.value)}
                  placeholder={`${preWriteStrategies[preWriteTab].label} note title...`}
                  className="text-xs"
                />
                <Textarea
                  value={newPreWriteContent}
                  onChange={(e) => setNewPreWriteContent(e.target.value)}
                  rows={preWriteTab === "freewriting" ? 8 : 4}
                  placeholder={
                    preWriteTab === "brainstorming" ? "Dump all your ideas here..." :
                    preWriteTab === "listing" ? "- Item 1\n- Item 2\n- Item 3..." :
                    preWriteTab === "clustering" ? "Central concept: ...\n  → Branch 1: ...\n  → Branch 2: ..." :
                    "Start writing freely without stopping..."
                  }
                  className="text-xs font-mono"
                />
                {/* Tool Selection */}
                {preWriteStrategies[preWriteTab].tools.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-slate-500">Tool Used (optional):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {preWriteStrategies[preWriteTab].tools.map((tool) => (
                        <button
                          key={tool.name}
                          onClick={() => setNewPreWriteTool(newPreWriteTool === tool.name ? "" : tool.name)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] border transition-all",
                            newPreWriteTool === tool.name
                              ? "bg-amber-500 text-white border-amber-500"
                              : "bg-[#0d1b30] text-slate-600 border-slate-700/50 hover:border-amber-300"
                          )}
                        >
                          {tool.name}
                        </button>
                      ))}
                      <Input
                        value={newPreWriteTool && !preWriteStrategies[preWriteTab].tools.find((t) => t.name === newPreWriteTool) ? newPreWriteTool : ""}
                        onChange={(e) => setNewPreWriteTool(e.target.value)}
                        placeholder="Other tool..."
                        className="text-[10px] h-6 w-28"
                      />
                    </div>
                  </div>
                )}
                {/* Upload Visualization / Document */}
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-slate-500">Upload Result / Document (optional):</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={handleSimulateUpload}>
                      <Upload className="w-3 h-3 mr-1" />
                      Upload File
                    </Button>
                    {newPreWriteUploads.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {newPreWriteUploads.map((f, i) => (
                          <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 gap-1">
                            📎 {f.name}
                            <button onClick={() => setNewPreWriteUploads(newPreWriteUploads.filter((_, idx) => idx !== i))}>
                              <X className="w-2 h-2" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" className="text-xs h-7 bg-amber-500 hover:bg-amber-600 text-white" onClick={handleAddPreWriteNote}>
                    <Save className="w-3 h-3 mr-1" />
                    Save Note
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setShowNewPreWrite(false); setNewPreWriteTitle(""); setNewPreWriteContent(""); setNewPreWriteTool(""); setNewPreWriteUploads([]); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {(preWriteNotes[preWriteTab] || []).length > 0 && (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                  {(preWriteNotes[preWriteTab] || []).map((note) => (
                    <div key={note.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50/20 group">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-medium text-slate-200">{note.title}</h4>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-400">{note.date}</span>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-amber-300 text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            + Add as Artifact
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-600 whitespace-pre-wrap line-clamp-3">{note.content}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        )}
      </Card>

      {/* Reporting Style Selector */}
      <Card className="border-slate-700/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">
              Reporting Style:
            </span>
            <div className="flex gap-2 flex-wrap">
              {REPORTING_STYLES.map((style) => (
                <Button
                  key={style.id}
                  size="sm"
                  variant={selectedStyle === style.id ? "default" : "outline"}
                  className={cn(
                    "text-xs",
                    selectedStyle === style.id && "bg-cyan-600 hover:bg-cyan-700 text-white"
                  )}
                  onClick={() => {
                    setSelectedStyle(style.id);
                    setActiveComponentId(
                      REPORTING_STYLES.find((s) => s.id === style.id)?.components[0]?.id || ""
                    );
                  }}
                >
                  {style.name}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">{activeStyle.description}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-5">
        {/* Left Column: Available Artifacts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Artifacts
            </h3>
            <Link to="/artifacts?tab=all">
              <Button size="sm" variant="outline" className="text-[10px] h-6 px-2">
                <Eye className="w-2.5 h-2.5 mr-0.5" />
                Browse All
              </Button>
            </Link>
          </div>
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-2 pr-1">
              {allArtifacts.map((artifact) => {
                const typeMeta = ARTIFACT_TYPE_META[artifact.type];
                return (
                  <div
                    key={artifact.id}
                    className="p-3 bg-[#0d1b30] border border-slate-700/50 rounded-lg hover:shadow-sm transition-all group record-item"
                  >
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] mb-1", typeMeta.bgColor, typeMeta.color)}
                    >
                      {typeMeta.label}
                    </Badge>
                    <p className="text-xs font-medium text-slate-700 line-clamp-2 record-item-title">
                      {artifact.title}
                    </p>
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2"
                        onClick={() => setPreviewArtifactId(artifact.id)}
                      >
                        <Eye className="w-2.5 h-2.5 mr-0.5" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[10px] h-6 px-2 border-cyan-600/30 text-cyan-300"
                        onClick={() => {
                          setInsertTarget(activeComponentId);
                          handleInsertArtifact(artifact.id);
                        }}
                      >
                        <Plus className="w-2.5 h-2.5 mr-0.5" />
                        Insert
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Middle Column: Writing Block */}
        <div className="space-y-3">
          <Card className="border-slate-700/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Writing Block — {activeStyle.name}
                </CardTitle>
                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {draftSaveMsg && (
                    <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {draftSaveMsg}
                    </span>
                  )}
                  {lastSaved && !draftSaveMsg && (
                    <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Saved {lastSaved}
                    </span>
                  )}
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleManualSave}>
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7 border-orange-300 text-orange-700 hover:bg-orange-50" onClick={handleSaveAsWritingDraft}>
                    <FileText className="w-3 h-3 mr-1" />
                    Save as Draft
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowDraftBrowser(!showDraftBrowser)}>
                    <FolderUp className="w-3 h-3 mr-1" />
                    Load Draft
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Draft Browser */}
              {showDraftBrowser && (
                <div className="p-3 rounded-lg border-2 border-dashed border-orange-200 bg-orange-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-orange-700">📂 Writing Drafts</p>
                    <button onClick={() => setShowDraftBrowser(false)} className="hover:bg-orange-100 rounded p-0.5">
                      <X className="w-3 h-3 text-orange-400" />
                    </button>
                  </div>
                  {writingDrafts.length === 0 ? (
                    <p className="text-[10px] text-slate-400 text-center py-3">
                      No writing drafts saved yet. Use &quot;Save as Draft&quot; to create one.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                      {writingDrafts.map((draft) => (
                        <div key={draft.id} className="p-2 rounded-lg border border-orange-200 bg-[#0d1b30]">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-medium text-slate-200">{draft.name}</h4>
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              {draft.versions.length} version{draft.versions.length > 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <p className="text-[9px] text-slate-400 mb-1.5">Created: {draft.createdAt}</p>
                          <div className="space-y-1">
                            {draft.versions.map((version) => (
                              <button
                                key={version.id}
                                onClick={() => handleLoadDraftVersion(draft.id, version.id)}
                                className={cn(
                                  "w-full text-left p-1.5 rounded text-[10px] transition-all border",
                                  selectedDraftId === draft.id && selectedVersionId === version.id
                                    ? "bg-orange-100 border-orange-300 text-orange-800"
                                    : "bg-slate-800/40 border-slate-700/50 hover:border-orange-200 text-slate-600"
                                )}
                              >
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {version.savedAt}
                                  {selectedDraftId === draft.id && selectedVersionId === version.id && (
                                    <Badge className="text-[8px] px-1 py-0 bg-orange-500 text-white ml-auto">Active</Badge>
                                  )}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Component Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1">
                {activeStyle.components.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => setActiveComponentId(comp.id)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-all border shrink-0",
                      activeComponentId === comp.id
                        ? "bg-cyan-600 text-white border-cyan-600"
                        : componentContents[getContentKey(comp.id)]
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-[#0d1b30] text-slate-500 border-slate-700/50 hover:border-slate-300"
                    )}
                  >
                    {comp.label}
                    {componentContents[getContentKey(comp.id)] && activeComponentId !== comp.id && (
                      <CheckCircle2 className="w-2.5 h-2.5 ml-1 inline" />
                    )}
                  </button>
                ))}
              </div>

              {/* Active Component Editor */}
              {activeStyle.components
                .filter((c) => c.id === activeComponentId)
                .map((comp) => (
                  <div key={comp.id} className="space-y-2">
                    <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-lg">
                      <p className="text-xs font-medium text-cyan-300 mb-0.5">{comp.label}</p>
                      <p className="text-[10px] text-slate-500">{comp.description}</p>
                    </div>
                    <Textarea
                      value={componentContents[getContentKey(comp.id)] || ""}
                      onChange={(e) => handleContentChange(comp.id, e.target.value)}
                      rows={14}
                      placeholder={comp.placeholder}
                      className="text-sm font-mono leading-relaxed"
                    />
                    {insertTarget === comp.id && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700">
                        Select an artifact from the left panel to insert here.
                      </div>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Structure Check */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Structure Check
          </h3>

          {/* Check Level Tabs */}
          <div className="flex gap-1">
            {(["macro", "meso", "micro"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCheckTab(tab)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium transition-all capitalize",
                  checkTab === tab
                    ? "bg-cyan-600 text-white"
                    : "text-slate-500 hover:bg-slate-800"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Macro Level */}
          {checkTab === "macro" && (
            <Card className="border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600">
                  Macro Level — Overall Structure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[350px]">
                  <div className="space-y-1.5">
                    {MACRO_CHECKLIST.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-800/40 cursor-pointer"
                      >
                        <Checkbox
                          checked={!!macroChecked[item.id]}
                          onCheckedChange={(checked) =>
                            setMacroChecked((prev) => ({ ...prev, [item.id]: !!checked }))
                          }
                          className="mt-0.5"
                        />
                        <span className={cn("text-xs", macroChecked[item.id] ? "text-emerald-700 line-through" : "text-slate-600")}>
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <Separator className="my-2" />
                <Button
                  size="sm"
                  className="w-full text-xs h-7 bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={handleAiCheck}
                  disabled={aiChecking}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {aiChecking ? "Checking..." : "AI Check (Premium)"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Meso Level — Toulmin Argumentation */}
          {checkTab === "meso" && (
            <Card className="border-slate-700/50">
              <CardHeader className="pb-2">
                <div>
                  <CardTitle className="text-xs font-semibold text-slate-600">
                    Meso Level — Toulmin Argumentation
                  </CardTitle>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Claim → Data → Warrant → Backing → Qualifier → Rebuttal
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-1.5">
                    {MESO_TOULMIN_CHECKLIST.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-800/40 cursor-pointer"
                      >
                        <Checkbox
                          checked={!!mesoChecked[item.id]}
                          onCheckedChange={(checked) =>
                            setMesoChecked((prev) => ({ ...prev, [item.id]: !!checked }))
                          }
                          className="mt-0.5"
                        />
                        <div>
                          <span className={cn("text-xs", mesoChecked[item.id] ? "text-emerald-700 line-through" : "text-slate-600")}>
                            {item.label}
                          </span>
                          <Badge variant="outline" className="text-[8px] ml-1.5 px-1 py-0">
                            {item.category}
                          </Badge>
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
                <Separator className="my-2" />
                <Button
                  size="sm"
                  className="w-full text-xs h-7 bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={handleAiCheck}
                  disabled={aiChecking}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {aiChecking ? "Checking..." : "AI Toulmin Check (Premium)"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Micro Level */}
          {checkTab === "micro" && (
            <Card className="border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-600">
                  Micro Level — Language & Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[380px]">
                  <div className="space-y-3">
                    {/* Basic Errors */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        🔍 Eliminate Basic Errors
                      </p>
                      <div className="space-y-1">
                        {MICRO_CHECKLIST_BASIC.map((item) => (
                          <label key={item.id} className="flex items-start gap-2 p-1 rounded hover:bg-slate-800/40 cursor-pointer">
                            <Checkbox
                              checked={!!microBasicChecked[item.id]}
                              onCheckedChange={(checked) =>
                                setMicroBasicChecked((prev) => ({ ...prev, [item.id]: !!checked }))
                              }
                              className="mt-0.5"
                            />
                            <span className={cn("text-[11px]", microBasicChecked[item.id] ? "text-emerald-700 line-through" : "text-slate-600")}>
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Readability */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        📖 Improve Readability
                      </p>
                      <div className="space-y-1">
                        {MICRO_CHECKLIST_READABILITY.map((item) => (
                          <label key={item.id} className="flex items-start gap-2 p-1 rounded hover:bg-slate-800/40 cursor-pointer">
                            <Checkbox
                              checked={!!microReadChecked[item.id]}
                              onCheckedChange={(checked) =>
                                setMicroReadChecked((prev) => ({ ...prev, [item.id]: !!checked }))
                              }
                              className="mt-0.5"
                            />
                            <span className={cn("text-[11px]", microReadChecked[item.id] ? "text-emerald-700 line-through" : "text-slate-600")}>
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Credibility */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                        🏛️ Establish Credibility
                      </p>
                      <div className="space-y-1">
                        {MICRO_CHECKLIST_CREDIBILITY.map((item) => (
                          <label key={item.id} className="flex items-start gap-2 p-1 rounded hover:bg-slate-800/40 cursor-pointer">
                            <Checkbox
                              checked={!!microCredChecked[item.id]}
                              onCheckedChange={(checked) =>
                                setMicroCredChecked((prev) => ({ ...prev, [item.id]: !!checked }))
                              }
                              className="mt-0.5"
                            />
                            <span className={cn("text-[11px]", microCredChecked[item.id] ? "text-emerald-700 line-through" : "text-slate-600")}>
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <Separator className="my-2" />
                <div className="space-y-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7"
                    onClick={() => window.open("https://www.grammarly.com", "_blank")}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Open Grammarly (Grammar AI Check)
                  </Button>
                  <Button
                    size="sm"
                    className="w-full text-xs h-7 bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={handleAiCheck}
                    disabled={aiChecking}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {aiChecking ? "Checking..." : "AI Grammar Check (Premium)"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Check Result */}
          {aiCheckResult && (
            <Card className="border-cyan-200 bg-cyan-50/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-cyan-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Analysis Result
                  </CardTitle>
                  <button onClick={() => setAiCheckResult(null)} className="hover:bg-cyan-100 rounded p-0.5">
                    <X className="w-3 h-3 text-cyan-400" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-[10px] text-cyan-800 whitespace-pre-wrap leading-relaxed">
                  {aiCheckResult}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Artifact Preview Modal */}
      {previewArtifact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#0d1b30] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[10px] mb-1",
                    ARTIFACT_TYPE_META[previewArtifact.type].bgColor,
                    ARTIFACT_TYPE_META[previewArtifact.type].color
                  )}
                >
                  {ARTIFACT_TYPE_META[previewArtifact.type].label}
                </Badge>
                <h3 className="text-sm font-semibold text-slate-200">{previewArtifact.title}</h3>
              </div>
              <button onClick={() => setPreviewArtifactId(null)} className="p-1 hover:bg-slate-800 rounded">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500 mb-2">{previewArtifact.description}</p>
              {previewArtifact.content && (
                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap">{previewArtifact.content}</pre>
                </div>
              )}
              <div className="flex gap-1.5 mt-3">
                <Button
                  size="sm"
                  className="text-xs h-7 bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => {
                    handleInsertArtifact(previewArtifact.id);
                    setPreviewArtifactId(null);
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Insert into {activeStyle.components.find((c) => c.id === activeComponentId)?.label || "Current Section"}
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setPreviewArtifactId(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-[#0d1b30] rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-[#0d1b30] z-10">
              <h3 className="text-sm font-semibold text-slate-200">
                Full Preview — {activeStyle.name}
              </h3>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-slate-800 rounded">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="prose prose-sm max-w-none">
                {activeStyle.components.map((comp) => {
                  const content = componentContents[getContentKey(comp.id)];
                  if (!content) return null;
                  return (
                    <div key={comp.id} className="mb-6">
                      <h2 className="text-base font-bold text-slate-200 mb-2 border-b pb-1">
                        {comp.label}
                      </h2>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {content}
                      </div>
                    </div>
                  );
                })}
                {!getFullText() && (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No content written yet. Start writing in the component tabs above.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Export Markdown
        </Button>
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Export Word
        </Button>
        <Link to="/workflow/3">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reading (Iterate)
          </Button>
        </Link>
      </div>
    </div>
  );
}