import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Import,
  Play,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  DUMMY_PROJECT,
  DUMMY_ARTIFACTS,
  STEP_META,
  ARTIFACT_TYPE_META,
  type WorkflowStep,
} from "@/lib/data";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const project = DUMMY_PROJECT;
  const stepMeta = STEP_META[project.currentStep];
  const progressPercent = ((project.currentStep - 1) / 5) * 100;
  const latestArtifacts = DUMMY_ARTIFACTS.slice(-4).reverse();

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {project.title}
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              {project.goal}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs">
              <Import className="w-3.5 h-3.5 mr-1.5" />
              Import Papers
            </Button>
            <Link to={`/workflow/${project.currentStep}`}>
              <Button
                size="sm"
                className="text-xs bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
              >
                <Play className="w-3.5 h-3.5 mr-1.5" />
                Continue Current Step
              </Button>
            </Link>
          </div>
        </div>

        {/* Workflow Progress */}
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Workflow Progress
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Step {project.currentStep} of 6 —{" "}
                  {stepMeta.label}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-[#1E3A5F] border-[#1E3A5F]/30 bg-blue-50"
              >
                {Math.round(progressPercent)}% Complete
              </Badge>
            </div>

            {/* Step Progress Bar */}
            <div className="flex items-center gap-1 mb-2">
              {([1, 2, 3, 4, 5, 6] as WorkflowStep[]).map((step) => {
                const meta = STEP_META[step];
                const isCompleted = step < project.currentStep;
                const isCurrent = step === project.currentStep;
                return (
                  <Link
                    key={step}
                    to={`/workflow/${step}`}
                    className="flex-1"
                  >
                    <div
                      className={cn(
                        "relative group cursor-pointer"
                      )}
                    >
                      <div
                        className={cn(
                          "h-2 rounded-full transition-colors",
                          isCompleted && "bg-emerald-500",
                          isCurrent && "bg-[#1E3A5F]",
                          !isCompleted &&
                            !isCurrent &&
                            "bg-slate-200"
                        )}
                      />
                      <div className="flex items-center gap-1 mt-2">
                        {isCompleted ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <span
                            className={cn(
                              "text-[10px] font-medium",
                              isCurrent
                                ? "text-[#1E3A5F]"
                                : "text-slate-400"
                            )}
                          >
                            {step}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-[10px] hidden sm:inline",
                            isCompleted && "text-emerald-600",
                            isCurrent &&
                              "text-[#1E3A5F] font-medium",
                            !isCompleted &&
                              !isCurrent &&
                              "text-slate-400"
                          )}
                        >
                          {meta.shortLabel}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Iteration hint */}
            <div className="flex items-center gap-1.5 mt-4 p-2 bg-slate-50 rounded-md">
              <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
              <p className="text-[11px] text-slate-500">
                This is an iterative workflow — you can always go back to
                earlier steps to refine your research.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Today's Target */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1E3A5F]" />
                Today's Target
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{stepMeta.icon}</span>
                  <span className="text-sm font-medium text-slate-800">
                    {stepMeta.label}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  {stepMeta.description}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className="line-through text-slate-400">
                      Define initial keywords
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-4 h-4 rounded border border-[#1E3A5F] bg-blue-50" />
                    <span>Search Web of Science with refined query</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <div className="w-4 h-4 rounded border border-slate-300" />
                    <span>Select 1-2 entry papers from results</span>
                  </div>
                </div>
              </div>
              <Link to={`/workflow/${project.currentStep}`}>
                <Button
                  size="sm"
                  className="w-full text-xs bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                >
                  Start Today's Task
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Next Suggested Move */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Next Suggested Move
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-1">
                  Refine your search strategy
                </p>
                <p className="text-xs text-amber-700">
                  You have 3 search records. Consider adding searches
                  in Scopus and ERIC databases to broaden your coverage.
                  Then select your entry paper.
                </p>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-lg">
                <p className="text-sm font-medium text-emerald-800 mb-1">
                  Ready for entry paper selection
                </p>
                <p className="text-xs text-emerald-700">
                  Chen et al. (2024) looks like a strong entry paper —
                  it's a comprehensive review that maps the field well.
                </p>
              </div>
              <div className="flex gap-2">
                <Link to="/workflow/2" className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    Go to Entry Paper Selection
                  </Button>
                </Link>
                <Link to="/artifacts" className="flex-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                  >
                    View Artifacts
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Latest Artifacts */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#2D6A4F]" />
                Latest Artifacts
              </CardTitle>
              <Link to="/artifacts">
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {latestArtifacts.map((artifact) => {
                const typeMeta = ARTIFACT_TYPE_META[artifact.type];
                return (
                  <div
                    key={artifact.id}
                    className="p-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          typeMeta.bgColor,
                          typeMeta.color
                        )}
                      >
                        {typeMeta.label}
                      </Badge>
                      <span className="text-[10px] text-slate-400">
                        Step {artifact.sourceStep}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-800 mb-1 group-hover:text-[#1E3A5F] transition-colors line-clamp-1">
                      {artifact.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {artifact.description}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      {artifact.updatedAt}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Hero Image */}
        <div className="relative rounded-xl overflow-hidden h-48">
          <img
            src="https://mgx-backend-cdn.metadl.com/generate/images/1012783/2026-03-09/7ac7d52d-7c9d-4f74-b291-3cc99fc97791.png"
            alt="Academic workspace"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/80 to-transparent flex items-center">
            <div className="p-6">
              <h2 className="text-white text-lg font-semibold mb-1">
                Your Research, Your Workflow
              </h2>
              <p className="text-white/80 text-xs max-w-md">
                Not just managing files — driving your research forward
                with structured artifacts and clear next steps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}