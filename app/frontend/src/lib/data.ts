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
  | "writing-block"
  | "writing-draft";

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
    label: "Purpose",
    shortLabel: "Purpose",
    description: "Define your reading and research goals",
    icon: "🎯",
  },
  2: {
    label: "Discover",
    shortLabel: "Discover",
    description: "Discover entry or seed papers",
    icon: "🔍",
  },
  3: {
    label: "Read",
    shortLabel: "Read",
    description: "Read, annotate and take notes.",
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
  "writing-draft": { label: "Writing Draft", color: "text-orange-700", bgColor: "bg-orange-50" },
};

// --- Dummy Data ---

export const DUMMY_PROJECT: Project = {
  id: "",
  title: "",
  goal: "",
  currentStep: 1,
  createdAt: "",
  updatedAt: "",
};

export const DUMMY_PAPERS: Paper[] = [
  {
    id: "",
    title: "",
    authors: [],
    year: new Date().getFullYear(),
    journal: "",
    abstract: "",
    researchQuestion: "",
    theory: "",
    method: "",
    findings: "",
    relevance: "low",
    isEntryPaper: false,
    annotations: [
      {
        id: "",
        text: "",
        note: "",
        color: "yellow",
      },
      {
        id: "",
        text: "",
        note: "",
        color: "green",
      },
    ],
  },
];

export const DUMMY_KEYWORDS: Keyword[] = [];

export const DUMMY_SEARCH_RECORDS: SearchRecord[] = [];

export const DUMMY_ARTIFACTS: Artifact[] = [];

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

// --- Projects ---
export interface ProjectItem {
  id: string;
  title: string;
  goal: string;
  currentStep: WorkflowStep;
  updatedAt: string;
}

export const DUMMY_PROJECTS: ProjectItem[] = [];

// --- Reporting Style Templates ---
export interface ReportingStyle {
  id: string;
  name: string;
  description: string;
  components: {
    id: string;
    label: string;
    description: string;
    placeholder: string;
  }[];
}

