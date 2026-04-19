import axios from "axios";
import { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import ChatMessageContent from "@/components/chat/ChatMessageContent";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Trash2,
  Globe,
  PanelLeftOpen,
  PanelLeftClose,
  Bot,
  Send,
  Minimize2,
  Atom,
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Project switcher state
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectGoal, setNewProjectGoal] = useState("");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPremiumUser = Boolean(user?.is_premium) || user?.role === "admin";
  const hasReachedFreeProjectLimit = !isPremiumUser && projects.length >= 1;

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
    if (hasReachedFreeProjectLimit) {
      setShowUpgradeDialog(true);
      return;
    }
    if (!newProjectTitle.trim()) return;
    const projectId = `proj-${Date.now()}`;
    try {
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
      toast.success(lang === "zh" ? "项目已创建" : "Project created");
    } catch (error) {
      const maybeMessage = error instanceof Error ? error.message : "";
      if (maybeMessage.toLowerCase().includes("premium")) {
        setShowUpgradeDialog(true);
      } else {
        toast.error(lang === "zh" ? "创建项目失败" : "Failed to create project");
      }
    }
  };

  const handleDeleteActiveProject = async () => {
    if (!activeProjectId) return;
    setDeleting(true);
    try {
      await projectAPI.delete(activeProjectId);
      await reloadProjects();
      setShowDeleteConfirm(false);
      setShowProjectSwitcher(false);
      toast.success(lang === "zh" ? "项目已删除" : "Project deleted");
      if (location.pathname.startsWith("/workflow/") || location.pathname === "/artifacts") {
        navigate("/");
      }
    } catch (error) {
      const maybeMessage = error instanceof Error ? error.message : "";
      if (maybeMessage.toLowerCase().includes("premium")) {
        setShowDeleteConfirm(false);
        setShowUpgradeDialog(true);
      } else {
        toast.error(lang === "zh" ? "删除项目失败" : "Failed to delete project");
      }
    } finally {
      setDeleting(false);
    }
  };

  const sendToAI = useCallback(async (userContent: string) => {
    const userMsg = {
      id: `msg-${Date.now()}`,
      role: "user" as const,
      content: userContent,
    };
    setChatMessages((prev) => [...prev, userMsg]);

    const thinkingId = `msg-${Date.now()}-thinking`;
    setChatMessages((prev) => [...prev, { id: thinkingId, role: "assistant" as const, content: "…" }]);

    const models = ["deepseek-chat", "deepseek-reasoner"];
    let reply = "";
    let lastError: string | null = null;

    for (const model of models) {
      try {
        const res = await axios.post("/api/v1/aihub/gentxt", {
          model,
          stream: false,
          temperature: 0.5,
          max_tokens: 1200,
          messages: [
            {
              role: "system",
              content:
                lang === "zh"
                  ? `你是 LitFlow 的文献综述助手。请结合当前项目上下文，提供准确、简洁、可执行的建议。当前项目标题：${activeProject.title}。当前项目目标：${activeProject.goal}。`
                  : `You are LitFlow's literature review assistant. Provide accurate, concise, actionable guidance grounded in the current project context. Current project title: ${activeProject.title}. Current project goal: ${activeProject.goal}.`,
            },
            { role: "user", content: userContent },
          ],
        }, {
          timeout: 120000,
        });

        reply = res?.data?.content?.trim() || "";
        if (reply) {
          break;
        }
      } catch (error) {
        if (!lastError) {
          if (axios.isAxiosError(error)) {
            const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
            lastError = `API Error [${error.response?.status ?? "unknown"}]: ${detail || error.message}`;
          } else {
            lastError = error instanceof Error ? error.message : String(error);
          }
        }
      }
    }

    if (!reply) {
      reply = lastError
        ? (lang === "zh" ? `AI 服务错误：${lastError}` : `AI service error: ${lastError}`)
        : (lang === "zh" ? "AI 服务暂时不可用，请稍后重试。" : "Sorry, the AI service is temporarily unavailable. Please try again later.");
    }

    setChatMessages((prev) => prev.map((message) => (message.id === thinkingId ? { ...message, content: reply } : message)));
  }, [activeProject.goal, activeProject.title, lang]);

  const handleSendMessage = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    setChatInput("");
    void sendToAI(trimmed);
  };

  const NAV_ITEMS = [
    { id: "wf-purpose", path: activeProject.id ? `/workflow/${activeProject.id}/1` : "/", label: t("nav.purpose"), icon: Target },
    { id: "wf-discover", path: activeProject.id ? `/workflow/${activeProject.id}/2` : "/", label: t("nav.discover"), icon: Search },
    { id: "wf-read", path: activeProject.id ? `/workflow/${activeProject.id}/3` : "/", label: t("nav.read"), icon: BookOpen },
    { id: "wf-expand", path: activeProject.id ? `/workflow/${activeProject.id}/4` : "/", label: t("nav.expand"), icon: Network },
    { id: "wf-visualize", path: activeProject.id ? `/workflow/${activeProject.id}/5` : "/", label: t("nav.visualize"), icon: Eye },
    { id: "wf-draft", path: activeProject.id ? `/workflow/${activeProject.id}/6` : "/", label: t("nav.draft"), icon: PenTool },
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
            <img
              src={BRAND_FAVICON_URL}
              alt="Research Workspace logo"
              className="w-5 h-5 shrink-0"
              style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(98%) saturate(400%) hue-rotate(152deg) brightness(103%)' }}
            />
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
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setShowProjectSwitcher(false)}
            >
              <div
                className="w-full max-w-sm mx-4 bg-[#0a1a2b] rounded-xl shadow-2xl border border-slate-700/60 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40">
                  <p className="text-sm font-semibold text-slate-200">{t("app.switchProject")}</p>
                  <button
                    onClick={() => setShowProjectSwitcher(false)}
                    className="text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Project dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-400">Select project</label>
                    <select
                      value={activeProjectId}
                      onChange={(e) => setActiveProjectId(e.target.value)}
                      className="w-full text-sm bg-slate-800 border border-slate-700/60 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
                    >
                      {projects.map((proj) => (
                        <option key={proj.id} value={proj.id}>{proj.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Switch button */}
                  <Button
                    size="sm"
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                    onClick={() => {
                      setShowProjectSwitcher(false);
                      if (location.pathname.startsWith("/workflow/")) {
                        const stepMatch = location.pathname.match(/^\/workflow\/[^/]+\/(\d+)/);
                        const step = stepMatch?.[1] || "1";
                        navigate(`/workflow/${activeProjectId}/${step}`);
                        return;
                      }
                      if (location.pathname === "/artifacts") {
                        const tab = searchParams.get("tab") || "all";
                        navigate(`/artifacts?tab=${tab}&projectId=${activeProjectId}`);
                      }
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Switch to this project
                  </Button>

                  {/* New project */}
                  <div className="border-t border-slate-700/40 pt-3">
                    {projects.length >= 1 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Badge
                          className={cn(
                            "text-[9px] border",
                            isPremiumUser
                              ? "bg-emerald-900/50 text-emerald-300 border-emerald-700/40"
                              : "bg-cyan-900/60 text-cyan-300 border-cyan-700/40"
                          )}
                        >
                          <Crown className="w-2.5 h-2.5 mr-0.5" />
                          {isPremiumUser ? (lang === "zh" ? "Premium 已开通" : "Premium Active") : "Premium"}
                        </Badge>
                        {!isPremiumUser && (
                          <span className="text-[10px] text-slate-400">
                            {lang === "zh" ? "创建多个项目需要 Premium" : "Creating multiple projects requires Premium"}
                          </span>
                        )}
                      </div>
                    )}
                    {showNewProject ? (
                      <div className="space-y-2">
                        <Input
                          value={newProjectTitle}
                          onChange={(e) => setNewProjectTitle(e.target.value)}
                          placeholder={t("app.projectTitle")}
                          className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                          autoFocus
                        />
                        <Input
                          value={newProjectGoal}
                          onChange={(e) => setNewProjectGoal(e.target.value)}
                          placeholder={t("app.researchGoal")}
                          className="text-xs h-8 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="text-xs h-7 bg-cyan-500 hover:bg-cyan-600 text-white flex-1"
                            onClick={handleCreateProject}
                            disabled={hasReachedFreeProjectLimit}
                          >
                            {t("app.create")}
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
                            {t("app.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 border-dashed"
                        onClick={() => {
                          if (hasReachedFreeProjectLimit) {
                            setShowUpgradeDialog(true);
                            return;
                          }
                          setShowNewProject(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        {t("app.newProject")}
                      </Button>
                    )}

                    {activeProjectId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8 border-rose-500/40 text-rose-300 hover:bg-rose-500/10 mt-2"
                        onClick={() => {
                          if (!isPremiumUser) {
                            setShowUpgradeDialog(true);
                            return;
                          }
                          setShowDeleteConfirm(true);
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {lang === "zh" ? "删除当前项目" : "Delete current project"}
                      </Button>
                    )}
                  </div>
                </div>
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
            {/* My Artifacts */}
            <Link to={activeProject.id ? `/artifacts?tab=all&projectId=${activeProject.id}` : "/artifacts?tab=all"}>
              <div
                data-selected={location.pathname === "/artifacts"}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                  location.pathname === "/artifacts"
                    ? "text-cyan-200 border-cyan-500/30"
                    : "text-slate-400 border-slate-700/40"
                )}
              >
                <Archive className="w-4 h-4 shrink-0" />
                <span className="truncate record-item-title">{lang === "zh" ? "我的 Artifacts" : "My Artifacts"}</span>
              </div>
            </Link>
            {/* Community Artifacts */}
            <Link to="/community-artifacts">
              <div
                data-selected={location.pathname === "/community-artifacts"}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                  location.pathname === "/community-artifacts"
                    ? "text-cyan-200 border-cyan-500/30"
                    : "text-slate-400 border-slate-700/40"
                )}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span className="truncate record-item-title">{lang === "zh" ? "社区 Artifacts" : "Community Artifacts"}</span>
              </div>
            </Link>

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
                <img
                  src={BRAND_FAVICON_URL}
                  alt="Research Workspace logo"
                  className="w-5 h-5"
                  style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(98%) saturate(400%) hue-rotate(152deg) brightness(103%)' }}
                />
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

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent className="bg-[#0b1f34] border-slate-700 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "zh" ? "升级到 Premium" : "Upgrade to Premium"}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {lang === "zh"
                ? "Free 用户仅可创建 1 个项目，且不能删除项目。升级 Premium 后可创建多个项目并删除现有项目。"
                : "Free users can create only 1 project and cannot delete projects. Upgrade to Premium for multi-project creation and deletion."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-200">
              {lang === "zh" ? "稍后再说" : "Maybe later"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900"
              onClick={() => navigate("/premium")}
            >
              {lang === "zh" ? "查看 Premium 详情" : "View Premium details"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#0b1f34] border-slate-700 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "zh" ? "确认删除项目" : "Confirm project deletion"}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {lang === "zh"
                ? `你将删除项目“${activeProject.title}”。该操作不可撤销，请确认。`
                : `You are about to delete project "${activeProject.title}". This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-200" disabled={deleting}>
              {lang === "zh" ? "取消" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-500 text-white"
              onClick={() => {
                void handleDeleteActiveProject();
              }}
              disabled={deleting}
            >
              {deleting ? (lang === "zh" ? "删除中..." : "Deleting...") : (lang === "zh" ? "确认删除" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden border-b border-slate-700/40 pr-1 [scrollbar-color:#06b6d4_#0f172a] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-900/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-500/70">
            <div className="p-4 space-y-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex w-full",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words",
                      msg.role === "user"
                        ? "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 rounded-br-md"
                        : "bg-slate-800 text-white rounded-bl-md"
                    )}
                  >
                    <ChatMessageContent content={msg.content} role={msg.role} />
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

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