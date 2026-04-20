import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Archive,
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  Crown,
  FileText,
  FolderPlus,
  Globe,
  Layers,
  Network,
  PenTool,
  Package,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { projectAPI, type Project } from "@/lib/manuscript-api";

const BRAND_FAVICON_URL = "https://public-frontend-cos.metadl.com/mgx/img/favicon_atoms.ico";

function UnauthenticatedLanding() {
  const { lang, setLang } = useI18n();
  const navigate = useNavigate();
  const isZh = lang === "zh";

  const featureBlocks = [
    {
      icon: Compass,
      title: isZh ? "目的" : "Purpose",
      desc: isZh
        ? "定义研究意图并生成推动您阅读决策的目的卡片片。"
        : "Define research intent and generate purpose cards that drive your reading decisions.",
    },
    {
      icon: Search,
      title: isZh ? "发现" : "Discover",
      desc: isZh
        ? "跟踪检索日志、关键词和候选论文，使用可重用的搜索策略。"
        : "Track search logs, keywords, and candidate papers with reusable search strategies.",
    },
    {
      icon: BookOpen,
      title: isZh ? "阅读与笔记" : "Read & Notes",
      desc: isZh
        ? "通过PDF阅读、高亮、文献笔记和永久笔记构建知识资产。"
        : "Build knowledge assets with PDF reading, highlights, literature notes, and permanent notes.",
    },
    {
      icon: Network,
      title: isZh ? "扩展" : "Expand",
      desc: isZh
        ? "通过引用线索和主题关系扩展您的资源库，以实现系统性覆盖。"
        : "Expand your pool through citation trails and thematic relations for systematic coverage.",
    },
    {
      icon: BarChart3,
      title: isZh ? "可视化" : "Visualize",
      desc: isZh
        ? "通过概念图和证据结构可视化，以发现有意义的研究空白。"
        : "Visualize concept maps and evidence structures to spot meaningful research gaps.",
    },
    {
      icon: PenTool,
      title: isZh ? "草稿" : "Draft",
      desc: isZh
        ? "将笔记和产件转换为结构化的写作块和论文草稿。"
        : "Convert notes and artifacts into structured writing blocks and paper drafts.",
    },
  ];

  const artifactModules = [
    {
      icon: Archive,
      title: isZh ? "我的产件" : "My Artifacts",
      desc: isZh
        ? "将目的卡片片、检索日志、笔记、概念和草稿放在一个地方，以便研究产件保持连接而不是分散。"
        : "Keep purpose cards, search logs, notes, concepts, and drafts in one place so research artifacts stay connected instead of scattered.",
    },
    {
      icon: Package,
      title: isZh ? "我的产集" : "My Packages",
      desc: isZh
        ? "将高价值的产件打产集成可重复使用的产集，用于个人图书馆、跨项目重用和加快知识转移。"
        : "Bundle high-value artifacts into reusable packages for personal libraries, cross-project reuse, and faster knowledge transfer.",
    },
    {
      icon: Globe,
      title: isZh ? "社区产集" : "Community Packages",
      desc: isZh
        ? "探索社区共享的产集，从其他研究人员的结构化输出中学习，并导入值得构建的产集。"
        : "Explore community-shared packages, learn from other researchers' structured outputs, and import the ones worth building on.",
    },
  ];

  const teamFeatures = [
    isZh ? "邀请项目成员进入同一个研究空间，而不是将证据分散在聊天线程和文档中。" : "Invite project members into the same research space instead of splitting evidence across chat threads and documents.",
    isZh ? "使用相同的论文、产件和工作流上下文进行工作，以便交接更轻松，决策保持可见。" : "Work from the same papers, artifacts, and workflow context so handoffs are lighter and decisions stay visible.",
    isZh ? "高级功能解锁团队访问权限和更高的协作限制，适用于顾问、研究小组和共同写作工作流。" : "Premium unlocks Team access and higher collaboration limits for advisors, research groups, and co-writing workflows.",
  ];

  const planRows = [
    {
      label: isZh ? "项目" : "Projects",
      free: isZh ? "最多1个" : "Up to 1",
      premium: isZh ? "多个项目" : "Multiple projects",
    },
    {
      label: isZh ? "项目删除" : "Project deletion",
      free: isZh ? "不可用" : "Not available",
      premium: isZh ? "可用" : "Available",
    },
    {
      label: isZh ? "我的产件" : "My Artifacts",
      free: isZh ? "已包含" : "Included",
      premium: isZh ? "支持" : "Included",
    },
    {
      label: isZh ? "我的产集" : "My Packages",
      free: isZh ? "支持" : "Included",
      premium: isZh ? "支持" : "Included",
    },
    {
      label: isZh ? "社区产集导入" : "Community Packages imports",
      free: isZh ? "最多2个产集" : "Up to 2 packages",
      premium: isZh ? "更高限额" : "Higher limits",
    },
    {
      label: isZh ? "团队协作" : "Team collaboration",
      free: isZh ? "不支持" : "Not available",
      premium: isZh ? "支持" : "Included",
    },
  ];

  return (
    <div className="min-h-screen bg-[#061423] text-slate-100 flex flex-col">
      <div className="mx-auto max-w-6xl px-6 py-10 flex-1 w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/20 border border-cyan-300/30 flex items-center justify-center">
              <img src={BRAND_FAVICON_URL} alt={isZh ? "研究工作空间商标" : isZh ? "研究工作空间商标" : isZh ? "研究工作区商标" : "Research Workspace logo"} className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">{isZh ? "研究工作区" : "Research Workspace"}</p>
              <p className="text-[11px] text-slate-400">
                {isZh ? "结构化的学术阅读与写作" : "Structured Academic Reading & Writing"}
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-lg border border-slate-700/60 overflow-hidden">
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1.5 text-xs ${lang === "en" ? "bg-cyan-500 text-slate-900" : "bg-slate-900 text-slate-300"}`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("zh")}
              className={`px-3 py-1.5 text-xs ${lang === "zh" ? "bg-slate-900 text-slate-300" : "bg-slate-900 text-slate-300"}`}
            >
              中文
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#0f2a45] via-[#0b1f34] to-[#111a26] p-8 md:p-12 overflow-hidden relative">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

          <div className="relative z-10">

          <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-300/30">
            {isZh ? "研究工作流平台" : "Research Workflow Platform"}
          </Badge>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            {isZh ? "从文献发现到初稿" : "From Literature Discovery to First Draft,"}
            <span className="text-cyan-300">{isZh ? "在一个连续的工作流中" : "in One Continuous Workflow"}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300 text-base md:text-lg">
            {isZh
              ? "专为学术阅读和写作设计：定义目的，发现论文，深入阅读，扩展证据，可视化洞察，以及在每个项目中用结构化的方式草拟。"
              : "Built for academic reading and writing: define purpose, discover papers, read deeply, expand evidence, visualize insights, and draft with structure inside each project."}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold"
              onClick={() => navigate("/auth/register")}
            >
              {isZh ? "免费注册" : "Start Free"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="border-slate-500/40 text-slate-100 hover:bg-slate-800/60"
              onClick={() => navigate("/auth/login")}
            >
              {isZh ? "登录" : "Sign In"}
            </Button>
          </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureBlocks.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-slate-700/60 bg-[#0a1a2b]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-cyan-400/15 text-cyan-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-300 leading-relaxed">{item.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <section className="mt-12">
          <div className="max-w-3xl">
            <Badge className="bg-amber-500/15 text-amber-200 border-amber-300/20">
              {isZh ? "研究产物" : "Research Artifacts"}
            </Badge>
            <h2 className="mt-4 text-2xl md:text-3xl font-bold text-slate-100">
              {isZh ? "使研究产件持久化，可打包，可分享" : "Make research artifacts persistent, packageable, and shareable"}
            </h2>
            <p className="mt-3 text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
              {isZh
                ? "除了工作流本身，研究工作空间还包括一个成果层，将工作过程中的产件转变为可重复使用的研究资产。"
                : "Beyond the workflow itself, Research Workspace includes an artifacts layer that turns working outputs into reusable research assets."}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {artifactModules.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="border-slate-700/60 bg-[#0a1a2b]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-100 flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-400/15 text-amber-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="border-slate-700/60 bg-[#0a1a2b]">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-cyan-400/15 text-cyan-300">
                  <Users className="h-4 w-4" />
                </span>
                {isZh ? "团队协作" : "Team Collaboration"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-300 leading-relaxed">
                {isZh
                  ? "当研究不再是单打独斗时，团队将成员、论文、产件和写作上下文都保留在一个共享的项目空间内。"
                  : "When research is not a solo activity, Team keeps members, papers, artifacts, and writing context inside one shared project space."}
              </p>
              {teamFeatures.map((item) => (
                <div key={item} className="rounded-lg border border-slate-700/60 bg-slate-900/30 px-3 py-3 text-sm text-slate-300 leading-relaxed">
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-700/60 bg-[#0a1a2b]">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-amber-400/15 text-amber-300">
                  <Crown className="h-4 w-4" />
                </span>
                {isZh ? "免费版与高级版" : "Free vs Premium"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700/60 text-left">
                      <th className="px-2 py-2 text-slate-400">{isZh ? "功能" : "Capability"}</th>
                      <th className="px-2 py-2 text-slate-300">{isZh ? "免费版" : "Free"}</th>
                      <th className="px-2 py-2 text-amber-300">{isZh ? "高级版" : "Premium"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planRows.map((row) => (
                      <tr key={row.label} className="border-b border-slate-800/80 last:border-b-0">
                        <td className="px-2 py-2 text-slate-300">{row.label}</td>
                        <td className="px-2 py-2 text-slate-400">{row.free}</td>
                        <td className="px-2 py-2 text-slate-100">{row.premium}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                {isZh
                  ? "免费版足以体验工作流程和产件系统。高级版设计用于需要多项目组织、更广泛产集访问权限和团队协作的持续研究。"
                  : "Free is enough to experience the workflow and artifacts system. Premium is designed for ongoing research that needs multi-project organization, broader package access, and team collaboration."}
              </p>
            </CardContent>
          </Card>
        </section>
      </div>

      <footer className="h-10 border-t border-slate-700/40 bg-[#061423] px-4 flex items-center justify-center">
        <p className="text-[11px] text-slate-400">
          {isZh ? "版权所有" : "Copyright"} © {new Date().getFullYear()} ·
          <a
            href="https://researchic.com"
            target="_blank"
            rel="noreferrer"
            className="ml-1 text-cyan-300 hover:text-cyan-200"
          >
            {isZh ? "西西弗斯林" : "Sisyphus Lynn"}
          </a>
          <span className="mx-2 text-slate-500">·</span>
          <a
            href="https://www.paypal.com/ncp/payment/M4RT9PJLJHSG2"
            target="_blank"
            rel="noreferrer"
            className="text-amber-300 hover:text-amber-200"
          >
            {isZh ? "捐赠" : "Donate"}
          </a>
        </p>
      </footer>
    </div>
  );
}

function AuthenticatedLanding() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [pendingDeleteProject, setPendingDeleteProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const isPremiumUser = Boolean(user?.is_premium) || user?.role === "admin";
  const totalProjects = useMemo(() => projects.length, [projects.length]);
  const hasReachedFreeProjectLimit = !isPremiumUser && totalProjects >= 1;

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const list = await projectAPI.list();
      setProjects(list);
    } catch {
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const handleCreateProject = async () => {
    if (hasReachedFreeProjectLimit) {
      setShowUpgradeDialog(true);
      return;
    }

    const nextTitle = title.trim();
    if (!nextTitle) {
      toast.error(isZh ? "请输入项目标题" : "Please enter a project title");
      return;
    }

    const id = `proj-${Date.now()}`;
    setCreating(true);
    try {
      await projectAPI.ensure({ id, title: nextTitle, description: description.trim() || undefined });
      toast.success(isZh ? "项目创建成功" : "Project created");
      setTitle("");
      setDescription("");
      await loadProjects();
      navigate(`/workflow/${id}/1`);
    } catch (error) {
      const maybeMessage = error instanceof Error ? error.message.toLowerCase() : "";
      if (maybeMessage.includes("premium")) {
        setShowUpgradeDialog(true);
      } else {
        toast.error(isZh ? "创建项目失败" : "Failed to create project");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    if (!isPremiumUser) {
      setShowUpgradeDialog(true);
      return;
    }
    setPendingDeleteProject(project);
  };

  const confirmDeleteProject = async () => {
    if (!pendingDeleteProject) return;
    setDeletingId(pendingDeleteProject.id);
    try {
      await projectAPI.delete(pendingDeleteProject.id);
      toast.success(isZh ? "项目已删除" : "Project deleted");
      await loadProjects();
      setPendingDeleteProject(null);
    } catch (error) {
      const maybeMessage = error instanceof Error ? error.message.toLowerCase() : "";
      if (maybeMessage.includes("premium")) {
        setPendingDeleteProject(null);
        setShowUpgradeDialog(true);
      } else {
        toast.error(isZh ? "删除项目失败" : "Failed to delete project");
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-r from-[#10243a] via-[#102b3f] to-[#172b34] p-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-cyan-300 tracking-wider uppercase">{isZh ? "项目管理" : "Project Management"}</p>
            <Badge className={isPremiumUser ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/30" : "bg-slate-700/60 text-slate-200 border-slate-500/40"}>
              {isPremiumUser ? (isZh ? "高级版用户" : "Premium") : (isZh ? "免费版用户" : "Free")}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mt-2">
            {isZh ? "用新项目启动你的工作流程" : "Start Your Workflow with a New Project"}
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl">
            {isZh
              ? "先创建项目，再进入工作流：步骤1-6。所有产件都是基于项目的。"
              : "Create a project first, then move through Workflow: Steps 1-6. All artifacts remain project-scoped."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-1 border-slate-700/50 bg-[#0a1528]">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-cyan-300" />
                {isZh ? "创建项目" : "Create Project"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder={isZh ? "项目标题（必填）" : "Project title (required)"}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <Input
                placeholder={isZh ? "研究目标（可选）" : "Research goal (optional)"}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900" onClick={() => void handleCreateProject()} disabled={creating}>
                {creating ? (isZh ? "创建中..." : "Creating...") : (isZh ? "创建并进入步骤1" : "Create and Enter Step 1")}
              </Button>
              {hasReachedFreeProjectLimit && (
                <p className="text-xs text-amber-300">
                  {isZh ? "免费计划仅限1个项目。升级为高级版。" : "Free plan allows only 1 project. Upgrade to Premium."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-slate-700/50 bg-[#0a1528]">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-300" />
                  {isZh ? "我的项目" : "My Projects"}
                </span>
                <Badge variant="secondary">{isZh ? `${totalProjects} 个项目` : `${totalProjects} projects`}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProjects ? (
                <p className="text-sm text-slate-400">{isZh ? "加载项目中..." : "Loading projects..."}</p>
              ) : projects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-600 p-6 text-center">
                  <p className="text-sm text-slate-300">
                    {isZh ? "还没有项目。创建你的第一个研究项目开始吧。" : "No projects yet. Create your first research project to begin."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div key={project.id} className="rounded-lg border border-slate-700/60 p-4 bg-slate-900/30">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">{project.title}</h3>
                          <p className="text-xs text-slate-400 mt-1">{project.description || (isZh ? "项目目标描述未提供" : "No project goal description")}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => navigate(`/workflow/${project.id}/1`)}>
                            <ArrowRight className="h-3 w-3 mr-1" />
                            {isZh ? "打开工作流" : "Open Workflow"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/artifacts?tab=all&projectId=${project.id}`)}>
                            <FileText className="h-3 w-3 mr-1" />
                            {isZh ? "产件" : "Artifacts"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate("/projects/members")}>
                            <Users className="h-3 w-3 mr-1" />
                            {isZh ? "成员" : "Members"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
                            onClick={() => void handleDeleteProject(project)}
                            disabled={deletingId === project.id}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {deletingId === project.id
                              ? (isZh ? "正在删除..." : "Deleting...")
                              : (isZh ? "删除" : "Delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent className="bg-[#0b1f34] border-slate-700 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>{isZh ? "升级为高级版" : "Upgrade to Premium"}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {isZh
                ? "免费用户只能创建1个项目且不能删除项目。升级为高级版可以创建和删除多个项目。"
                : "Free users can only create 1 project and cannot delete projects. Upgrade to Premium for multi-project creation and deletion."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-200">
              {isZh ? "稍后再试" : "Maybe later"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900"
              onClick={() => navigate("/premium")}
            >
              {isZh ? "查看高级版详情" : "View Premium details"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(pendingDeleteProject)} onOpenChange={(open) => !open && setPendingDeleteProject(null)}>
        <AlertDialogContent className="bg-[#0b1f34] border-slate-700 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>{isZh ? "确认删除项目" : "Confirm project deletion"}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {isZh
                ? `你将删除项目“${pendingDeleteProject?.title || ""}”，该操作不可撤销。`
                : `You are about to delete project "${pendingDeleteProject?.title || ""}". This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-200" disabled={Boolean(deletingId)}>
              {isZh ? "取消" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-500 text-white"
              onClick={() => {
                void confirmDeleteProject();
              }}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? (isZh ? "删除中..." : "Deleting...") : (isZh ? "确认删除" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

export default function IndexPage() {
  const { user, loading } = useAuth();
  const { lang } = useI18n();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#061423] text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-300">{lang === "zh" ? "加载中..." : "Loading..."}</p>
      </div>
    );
  }

  if (!user) {
    return <UnauthenticatedLanding />;
  }

  return <AuthenticatedLanding />;
}
