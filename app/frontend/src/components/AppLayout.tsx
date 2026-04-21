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
import ThemeToggle from "@/components/ThemeToggle";
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
  ShieldCheck,
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
  const isZh = lang === "zh";
  const { user, logout } = useAuth();
  const [headerDisplayName, setHeaderDisplayName] = useState("");
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
  const showDesignatedAdminEntry = (user?.email || "").trim().toLowerCase() === "pandalinjingjing@gmail.com";
  const hasReachedFreeProjectLimit = !isPremiumUser && projects.length >= 1;

  useEffect(() => {
    if (!user) {
      setHeaderDisplayName("");
      return;
    }
    setHeaderDisplayName(user.name || user.email);
  }, [user?.id, user?.name, user?.email]);

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
        ? "你好，我是你的AI助手 西西弗斯。今天我能帮助你什么？"
        : "Hello, I am Sisyphus, your AI Assistant here. How can I help you today",
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
    title: lang === "zh" ? "无项目" : "No Project",
    goal: lang === "zh" ? "创建项目以启动工作流程。" : "Create a project to start the workflow.",
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
      toast.success(lang === "zh" ? "项目创建成功" : "Project created");
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
        : (lang === "zh" ? "抱歉，AI服务暂时不可用。请稍后再试。" : "Sorry, the AI service is temporarily unavailable. Please try again later.");
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
    { id: "wf-purpose", path: activeProject.id ? `/workflow/${activeProject.id}/1` : null, label: t("nav.purpose"), icon: Target },
    { id: "wf-discover", path: activeProject.id ? `/workflow/${activeProject.id}/2` : null, label: t("nav.discover"), icon: Search },
    { id: "wf-read", path: activeProject.id ? `/workflow/${activeProject.id}/3` : null, label: t("nav.read"), icon: BookOpen },
    { id: "wf-expand", path: activeProject.id ? `/workflow/${activeProject.id}/4` : null, label: t("nav.expand"), icon: Network },
    { id: "wf-visualize", path: activeProject.id ? `/workflow/${activeProject.id}/5` : null, label: t("nav.visualize"), icon: Eye },
    { id: "wf-draft", path: activeProject.id ? `/workflow/${activeProject.id}/6` : null, label: t("nav.draft"), icon: PenTool },
  ];

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {/* Left Sidebar */}
      <aside
        className={cn(
          "sidebar-shell flex flex-col border-r transition-all duration-300 shrink-0",
          sidebarCollapsed ? "w-0 overflow-hidden border-r-0" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="sidebar-divider flex items-center gap-2 px-4 h-12 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={BRAND_FAVICON_URL}
              alt={isZh ? "研究工作区标志" : isZh ? "研究工作空间商标" : isZh ? "研究工作空间商标" : isZh ? "研究工作区商标" : isZh ? "研究工作区商标" : "Research Workspace logo"}
              className="w-5 h-5 shrink-0"
              style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(98%) saturate(400%) hue-rotate(152deg) brightness(103%)' }}
            />
            <span className="font-semibold text-sm text-slate-200 truncate">
              {t("app.title")}
            </span>
          </div>
        </div>

        {/* Project Info + Switcher */}
        <div className="sidebar-divider px-4 py-3 border-b shrink-0">
          <p className="warm-section-label text-xs uppercase tracking-wider mb-1">
            {t("app.currentProject")}
          </p>
          <button
            onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
            className="w-full text-left flex items-center justify-between gap-1 group"
          >
            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-[#87ecff] transition-colors">
              {activeProject.title}
            </p>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </button>
          <Link to="/" className="mt-3 block">
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border",
                location.pathname === "/"
                  ? "nav-item-active"
                  : "nav-item-idle"
              )}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span className="truncate">{t("nav.dashboard")}</span>
            </div>
          </Link>

          {showProjectSwitcher && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
              onClick={() => setShowProjectSwitcher(false)}
            >
              <div
                className="glass-panel w-full max-w-sm mx-4 rounded-xl overflow-hidden border-0"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                  <div className="sidebar-divider flex items-center justify-between px-4 py-3 border-b">
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
                    <label className="text-xs font-medium text-slate-400">{isZh ? "选择项目" : "Select project"}</label>
                    <select
                      value={activeProjectId}
                      onChange={(e) => setActiveProjectId(e.target.value)}
                      className="w-full text-sm bg-[rgba(15,18,52,0.82)] border border-[rgba(103,121,237,0.22)] text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[rgba(24,187,237,0.56)]"
                    >
                      {projects.map((proj) => (
                        <option key={proj.id} value={proj.id}>{proj.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Switch button */}
                  <Button
                    size="sm"
                    className="brand-button w-full border-0 text-xs"
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
                  <div className="sidebar-divider border-t pt-3">
                    {projects.length >= 1 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Badge
                          role="button"
                          tabIndex={0}
                          className={cn(
                            "text-[9px] border cursor-pointer",
                            isPremiumUser
                              ? "bg-emerald-900/50 text-emerald-300 border-emerald-700/40"
                                : "warm-chip"
                          )}
                          onClick={() => {
                            setShowProjectSwitcher(false);
                            navigate("/premium");
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setShowProjectSwitcher(false);
                              navigate("/premium");
                            }
                          }}
                        >
                          <Crown className="w-2.5 h-2.5 mr-0.5" />
                          {isPremiumUser ? (lang === "zh" ? "高级版已激活" : "Premium Active") : "Premium"}
                        </Badge>
                        {!isPremiumUser && (
                          <span className="text-[10px] text-slate-400">
                            {lang === "zh" ? "创建多个项目需要高级版功能" : "Creating multiple projects requires Premium"}
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
                          className="text-xs h-8 bg-[rgba(15,18,52,0.82)] border-[rgba(103,121,237,0.22)] text-slate-200 placeholder:text-slate-500"
                          autoFocus
                        />
                        <Input
                          value={newProjectGoal}
                          onChange={(e) => setNewProjectGoal(e.target.value)}
                          placeholder={t("app.researchGoal")}
                          className="text-xs h-8 bg-[rgba(15,18,52,0.82)] border-[rgba(103,121,237,0.22)] text-slate-200 placeholder:text-slate-500"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="brand-button text-xs h-7 border-0 flex-1"
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
            <p className="warm-section-label text-[10px] uppercase tracking-wider px-2 pt-2 pb-1">
              {t("nav.workflow")}
            </p>
            {NAV_ITEMS.map((item, idx) => {
              const isActive =
                Boolean(item.path) &&
                (location.pathname === item.path || location.pathname.startsWith(item.path));
              const Icon = item.icon;
              const stepNum = idx;
              const isCompleted = stepNum > 0 && stepNum < activeProject.currentStep;

              return (
                <Link
                  key={item.id}
                  to={item.path || "#"}
                  onClick={(event) => {
                    if (!item.path) {
                      event.preventDefault();
                    }
                  }}
                >
                  <div
                    data-selected={isActive}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                      isActive
                        ? "text-[#c7f2ff] border-[rgba(24,187,237,0.28)] bg-[rgba(24,187,237,0.08)]"
                        : !item.path
                        ? "text-slate-600 border-[rgba(103,121,237,0.1)]"
                        : "text-slate-400 border-[rgba(103,121,237,0.18)]"
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Icon className="w-4 h-4 shrink-0" />
                    )}
                    <span className="truncate record-item-title">{item.label}</span>
                  </div>
                </Link>
              );
            })}

            <p className="warm-section-label text-[10px] uppercase tracking-wider px-2 pt-4 pb-1">
              {t("nav.artifacts")}
            </p>
            {/* My Artifacts */}
            <Link to={activeProject.id ? `/artifacts?tab=all&projectId=${activeProject.id}` : "/artifacts?tab=all"}>
              <div
                data-selected={location.pathname === "/artifacts"}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                  location.pathname === "/artifacts"
                    ? "text-[#c7f2ff] border-[rgba(24,187,237,0.28)] bg-[rgba(24,187,237,0.08)]"
                    : "text-slate-400 border-[rgba(103,121,237,0.18)]"
                )}
              >
                <Archive className="w-4 h-4 shrink-0" />
                <span className="truncate record-item-title">{lang === "zh" ? "我的产件" : "My Artifacts"}</span>
              </div>
            </Link>
            {/* My Packages */}
            <Link to="/my-packages">
              <div
                data-selected={location.pathname === "/my-packages"}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                  location.pathname === "/my-packages"
                    ? "text-[#c7f2ff] border-[rgba(24,187,237,0.28)] bg-[rgba(24,187,237,0.08)]"
                    : "text-slate-400 border-[rgba(103,121,237,0.18)]"
                )}
              >
                <Archive className="w-4 h-4 shrink-0" />
                <span className="truncate record-item-title">{lang === "zh" ? "我的产集" : "My Packages"}</span>
              </div>
            </Link>
            {/* Community Packages */}
            <Link to="/community-artifacts">
              <div
                data-selected={location.pathname === "/community-artifacts"}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                  location.pathname === "/community-artifacts"
                    ? "text-[#c7f2ff] border-[rgba(24,187,237,0.28)] bg-[rgba(24,187,237,0.08)]"
                    : "text-slate-400 border-[rgba(103,121,237,0.18)]"
                )}
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span className="truncate record-item-title">{lang === "zh" ? "社区产集" : "Community Packages"}</span>
              </div>
            </Link>

            <p className="warm-section-label text-[10px] uppercase tracking-wider px-2 pt-4 pb-1">
              {lang === "zh" ? "团队" : "Team"}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!isPremiumUser) {
                  navigate("/premium");
                  return;
                }
                navigate("/projects/members");
              }}
              className="w-full"
            >
              <div
                data-selected={location.pathname === "/projects/members"}
                className={cn(
                  "flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                  location.pathname === "/projects/members"
                    ? "nav-item-active"
                    : "nav-item-idle"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate record-item-title">{lang === "zh" ? "项目成员" : "Project Members"}</span>
                </div>
                {!isPremiumUser && (
                  <Badge className="warm-chip text-[9px]">
                    <Crown className="w-2.5 h-2.5 mr-0.5" />
                    Premium
                  </Badge>
                )}
              </div>
            </button>

            {showDesignatedAdminEntry && (
              <>
                <p className="warm-section-label text-[10px] uppercase tracking-wider px-2 pt-4 pb-1">
                  Admin
                </p>
                <Link to="/admin/users">
                  <div
                    data-selected={location.pathname === "/admin/users"}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                      location.pathname === "/admin/users"
                        ? "nav-item-active"
                        : "nav-item-idle"
                    )}
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span className="truncate record-item-title">{lang === "zh" ? "用户管理" : "User Management"}</span>
                  </div>
                </Link>
                <Link to="/admin/activity">
                  <div
                    data-selected={location.pathname === "/admin/activity"}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                      location.pathname === "/admin/activity"
                        ? "nav-item-active"
                        : "nav-item-idle"
                    )}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate record-item-title">{lang === "zh" ? "活动审计" : "Activity Audit"}</span>
                  </div>
                </Link>
              </>
            )}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="shell-chrome h-12 border-b flex items-center px-2 shrink-0">
          {/* Left toggle button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-lg border transition-all text-xs font-medium",
              sidebarCollapsed
                ? "warm-toggle"
                : "shell-toggle"
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
                  alt={isZh ? "研究工作区商标" : "Research Workspace logo"}
                  className="w-5 h-5"
                  style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(98%) saturate(400%) hue-rotate(152deg) brightness(103%)' }}
                />
                <span className="text-sm font-semibold text-slate-200 hidden sm:inline">
                  {t("app.title")}
                </span>
              </div>
            )}
          </div>

          {/* Right: Theme + language switcher */}
          <div className="flex items-center gap-2">
            {!user ? (
              <>
                <Link to="/auth/register">
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    {lang === "zh" ? "注册" : "Register"}
                  </Button>
                </Link>
                <Link to="/auth/login">
                  <Button size="sm" className="brand-button h-8 text-xs border-0">
                    {lang === "zh" ? "登录" : "Login"}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/profile">
                  <Badge variant="outline" className="text-xs text-slate-300 border-[rgba(103,121,237,0.24)] hover:border-[rgba(24,187,237,0.45)] cursor-pointer">
                    {headerDisplayName || user.name || user.email}
                  </Badge>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => {
                    void logout();
                  }}
                >
                  {lang === "zh" ? "登出" : "Logout"}
                </Button>
              </>
            )}
            <ThemeToggle compact />
            <div className="relative">
              <button
                onClick={() => setShowLangSwitcher(!showLangSwitcher)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(103,121,237,0.2)] hover:border-[rgba(24,187,237,0.32)] hover:bg-[rgba(31,39,103,0.42)] transition-all text-sm"
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
                  <div className="glass-panel absolute right-0 top-full mt-1 w-44 rounded-xl z-50 overflow-hidden border-0">
                    <div className="p-2 border-b border-[rgba(103,121,237,0.16)]">
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
                            ? "nav-item-active font-medium"
                            : "nav-item-idle"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">🇺🇸</span>
                          <span className="text-slate-300 record-item-title">{isZh ? "英文" : "English"}</span>
                        </span>
                        {lang === "en" && <CheckCircle2 className="w-3.5 h-3.5 text-[#87ecff]" />}
                      </button>
                      <button
                        onClick={() => { setLang("zh"); setShowLangSwitcher(false); }}
                        data-selected={lang === "zh"}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center justify-between border record-item",
                          lang === "zh"
                            ? "nav-item-active"
                            : "nav-item-idle"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">🇨🇳</span>
                          <span className="text-slate-300 record-item-title">中文</span>
                        </span>
                        {lang === "zh" && <CheckCircle2 className="w-3.5 h-3.5 text-[#87ecff]" />}
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

        <footer className="shell-chrome h-10 border-t px-4 flex items-center justify-center">
          <p className="text-[11px] text-slate-400">
            {lang === "zh" ? "版权所有" : "Copyright"} © {new Date().getFullYear()} ·
            <a
              href="https://researchic.com"
              target="_blank"
              rel="noreferrer"
              className="ml-1 text-[#87ecff] hover:text-white"
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
              {lang === "zh" ? "捐赠" : "Donate"}
            </a>
          </p>
        </footer>
      </div>

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent className="glass-panel text-slate-100 border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "zh" ? "升级为高级版" : "Upgrade to Premium"}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {lang === "zh"
                ? "免费版只能创建一个项目且不能删除项目。升级为高级版以创建和删除多个项目。"
                : "Free users can create only 1 project and cannot delete projects. Upgrade to Premium for multi-project creation and deletion."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-200">
              {lang === "zh" ? "稍后再试" : "Maybe later"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="brand-button border-0"
              onClick={() => navigate("/premium")}
            >
              {lang === "zh" ? "查看高级版详情" : "View Premium details"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="glass-panel text-slate-100 border-0">
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
              {deleting ? (lang === "zh" ? "正在删除..." : "Deleting...") : (lang === "zh" ? "删除" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Floating AI Assistant */}
      {/* Chat Dialog */}
      {showChat && (
        <div className="glass-panel fixed bottom-20 right-5 z-50 w-[380px] max-h-[520px] rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200 border-0">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 text-white shrink-0 bg-[linear-gradient(135deg,#18BBED_0%,#1878ED_52%,#8008F0_100%)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {lang === "zh" ? "AI助手：西西弗斯" : "AI Assistant: Sisyphus"}
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
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden border-b border-[rgba(103,121,237,0.16)] pr-1 [scrollbar-color:#18BBED_#0f1234] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[rgba(15,18,52,0.88)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(24,187,237,0.72)]">
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
                        ? "warm-thread-user rounded-br-md"
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
          <div className="p-3 border-t border-[rgba(103,121,237,0.16)] shrink-0 bg-[rgba(15,18,52,0.72)]">
            <div className="flex items-center gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === "zh" ? "输入你的问题..." : "Type your question..."}
                className="text-sm h-9 rounded-full px-4 bg-[rgba(15,18,52,0.82)] border-[rgba(103,121,237,0.22)] text-slate-200 placeholder:text-slate-500 focus-visible:ring-[rgba(24,187,237,0.45)]"
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
        title={lang === "zh" ? "AI助手：西西" : "AI Assistant: Sisyphus"}
      >
        {showChat ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <Bot className="w-6 h-6 text-white" />
            {/* Pulse indicator */}
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[rgba(10,12,38,0.95)]" />
          </>
        )}
      </button>
    </div>
  );
}