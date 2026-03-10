import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Target,
  Search,
  BookOpen,
  Network,
  Eye,
  PenTool,
  LayoutDashboard,
  Archive,
  FileText,
  Map,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
  Bot,
  FolderOpen,
  Plus,
  X,
  Crown,
} from "lucide-react";
import { DUMMY_PROJECT, DUMMY_PROJECTS, STEP_META, type WorkflowStep, type ProjectItem } from "@/lib/data";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/workflow/1", label: "1. Purpose", icon: Target },
  { path: "/workflow/2", label: "2. Discover", icon: Search },
  { path: "/workflow/3", label: "3. Read", icon: BookOpen },
  { path: "/workflow/4", label: "4. Expand", icon: Network },
  { path: "/workflow/5", label: "5. Visualize", icon: Eye },
  { path: "/workflow/6", label: "6. Draft", icon: PenTool },
];

const ARTIFACT_NAV_ITEMS = [
  { path: "/artifacts?tab=all", label: "All Artifacts", icon: Archive },
  { path: "/artifacts?tab=purpose", label: "Purpose Cards", icon: Target },
  { path: "/artifacts?tab=search", label: "Search Logs", icon: Search },
  { path: "/artifacts?tab=notes", label: "Notes", icon: FileText },
  { path: "/artifacts?tab=drafts", label: "Drafts", icon: PenTool },
  { path: "/artifacts?tab=visual", label: "Visualizations", icon: Map },
];



const STEP_ICONS: Record<WorkflowStep, typeof Target> = {
  1: Target,
  2: Search,
  3: BookOpen,
  4: Network,
  5: Eye,
  6: PenTool,
};

interface AppLayoutProps {
  children: ReactNode;
  showRightPanel?: boolean;
  rightPanelContent?: ReactNode;
}

