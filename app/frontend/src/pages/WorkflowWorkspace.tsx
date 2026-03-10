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
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Network,
  PenTool,
  Plus,
  Save,
  Search,
  Sparkles,
  Star,
  Tag,
  Target,
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
          <CardTitle className="text-sm font-semibold">
            Expansion Paths from Entry Paper
          </CardTitle>
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
  const [activeView, setActiveView] = useState("topic");
  const [insightText, setInsightText] = useState(
    "Three main clusters emerge: (1) AI tutoring effectiveness studies, (2) SRL theory and measurement, (3) Technology-enhanced metacognition. The gap lies at the intersection of clusters 1 and 2."
  );

  return (
    <div className="space-y-5">
      <Card className="border-slate-200">
        <CardContent className="p-3">
          <div className="flex gap-2">
            {VIZ_VIEWS.map((view) => (
              <Button
                key={view.id}
                size="sm"
                variant={activeView === view.id ? "default" : "outline"}
                className={cn(
                  "text-xs",
                  activeView === view.id &&
                    "bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                )}
                onClick={() => setActiveView(view.id)}
              >
                {view.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card className="border-slate-200 h-[400px]">
            <CardContent className="p-0 h-full relative">
              <img
                src="https://mgx-backend-cdn.metadl.com/generate/images/1012783/2026-03-09/d73120cf-3173-4321-a9bb-689bd05b9c7f.png"
                alt="Visualization network"
                className="w-full h-full object-cover rounded-lg opacity-30"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 500 300"
                  className="w-full h-full p-6"
                >
                  <line x1="250" y1="80" x2="120" y2="160" stroke="#1E3A5F" strokeWidth="1.5" opacity="0.3" />
                  <line x1="250" y1="80" x2="380" y2="140" stroke="#1E3A5F" strokeWidth="1.5" opacity="0.3" />
                  <line x1="250" y1="80" x2="250" y2="200" stroke="#2D6A4F" strokeWidth="2" opacity="0.4" />
                  <line x1="120" y1="160" x2="180" y2="240" stroke="#1E3A5F" strokeWidth="1" opacity="0.2" />
                  <line x1="380" y1="140" x2="350" y2="230" stroke="#1E3A5F" strokeWidth="1" opacity="0.2" />
                  <line x1="250" y1="200" x2="180" y2="240" stroke="#2D6A4F" strokeWidth="1.5" opacity="0.3" />
                  <line x1="250" y1="200" x2="350" y2="230" stroke="#2D6A4F" strokeWidth="1.5" opacity="0.3" />

                  <circle cx="250" cy="80" r="28" fill="#1E3A5F" opacity="0.9" />
                  <text x="250" y="84" textAnchor="middle" fill="white" fontSize="8" fontWeight="600">AI Tutoring</text>

                  <circle cx="120" cy="160" r="22" fill="#2D6A4F" opacity="0.8" />
                  <text x="120" y="164" textAnchor="middle" fill="white" fontSize="7" fontWeight="500">SRL Theory</text>

                  <circle cx="380" cy="140" r="20" fill="#1E3A5F" opacity="0.7" />
                  <text x="380" y="144" textAnchor="middle" fill="white" fontSize="7" fontWeight="500">Metacognition</text>

                  <circle cx="250" cy="200" r="24" fill="#dc2626" opacity="0.6" />
                  <text x="250" y="197" textAnchor="middle" fill="white" fontSize="7" fontWeight="600">GAP</text>
                  <text x="250" y="207" textAnchor="middle" fill="white" fontSize="6">AI × SRL</text>

                  <circle cx="180" cy="240" r="16" fill="#64748b" opacity="0.5" />
                  <text x="180" y="243" textAnchor="middle" fill="white" fontSize="6">Methods</text>

                  <circle cx="350" cy="230" r="16" fill="#64748b" opacity="0.5" />
                  <text x="350" y="233" textAnchor="middle" fill="white" fontSize="6">Feedback</text>
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={insightText}
                onChange={(e) => setInsightText(e.target.value)}
                rows={6}
                className="text-xs"
                placeholder="Write your synthesis insights..."
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Candidate Research Questions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="p-2 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-800">
                  How do AI-powered adaptive tutoring systems influence
                  the development of self-regulated learning strategies
                  among graduate students?
                </div>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                  What design features of AI tutoring systems mediate
                  the relationship between adaptive feedback and
                  metacognitive development?
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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

  const previewArtifact = allArtifacts.find((a) => a.id === previewArtifactId);

  return (
    <div className="space-y-5">
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
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Available Artifacts
          </h3>
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
                <div className="flex items-center gap-1.5">
                  {lastSaved && (
                    <span className="text-[10px] text-emerald-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Saved {lastSaved}
                    </span>
                  )}
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={handleManualSave}>
                    <Save className="w-3 h-3 mr-1" />
                    Save
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