export const REPORTING_STYLES: ReportingStyle[] = [
  {
    id: "apa",
    name: "APA Style (7th Edition)",
    description: "American Psychological Association — commonly used in social sciences, education, and psychology.",
    components: [
      { id: "title-page", label: "Title Page", description: "Includes running head, title, author name(s), institutional affiliation, author note, and page number.", placeholder: "Enter your paper title, author names, and affiliation..." },
      { id: "abstract", label: "Abstract", description: "A brief (150–250 words) comprehensive summary of the contents. Include keywords below.", placeholder: "Write a concise summary of your research purpose, methods, findings, and conclusions..." },
      { id: "introduction", label: "Introduction", description: "Introduce the problem, review relevant literature, state the purpose and rationale. Use the funnel approach: broad context → specific gap → your study.", placeholder: "Begin with the broad context, narrow to the specific problem, and state your research question..." },
      { id: "literature-review", label: "Literature Review", description: "Critically synthesize prior research. Organize thematically or chronologically. Identify gaps that justify your study.", placeholder: "Synthesize existing research, identify themes, and highlight the gap your study addresses..." },
      { id: "method", label: "Method", description: "Describe participants, materials/instruments, and procedures in enough detail for replication. Include subsections: Participants, Materials, Procedure.", placeholder: "Detail your research design, participants, data collection instruments, and procedures..." },
      { id: "results", label: "Results", description: "Present findings without interpretation. Use tables and figures. Report statistical tests, effect sizes, and confidence intervals.", placeholder: "Report your findings objectively, including statistical results and data summaries..." },
      { id: "discussion", label: "Discussion", description: "Interpret results in context of hypotheses and prior research. Discuss implications, limitations, and future directions.", placeholder: "Interpret your findings, discuss implications, acknowledge limitations, and suggest future research..." },
      { id: "references", label: "References", description: "List all cited sources in APA format. Use hanging indent. Alphabetical by first author's last name.", placeholder: "List all references in APA 7th edition format..." },
    ],
  },
  {
    id: "ieee",
    name: "IEEE Style",
    description: "Institute of Electrical and Electronics Engineers — commonly used in engineering, computer science, and technology.",
    components: [
      { id: "title-authors", label: "Title & Authors", description: "Paper title (centered, bold), author names with affiliations and emails below.", placeholder: "Enter paper title, author names, affiliations, and contact information..." },
      { id: "abstract", label: "Abstract", description: "A concise (100–200 words) overview of the paper's purpose, methodology, results, and conclusions.", placeholder: "Summarize the purpose, approach, key results, and significance of your work..." },
      { id: "index-terms", label: "Index Terms", description: "List 4–6 keywords in alphabetical order, separated by commas.", placeholder: "List relevant keywords (e.g., machine learning, neural networks, optimization)..." },
      { id: "introduction", label: "I. Introduction", description: "Present the problem, motivation, and contribution. End with a brief outline of the paper structure.", placeholder: "Introduce the problem, state your contribution, and outline the paper structure..." },
      { id: "related-work", label: "II. Related Work", description: "Review and compare existing approaches. Clearly distinguish your contribution from prior work.", placeholder: "Review existing approaches and clearly state how your work differs..." },
      { id: "methodology", label: "III. Methodology", description: "Describe your proposed approach, system architecture, algorithms, or experimental setup in detail.", placeholder: "Detail your proposed method, system design, or experimental framework..." },
      { id: "results", label: "IV. Results & Discussion", description: "Present experimental results with tables/figures. Compare with baselines. Discuss significance.", placeholder: "Present results, compare with baselines, and discuss the significance of findings..." },
      { id: "conclusion", label: "V. Conclusion", description: "Summarize contributions, state limitations, and suggest future work directions.", placeholder: "Summarize your contributions, limitations, and future research directions..." },
      { id: "references", label: "References", description: "Numbered references in order of appearance. Use IEEE citation format [1], [2], etc.", placeholder: "List references in IEEE numbered format..." },
    ],
  },
  {
    id: "harvard",
    name: "Harvard Style",
    description: "Author-date referencing system — widely used in humanities, business, and social sciences across UK and Australian universities.",
    components: [
      { id: "title-page", label: "Title Page", description: "Title, author, institution, date, and word count. Some variants include a cover page with module details.", placeholder: "Enter your essay/report title, author details, and submission information..." },
      { id: "abstract", label: "Abstract / Executive Summary", description: "Brief summary (150–300 words) of the research aims, methods, key findings, and conclusions.", placeholder: "Provide a concise overview of your research aims, approach, and key findings..." },
      { id: "introduction", label: "Introduction", description: "Introduce the topic, provide background context, state the research aim/question, and outline the structure.", placeholder: "Introduce your topic, provide context, state your aim, and outline the essay structure..." },
      { id: "literature-review", label: "Literature Review", description: "Critically evaluate and synthesize existing literature. Use author-date citations (Smith, 2020). Identify themes and gaps.", placeholder: "Critically review and synthesize relevant literature, identifying key themes and gaps..." },
      { id: "methodology", label: "Methodology", description: "Justify and describe your research approach, data collection, and analysis methods.", placeholder: "Describe and justify your research design, data collection, and analysis approach..." },
      { id: "findings", label: "Findings / Results", description: "Present findings clearly using headings, tables, and figures where appropriate.", placeholder: "Present your findings clearly with supporting evidence..." },
      { id: "discussion", label: "Discussion", description: "Interpret findings in relation to the literature. Discuss implications, limitations, and recommendations.", placeholder: "Discuss your findings in context, address limitations, and provide recommendations..." },
      { id: "conclusion", label: "Conclusion", description: "Summarize key points, restate the significance, and suggest areas for further research.", placeholder: "Summarize your key arguments and their significance..." },
      { id: "reference-list", label: "Reference List", description: "Alphabetical list of all cited works in Harvard format (Author, Year, Title, Source).", placeholder: "List all references in Harvard author-date format..." },
    ],
  },
];

