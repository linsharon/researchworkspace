import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  Eye,
  Map,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";
import { VIZ_VIEWS, DUMMY_ARTIFACTS } from "@/lib/data";
import { cn } from "@/lib/utils";

export default function VisualizationBoard() {
  const [activeView, setActiveView] = useState("topic");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [insightText, setInsightText] = useState(
    "Three main clusters emerge from the literature:\n\n1. AI Tutoring Effectiveness — Studies measuring learning outcomes from AI-powered systems\n\n2. Self-Regulated Learning Theory — Research on how students plan, monitor, and evaluate their learning\n\n3. Technology-Enhanced Metacognition — Work on how digital tools support metacognitive development\n\nThe critical gap lies at the intersection of clusters 1 and 2."
  );

  const permanentNotes = DUMMY_ARTIFACTS.filter(
    (a) => a.type === "permanent-note" || a.type === "literature-note"
  );

  const rightPanelContent = (
    <div className="p-4 space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Source Notes
        </h4>
        <div className="space-y-2">
          {permanentNotes.map((note) => (
            <div
              key={note.id}
              className="p-2 bg-white border border-slate-200 rounded-lg text-xs cursor-pointer hover:border-[#1E3A5F] transition-colors"
            >
              <p className="font-medium text-slate-700 line-clamp-2">
                {note.title}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Step {note.sourceStep}
              </p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Quick Actions
        </h4>
        <div className="space-y-1.5">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-8"
          >
            <Sparkles className="w-3 h-3 mr-2" />
            Generate from Notes
          </Button>
          <Link to="/workflow/6">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs h-8"
            >
              <ArrowRight className="w-3 h-3 mr-2" />
              Push to Draft
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout
      showRightPanel={!isFullscreen}
      rightPanelContent={rightPanelContent}
    >
      <div
        className={cn(
          "p-6 space-y-5",
          isFullscreen ? "max-w-none" : "max-w-5xl mx-auto"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Visualization Board
              </h1>
              <p className="text-sm text-slate-500">
                Map and synthesize your research landscape
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3 h-3 mr-1" />
                Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3 mr-1" />
                Fullscreen
              </>
            )}
          </Button>
        </div>

        {/* View Switcher */}
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

        {/* Main Visualization Canvas */}
        <Card className="border-slate-200">
          <CardContent
            className="p-0 relative overflow-hidden rounded-lg"
            style={{
              height: isFullscreen ? "calc(100vh - 300px)" : "450px",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50/30" />

            {activeView === "synthesis" ? (
              <SynthesisTableView />
            ) : activeView === "timeline" ? (
              <TimelineView />
            ) : (
              <NetworkGraphView viewType={activeView} />
            )}
          </CardContent>
        </Card>

        {/* Insights & RQ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Research Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={insightText}
                onChange={(e) => setInsightText(e.target.value)}
                rows={8}
                className="text-sm"
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Emerging Research Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <p className="text-sm text-teal-800 font-medium mb-1">
                  Primary RQ
                </p>
                <p className="text-xs text-teal-700">
                  How do AI-powered adaptive tutoring systems influence
                  the development of self-regulated learning strategies
                  among graduate students?
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm text-slate-700 font-medium mb-1">
                  Sub-RQ 1
                </p>
                <p className="text-xs text-slate-600">
                  What design features of AI tutoring systems mediate
                  the relationship between adaptive feedback and
                  metacognitive development?
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm text-slate-700 font-medium mb-1">
                  Sub-RQ 2
                </p>
                <p className="text-xs text-slate-600">
                  Does AI scaffolding reduce or enhance students' need
                  for self-regulation over time?
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Generate Visualization Board
          </Button>
          <Button variant="outline">
            <Sparkles className="w-4 h-4 mr-2" />
            Synthesize into Permanent Note
          </Button>
          <Link to="/draft">
            <Button className="bg-[#1E3A5F] hover:bg-[#162d4a] text-white">
              Push to Research Question Draft
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}

function NetworkGraphView({ viewType }: { viewType: string }) {
  const configs: Record<string, { nodes: Array<{ x: number; y: number; r: number; label: string; sub?: string; color: string }>; edges: Array<{ from: number; to: number; weight: number }> }> = {
    topic: {
      nodes: [
        { x: 350, y: 70, r: 35, label: "AI Tutoring", sub: "Systems", color: "#1E3A5F" },
        { x: 150, y: 170, r: 30, label: "Self-Regulated", sub: "Learning", color: "#2D6A4F" },
        { x: 550, y: 150, r: 26, label: "Metacognition", color: "#1E3A5F" },
        { x: 350, y: 220, r: 28, label: "GAP", sub: "AI × SRL", color: "#dc2626" },
        { x: 180, y: 310, r: 20, label: "Assessment", color: "#64748b" },
        { x: 520, y: 300, r: 20, label: "Feedback", color: "#64748b" },
        { x: 350, y: 340, r: 18, label: "Scaffolding", color: "#64748b" },
      ],
      edges: [
        { from: 0, to: 1, weight: 2 }, { from: 0, to: 2, weight: 2 },
        { from: 0, to: 3, weight: 3 }, { from: 1, to: 3, weight: 3 },
        { from: 2, to: 3, weight: 2 }, { from: 1, to: 4, weight: 1 },
        { from: 2, to: 5, weight: 1 }, { from: 3, to: 6, weight: 1 },
      ],
    },
    theory: {
      nodes: [
        { x: 350, y: 60, r: 32, label: "SRL Theory", sub: "Zimmerman", color: "#2D6A4F" },
        { x: 170, y: 150, r: 28, label: "Metacognition", sub: "Flavell", color: "#2D6A4F" },
        { x: 530, y: 140, r: 26, label: "Cognitive Load", sub: "Sweller", color: "#1E3A5F" },
        { x: 250, y: 260, r: 24, label: "TAM", sub: "Davis", color: "#1E3A5F" },
        { x: 450, y: 270, r: 24, label: "Feedback", sub: "Carless", color: "#64748b" },
        { x: 350, y: 170, r: 22, label: "Pintrich", sub: "Model", color: "#2D6A4F" },
      ],
      edges: [
        { from: 0, to: 1, weight: 3 }, { from: 0, to: 2, weight: 2 },
        { from: 0, to: 5, weight: 3 }, { from: 1, to: 5, weight: 2 },
        { from: 2, to: 3, weight: 1 }, { from: 3, to: 4, weight: 1 },
        { from: 5, to: 4, weight: 1 },
      ],
    },
    method: {
      nodes: [
        { x: 350, y: 70, r: 32, label: "Systematic", sub: "Review", color: "#1E3A5F" },
        { x: 170, y: 170, r: 28, label: "Meta-Analysis", color: "#1E3A5F" },
        { x: 530, y: 160, r: 26, label: "Mixed Methods", color: "#2D6A4F" },
        { x: 250, y: 290, r: 22, label: "RCT", color: "#64748b" },
        { x: 450, y: 280, r: 22, label: "Design-Based", sub: "Research", color: "#64748b" },
        { x: 350, y: 200, r: 20, label: "Narrative", sub: "Review", color: "#64748b" },
      ],
      edges: [
        { from: 0, to: 1, weight: 3 }, { from: 0, to: 5, weight: 2 },
        { from: 1, to: 2, weight: 1 }, { from: 2, to: 3, weight: 2 },
        { from: 2, to: 4, weight: 2 }, { from: 5, to: 4, weight: 1 },
      ],
    },
  };

  const config = configs[viewType] || configs.topic;

  return (
    <svg viewBox="0 0 700 400" className="w-full h-full">
      {/* Edges */}
      {config.edges.map((edge, i) => {
        const from = config.nodes[edge.from];
        const to = config.nodes[edge.to];
        return (
          <line
            key={`edge-${i}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={from.color}
            strokeWidth={edge.weight}
            opacity={0.15 + edge.weight * 0.05}
          />
        );
      })}
      {/* Nodes */}
      {config.nodes.map((node, i) => (
        <g key={`node-${i}`} className="cursor-pointer">
          <circle
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill={node.color}
            opacity={0.85}
          />
          <text
            x={node.x}
            y={node.sub ? node.y - 4 : node.y + 3}
            textAnchor="middle"
            fill="white"
            fontSize={node.r > 25 ? 9 : 7}
            fontWeight="600"
          >
            {node.label}
          </text>
          {node.sub && (
            <text
              x={node.x}
              y={node.y + 8}
              textAnchor="middle"
              fill="white"
              fontSize={7}
              opacity={0.8}
            >
              {node.sub}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

function TimelineView() {
  const items = [
    { year: "2018", label: "Early AI tutoring studies", color: "#64748b" },
    { year: "2020", label: "SRL in tech environments gains attention", color: "#2D6A4F" },
    { year: "2022", label: "Metacognition + ITS research emerges", color: "#1E3A5F" },
    { year: "2023", label: "Kim & Park meta-analysis on SRL + tech", color: "#2D6A4F" },
    { year: "2024", label: "Chen et al. comprehensive AI-Ed review", color: "#1E3A5F" },
    { year: "2025", label: "Rodriguez et al. ITS + metacognition", color: "#dc2626" },
  ];

  return (
    <div className="flex items-center h-full px-12">
      <div className="w-full">
        {/* Timeline line */}
        <div className="relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200" />
          <div className="flex justify-between relative">
            {items.map((item, i) => (
              <div key={i} className="flex flex-col items-center" style={{ width: `${100 / items.length}%` }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[9px] font-bold z-10 relative"
                  style={{ backgroundColor: item.color }}
                >
                  {item.year.slice(2)}
                </div>
                <p className="text-[10px] font-semibold text-slate-700 mt-2">
                  {item.year}
                </p>
                <p className="text-[9px] text-slate-500 text-center mt-1 max-w-[100px] leading-tight">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SynthesisTableView() {
  const rows = [
    {
      paper: "Chen et al. (2024)",
      topic: "AI Adaptive Learning",
      theory: "SRL + TAM",
      method: "Systematic Review",
      finding: "AI improves scores; SRL gap",
    },
    {
      paper: "Kim & Park (2023)",
      topic: "SRL in Tech",
      theory: "SRL (Pintrich)",
      method: "Meta-Analysis",
      finding: "Tech scaffolds support SRL (d=0.42)",
    },
    {
      paper: "Rodriguez et al. (2025)",
      topic: "ITS + Metacognition",
      theory: "Metacognition + CLT",
      method: "Design-Based",
      finding: "23% metacognitive improvement",
    },
    {
      paper: "Williams & Brown (2024)",
      topic: "AI Writing Feedback",
      theory: "Feedback Literacy",
      method: "Mixed Methods",
      finding: "Structure improved; argumentation limited",
    },
  ];

  return (
    <div className="p-6 h-full overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-3 px-3 font-semibold text-slate-600">Paper</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-600">Topic</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-600">Theory</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-600">Method</th>
            <th className="text-left py-3 px-3 font-semibold text-slate-600">Key Finding</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors"
            >
              <td className="py-3 px-3 font-medium text-slate-800">{row.paper}</td>
              <td className="py-3 px-3 text-slate-600">{row.topic}</td>
              <td className="py-3 px-3 text-slate-600">{row.theory}</td>
              <td className="py-3 px-3 text-slate-600">{row.method}</td>
              <td className="py-3 px-3 text-slate-600">{row.finding}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}