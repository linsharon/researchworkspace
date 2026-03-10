// ============================================================
// Academic Reading & Writing Workspace - Data & Types
// ============================================================

// --- Types ---

export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6;

export interface Project {
  id: string;
  title: string;
  goal: string;
  currentStep: WorkflowStep;
  createdAt: string;
  updatedAt: string;
}

export interface Artifact {
  id: string;
  title: string;
  type: ArtifactType;
  projectId: string;
  sourceStep: WorkflowStep;
  description: string;
  updatedAt: string;
  content?: string;
}

export type ArtifactType =
  | "purpose"
  | "keyword"
  | "search-log"
  | "entry-paper"
  | "literature-note"
  | "permanent-note"
  | "visualization"
  | "rq-draft"
  | "writing-block";

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  journal: string;
  abstract: string;
  researchQuestion: string;
  theory: string;
  method: string;
  findings: string;
  relevance: "high" | "medium" | "low";
  isEntryPaper: boolean;
  annotations: Annotation[];
}

export interface Annotation {
  id: string;
  text: string;
  note: string;
  color: string;
}

export interface Keyword {
  id: string;
  term: string;
  category: string;
}

export interface SearchRecord {
  id: string;
  database: string;
  query: string;
  results: number;
  relevant: number;
  date: string;
}

// --- Step Metadata ---

export const STEP_META: Record<
  WorkflowStep,
  { label: string; shortLabel: string; description: string; icon: string }
> = {
  1: {
    label: "Clarify Purpose",
    shortLabel: "Purpose",
    description: "Define your reading and research goals",
    icon: "🎯",
  },
  2: {
    label: "Discover Entry Paper",
    shortLabel: "Discover",
    description: "Find keywords and entry papers",
    icon: "🔍",
  },
  3: {
    label: "Read Found Paper",
    shortLabel: "Read",
    description: "Deep read and annotate papers",
    icon: "📖",
  },
  4: {
    label: "Expand",
    shortLabel: "Expand",
    description: "Expand your literature base",
    icon: "🌐",
  },
  5: {
    label: "Visualize",
    shortLabel: "Visualize",
    description: "Map and synthesize your findings",
    icon: "🗺️",
  },
  6: {
    label: "Draft",
    shortLabel: "Draft",
    description: "Write and structure your output",
    icon: "✍️",
  },
};

export const ARTIFACT_TYPE_META: Record<
  ArtifactType,
  { label: string; color: string; bgColor: string }
> = {
  purpose: { label: "Purpose Card", color: "text-blue-700", bgColor: "bg-blue-50" },
  keyword: { label: "Keyword Set", color: "text-indigo-700", bgColor: "bg-indigo-50" },
  "search-log": { label: "Search Log", color: "text-purple-700", bgColor: "bg-purple-50" },
  "entry-paper": { label: "Entry Paper Card", color: "text-emerald-700", bgColor: "bg-emerald-50" },
  "literature-note": { label: "Literature Note", color: "text-amber-700", bgColor: "bg-amber-50" },
  "permanent-note": { label: "Permanent Note", color: "text-rose-700", bgColor: "bg-rose-50" },
  visualization: { label: "Visualization Board", color: "text-cyan-700", bgColor: "bg-cyan-50" },
  "rq-draft": { label: "RQ Draft", color: "text-teal-700", bgColor: "bg-teal-50" },
  "writing-block": { label: "Writing Block", color: "text-slate-700", bgColor: "bg-slate-100" },
};

// --- Dummy Data ---

export const DUMMY_PROJECT: Project = {
  id: "proj-1",
  title: "AI in Education",
  goal: "Find a research question on how AI tutoring systems affect student self-regulated learning in higher education",
  currentStep: 2,
  createdAt: "2026-02-15",
  updatedAt: "2026-03-09",
};

