import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Users,
  ChevronDown,
  CheckCircle2,
  Plus,
  X,
  Crown,
  Globe,
  PanelLeftOpen,
  PanelLeftClose,
  Bot,
  Send,
  Minimize2,
} from "lucide-react";
import { type WorkflowStep, type ProjectItem } from "@/lib/data";
import { projectAPI } from "@/lib/manuscript-api";

const BRAND_FAVICON_URL = "https://public-frontend-cos.metadl.com/mgx/img/favicon_atoms.ico";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Project switcher state
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectGoal, setNewProjectGoal] = useState("");

  const reloadProjects = async () => {
    try {
      const items = await projectAPI.list();
      const mapped: ProjectItem[] = items.map((item) => ({
        id: item.id,
        title: item.title,
        goal: item.description || "",
        currentStep: 1,
        updatedAt: (item.updated_at || "").split("T")[0] || new Date().toISOString().split("T")[0],
      }));
      setProjects(mapped);
      if (mapped.length > 0) {
        setActiveProjectId((prev) => prev || mapped[0].id);
      }
    } catch {
      setProjects([]);
    }
  };

  useEffect(() => {
    void reloadProjects();
  }, []);

  useEffect(() => {
    const workflowMatch = location.pathname.match(/^\/workflow\/([^/]+)\//);
    if (workflowMatch?.[1]) {
      setActiveProjectId(workflowMatch[1]);
      return;
    }

    if (location.pathname === "/artifacts") {
      const projectIdFromQuery = searchParams.get("projectId");
      if (projectIdFromQuery) {
        setActiveProjectId(projectIdFromQuery);
      }
    }
  }, [location.pathname, searchParams]);

  // Language switcher state
  const [showLangSwitcher, setShowLangSwitcher] = useState(false);

  // AI Assistant chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >([
    {
      id: "welcome",
      role: "assistant",
      content: lang === "zh"
        ? "你好！我是 LitFlow AI 助手。我可以帮助你进行文献综述的各个环节，包括研究问题构建、文献检索策略、阅读笔记整理等。请问有什么可以帮你的？"
        : "Hello! I'm the LitFlow AI Assistant. I can help you with various aspects of your literature review, including research question formulation, search strategies, reading notes, and more. How can I help you?",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, showChat]);

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0] || {
    id: "",
    title: lang === "zh" ? "暂无项目" : "No Project",
    goal: lang === "zh" ? "请先创建项目以开始工作流。" : "Create a project to start the workflow.",
    currentStep: 1 as WorkflowStep,
    updatedAt: new Date().toISOString().split("T")[0],
  };

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return;
    const projectId = `proj-${Date.now()}`;
    await projectAPI.ensure({
      id: projectId,
      title: newProjectTitle.trim(),
      description: newProjectGoal.trim(),
    });
    await reloadProjects();
    setActiveProjectId(projectId);
    setNewProjectTitle("");
    setNewProjectGoal("");
    setShowNewProject(false);
    setShowProjectSwitcher(false);
  };

  const handleSendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const userMsg = {
      id: `msg-${Date.now()}`,
      role: "user" as const,
      content: trimmed,
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant" as const,
        content: lang === "zh"
          ? "感谢你的提问！这是一个很好的研究方向。基于你当前的工作流进度，我建议你可以先完善关键词定义，然后在多个学术数据库中进行系统检索。如果你需要更具体的建议，请告诉我你的研究主题和当前遇到的困难。"
          : "Thank you for your question! That's a great research direction. Based on your current workflow progress, I suggest refining your keyword definitions first, then conducting systematic searches across multiple academic databases. If you need more specific advice, please share your research topic and current challenges.",
      };
      setChatMessages((prev) => [...prev, aiResponse]);
    }, 1200);
  };

  const NAV_ITEMS = [
    { id: "wf-purpose", path: activeProject.id ? `/workflow/${activeProject.id}/1` : "/", label: t("nav.purpose"), icon: Target },
    { id: "wf-discover", path: activeProject.id ? `/workflow/${activeProject.id}/2` : "/", label: t("nav.discover"), icon: Search },
    { id: "wf-read", path: activeProject.id ? `/workflow/${activeProject.id}/3` : "/", label: t("nav.read"), icon: BookOpen },
    { id: "wf-expand", path: activeProject.id ? `/workflow/${activeProject.id}/4` : "/", label: t("nav.expand"), icon: Network },
    { id: "wf-visualize", path: activeProject.id ? `/workflow/${activeProject.id}/5` : "/", label: t("nav.visualize"), icon: Eye },
    { id: "wf-draft", path: activeProject.id ? `/workflow/${activeProject.id}/6` : "/", label: t("nav.draft"), icon: PenTool },
  ];

  const withProjectScope = (tab: string) =>
    activeProject.id ? `/artifacts?tab=${tab}&projectId=${activeProject.id}` : `/artifacts?tab=${tab}`;

  const ARTIFACT_NAV_ITEMS = [
    { path: withProjectScope("all"), label: t("nav.allArtifacts"), icon: Archive },
    { path: withProjectScope("purpose"), label: t("nav.purposeCards"), icon: Target },
    { path: withProjectScope("search"), label: t("nav.searchLogs"), icon: Search },
    { path: withProjectScope("notes"), label: t("nav.notes"), icon: FileText },
    { path: withProjectScope("drafts"), label: t("nav.drafts"), icon: PenTool },
    { path: withProjectScope("visual"), label: t("nav.visualizations"), icon: Map },
  ];

  return (
    <div className="flex h-screen bg-[#061423] overflow-hidden">
      {/* Left Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-slate-700/30 bg-[#061423] transition-all duration-300 shrink-0",
          sidebarCollapsed ? "w-0 overflow-hidden border-r-0" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-300/30 flex items-center justify-center shrink-0">
              <img src={BRAND_FAVICON_URL} alt="Research Workspace logo" className="w-4 h-4" />
            </div>
            <span className="font-semibold text-sm text-slate-200 truncate">
              {t("app.title")}
            </span>
          </div>
        </div>

        {/* Project Info + Switcher */}
        <div className="px-4 py-3 border-b border-slate-700/30 shrink-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
            {t("app.currentProject")}
          </p>
          <button
            onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
            className="w-full text-left flex items-center justify-between gap-1 group"
          >
            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
              {activeProject.title}
            </p>
            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform", showProjectSwitcher && "rotate-180")} />
          </button>
          <Link to="/" className="mt-3 block">
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border",
                location.pathname === "/"
                  ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40"
                  : "text-slate-400 border-slate-700/40 hover:bg-slate-800/60 hover:text-slate-200"
              )}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="truncate">{t("nav.dashboard")}</span>
            </div>
          </Link>

          <Link to="/projects/members" className="mt-2 block">
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border",
                location.pathname === "/projects/members"
                  ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40"
                  : "text-slate-400 border-slate-700/40 hover:bg-slate-800/60 hover:text-slate-200"
              )}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">Project Members</span>
            </div>
          </Link>

          {showProjectSwitcher && (
            <div className="mt-2 bg-[#0a1a2b] rounded-lg shadow-xl border border-slate-700/50 overflow-hidden">
              <div className="p-2 border-b border-slate-700/40">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {t("app.switchProject")}
                  </p>
                  <Badge className="text-[8px] bg-cyan-100 text-cyan-700 border-cyan-200">
                    <Crown className="w-2 h-2 mr-0.5" />
                    {t("app.premium")}
                  </Badge>
                </div>
              </div>
              <ScrollArea className="max-h-[200px]">
                <div className="p-1.5 space-y-0.5">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setActiveProjectId(proj.id);
                        setShowProjectSwitcher(false);
                        if (location.pathname.startsWith("/workflow/")) {
                          const stepMatch = location.pathname.match(/^\/workflow\/[^/]+\/(\d+)/);
                          const step = stepMatch?.[1] || "1";
                          navigate(`/workflow/${proj.id}/${step}`);
                          return;
                        }

                        if (location.pathname === "/artifacts") {
                          const tab = searchParams.get("tab") || "all";
                          navigate(`/artifacts?tab=${tab}&projectId=${proj.id}`);
                        }
                      }}
                      data-selected={proj.id === activeProjectId}
                      className={cn(
                        "w-full text-left p-2 rounded-md transition-all border record-item",
                        proj.id === activeProjectId
                          ? "border-cyan-500/40"
                          : "border-slate-700/40"
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-slate-200 truncate record-item-title">
                          {proj.title}
                        </span>
                        {proj.id === activeProjectId && (
                          <CheckCircle2 className="w-3 h-3 text-cyan-300 shrink-0" />
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 truncate">{proj.goal}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[8px] px-1 py-0">
                          {t("app.step")} {proj.currentStep}/6
                        </Badge>
                        <span className="text-[8px] text-slate-300">{proj.updatedAt}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-1.5 border-t border-slate-700/40">
                {showNewProject ? (
                  <div className="p-1.5 space-y-1.5">
                    <Input
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder={t("app.projectTitle")}
                      className="text-xs h-7 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                      autoFocus
                    />
                    <Input
                      value={newProjectGoal}
                      onChange={(e) => setNewProjectGoal(e.target.value)}
                      placeholder={t("app.researchGoal")}
                      className="text-xs h-7 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                    />
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="text-[10px] h-6 bg-cyan-500 hover:bg-cyan-600 text-white flex-1"
                        onClick={handleCreateProject}
                      >
                        {t("app.create")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-[10px] h-6"
                        onClick={() => {
                          setShowNewProject(false);
                          setNewProjectTitle("");
                          setNewProjectGoal("");
                        }}
                      >
                        {t("app.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-[10px] h-7"
                    onClick={() => setShowNewProject(true)}
                  >
                    <Plus className="w-2.5 h-2.5 mr-1" />
                    {t("app.newProject")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-2 space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 px-2 pt-2 pb-1">
              {t("nav.workflow")}
            </p>
            {NAV_ITEMS.map((item, idx) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== "/" && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              const stepNum = idx;
              const isCompleted = stepNum > 0 && stepNum < activeProject.currentStep;
              const isCurrent = stepNum === activeProject.currentStep;

              return (
                <Link key={item.id} to={item.path}>
                  <div
                    data-selected={isActive}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                      isActive
                        ? "text-cyan-200 border-cyan-500/30"
                        : "text-slate-400 border-slate-700/40"
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
                    <span className="truncate record-item-title">{item.label}</span>
                  </div>
                </Link>
              );
            })}

            <p className="text-[10px] uppercase tracking-wider text-slate-500 px-2 pt-4 pb-1">
              {t("nav.artifacts")}
            </p>
            {ARTIFACT_NAV_ITEMS.map((item) => {
              const isActive =
                location.pathname + location.search === item.path ||
                (location.pathname === "/artifacts" && item.path.includes("tab=all") && !location.search);
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}>
                  <div
                    data-selected={isActive}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                      isActive
                        ? "text-cyan-200 border-cyan-500/30"
                        : "text-slate-400 border-slate-700/40"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate record-item-title">{item.label}</span>
                  </div>
                </Link>
              );
            })}

            <p className="text-[10px] uppercase tracking-wider text-slate-500 px-2 pt-4 pb-1">
              {lang === "zh" ? "文件管理" : "Files"}
            </p>
            <Link to="/pdf-manager">
              <div
                data-selected={location.pathname === "/pdf-manager"}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                  location.pathname === "/pdf-manager"
                    ? "text-cyan-200 border-cyan-500/30"
                    : "text-slate-400 border-slate-700/40"
                )}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate record-item-title">{lang === "zh" ? "PDF 管理" : "PDF Manager"}</span>
              </div>
            </Link>
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="h-12 border-b border-slate-700/30 bg-[#061423] flex items-center px-2 shrink-0">
          {/* Left toggle button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-lg border transition-all text-xs font-medium",
              sidebarCollapsed
                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20"
                : "border-slate-700/50 bg-slate-800/40 text-slate-400 hover:bg-slate-800/70"
            )}
            title={sidebarCollapsed ? t("app.expandSidebar") : t("app.collapseSidebar")}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
            <span>{sidebarCollapsed ? t("app.menu") : t("app.hideMenu")}</span>
          </button>

          {/* Center: app title when sidebar collapsed */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            {sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-cyan-500/20 border border-cyan-300/30 flex items-center justify-center">
                  <img src={BRAND_FAVICON_URL} alt="Research Workspace logo" className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold text-slate-200 hidden sm:inline">
                  {t("app.title")}
                </span>
              </div>
            )}
          </div>

          {/* Right: Language switcher */}
          <div className="flex items-center gap-2">
            {!user ? (
              <>
                <Link to="/auth/register">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    {lang === "zh" ? "注册" : "Register"}
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button size="sm" className="h-8 text-xs bg-cyan-500 hover:bg-cyan-600">
                    {lang === "zh" ? "登录" : "Login"}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">
                  {user.name || user.email}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    void logout();
                  }}
                >
                  {lang === "zh" ? "退出" : "Logout"}
                </Button>
              </>
            )}
            <div className="relative">
              <button
                onClick={() => setShowLangSwitcher(!showLangSwitcher)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700/50 hover:border-slate-500/60 hover:bg-slate-800/50 transition-all text-sm"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-300 font-medium text-xs">
                  {lang === "en" ? "EN" : "中"}
                </span>
                <ChevronDown className={cn("w-3 h-3 text-slate-400 transition-transform", showLangSwitcher && "rotate-180")} />
              </button>

              {showLangSwitcher && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLangSwitcher(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-[#0a1528] rounded-xl shadow-2xl border border-slate-700/50 z-50 overflow-hidden">
                    <div className="p-2 border-b border-slate-700/40">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {t("app.language")}
                      </p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                      <button
                        onClick={() => { setLang("en"); setShowLangSwitcher(false); }}
                        data-selected={lang === "en"}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center justify-between border record-item",
                          lang === "en"
                            ? "border-cyan-500/30 font-medium"
                            : "border-slate-700/40"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">🇺🇸</span>
                          <span className="text-slate-300 record-item-title">English</span>
                        </span>
                        {lang === "en" && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />}
                      </button>
                      <button
                        onClick={() => { setLang("zh"); setShowLangSwitcher(false); }}
                        data-selected={lang === "zh"}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center justify-between border record-item",
                          lang === "zh"
                            ? "border-cyan-500/30 font-medium"
                            : "border-slate-700/40"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">🇨🇳</span>
                          <span className="text-slate-300 record-item-title">中文</span>
                        </span>
                        {lang === "zh" && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>

        <footer className="h-10 border-t border-slate-700/30 bg-[#061423] px-4 flex items-center justify-center">
          <p className="text-[11px] text-slate-400">
            {lang === "zh" ? "版权所有" : "Copyright"} © {new Date().getFullYear()} ·
            <a
              href="https://researchic.com"
              target="_blank"
              rel="noreferrer"
              className="ml-1 text-cyan-300 hover:text-cyan-200"
            >
              {lang === "zh" ? "西西弗斯林" : "Sisyphus Lynn"}
            </a>
            <span className="mx-2 text-slate-500">·</span>
            <a
              href="https://www.paypal.com/ncp/payment/M4RT9PJLJHSG2"
              target="_blank"
              rel="noreferrer"
              className="text-amber-300 hover:text-amber-200"
            >
              {lang === "zh" ? "打赏" : "Donate"}
            </a>
          </p>
        </footer>
      </div>

      {/* Floating AI Assistant */}
      {/* Chat Dialog */}
      {showChat && (
        <div className="fixed bottom-20 right-5 z-50 w-[380px] max-h-[520px] bg-[#0a1528] rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-cyan-500 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {lang === "zh" ? "AI 助手" : "AI Assistant"}
                </p>
                <p className="text-[10px] text-white/60">
                  {lang === "zh" ? "LitFlow 文献综述助手" : "LitFlow Literature Review"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowChat(false)}
              className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-cyan-500 text-white rounded-br-md"
                        : "bg-slate-800 text-slate-200 rounded-bl-md"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-3 border-t border-slate-700/40 shrink-0 bg-[#0a1a2b]">
            <div className="flex items-center gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === "zh" ? "输入你的问题..." : "Type your question..."}
                className="text-sm h-9 rounded-full px-4 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-cyan-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim()}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all",
                  chatInput.trim()
                    ? "bg-cyan-500 text-white hover:bg-cyan-600"
                    : "bg-slate-800 text-slate-600 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setShowChat(!showChat)}
        className={cn(
          "fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 group glow-cyan",
          showChat
            ? "bg-slate-700 hover:bg-slate-600 rotate-0"
            : "bg-cyan-500 hover:bg-cyan-600 hover:scale-105"
        )}
        title={lang === "zh" ? "AI 助手" : "AI Assistant"}
      >
        {showChat ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <Bot className="w-6 h-6 text-white" />
            {/* Pulse indicator */}
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#061423]" />
          </>
        )}
      </button>
    </div>
  );
}