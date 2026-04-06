import { ReactNode, useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { DUMMY_PROJECT, DUMMY_PROJECTS, type WorkflowStep, type ProjectItem } from "@/lib/data";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { t, lang, setLang } = useI18n();
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const project = DUMMY_PROJECT;

  // Project switcher state
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([...DUMMY_PROJECTS]);
  const [activeProjectId, setActiveProjectId] = useState("proj-1");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectGoal, setNewProjectGoal] = useState("");

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
    { path: `/workflow/${activeProjectId}/1`, label: t("nav.purpose"), icon: Target },
    { path: `/workflow/${activeProjectId}/2`, label: t("nav.discover"), icon: Search },
    { path: `/workflow/${activeProjectId}/3`, label: t("nav.read"), icon: BookOpen },
    { path: `/workflow/${activeProjectId}/4`, label: t("nav.expand"), icon: Network },
    { path: `/workflow/${activeProjectId}/5`, label: t("nav.visualize"), icon: Eye },
    { path: `/workflow/${activeProjectId}/6`, label: t("nav.draft"), icon: PenTool },
  ];

  const ARTIFACT_NAV_ITEMS = [
    { path: "/artifacts?tab=all", label: t("nav.allArtifacts"), icon: Archive },
    { path: "/artifacts?tab=purpose", label: t("nav.purposeCards"), icon: Target },
    { path: "/artifacts?tab=search", label: t("nav.searchLogs"), icon: Search },
    { path: "/artifacts?tab=notes", label: t("nav.notes"), icon: FileText },
    { path: "/artifacts?tab=drafts", label: t("nav.drafts"), icon: PenTool },
    { path: "/artifacts?tab=visual", label: t("nav.visualizations"), icon: Map },
  ];

  return (
    <div className="flex h-screen bg-[#070f1e] overflow-hidden">
      {/* Left Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-slate-700/30 bg-[#050b18] transition-all duration-300 shrink-0",
          sidebarCollapsed ? "w-0 overflow-hidden border-r-0" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-slate-700/30 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 glow-sm">
              <BookOpen className="w-4 h-4 text-white" />
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
            <p className="text-sm font-medium text-slate-200 truncate group-hover:text-violet-400 transition-colors">
              {activeProject.title}
            </p>
            <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform", showProjectSwitcher && "rotate-180")} />
          </button>
          <div className="mt-2 space-y-1.5">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Steps</div>
            <div className="grid grid-cols-6 gap-1">
              {([1, 2, 3, 4, 5, 6] as WorkflowStep[]).map((step) => {
                const isCurrent = step === activeProject.currentStep;
                return (
                  <div
                    key={step}
                    className={cn(
                      "h-1.5 rounded-full transition-colors",
                      isCurrent ? "bg-violet-600" : "bg-slate-700/60"
                    )}
                    title={`Step ${step}`}
                  />
                );
              })}
            </div>
          </div>

          <Link to="/" className="mt-3 block">
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border",
                location.pathname === "/"
                  ? "bg-violet-600/20 text-violet-300 border-violet-600/40"
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
                  ? "bg-violet-600/20 text-violet-300 border-violet-600/40"
                  : "text-slate-400 border-slate-700/40 hover:bg-slate-800/60 hover:text-slate-200"
              )}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="truncate">Project Members</span>
            </div>
          </Link>

          {showProjectSwitcher && (
            <div className="mt-2 bg-[#0a1528] rounded-lg shadow-xl border border-slate-700/50 overflow-hidden">
              <div className="p-2 border-b border-slate-700/40">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {t("app.switchProject")}
                  </p>
                  <Badge className="text-[8px] bg-amber-100 text-amber-700 border-amber-200">
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
                      }}
                      data-selected={proj.id === activeProjectId}
                      className={cn(
                        "w-full text-left p-2 rounded-md transition-all border record-item",
                        proj.id === activeProjectId
                          ? "border-violet-600/40"
                          : "border-slate-700/40"
                      )}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-slate-200 truncate record-item-title">
                          {proj.title}
                        </span>
                        {proj.id === activeProjectId && (
                          <CheckCircle2 className="w-3 h-3 text-violet-400 shrink-0" />
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
                        className="text-[10px] h-6 bg-violet-600 hover:bg-violet-700 text-white flex-1"
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
              const isCompleted = stepNum > 0 && stepNum < project.currentStep;
              const isCurrent = stepNum === project.currentStep;

              return (
                <Link key={item.path} to={item.path}>
                  <div
                    data-selected={isActive}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors border record-item",
                      isActive
                        ? "text-violet-300 border-violet-600/30"
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
                        ? "text-violet-300 border-violet-600/30"
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
                    ? "text-violet-300 border-violet-600/30"
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
        <header className="h-12 border-b border-slate-700/30 bg-[#050b18] flex items-center px-2 shrink-0">
          {/* Left toggle button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-3 rounded-lg border transition-all text-xs font-medium",
              sidebarCollapsed
                ? "border-violet-600/40 bg-violet-600/10 text-violet-400 hover:bg-violet-600/20"
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
                <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-white" />
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
                  <Button size="sm" className="h-8 text-xs bg-violet-600 hover:bg-violet-700">
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
                            ? "border-violet-600/30 font-medium"
                            : "border-slate-700/40"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">🇺🇸</span>
                          <span className="text-slate-300 record-item-title">English</span>
                        </span>
                        {lang === "en" && <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />}
                      </button>
                      <button
                        onClick={() => { setLang("zh"); setShowLangSwitcher(false); }}
                        data-selected={lang === "zh"}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg transition-all text-sm flex items-center justify-between border record-item",
                          lang === "zh"
                            ? "border-violet-600/30 font-medium"
                            : "border-slate-700/40"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">🇨🇳</span>
                          <span className="text-slate-300 record-item-title">中文</span>
                        </span>
                        {lang === "zh" && <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />}
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
      </div>

      {/* Floating AI Assistant */}
      {/* Chat Dialog */}
      {showChat && (
        <div className="fixed bottom-20 right-5 z-50 w-[380px] max-h-[520px] bg-[#0a1528] rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-violet-700 text-white shrink-0">
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
                        ? "bg-violet-600 text-white rounded-br-md"
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
          <div className="p-3 border-t border-slate-700/40 shrink-0 bg-[#0a1528]">
            <div className="flex items-center gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === "zh" ? "输入你的问题..." : "Type your question..."}
                className="text-sm h-9 rounded-full px-4 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-violet-500"
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
                    ? "bg-violet-600 text-white hover:bg-violet-700"
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
          "fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 group glow-violet",
          showChat
            ? "bg-slate-700 hover:bg-slate-600 rotate-0"
            : "bg-violet-600 hover:bg-violet-500 hover:scale-105"
        )}
        title={lang === "zh" ? "AI 助手" : "AI Assistant"}
      >
        {showChat ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <>
            <Bot className="w-6 h-6 text-white" />
            {/* Pulse indicator */}
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-[#070f1e]" />
          </>
        )}
      </button>
    </div>
  );
}