export const DUMMY_PAPERS: Paper[] = [
  {
    id: "paper-1",
    title: "Artificial Intelligence in Education: A Review of Adaptive Learning Systems",
    authors: ["Chen, L.", "Wang, P.", "Zhang, H."],
    year: 2024,
    journal: "Computers & Education",
    abstract:
      "This comprehensive review examines the current state of AI-powered adaptive learning systems in higher education. We analyze 87 studies published between 2018-2024, identifying key themes including personalization algorithms, student engagement metrics, and learning outcome measurements. Our findings suggest that while AI tutoring systems show promise in improving test scores, their impact on deeper learning processes such as self-regulated learning remains underexplored.",
    researchQuestion: "How do AI-powered adaptive learning systems impact student learning outcomes in higher education?",
    theory: "Self-Regulated Learning Theory (Zimmerman, 2002); Technology Acceptance Model (Davis, 1989)",
    method: "Systematic literature review; Meta-analysis of 87 empirical studies",
    findings:
      "AI tutoring systems improve test scores by 0.3-0.5 SD on average. Limited evidence on self-regulated learning outcomes. Personalization features are key mediators.",
    relevance: "high",
    isEntryPaper: true,
    annotations: [
      {
        id: "ann-1",
        text: "self-regulated learning remains underexplored",
        note: "This is the gap I want to investigate further",
        color: "yellow",
      },
      {
        id: "ann-2",
        text: "personalization algorithms",
        note: "Key mechanism - how does personalization affect SRL?",
        color: "green",
      },
    ],
  },
  {
    id: "paper-2",
    title: "Self-Regulated Learning in Technology-Enhanced Environments: A Meta-Analysis",
    authors: ["Kim, S.", "Park, J."],
    year: 2023,
    journal: "Educational Psychology Review",
    abstract:
      "This meta-analysis synthesizes findings from 52 studies examining self-regulated learning (SRL) in technology-enhanced learning environments. Results indicate that technology scaffolds can significantly support SRL processes, particularly in planning and monitoring phases.",
    researchQuestion: "What is the effect of technology-enhanced environments on students' self-regulated learning?",
    theory: "Self-Regulated Learning Theory (Pintrich, 2000)",
    method: "Meta-analysis of 52 studies; Random-effects model",
    findings:
      "Technology scaffolds improve SRL with moderate effect size (d=0.42). Planning and monitoring phases benefit most. Reflection support remains challenging.",
    relevance: "high",
    isEntryPaper: false,
    annotations: [],
  },
  {
    id: "paper-3",
    title: "Intelligent Tutoring Systems and Metacognition: Current Trends and Future Directions",
    authors: ["Rodriguez, M.", "Liu, X.", "Thompson, K."],
    year: 2025,
    journal: "Journal of Educational Technology & Society",
    abstract:
      "This paper reviews the intersection of intelligent tutoring systems (ITS) and metacognitive development. We identify design principles that promote metacognitive awareness and discuss how AI can be leveraged to support students' metacognitive growth.",
    researchQuestion: "How can intelligent tutoring systems be designed to promote metacognitive development?",
    theory: "Metacognition Theory (Flavell, 1979); Cognitive Load Theory (Sweller, 1988)",
    method: "Narrative review; Design-based research framework",
    findings:
      "ITS with explicit metacognitive prompts show 23% improvement in metacognitive awareness. Adaptive feedback timing is crucial.",
    relevance: "medium",
    isEntryPaper: false,
    annotations: [],
  },
  {
    id: "paper-4",
    title: "The Role of AI Feedback in Developing Academic Writing Skills",
    authors: ["Williams, A.", "Brown, D."],
    year: 2024,
    journal: "Assessment & Evaluation in Higher Education",
    abstract:
      "This study investigates how AI-generated feedback affects graduate students' academic writing development over a semester-long intervention. Using a mixed-methods approach, we examine both writing quality improvements and students' perceptions of AI feedback.",
    researchQuestion: "How does AI-generated feedback influence graduate students' academic writing development?",
    theory: "Feedback Literacy Framework (Carless & Boud, 2018)",
    method: "Mixed methods; Pre-post design with 120 graduate students",
    findings:
      "AI feedback improved structural coherence but had limited impact on argumentation quality. Students valued immediacy but questioned depth.",
    relevance: "low",
    isEntryPaper: false,
    annotations: [],
  },
];

export const DUMMY_KEYWORDS: Keyword[] = [
  { id: "kw-1", term: "AI tutoring systems", category: "Technology" },
  { id: "kw-2", term: "self-regulated learning", category: "Theory" },
  { id: "kw-3", term: "higher education", category: "Context" },
  { id: "kw-4", term: "adaptive learning", category: "Technology" },
  { id: "kw-5", term: "metacognition", category: "Theory" },
  { id: "kw-6", term: "intelligent tutoring systems", category: "Technology" },
];

export const DUMMY_SEARCH_RECORDS: SearchRecord[] = [
  {
    id: "sr-1",
    database: "Web of Science",
    query: '"AI tutoring" AND "self-regulated learning"',
    results: 234,
    relevant: 18,
    date: "2026-02-20",
  },
  {
    id: "sr-2",
    database: "Scopus",
    query: '"intelligent tutoring systems" AND "metacognition" AND "higher education"',
    results: 156,
    relevant: 12,
    date: "2026-02-22",
  },
  {
    id: "sr-3",
    database: "Google Scholar",
    query: '"adaptive learning" AND "self-regulation" AND "university students"',
    results: 1420,
    relevant: 25,
    date: "2026-02-25",
  },
];

