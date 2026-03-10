import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Eye,
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
  Table2,
  Tag,
  Target,
  Upload,
  X,
  Zap,
} from "lucide-react";
import {
  STEP_META,
  ARTIFACT_TYPE_META,
  DUMMY_PAPERS,
  DUMMY_KEYWORDS,
  DUMMY_SEARCH_RECORDS,
  DUMMY_ARTIFACTS,
  PURPOSE_OPTIONS,
  EXPAND_PATHS,
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
  type Paper,
  type Keyword,
  type SearchRecord,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export default function WorkflowWorkspace() {
  const { step } = useParams<{ step: string }>();
  const currentStep = (parseInt(step || "1") as WorkflowStep) || 1;
  const stepMeta = STEP_META[currentStep];
  const prevStep = currentStep > 1 ? currentStep - 1 : null;
  const nextStep = currentStep < 6 ? currentStep + 1 : null;

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Step Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center text-xl">
              {stepMeta.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">
                  Step {currentStep}: {stepMeta.label}
                </h1>
                <Badge variant="outline" className="text-xs">
                  {currentStep} / 6
                </Badge>
              </div>
              <p className="text-sm text-slate-500">
                {stepMeta.description}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {prevStep && (
              <Link to={`/workflow/${prevStep}`}>
                <Button variant="outline" size="sm" className="text-xs">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Step {prevStep}
                </Button>
              </Link>
            )}
            {nextStep && (
              <Link to={`/workflow/${nextStep}`}>
                <Button
                  size="sm"
                  className="text-xs bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                >
                  Step {nextStep}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Step Navigation Breadcrumb */}
        <div className="flex items-center gap-1 text-xs overflow-x-auto pb-1">
          {([1, 2, 3, 4, 5, 6] as WorkflowStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1 shrink-0">
              {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
              <Link to={`/workflow/${s}`}>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full transition-colors",
                    s === currentStep
                      ? "bg-[#1E3A5F] text-white font-medium"
                      : s < currentStep
                        ? "text-emerald-600 hover:bg-emerald-50"
                        : "text-slate-400 hover:bg-slate-100"
                  )}
                >
                  {STEP_META[s].shortLabel}
                </span>
              </Link>
            </div>
          ))}
        </div>

        {/* Step Content */}
        {currentStep === 1 && <PurposeWorkspace />}
        {currentStep === 2 && <EntryPaperWorkspace />}
        {currentStep === 3 && <ReadWorkspace />}
        {currentStep === 4 && <ExpandWorkspace />}
        {currentStep === 5 && <VisualizeWorkspace />}
        {currentStep === 6 && <DraftWorkspaceInline />}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
            <X className="w-4 h-4 text-slate-500" />
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
function PurposeWorkspace() {
  const [selected, setSelected] = useState<string[]>(["Find research questions"]);
  const [customPurposes, setCustomPurposes] = useState<string[]>([]);
  const [newCustomPurpose, setNewCustomPurpose] = useState("");
  const [notes, setNotes] = useState(
    "I want to understand how AI tutoring systems affect self-regulated learning in higher education. Specifically interested in the tension between AI scaffolding and learner autonomy."
  );
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

  return (
    <div className="space-y-5">
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            What is your reading purpose?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {allPurposes.map((option) => (
              <label
                key={option}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                  selected.includes(option)
                    ? "border-[#1E3A5F] bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelected([...selected, option]);
                    else setSelected(selected.filter((s) => s !== option));
                  }}
                />
                <span>{option}</span>
                {customPurposes.includes(option) && (
                  <Badge variant="outline" className="text-[9px] ml-auto text-blue-500 border-blue-300">
                    Custom
                  </Badge>
                )}
              </label>
            ))}
          </div>

          {/* Add Custom Purpose */}
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500">
              Define your own purpose (Premium)
            </p>
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
                className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white shrink-0"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Purpose
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Additional Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Describe your specific research interest..."
            className="text-sm"
          />
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
            <div className="p-4 bg-white rounded-lg border border-emerald-200">
              <h4 className="font-medium text-sm text-slate-800 mb-2">
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
          onClick={() => setCardGenerated(true)}
          className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Purpose Card
        </Button>
        <Link to="/workflow/2">
          <Button variant="outline">
            Save and Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Step 2: Entry Paper Workspace
// ============================================================
function EntryPaperWorkspace() {
  const [newKeyword, setNewKeyword] = useState("");
  const [keywords, setKeywords] = useState<Keyword[]>([...DUMMY_KEYWORDS]);
  const [searchRecords, setSearchRecords] = useState<SearchRecord[]>([...DUMMY_SEARCH_RECORDS]);
  const [entryPapers, setEntryPapers] = useState<string[]>(["paper-1"]);

  // Candidate papers state
  const [candidatePapers, setCandidatePapers] = useState<
    Array<Paper & { discoveryPath?: string; discoveryNote?: string }>
  >(DUMMY_PAPERS.map((p) => ({ ...p })));
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);

  // Add Search Record Dialog
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [srKeywords, setSrKeywords] = useState<string[]>([]);
  const [srNewKeyword, setSrNewKeyword] = useState("");
  const [srDatabase, setSrDatabase] = useState("Web of Science");
  const [srCustomDb, setSrCustomDb] = useState("");
  const [srBooleanString, setSrBooleanString] = useState("");
  const [srTotalResults, setSrTotalResults] = useState("");
  const [srRelevantResults, setSrRelevantResults] = useState("");

  // Mark Relevant Dialog
  const [showRelevanceDialog, setShowRelevanceDialog] = useState(false);
  const [relevancePaperId, setRelevancePaperId] = useState<string | null>(null);

  // Add Candidate Paper Dialog
  const [showAddPaperDialog, setShowAddPaperDialog] = useState(false);
  const [newPaperTitle, setNewPaperTitle] = useState("");
  const [newPaperAuthors, setNewPaperAuthors] = useState("");
  const [newPaperYear, setNewPaperYear] = useState("");
  const [newPaperJournal, setNewPaperJournal] = useState("");
  const [newPaperDiscoveryPath, setNewPaperDiscoveryPath] = useState("Academic Database");
  const [newPaperDiscoveryNote, setNewPaperDiscoveryNote] = useState("");

  // Discovery Path Dialog
  const [showDiscoveryDialog, setShowDiscoveryDialog] = useState(false);
  const [discoveryPaperId, setDiscoveryPaperId] = useState<string | null>(null);
  const [discoveryPathValue, setDiscoveryPathValue] = useState("Academic Database");
  const [discoveryNoteValue, setDiscoveryNoteValue] = useState("");

  const handleAddSearchRecord = () => {
    // Add any new keywords to the global keywords list
    srKeywords.forEach((kw) => {
      if (!keywords.find((k) => k.term === kw)) {
        setKeywords((prev) => [
          ...prev,
          { id: `kw-${Date.now()}-${Math.random()}`, term: kw, category: "Custom" },
        ]);
      }
    });

    const db = srDatabase === "Other" ? srCustomDb || "Other" : srDatabase;
    const newRecord: SearchRecord = {
      id: `sr-${Date.now()}`,
      database: db,
      query: srBooleanString || srKeywords.join(" AND "),
      results: parseInt(srTotalResults) || 0,
      relevant: parseInt(srRelevantResults) || 0,
      date: new Date().toISOString().split("T")[0],
    };
    setSearchRecords([...searchRecords, newRecord]);
    setShowSearchDialog(false);
    setSrKeywords([]);
    setSrNewKeyword("");
    setSrDatabase("Web of Science");
    setSrCustomDb("");
    setSrBooleanString("");
    setSrTotalResults("");
    setSrRelevantResults("");
  };

  const handleMarkRelevance = (level: "high" | "medium" | "low") => {
    if (relevancePaperId) {
      setCandidatePapers(
        candidatePapers.map((p) =>
          p.id === relevancePaperId ? { ...p, relevance: level } : p
        )
      );
    }
    setShowRelevanceDialog(false);
    setRelevancePaperId(null);
  };

  const handleAddCandidatePaper = () => {
    if (!newPaperTitle.trim()) return;
    const newPaper: Paper & { discoveryPath?: string; discoveryNote?: string } = {
      id: `paper-${Date.now()}`,
      title: newPaperTitle.trim(),
      authors: newPaperAuthors
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      year: parseInt(newPaperYear) || new Date().getFullYear(),
      journal: newPaperJournal.trim() || "Unknown",
      abstract: "",
      researchQuestion: "",
      theory: "",
      method: "",
      findings: "",
      relevance: "medium",
      isEntryPaper: false,
      annotations: [],
      discoveryPath: newPaperDiscoveryPath,
      discoveryNote: newPaperDiscoveryNote,
    };
    setCandidatePapers([...candidatePapers, newPaper]);
    setShowAddPaperDialog(false);
    setNewPaperTitle("");
    setNewPaperAuthors("");
    setNewPaperYear("");
    setNewPaperJournal("");
    setNewPaperDiscoveryPath("Academic Database");
    setNewPaperDiscoveryNote("");
  };

  const handleSaveDiscoveryPath = () => {
    if (discoveryPaperId) {
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

  const handleBatchAddArtifacts = () => {
    // In a real app this would add to artifacts store
    alert(`Added ${selectedPaperIds.length} paper(s) as artifacts.`);
    setSelectedPaperIds([]);
  };

  return (
    <div className="space-y-5">
      <Tabs defaultValue="keywords" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="search">Search Log</TabsTrigger>
          <TabsTrigger value="candidates">Candidate Papers</TabsTrigger>
        </TabsList>

        <TabsContent value="keywords" className="mt-4 space-y-4">
          <Card className="border-slate-200">
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
                      if (newKeyword.trim()) {
                        setKeywords([
                          ...keywords,
                          {
                            id: `kw-${Date.now()}`,
                            term: newKeyword.trim(),
                            category: "Custom",
                          },
                        ]);
                        setNewKeyword("");
                      }
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (newKeyword.trim()) {
                      setKeywords([
                        ...keywords,
                        {
                          id: `kw-${Date.now()}`,
                          term: newKeyword.trim(),
                          category: "Custom",
                        },
                      ]);
                      setNewKeyword("");
                    }
                  }}
                  className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white shrink-0"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Keyword
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <Badge
                    key={kw.id}
                    variant="secondary"
                    className="text-xs px-3 py-1 bg-slate-100 gap-1"
                  >
                    {kw.term}
                    <span className="ml-1.5 text-[10px] text-slate-400">
                      {kw.category}
                    </span>
                    <button
                      onClick={() => setKeywords(keywords.filter((k) => k.id !== kw.id))}
                      className="ml-1 hover:text-red-500"
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
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Search Records
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setShowSearchDialog(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Search Record
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {searchRecords.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200"
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
                      {record.query}
                    </p>
                    <div className="flex gap-4 text-[11px] text-slate-500">
                      <span>{record.results} results</span>
                      <span>{record.relevant} relevant</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="mt-4 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Candidate Papers ({candidatePapers.length})
                </CardTitle>
                <div className="flex gap-1.5">
                  {selectedPaperIds.length > 0 && (
                    <Button
                      size="sm"
                      className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={handleBatchAddArtifacts}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add {selectedPaperIds.length} as Artifacts
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => setShowAddPaperDialog(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Paper
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {candidatePapers.map((paper) => (
                  <div
                    key={paper.id}
                    className={cn(
                      "p-4 rounded-lg border transition-all",
                      entryPapers.includes(paper.id)
                        ? "border-[#1E3A5F] bg-blue-50/30"
                        : selectedPaperIds.includes(paper.id)
                          ? "border-emerald-400 bg-emerald-50/20"
                          : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
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
                              <Badge className="text-[10px] bg-[#1E3A5F] text-white">
                                Entry Paper
                              </Badge>
                            )}
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
                            {paper.discoveryPath && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-purple-300 text-purple-600"
                              >
                                via {paper.discoveryPath}
                              </Badge>
                            )}
                          </div>
                          {/* Title links to read page */}
                          <Link to={`/workflow/3`}>
                            <h4 className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline mb-1 cursor-pointer">
                              {paper.title}
                            </h4>
                          </Link>
                          <p className="text-xs text-slate-500 mb-2">
                            {paper.authors.join(", ")} ({paper.year}) —{" "}
                            {paper.journal}
                          </p>
                          {paper.abstract && (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {paper.abstract}
                            </p>
                          )}
                          {paper.discoveryNote && (
                            <p className="text-[10px] text-purple-500 mt-1 italic">
                              📝 {paper.discoveryNote}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
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
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => {
                            setDiscoveryPaperId(paper.id);
                            setDiscoveryPathValue(paper.discoveryPath || "Academic Database");
                            setDiscoveryNoteValue(paper.discoveryNote || "");
                            setShowDiscoveryDialog(true);
                          }}
                        >
                          <Network className="w-3 h-3 mr-1" />
                          Discovery Path
                        </Button>
                        <Button
                          size="sm"
                          className={cn(
                            "text-xs h-7",
                            entryPapers.includes(paper.id)
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                          )}
                          onClick={() => {
                            if (entryPapers.includes(paper.id)) {
                              setEntryPapers(
                                entryPapers.filter(
                                  (id) => id !== paper.id
                                )
                              );
                            } else {
                              setEntryPapers([
                                ...entryPapers,
                                paper.id,
                              ]);
                            }
                          }}
                        >
                          {entryPapers.includes(paper.id) ? (
                            <>
                              <Check className="w-3 h-3 mr-1" />
                              Entry Paper
                            </>
                          ) : (
                            <>
                              <Target className="w-3 h-3 mr-1" />
                              Set as Entry
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

      {/* Add Search Record Dialog */}
      <ModalOverlay
        open={showSearchDialog}
        onClose={() => setShowSearchDialog(false)}
        title="Add Search Record"
      >
        <div className="space-y-4">
          {/* Keywords selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-600">Keywords</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {keywords.map((kw) => (
                <Badge
                  key={kw.id}
                  variant={srKeywords.includes(kw.term) ? "default" : "outline"}
                  className={cn(
                    "text-[10px] cursor-pointer transition-all",
                    srKeywords.includes(kw.term)
                      ? "bg-[#1E3A5F] text-white"
                      : "hover:bg-slate-100"
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
            </div>
            <div className="flex gap-1.5">
              <Input
                value={srNewKeyword}
                onChange={(e) => setSrNewKeyword(e.target.value)}
                placeholder="Add new keyword..."
                className="text-xs h-7"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = srNewKeyword.trim();
                    if (trimmed && !srKeywords.includes(trimmed)) {
                      setSrKeywords([...srKeywords, trimmed]);
                      // Also add to global keywords if not present
                      if (!keywords.find((k) => k.term === trimmed)) {
                        setKeywords([
                          ...keywords,
                          { id: `kw-${Date.now()}`, term: trimmed, category: "Custom" },
                        ]);
                      }
                      setSrNewKeyword("");
                    }
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 shrink-0"
                onClick={() => {
                  const trimmed = srNewKeyword.trim();
                  if (trimmed && !srKeywords.includes(trimmed)) {
                    setSrKeywords([...srKeywords, trimmed]);
                    if (!keywords.find((k) => k.term === trimmed)) {
                      setKeywords([
                        ...keywords,
                        { id: `kw-${Date.now()}`, term: trimmed, category: "Custom" },
                      ]);
                    }
                    setSrNewKeyword("");
                  }
                }}
              >
                <Plus className="w-3 h-3" />
              </Button>
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
                      ? "border-[#1E3A5F] bg-blue-50/50"
                      : "border-slate-200 hover:border-slate-300"
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
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-xs"
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
                level === "low" && "border-slate-300 hover:bg-slate-50"
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

      {/* Add Candidate Paper Dialog */}
      <ModalOverlay
        open={showAddPaperDialog}
        onClose={() => setShowAddPaperDialog(false)}
        title="Add Candidate Paper"
      >
        <div className="space-y-3">
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
                      ? "border-purple-400 bg-purple-50/50"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <input
                    type="radio"
                    name="new-paper-discovery"
                    checked={newPaperDiscoveryPath === path}
                    onChange={() => setNewPaperDiscoveryPath(path)}
                    className="accent-purple-600"
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
              className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-xs"
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
                    ? "border-purple-400 bg-purple-50/50"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <input
                  type="radio"
                  name="discovery-path"
                  checked={discoveryPathValue === path}
                  onChange={() => setDiscoveryPathValue(path)}
                  className="accent-purple-600"
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
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
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

      <div className="flex gap-2">
        <Button variant="outline">
          <Save className="w-4 h-4 mr-2" />
          Save Artifacts
        </Button>
        <Link to="/workflow/3">
          <Button className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white">
            Move to Reading
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
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
            className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 cursor-pointer gap-1"
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
      <Card className="border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Badge className="text-[10px] bg-[#1E3A5F] text-white mb-2">
                Entry Paper
              </Badge>
              <h3 className="text-base font-semibold text-slate-800 mb-1">
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
        <Card className="border-slate-200">
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
                <div className="p-1.5 bg-slate-50 rounded text-[10px] text-slate-500">
                  📎 Auto-citation: {citation}
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
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
                    className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all group"
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
                            className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-500"
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
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <button
                  onClick={() => setNoteTab("literature")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all",
                    noteTab === "literature"
                      ? "bg-[#1E3A5F] text-white"
                      : "text-slate-500 hover:bg-slate-100"
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
                      : "text-slate-500 hover:bg-slate-100"
                  )}
                >
                  Permanent Notes ({permNotes.length})
                </button>
              </div>
              {noteTab === "literature" ? (
                <Button
                  size="sm"
                  className="text-xs h-7 bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
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
                          ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
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
                    <div className="p-1.5 bg-slate-50 rounded text-[10px] text-slate-500">
                      📎 Auto-citation: {citation}
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="text-xs bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
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
                      <h4 className="text-sm font-medium text-slate-800">
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
                          className="text-[10px] px-2 py-0.5 bg-slate-100"
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
                            <h4 className="text-sm font-medium text-slate-800">
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
      <Card className="border-slate-200">
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
                      : "border-slate-200 hover:border-slate-300"
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
interface ExpandPaper {
  id: string;
  title: string;
  authors: string;
  year: number;
  source: "auto" | "manual";
}

function ExpandWorkspace() {
  const [activeTrail, setActiveTrail] = useState("references");

  // References
  const [refPapers, setRefPapers] = useState<ExpandPaper[]>([
    { id: "ref-1", title: "Self-Regulated Learning Theory (Zimmerman, 2002)", authors: "Zimmerman, B.J.", year: 2002, source: "auto" },
    { id: "ref-2", title: "Technology Acceptance Model (Davis, 1989)", authors: "Davis, F.D.", year: 1989, source: "auto" },
    { id: "ref-3", title: "Metacognition and Learning Technologies: An Overview", authors: "Azevedo, R., Aleven, V.", year: 2013, source: "auto" },
    { id: "ref-4", title: "Adaptive Learning Systems: A Systematic Review", authors: "Martin, F., Chen, Y.", year: 2020, source: "auto" },
  ]);
  const [showAddRef, setShowAddRef] = useState(false);
  const [newRefTitle, setNewRefTitle] = useState("");
  const [newRefAuthors, setNewRefAuthors] = useState("");
  const [newRefYear, setNewRefYear] = useState("");

  // Cited By
  const [citedByPapers, setCitedByPapers] = useState<ExpandPaper[]>([
    { id: "cb-1", title: "AI Scaffolding and Learner Autonomy in Graduate Education", authors: "Park, J., Lee, S.", year: 2025, source: "auto" },
    { id: "cb-2", title: "Measuring SRL in AI-Enhanced Classrooms", authors: "Wang, M., Chen, L.", year: 2025, source: "auto" },
  ]);
  const [showAddCitedBy, setShowAddCitedBy] = useState(false);
  const [newCbTitle, setNewCbTitle] = useState("");
  const [newCbAuthors, setNewCbAuthors] = useState("");
  const [newCbYear, setNewCbYear] = useState("");

  // Similar Topic
  const [similarTopicPapers, setSimilarTopicPapers] = useState<ExpandPaper[]>(
    DUMMY_PAPERS.slice(1, 3).map((p) => ({
      id: p.id,
      title: p.title,
      authors: p.authors.join(", "),
      year: p.year,
      source: "auto" as const,
    }))
  );
  const [showAddSimilarTopic, setShowAddSimilarTopic] = useState(false);
  const [newStTitle, setNewStTitle] = useState("");
  const [newStAuthors, setNewStAuthors] = useState("");
  const [newStYear, setNewStYear] = useState("");

  // Similar Method
  const [similarMethodPapers, setSimilarMethodPapers] = useState<ExpandPaper[]>([
    { id: "sm-1", title: "A Meta-Analysis of Intelligent Tutoring System Effectiveness", authors: "Kulik, J.A., Fletcher, J.D.", year: 2016, source: "auto" },
  ]);
  const [showAddSimilarMethod, setShowAddSimilarMethod] = useState(false);
  const [newSmTitle, setNewSmTitle] = useState("");
  const [newSmAuthors, setNewSmAuthors] = useState("");
  const [newSmYear, setNewSmYear] = useState("");

  const handleAddPaper = (
    type: "ref" | "citedBy" | "similarTopic" | "similarMethod"
  ) => {
    let title = "", authors = "", year = "";
    if (type === "ref") { title = newRefTitle; authors = newRefAuthors; year = newRefYear; }
    else if (type === "citedBy") { title = newCbTitle; authors = newCbAuthors; year = newCbYear; }
    else if (type === "similarTopic") { title = newStTitle; authors = newStAuthors; year = newStYear; }
    else { title = newSmTitle; authors = newSmAuthors; year = newSmYear; }

    if (!title.trim()) return;

    const newPaper: ExpandPaper = {
      id: `${type}-${Date.now()}`,
      title: title.trim(),
      authors: authors.trim(),
      year: parseInt(year) || new Date().getFullYear(),
      source: "manual",
    };

    if (type === "ref") {
      setRefPapers([...refPapers, newPaper]);
      setShowAddRef(false);
      setNewRefTitle(""); setNewRefAuthors(""); setNewRefYear("");
    } else if (type === "citedBy") {
      setCitedByPapers([...citedByPapers, newPaper]);
      setShowAddCitedBy(false);
      setNewCbTitle(""); setNewCbAuthors(""); setNewCbYear("");
    } else if (type === "similarTopic") {
      setSimilarTopicPapers([...similarTopicPapers, newPaper]);
      setShowAddSimilarTopic(false);
      setNewStTitle(""); setNewStAuthors(""); setNewStYear("");
    } else {
      setSimilarMethodPapers([...similarMethodPapers, newPaper]);
      setShowAddSimilarMethod(false);
      setNewSmTitle(""); setNewSmAuthors(""); setNewSmYear("");
    }
  };

  const getPapersForTrail = () => {
    if (activeTrail === "references") return refPapers;
    if (activeTrail === "cited-by") return citedByPapers;
    if (activeTrail === "same-author") {
      return DUMMY_PAPERS.slice(0, 2).map((p) => ({
        id: p.id,
        title: p.title,
        authors: p.authors.join(", "),
        year: p.year,
        source: "auto" as const,
      }));
    }
    if (activeTrail === "similar-topic") return similarTopicPapers;
    if (activeTrail === "similar-method") return similarMethodPapers;
    return [];
  };

  const getShowAdd = () => {
    if (activeTrail === "references") return showAddRef;
    if (activeTrail === "cited-by") return showAddCitedBy;
    if (activeTrail === "similar-topic") return showAddSimilarTopic;
    if (activeTrail === "similar-method") return showAddSimilarMethod;
    return false;
  };

  const setShowAdd = (val: boolean) => {
    if (activeTrail === "references") setShowAddRef(val);
    else if (activeTrail === "cited-by") setShowAddCitedBy(val);
    else if (activeTrail === "similar-topic") setShowAddSimilarTopic(val);
    else if (activeTrail === "similar-method") setShowAddSimilarMethod(val);
  };

  const getNewTitle = () => {
    if (activeTrail === "references") return newRefTitle;
    if (activeTrail === "cited-by") return newCbTitle;
    if (activeTrail === "similar-topic") return newStTitle;
    if (activeTrail === "similar-method") return newSmTitle;
    return "";
  };
  const setNewTitle = (val: string) => {
    if (activeTrail === "references") setNewRefTitle(val);
    else if (activeTrail === "cited-by") setNewCbTitle(val);
    else if (activeTrail === "similar-topic") setNewStTitle(val);
    else if (activeTrail === "similar-method") setNewSmTitle(val);
  };
  const getNewAuthors = () => {
    if (activeTrail === "references") return newRefAuthors;
    if (activeTrail === "cited-by") return newCbAuthors;
    if (activeTrail === "similar-topic") return newStAuthors;
    if (activeTrail === "similar-method") return newSmAuthors;
    return "";
  };
  const setNewAuthors = (val: string) => {
    if (activeTrail === "references") setNewRefAuthors(val);
    else if (activeTrail === "cited-by") setNewCbAuthors(val);
    else if (activeTrail === "similar-topic") setNewStAuthors(val);
    else if (activeTrail === "similar-method") setNewSmAuthors(val);
  };
  const getNewYear = () => {
    if (activeTrail === "references") return newRefYear;
    if (activeTrail === "cited-by") return newCbYear;
    if (activeTrail === "similar-topic") return newStYear;
    if (activeTrail === "similar-method") return newSmYear;
    return "";
  };
  const setNewYear = (val: string) => {
    if (activeTrail === "references") setNewRefYear(val);
    else if (activeTrail === "cited-by") setNewCbYear(val);
    else if (activeTrail === "similar-topic") setNewStYear(val);
    else if (activeTrail === "similar-method") setNewSmYear(val);
  };
  const getAddType = (): "ref" | "citedBy" | "similarTopic" | "similarMethod" => {
    if (activeTrail === "references") return "ref";
    if (activeTrail === "cited-by") return "citedBy";
    if (activeTrail === "similar-topic") return "similarTopic";
    return "similarMethod";
  };

  const papers = getPapersForTrail();
  const canManualAdd = ["references", "cited-by", "similar-topic", "similar-method"].includes(activeTrail);

  return (
    <div className="space-y-5">
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Expansion Paths from Entry Paper
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="w-3 h-3 mr-1" />
              Add Manually
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {EXPAND_PATHS.map((path) => (
              <button
                key={path.id}
                onClick={() => setActiveTrail(path.id)}
                className={cn(
                  "p-3 rounded-lg border text-center transition-all",
                  activeTrail === path.id
                    ? "border-[#1E3A5F] bg-blue-50/50"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <span className="text-xl block mb-1">{path.icon}</span>
                <span className="text-xs font-medium text-slate-700">
                  {path.label}
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {path.description}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expanded Papers */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              {EXPAND_PATHS.find((p) => p.id === activeTrail)?.label} ({papers.length})
            </CardTitle>
            <div className="flex gap-1.5">
              {(activeTrail === "references" || activeTrail === "cited-by") && (
                <Button size="sm" variant="outline" className="text-xs h-7">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-Identify
                </Button>
              )}
              {canManualAdd && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setShowAdd(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Manually
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Manual Add Form */}
          {getShowAdd() && canManualAdd && (
            <div className="p-3 mb-3 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 space-y-2">
              <Input
                value={getNewTitle()}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Paper title..."
                className="text-xs"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={getNewAuthors()}
                  onChange={(e) => setNewAuthors(e.target.value)}
                  placeholder="Authors..."
                  className="text-xs"
                />
                <Input
                  value={getNewYear()}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="Year"
                  type="number"
                  className="text-xs"
                />
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="text-xs h-7 bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                  onClick={() => handleAddPaper(getAddType())}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Paper
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs h-7"
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {papers.map((paper) => (
              <div
                key={paper.id}
                className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          paper.source === "auto"
                            ? "border-blue-300 text-blue-600"
                            : "border-purple-300 text-purple-600"
                        )}
                      >
                        {paper.source === "auto" ? "Auto-identified" : "Manually added"}
                      </Badge>
                    </div>
                    <Link to="/workflow/3">
                      <h4 className="text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline cursor-pointer mb-1">
                        {paper.title}
                      </h4>
                    </Link>
                    <p className="text-xs text-slate-500">
                      {paper.authors} ({paper.year})
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Quick Check
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7 bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add to Queue
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {papers.length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs">
                No papers found. Use &quot;Auto-Identify&quot; or add manually.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reading Queue */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Reading Queue (3 papers)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {DUMMY_PAPERS.slice(0, 3).map((paper, i) => (
              <div
                key={paper.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-50"
              >
                <span className="text-xs font-mono text-slate-400 w-5">
                  {i + 1}
                </span>
                <Link to="/workflow/3" className="flex-1 truncate">
                  <span className="text-sm text-blue-700 hover:text-blue-900 hover:underline cursor-pointer">
                    {paper.title}
                  </span>
                </Link>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    i === 0
                      ? "text-emerald-600 border-emerald-300"
                      : "text-slate-400"
                  )}
                >
                  {i === 0 ? "Reading" : "Queued"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />
          Generate Comparison Table
        </Button>
        <Link to="/workflow/5">
          <Button className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white">
            Save and Go to Visualization
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// Step 5: Visualize Workspace
// ============================================================
function VisualizeWorkspace() {
  const [vizSection, setVizSection] = useState<"workspace" | "research" | "viztools">("workspace");
  const [researchSubTab, setResearchSubTab] = useState<"papers" | "files" | "ai-summary" | "perm-notes" | "synthesis">("papers");

  // Workspace stats
  const workspaceStats = {
    projects: 3,
    totalArtifacts: DUMMY_ARTIFACTS.length,
    annotations: DUMMY_ARTIFACTS.filter((a) => a.type === "highlight").length + 3,
    litNotes: DUMMY_ARTIFACTS.filter((a) => a.type === "literature-note").length + 2,
    permNotes: DUMMY_ARTIFACTS.filter((a) => a.type === "permanent-note").length + 1,
    drafts: DUMMY_ARTIFACTS.filter((a) => a.type === "rq-draft").length,
    purposeCards: DUMMY_ARTIFACTS.filter((a) => a.type === "purpose").length + 1,
    onlineHours: 24.5,
    totalWords: 12840,
  };

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

  const artifactBreakdown = [
    { label: "Annotations/Highlights", count: workspaceStats.annotations, color: "bg-yellow-400" },
    { label: "Literature Notes", count: workspaceStats.litNotes, color: "bg-blue-400" },
    { label: "Permanent Notes", count: workspaceStats.permNotes, color: "bg-rose-400" },
    { label: "Drafts", count: workspaceStats.drafts, color: "bg-emerald-400" },
    { label: "Purpose Cards", count: workspaceStats.purposeCards, color: "bg-purple-400" },
  ];
  const maxArtifactCount = Math.max(...artifactBreakdown.map((a) => a.count), 1);

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
      <Card className="border-slate-200">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={vizSection === "workspace" ? "default" : "outline"}
              className={cn("text-xs", vizSection === "workspace" && "bg-[#1E3A5F] hover:bg-[#162d4a] text-white")}
              onClick={() => setVizSection("workspace")}
            >
              <BarChart3 className="w-3 h-3 mr-1" />
              Workspace Analytics
            </Button>
            <Button
              size="sm"
              variant={vizSection === "research" ? "default" : "outline"}
              className={cn("text-xs", vizSection === "research" && "bg-[#1E3A5F] hover:bg-[#162d4a] text-white")}
              onClick={() => setVizSection("research")}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              Research Content
            </Button>
            <Button
              size="sm"
              variant={vizSection === "viztools" ? "default" : "outline"}
              className={cn("text-xs", vizSection === "viztools" && "bg-[#1E3A5F] hover:bg-[#162d4a] text-white")}
              onClick={() => setVizSection("viztools")}
            >
              <Zap className="w-3 h-3 mr-1" />
              Visualization Tools
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== WORKSPACE ANALYTICS ===== */}
      {vizSection === "workspace" && (
        <div className="space-y-5">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Projects", value: workspaceStats.projects, icon: "📁" },
              { label: "Total Artifacts", value: workspaceStats.totalArtifacts, icon: "📦" },
              { label: "Online Hours", value: `${workspaceStats.onlineHours}h`, icon: "⏱️" },
              { label: "Total Words", value: workspaceStats.totalWords.toLocaleString(), icon: "✍️" },
            ].map((stat) => (
              <Card key={stat.label} className="border-slate-200">
                <CardContent className="p-4 text-center">
                  <span className="text-2xl block mb-1">{stat.icon}</span>
                  <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Artifact Breakdown */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Artifact Breakdown by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {artifactBreakdown.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-600 w-36 shrink-0">{item.label}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", item.color)}
                        style={{ width: `${(item.count / maxArtifactCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 w-8 text-right">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== RESEARCH CONTENT with Sub-Tabs ===== */}
      {vizSection === "research" && (
        <div className="space-y-5">
          {/* Paper Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Card className="border-slate-200">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-slate-800">{papers.length}</p>
                <p className="text-[10px] text-slate-500 uppercase">Total Papers</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{readPapers.length}</p>
                <p className="text-[10px] text-slate-500 uppercase">Papers Read</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
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
                    ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-Tab: Papers Overview */}
          {researchSubTab === "papers" && (
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Papers Overview</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={paperSort === "year" ? "default" : "outline"}
                      className={cn("text-[10px] h-6", paperSort === "year" && "bg-[#1E3A5F] text-white")}
                      onClick={() => setPaperSort("year")}
                    >
                      <Clock className="w-2.5 h-2.5 mr-0.5" />
                      By Year
                    </Button>
                    <Button
                      size="sm"
                      variant={paperSort === "access" ? "default" : "outline"}
                      className={cn("text-[10px] h-6", paperSort === "access" && "bg-[#1E3A5F] text-white")}
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
                      <div key={paper.id} className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-medium text-slate-800 line-clamp-1">{paper.title}</h4>
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
            <Card className="border-slate-200">
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
                    <Button size="sm" className="text-xs bg-[#1E3A5F] hover:bg-[#162d4a] text-white" onClick={handleUploadFile}>
                      <Plus className="w-3 h-3 mr-1" />
                      Simulate Upload
                    </Button>
                  </div>
                )}
                {uploadedFiles.length > 0 ? (
                  <div className="space-y-2">
                    {uploadedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
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
                                className="text-[10px] h-6 px-2 border-purple-300 text-purple-600 hover:bg-purple-50"
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
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  AI Summarize Notes (Premium)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-500 mb-3">
                  Automatically summarize your literature notes, highlights, and permanent notes. Generate insight notes from patterns found across your materials.
                </p>
                <Button
                  size="sm"
                  className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={handleAiSummarize}
                  disabled={aiSummarizing}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {aiSummarizing ? "Summarizing..." : "Generate AI Summary & Insights"}
                </Button>
                {aiSummaryResult && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold text-purple-700 uppercase">AI Result</span>
                      <button onClick={() => setAiSummaryResult(null)} className="hover:bg-purple-100 rounded p-0.5">
                        <X className="w-3 h-3 text-purple-400" />
                      </button>
                    </div>
                    <pre className="text-[10px] text-purple-800 whitespace-pre-wrap leading-relaxed">{aiSummaryResult}</pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sub-Tab: Permanent Notes */}
          {researchSubTab === "perm-notes" && (
            <Card className="border-slate-200">
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
                          <h4 className="text-xs font-medium text-slate-800">{note.title}</h4>
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
            <Card className="border-slate-200">
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
                              ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
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
                        <label key={paper.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer">
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
                        <Badge key={col} variant="secondary" className="text-[10px] px-2 py-0.5 bg-slate-100 gap-1">
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
                    className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
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
                            <th className="text-left p-2 border border-slate-200 bg-slate-50 font-semibold text-slate-600 min-w-[150px]">
                              Paper
                            </th>
                            {synthColumns.map((col) => (
                              <th key={col} className="text-left p-2 border border-slate-200 bg-slate-50 font-semibold text-slate-600 min-w-[120px]">
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
                                <td className="p-2 border border-slate-200 font-medium text-slate-700">
                                  {paper.authors[0]} ({paper.year})
                                </td>
                                {synthColumns.map((col) => (
                                  <td key={col} className="p-2 border border-slate-200">
                                    <input
                                      type="text"
                                      value={synthData[pid]?.[col] || ""}
                                      onChange={(e) => {
                                        setSynthData((prev) => ({
                                          ...prev,
                                          [pid]: { ...prev[pid], [col]: e.target.value },
                                        }));
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
          <Card className="border-slate-200">
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
                  className="text-xs h-7 bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
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
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
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
                    className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-slate-800">{tool.name}</h4>
                        {tool.source === "user" && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 border-purple-300 text-purple-600">
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

      <div className="flex gap-2">
        <Button variant="outline">
          <Eye className="w-4 h-4 mr-2" />
          Generate Visualization Board
        </Button>
        <Button variant="outline">
          <Sparkles className="w-4 h-4 mr-2" />
          Synthesize into Permanent Note
        </Button>
        <Link to="/workflow/6">
          <Button className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white">
            Push to Research Question Draft
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
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
      <Card className="border-slate-200">
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
                        : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
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
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50 transition-all text-[10px] text-slate-600 hover:text-amber-700"
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
                              : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
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
                        <h4 className="text-xs font-medium text-slate-800">{note.title}</h4>
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
      <Card className="border-slate-200">
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
                    selectedStyle === style.id && "bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
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
                    className="p-3 bg-white border border-slate-200 rounded-lg hover:border-[#1E3A5F] hover:shadow-sm transition-all group"
                  >
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] mb-1", typeMeta.bgColor, typeMeta.color)}
                    >
                      {typeMeta.label}
                    </Badge>
                    <p className="text-xs font-medium text-slate-700 line-clamp-2 group-hover:text-[#1E3A5F]">
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
                        className="text-[10px] h-6 px-2 border-[#1E3A5F]/30 text-[#1E3A5F]"
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
        <div className="lg:col-span-2 space-y-3">
          <Card className="border-slate-200">
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
                        <div key={draft.id} className="p-2 rounded-lg border border-orange-200 bg-white">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-medium text-slate-800">{draft.name}</h4>
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
                                    : "bg-slate-50 border-slate-200 hover:border-orange-200 text-slate-600"
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
                        ? "bg-[#1E3A5F] text-white border-[#1E3A5F]"
                        : componentContents[getContentKey(comp.id)]
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
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
                      <p className="text-xs font-medium text-[#1E3A5F] mb-0.5">{comp.label}</p>
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
                    ? "bg-[#1E3A5F] text-white"
                    : "text-slate-500 hover:bg-slate-100"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Macro Level */}
          {checkTab === "macro" && (
            <Card className="border-slate-200">
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
                        className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer"
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
                  className="w-full text-xs h-7 bg-purple-600 hover:bg-purple-700 text-white"
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
            <Card className="border-slate-200">
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
                        className="flex items-start gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer"
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
                  className="w-full text-xs h-7 bg-purple-600 hover:bg-purple-700 text-white"
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
            <Card className="border-slate-200">
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
                          <label key={item.id} className="flex items-start gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer">
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
                          <label key={item.id} className="flex items-start gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer">
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
                          <label key={item.id} className="flex items-start gap-2 p-1 rounded hover:bg-slate-50 cursor-pointer">
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
                    className="w-full text-xs h-7 bg-purple-600 hover:bg-purple-700 text-white"
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
            <Card className="border-purple-200 bg-purple-50/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Analysis Result
                  </CardTitle>
                  <button onClick={() => setAiCheckResult(null)} className="hover:bg-purple-100 rounded p-0.5">
                    <X className="w-3 h-3 text-purple-400" />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-[10px] text-purple-800 whitespace-pre-wrap leading-relaxed">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[70vh] overflow-y-auto">
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
                <h3 className="text-sm font-semibold text-slate-800">{previewArtifact.title}</h3>
              </div>
              <button onClick={() => setPreviewArtifactId(null)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-slate-500 mb-2">{previewArtifact.description}</p>
              {previewArtifact.content && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap">{previewArtifact.content}</pre>
                </div>
              )}
              <div className="flex gap-1.5 mt-3">
                <Button
                  size="sm"
                  className="text-xs h-7 bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="text-sm font-semibold text-slate-800">
                Full Preview — {activeStyle.name}
              </h3>
              <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-slate-100 rounded">
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
                      <h2 className="text-base font-bold text-slate-800 mb-2 border-b pb-1">
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