export default function AppLayout({
  children,
  showRightPanel = true,
  rightPanelContent,
}: AppLayoutProps) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const project = DUMMY_PROJECT;
  const progressPercent = ((project.currentStep - 1) / 5) * 100;

  // Project switcher state
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([...DUMMY_PROJECTS]);
  const [activeProjectId, setActiveProjectId] = useState("proj-1");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectGoal, setNewProjectGoal] = useState("");

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  const handleCreateProject = () => {
    if (!newProjectTitle.trim()) return;
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: newProjectTitle.trim(),
      goal: newProjectGoal.trim(),
      currentStep: 1,
      updatedAt: new Date().toISOString().split("T")[0],
    };
    setProjects([...projects, newProj]);
    setActiveProjectId(newProj.id);
    setNewProjectTitle("");
    setNewProjectGoal("");
    setShowNewProject(false);
    setShowProjectSwitcher(false);
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Left Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-slate-200 bg-slate-50/80 transition-all duration-300 shrink-0",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-slate-200 shrink-0">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#1E3A5F] flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm text-slate-800 truncate">
                Academic Workspace
              </span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-7 h-7 rounded-lg bg-[#1E3A5F] flex items-center justify-center mx-auto">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        {/* Project Info */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-slate-200 shrink-0">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
              Current Project
            </p>
            <p className="text-sm font-medium text-slate-800 truncate">
              {activeProject.title}
            </p>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Step {activeProject.currentStep} of 6</span>
                <span>{Math.round(((activeProject.currentStep - 1) / 5) * 100)}%</span>
              </div>
              <Progress value={((activeProject.currentStep - 1) / 5) * 100} className="h-1.5" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            {!sidebarCollapsed && (
              <p className="text-[10px] uppercase tracking-wider text-slate-400 px-2 pt-2 pb-1">
                Workflow
              </p>
            )}
            {NAV_ITEMS.map((item, idx) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== "/" &&
                  location.pathname.startsWith(item.path));
              const Icon = item.icon;
              const stepNum = idx;
              const isCompleted = stepNum > 0 && stepNum < project.currentStep;
              const isCurrent = stepNum === project.currentStep;

              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-[#1E3A5F] text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      sidebarCollapsed && "justify-center px-0"
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : isCurrent && !isActive ? (
                      <div className="relative shrink-0">
                        <Icon className="w-4 h-4" />
                        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full" />
                      </div>
                    ) : (
                      <Icon className="w-4 h-4 shrink-0" />
                    )}
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                </Link>
              );
            })}

            {!sidebarCollapsed && (
              <p className="text-[10px] uppercase tracking-wider text-slate-400 px-2 pt-4 pb-1">
                Artifacts
              </p>
            )}
            {sidebarCollapsed && <Separator className="my-2" />}
            {ARTIFACT_NAV_ITEMS.map((item) => {
              const isActive = location.pathname + location.search === item.path ||
                (location.pathname === "/artifacts" && item.path.includes("tab=all") && !location.search);
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-[#1E3A5F] text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      sidebarCollapsed && "justify-center px-0"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </div>
                </Link>
              );
            })}


          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="p-2 border-t border-slate-200 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Project Switcher */}
        <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-end px-4 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-700 font-medium max-w-[180px] truncate">
                {activeProject.title}
              </span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                Step {activeProject.currentStep}
              </Badge>
              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", showProjectSwitcher && "rotate-180")} />
            </button>

            {/* Project Switcher Dropdown */}
            {showProjectSwitcher && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setShowProjectSwitcher(false); setShowNewProject(false); }} />
                <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-3 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Switch Project
                      </p>
                      <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">
                        <Crown className="w-2.5 h-2.5 mr-0.5" />
                        Premium
                      </Badge>
                    </div>
                  </div>
                  <ScrollArea className="max-h-[240px]">
                    <div className="p-2 space-y-1">
                      {projects.map((proj) => (
                        <button
                          key={proj.id}
                          onClick={() => {
                            setActiveProjectId(proj.id);
                            setShowProjectSwitcher(false);
                          }}
                          className={cn(
                            "w-full text-left p-3 rounded-lg transition-all",
                            proj.id === activeProjectId
                              ? "bg-[#1E3A5F]/5 border border-[#1E3A5F]/20"
                              : "hover:bg-slate-50 border border-transparent"
                          )}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-medium text-slate-800 truncate">
                              {proj.title}
                            </span>
                            {proj.id === activeProjectId && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#1E3A5F] shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{proj.goal}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] px-1 py-0">
                              Step {proj.currentStep}/6
                            </Badge>
                            <span className="text-[9px] text-slate-300">{proj.updatedAt}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-2 border-t border-slate-100">
                    {showNewProject ? (
                      <div className="p-2 space-y-2">
                        <Input
                          value={newProjectTitle}
                          onChange={(e) => setNewProjectTitle(e.target.value)}
                          placeholder="Project title..."
                          className="text-xs h-8"
                          autoFocus
                        />
                        <Input
                          value={newProjectGoal}
                          onChange={(e) => setNewProjectGoal(e.target.value)}
                          placeholder="Research goal (optional)..."
                          className="text-xs h-8"
                        />
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="text-xs h-7 bg-[#1E3A5F] hover:bg-[#162d4a] text-white flex-1"
                            onClick={handleCreateProject}
                          >
                            Create
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7"
                            onClick={() => {
                              setShowNewProject(false);
                              setNewProjectTitle("");
                              setNewProjectGoal("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8"
                        onClick={() => setShowNewProject(true)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        New Project
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>

      {/* Right Panel */}
      {showRightPanel && (
        <aside
          className={cn(
            "border-l border-slate-200 bg-slate-50/50 transition-all duration-300 shrink-0 flex flex-col",
            rightPanelCollapsed ? "w-10" : "w-72"
          )}
        >
          <div className="flex items-center justify-between px-3 h-14 border-b border-slate-200 shrink-0">
            {!rightPanelCollapsed && (
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Assistant
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            >
              {rightPanelCollapsed ? (
                <ChevronLeft className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>

          {!rightPanelCollapsed && (
            <ScrollArea className="flex-1">
              {rightPanelContent || <DefaultRightPanel />}
            </ScrollArea>
          )}
        </aside>
      )}
    </div>
  );
}

function DefaultRightPanel() {
  const project = DUMMY_PROJECT;
  const stepMeta = STEP_META[project.currentStep];

  return (
    <div className="p-4 space-y-5">
      {/* Current Goal */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Current Goal
        </h4>
        <div className="p-3 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{stepMeta.icon}</span>
            <span className="text-sm font-medium text-slate-800">
              {stepMeta.label}
            </span>
          </div>
          <p className="text-xs text-slate-500">{stepMeta.description}</p>
        </div>
      </div>

      {/* Completion */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Progress
        </h4>
        <div className="space-y-2">
          {([1, 2, 3, 4, 5, 6] as WorkflowStep[]).map((step) => {
            const meta = STEP_META[step];
            const Icon = STEP_ICONS[step];
            const isCompleted = step < project.currentStep;
            const isCurrent = step === project.currentStep;
            return (
              <div
                key={step}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-xs",
                  isCompleted && "text-emerald-700",
                  isCurrent && "text-[#1E3A5F] font-medium bg-blue-50",
                  !isCompleted && !isCurrent && "text-slate-400"
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : isCurrent ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#1E3A5F] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1E3A5F]" />
                  </div>
                ) : (
                  <Circle className="w-3.5 h-3.5" />
                )}
                <span>{meta.shortLabel}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Suggested Move */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Next Suggested Move
        </h4>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-800">
                Complete keyword search
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Add 2 more search records to strengthen your search log
              </p>
            </div>
          </div>
          <Link to={`/workflow/${project.currentStep}`}>
            <Button
              size="sm"
              className="w-full mt-2 h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              Go <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* AI Copilot Placeholder */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          AI Copilot
        </h4>
        <div className="p-3 bg-white border border-dashed border-slate-300 rounded-lg text-center">
          <Bot className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">
            AI assistant coming soon
          </p>
          <p className="text-[10px] text-slate-300 mt-1">
            Get suggestions, summaries, and writing help
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Quick Actions
        </h4>
        <div className="space-y-1.5">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start h-8 text-xs"
          >
            <FileText className="w-3.5 h-3.5 mr-2" />
            Import Papers
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start h-8 text-xs"
          >
            <Archive className="w-3.5 h-3.5 mr-2" />
            View All Artifacts
          </Button>
        </div>
      </div>
    </div>
  );
}