export const DUMMY_ARTIFACTS: Artifact[] = [
  {
    id: "art-1",
    title: "Research Purpose: AI & SRL in Higher Ed",
    type: "purpose",
    projectId: "proj-1",
    sourceStep: 1,
    description: "Understand how AI tutoring systems affect self-regulated learning processes in graduate education",
    updatedAt: "2026-02-16",
    content:
      "Purpose: Investigate the intersection of AI-powered tutoring and self-regulated learning in higher education contexts. Focus areas: (1) How do AI personalization features interact with SRL processes? (2) What design principles support metacognitive development? (3) What gaps exist in current empirical evidence?",
  },
  {
    id: "art-2",
    title: "Keyword Set v2",
    type: "keyword",
    projectId: "proj-1",
    sourceStep: 2,
    description: "Refined keyword set after initial search rounds",
    updatedAt: "2026-02-25",
  },
  {
    id: "art-3",
    title: "Search Log — Round 1",
    type: "search-log",
    projectId: "proj-1",
    sourceStep: 2,
    description: "First round of systematic searching across 3 databases",
    updatedAt: "2026-02-25",
  },
  {
    id: "art-4",
    title: "Entry Paper: Chen et al. (2024)",
    type: "entry-paper",
    projectId: "proj-1",
    sourceStep: 2,
    description: "AI in Education review — key entry point for the field",
    updatedAt: "2026-02-28",
  },
  {
    id: "art-5",
    title: "Lit Note: Chen et al. (2024) — AI Adaptive Learning Review",
    type: "literature-note",
    projectId: "proj-1",
    sourceStep: 3,
    description: "Detailed reading notes on the comprehensive review of AI adaptive learning systems",
    updatedAt: "2026-03-02",
    content:
      "Key takeaway: AI tutoring improves test scores but SRL impact is underexplored. The gap between performance outcomes and process outcomes is significant. Personalization algorithms are the key mechanism but their effect on metacognition is unclear.",
  },
  {
    id: "art-6",
    title: "Permanent Note: The SRL Gap in AI Education Research",
    type: "permanent-note",
    projectId: "proj-1",
    sourceStep: 5,
    description: "Synthesized insight about the gap between AI performance gains and SRL development",
    updatedAt: "2026-03-05",
    content:
      "Current AI education research focuses heavily on performance outcomes (test scores, completion rates) while neglecting process outcomes (self-regulation, metacognition, learning strategies). This creates a fundamental gap: we know AI tutoring 'works' but we don't know if it helps students become better learners. Three possible explanations: (1) AI scaffolding may reduce the need for self-regulation, (2) Adaptive features may inadvertently bypass metacognitive processes, (3) Current assessment methods don't capture SRL changes.",
  },
  {
    id: "art-7",
    title: "RQ Draft: Does AI Tutoring Help or Hinder SRL?",
    type: "rq-draft",
    projectId: "proj-1",
    sourceStep: 5,
    description: "Draft research question exploring the tension between AI support and learner autonomy",
    updatedAt: "2026-03-07",
    content:
      "Draft RQ: How do AI-powered adaptive tutoring systems influence the development of self-regulated learning strategies among graduate students, and what design features mediate this relationship?",
  },
];

export const PURPOSE_OPTIONS = [
  "Understand the field",
  "Find key concepts",
  "Find theories",
  "Find methods",
  "Find research questions",
  "Prepare for literature review",
  "Prepare for introduction",
] as const;

export const EXPAND_PATHS = [
  { id: "references", label: "References", icon: "📚", description: "Papers cited by this paper" },
  { id: "cited-by", label: "Cited By", icon: "🔗", description: "Papers that cite this paper" },
  { id: "same-author", label: "Same Author", icon: "👤", description: "Other works by the same authors" },
  { id: "similar-topic", label: "Similar Topic", icon: "🏷️", description: "Papers on similar topics" },
  { id: "similar-method", label: "Similar Method", icon: "🔬", description: "Papers using similar methods" },
] as const;

export const DISCOVERY_PATH_OPTIONS = [
  "Academic Database",
  "AI Academic Search Engine",
  "Search Engine",
  "Manual Search",
  "Social Platform",
  "RSS Subscription",
  "Expert Consultation",
  "Other",
] as const;

export const DATABASE_OPTIONS = [
  "Web of Science",
  "Scopus",
  "Google Scholar",
  "CNKI",
  "VIP (维普)",
  "PubMed",
  "IEEE Xplore",
  "ERIC",
] as const;

export const VIZ_VIEWS = [
  { id: "topic", label: "Topic Map" },
  { id: "theory", label: "Theory Map" },
  { id: "method", label: "Method Map" },
  { id: "timeline", label: "Timeline" },
  { id: "synthesis", label: "Synthesis Table" },
] as const;