// --- Structure Check: Macro Level ---
export const MACRO_CHECKLIST = [
  { id: "mc-1", label: "Title is clear and informative", category: "Structure" },
  { id: "mc-2", label: "Abstract covers purpose, method, findings, conclusion", category: "Structure" },
  { id: "mc-3", label: "Introduction present with clear research question", category: "Structure" },
  { id: "mc-4", label: "Literature review synthesizes (not just summarizes)", category: "Structure" },
  { id: "mc-5", label: "Method section is replicable", category: "Structure" },
  { id: "mc-6", label: "Results are presented before interpretation", category: "Structure" },
  { id: "mc-7", label: "Discussion addresses implications and limitations", category: "Structure" },
  { id: "mc-8", label: "Conclusion does not introduce new information", category: "Structure" },
  { id: "mc-9", label: "References are complete and consistent", category: "Structure" },
];

// --- Structure Check: Meso Level (Toulmin Argumentation Model) ---
export const MESO_TOULMIN_CHECKLIST = [
  { id: "tm-1", label: "Claim — Main argument/thesis is clearly stated", category: "Claim" },
  { id: "tm-2", label: "Data/Grounds — Evidence supports each claim", category: "Data" },
  { id: "tm-3", label: "Warrant — Logical connection between data and claim is explicit", category: "Warrant" },
  { id: "tm-4", label: "Backing — Warrants are supported by additional evidence or theory", category: "Backing" },
  { id: "tm-5", label: "Qualifier — Degree of certainty is appropriate (e.g., 'may', 'likely')", category: "Qualifier" },
  { id: "tm-6", label: "Rebuttal — Counter-arguments are acknowledged and addressed", category: "Rebuttal" },
  { id: "tm-7", label: "Each paragraph has a clear topic sentence (claim)", category: "Paragraph" },
  { id: "tm-8", label: "Paragraphs follow claim → evidence → analysis structure", category: "Paragraph" },
  { id: "tm-9", label: "Transitions between paragraphs maintain argument flow", category: "Flow" },
  { id: "tm-10", label: "Overall argument builds progressively toward conclusion", category: "Flow" },
];

// --- Structure Check: Micro Level ---
export const MICRO_CHECKLIST_BASIC = [
  { id: "mb-1", label: "Spelling errors checked", category: "Spelling & Grammar" },
  { id: "mb-2", label: "Grammar errors checked", category: "Spelling & Grammar" },
  { id: "mb-3", label: "Formatting is consistent (headings, fonts, spacing)", category: "Format Consistency" },
  { id: "mb-4", label: "Visual elements are consistent (tables, figures, captions)", category: "Visual Consistency" },
  { id: "mb-5", label: "No broken links or missing references", category: "Broken Links" },
  { id: "mb-6", label: "All abbreviations are defined on first use", category: "Abbreviations" },
  { id: "mb-7", label: "Each paragraph has a clear topic sentence", category: "Paragraph Structure" },
];

export const MICRO_CHECKLIST_READABILITY = [
  { id: "mr-1", label: "Paragraphs are appropriate length (5–8 sentences)", category: "Paragraph Length" },
  { id: "mr-2", label: "Signposting words guide the reader (however, therefore, moreover)", category: "Signposting" },
  { id: "mr-3", label: "Subject and verb are close together in sentences", category: "Subject-Verb" },
  { id: "mr-4", label: "Sentence complexity is varied but not excessive", category: "Sentence Complexity" },
  { id: "mr-5", label: "Information density is manageable per paragraph", category: "Information Density" },
];

export const MICRO_CHECKLIST_CREDIBILITY = [
  { id: "mcr-1", label: "Facts and data are accurate and verifiable", category: "Accuracy" },
  { id: "mcr-2", label: "Limitations are explicitly acknowledged", category: "Limitations" },
  { id: "mcr-3", label: "Academic tone is maintained throughout", category: "Tone" },
  { id: "mcr-4", label: "Cited references include seminal/classic works", category: "Citation Quality" },
  { id: "mcr-5", label: "Cited references are recent and relevant (within 5 years for most)", category: "Citation Recency" },
];