import { useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  GripVertical,
  PenTool,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  DUMMY_ARTIFACTS,
  ARTIFACT_TYPE_META,
} from "@/lib/data";
import { cn } from "@/lib/utils";

const INITIAL_DRAFT = `# Introduction

The integration of artificial intelligence in educational settings has garnered significant attention in recent years. AI-powered tutoring systems, in particular, have shown promise in improving student learning outcomes through personalized instruction and adaptive feedback mechanisms (Chen et al., 2024).

However, a critical gap exists in our understanding of how these systems affect deeper learning processes. While studies consistently demonstrate improvements in test scores and completion rates, the impact on self-regulated learning (SRL) — the ability of students to plan, monitor, and evaluate their own learning — remains largely unexplored.

Self-regulated learning, as conceptualized by Zimmerman (2002) and Pintrich (2000), involves three cyclical phases: forethought (planning), performance (monitoring), and self-reflection (evaluation). Technology-enhanced learning environments have shown moderate effects on SRL development (Kim & Park, 2023, d=0.42), particularly in planning and monitoring phases. Yet, the specific mechanisms through which AI tutoring systems interact with these processes remain unclear.

## The Paradox of AI Scaffolding

A fundamental tension exists between AI-powered scaffolding and learner autonomy. While adaptive systems can provide precisely calibrated support, this very precision may reduce students' need to develop their own regulatory strategies. Rodriguez et al. (2025) found that intelligent tutoring systems with explicit metacognitive prompts improved metacognitive awareness by 23%, suggesting that intentional design can bridge this gap.

## Research Question

How do AI-powered adaptive tutoring systems influence the development of self-regulated learning strategies among graduate students, and what design features mediate this relationship?

## Significance

This research addresses a critical gap at the intersection of AI in education and self-regulated learning theory. By examining not just whether AI tutoring "works" (in terms of performance outcomes) but how it affects the development of learning processes, this study contributes to both theoretical understanding and practical design guidelines for educational technology.`;

export default function DraftStudio() {
  const [draftContent, setDraftContent] = useState(INITIAL_DRAFT);
  const [insertedNotes, setInsertedNotes] = useState<string[]>([]);

  const materials = DUMMY_ARTIFACTS.filter((a) =>
    [
      "purpose",
      "literature-note",
      "permanent-note",
      "rq-draft",
      "visualization",
    ].includes(a.type)
  );

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-0px)]">
        {/* Left: Materials Sidebar */}
        <div className="w-64 border-r border-slate-700/50 bg-slate-800/40/50 shrink-0 flex flex-col">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Materials Library
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Click to insert into your draft
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {materials.map((artifact) => {
                const typeMeta = ARTIFACT_TYPE_META[artifact.type];
                const isInserted = insertedNotes.includes(artifact.id);
                return (
                  <div
                    key={artifact.id}
                    onClick={() => {
                      if (!isInserted) {
                        setInsertedNotes([...insertedNotes, artifact.id]);
                        if (artifact.content) {
                          setDraftContent(
                            draftContent +
                              "\n\n---\n*[Inserted from: " +
                              artifact.title +
                              "]*\n\n" +
                              artifact.content
                          );
                        }
                      }
                    }}
                    className={cn(
                      "p-3 rounded-lg border transition-all cursor-pointer group",
                      isInserted
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-slate-700/50 bg-[#0d1b30] hover:border-cyan-600 hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <GripVertical className="w-3 h-3 text-slate-300 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[9px] px-1.5 py-0 mb-1",
                            typeMeta.bgColor,
                            typeMeta.color
                          )}
                        >
                          {typeMeta.label}
                        </Badge>
                        <p
                          className={cn(
                            "text-xs font-medium line-clamp-2",
                            isInserted
                              ? "text-emerald-700"
                              : "text-slate-700 group-hover:text-cyan-300"
                          )}
                        >
                          {artifact.title}
                        </p>
                        {isInserted && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-600">
                            <CheckCircle2 className="w-3 h-3" />
                            Inserted
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="p-3 border-t border-slate-700/50 space-y-1.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Insert Permanent Note
            </Button>
          </div>
        </div>

        {/* Center: Writing Editor */}
        <div className="flex-1 flex flex-col">
          {/* Editor Header */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-600 flex items-center justify-center">
                <PenTool className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-200">
                  Draft Studio
                </h2>
                <p className="text-[10px] text-slate-400">
                  AI in Education — Introduction Draft
                </p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="text-xs h-7">
                <Sparkles className="w-3 h-3 mr-1" />
                Generate Paragraph Skeleton
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7">
                <Download className="w-3 h-3 mr-1" />
                Export Markdown
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7">
                <FileText className="w-3 h-3 mr-1" />
                Export Word
              </Button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto">
              <Textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                className="min-h-[600px] text-sm leading-relaxed font-mono border-0 shadow-none focus-visible:ring-0 resize-none p-0"
                placeholder="Start writing your draft..."
              />
            </div>
          </div>

          {/* Editor Footer */}
          <div className="flex items-center justify-between px-6 py-2 border-t border-slate-700/50 bg-slate-800/40/50">
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
              <span>{draftContent.split(/\s+/).length} words</span>
              <span>{draftContent.split("\n").length} lines</span>
              <span>
                {(draftContent.match(/\([^)]*\d{4}[^)]*\)/g) || []).length}{" "}
                citations
              </span>
            </div>
            <div className="flex gap-2">
              <Link to="/workflow/3">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  Back to Reading
                </Button>
              </Link>
              <Link to="/visualization">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Back to Visualization
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}