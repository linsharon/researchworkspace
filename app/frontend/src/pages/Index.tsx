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
      title: isZh ? "研究目的" : "Purpose",
      desc: isZh
        ? "明确阅读目标与研究问题方向，生成可追踪的目的卡片。"
        : "Define research intent and generate purpose cards that drive your reading decisions.",
    },
    {
      icon: Search,
      title: isZh ? "检索" : "Discover",
      desc: isZh
        ? "管理检索记录、关键词与候选文献，沉淀可复用检索策略。"
        : "Track search logs, keywords, and candidate papers with reusable search strategies.",
    },
    {
      icon: BookOpen,
      title: isZh ? "阅读和笔记" : "Read & Notes",
      desc: isZh
        ? "围绕 PDF 阅读、标注、文献笔记与永久笔记形成知识资产。"
        : "Build knowledge assets with PDF reading, highlights, literature notes, and permanent notes.",
    },
    {
      icon: Network,
      title: isZh ? "扩展" : "Expand",
      desc: isZh
        ? "沿引文网络与主题关系扩展文献池，形成系统化阅读路径。"
        : "Expand your pool through citation trails and thematic relations for systematic coverage.",
    },
    {
      icon: BarChart3,
      title: isZh ? "可视化" : "Visualize",
      desc: isZh
        ? "将概念、证据与论证结构可视化，快速识别研究空白。"
        : "Visualize concept maps and evidence structures to spot meaningful research gaps.",
    },
    {
      icon: PenTool,
      title: isZh ? "草稿" : "Draft",
      desc: isZh
        ? "把卡片与笔记回填到写作，完成从阅读到论文草稿的闭环。"
        : "Convert notes and artifacts into structured writing blocks and paper drafts.",
    },
  ];

  const artifactModules = [
    {
      icon: Archive,
      title: isZh ? "我的产件" : "My Artifacts",
      desc: isZh
        ? "集中管理项目里的目的卡片、检索日志、笔记、概念和草稿，让研究产件不再散落在不同步骤里。"
        : "Keep purpose cards, search logs, notes, concepts, and drafts in one place so research artifacts stay connected instead of scattered.",
    },
    {
      icon: Package,
      title: isZh ? "我的产集" : "My Packages",
      desc: isZh
        ? "把一组高价值产件打包成可复用的研究包，用于个人沉淀、跨项目复用和知识迁移。"
        : "Bundle high-value artifacts into reusable packages for personal libraries, cross-project reuse, and faster knowledge transfer.",
    },
    {
      icon: Globe,
      title: isZh ? "社区产集" : "Community Packages",
      desc: isZh
        ? "浏览社区共享的研究包，吸收他人的结构化产出，并将合适内容纳入自己的研究工作台。"
        : "Explore community-shared packages, learn from other researchers' structured outputs, and import the ones worth building on.",
    },
  ];

  const teamFeatures = [
    isZh ? "邀请项目成员围绕同一研究主题协作，避免资料和判断分散在聊天工具里。" : "Invite project members into the same research space instead of splitting evidence across chat threads and documents.",
    isZh ? "围绕共享项目查看相同的文献、产件与工作流上下文，减少交接成本。" : "Work from the same papers, artifacts, and workflow context so handoffs are lighter and decisions stay visible.",
    isZh ? "高级版解锁团队与更高协作额度，适合导师-学生、小组和联合写作场景。" : "Premium unlocks Team access and higher collaboration limits for advisors, research groups, and co-writing workflows.",
  ];

  const planRows = [
    {
      label: isZh ? "项目数量" : "Projects",
      free: isZh ? "最多 1 个" : "Up to 1",
      premium: isZh ? "多个项目" : "Multiple projects",
    },
    {
      label: isZh ? "删除项目" : "Project deletion",
      free: isZh ? "不支持" : "Not available",
      premium: isZh ? "支持" : "Available",
    },
    {
      label: isZh ? "我的产件" : "My Artifacts",
      free: isZh ? "支持" : "Included",
      premium: isZh ? "支持" : "Included",
    },
    {
      label: isZh ? "我的产集" : "My Packages",
      free: isZh ? "支持" : "Included",
      premium: isZh ? "支持" : "Included",
    },
    {
      label: isZh ? "社区产集导入" : "Community Packages imports",
      free: isZh ? "最多 2 个产集" : "Up to 2 packages",
      premium: isZh ? "更高额度" : "Higher limits",
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
              <img src={BRAND_FAVICON_URL} alt="Research Workspace logo" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">{isZh ? "研究工作流" : "Research Workspace"}</p>
              <p className="text-[11px] text-slate-400">
                {isZh ? "结构化学术阅读与写作" : "Structured Academic Reading & Writing"}
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
              className={`px-3 py-1.5 text-xs ${lang === "zh" ? "bg-cyan-500 text-slate-900" : "bg-slate-900 text-slate-300"}`}
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
            {isZh ? "从文献检索到论文草稿，" : "From Literature Discovery to First Draft,"}
            <span className="text-cyan-300">{isZh ? "一条工作流完成" : "in One Continuous Workflow"}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300 text-base md:text-lg">
            {isZh
              ? "这个系统围绕学术阅读和写作设计：目标定义、文献发现、深度阅读、知识扩展、证据可视化、结构化写作，全部在一个项目里沉淀。"
              : "Built for academic reading and writing: define purpose, discover papers, read deeply, expand evidence, visualize insights, and draft with structure inside each project."}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold"
              onClick={() => navigate("/auth/register")}
            >
              {isZh ? "免费开始" : "Start Free"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="border-slate-500/40 text-slate-100 hover:bg-slate-800/60"
              onClick={() => navigate("/auth/login")}
            >
              {isZh ? "登录已有账号" : "Sign In"}
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
              {isZh ? "让研究产件可沉淀、可打包、可共享" : "Make research artifacts persistent, packageable, and shareable"}
            </h2>
            <p className="mt-3 text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">
              {isZh
                ? "除了工作流步骤本身，研究工作流还提供一层面向成果沉淀的研究产物体系，帮助你把过程产出变成可复用资产。"
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
                  ? "当研究不再是一个人的任务，团队能把成员、文献、产件与写作上下文维持在同一个项目空间。"
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
                      <th className="px-2 py-2 text-slate-400">{isZh ? "能力" : "Capability"}</th>
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
                  ? "免费版适合先体验完整工作流与研究产物体系。高级版面向需要多项目管理、社区资源扩展和团队协作的持续研究场景。"
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
            {isZh ? "打赏" : "Donate"}
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
      toast.error(isZh ? "请输入项目名称" : "Please enter a project title");
      return;
    }

    const id = `proj-${Date.now()}`;
    setCreating(true);
    try {
      await projectAPI.ensure({ id, title: nextTitle, description: description.trim() || undefined });
      toast.success(isZh ? "项目已创建" : "Project created");
      setTitle("");
      setDescription("");
      await loadProjects();
      navigate(`/workflow/${id}/1`);
    } catch (error) {
      const maybeMessage = error instanceof Error ? error.message.toLowerCase() : "";
      if (maybeMessage.includes("premium")) {
        setShowUpgradeDialog(true);
      } else {
        toast.error(isZh ? "创建项目失败，请稍后重试" : "Failed to create project");
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
        toast.error(isZh ? "删除项目失败，请稍后重试" : "Failed to delete project");
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
            <p className="text-xs text-cyan-300 tracking-wider uppercase">Project Management</p>
            <Badge className={isPremiumUser ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/30" : "bg-slate-700/60 text-slate-200 border-slate-500/40"}>
              {isPremiumUser ? (isZh ? "Premium 用户" : "Premium") : (isZh ? "Free 用户" : "Free")}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mt-2">
            {isZh ? "从新项目开始你的研究工作流" : "Start Your Workflow with a New Project"}
          </h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl">
            {isZh
              ? "先创建项目，再进入 Purpose → Discover → Read → Expand → Visualize → Draft。所有文献、卡片、笔记和草稿都归属于项目。"
              : "Create a project first, then move through Purpose → Discover → Read → Expand → Visualize → Draft. All papers, artifacts, notes, and drafts remain project-scoped."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-1 border-slate-700/50 bg-[#0a1528]">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-cyan-300" />
                {isZh ? "新建项目" : "Create Project"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder={isZh ? "项目名称（必填）" : "Project title (required)"}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <Input
                placeholder={isZh ? "研究目标（可选）" : "Research goal (optional)"}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900" onClick={() => void handleCreateProject()} disabled={creating}>
                {creating ? (isZh ? "创建中..." : "Creating...") : (isZh ? "创建并进入 Step 1" : "Create and Enter Step 1")}
              </Button>
              {hasReachedFreeProjectLimit && (
                <p className="text-xs text-amber-300">
                  {isZh ? "Free 用户仅可创建 1 个项目，请升级 Premium。" : "Free plan allows only 1 project. Upgrade to Premium."}
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
                    {isZh ? "还没有项目，先创建你的第一个研究项目。" : "No projects yet. Create your first research project to begin."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div key={project.id} className="rounded-lg border border-slate-700/60 p-4 bg-slate-900/30">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">{project.title}</h3>
                          <p className="text-xs text-slate-400 mt-1">{project.description || (isZh ? "暂无研究目标描述" : "No project goal description")}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => navigate(`/workflow/${project.id}/1`)}>
                            <ArrowRight className="h-3 w-3 mr-1" />
                            {isZh ? "进入工作流" : "Open Workflow"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate(`/artifacts?tab=all&projectId=${project.id}`)}>
                            <FileText className="h-3 w-3 mr-1" />
                            Artifacts
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate("/projects/members")}>
                            <Users className="h-3 w-3 mr-1" />
                            {isZh ? "成员管理" : "Members"}
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
                              ? (isZh ? "删除中..." : "Deleting...")
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
            <AlertDialogTitle>{isZh ? "升级到 Premium" : "Upgrade to Premium"}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              {isZh
                ? "Free 用户只能创建 1 个项目，且不支持删除项目。升级 Premium 后可创建多个项目并删除项目。"
                : "Free users can only create 1 project and cannot delete projects. Upgrade to Premium for multi-project creation and deletion."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-600 text-slate-200">
              {isZh ? "稍后再说" : "Maybe later"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-900"
              onClick={() => navigate("/premium")}
            >
              {isZh ? "查看 Premium 详情" : "View Premium details"}
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
        <p className="text-sm text-slate-300">{lang === "zh" ? "正在加载..." : "Loading..."}</p>
      </div>
    );
  }

  if (!user) {
    return <UnauthenticatedLanding />;
  }

  return <AuthenticatedLanding />;
}
