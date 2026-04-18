import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Compass,
  FileText,
  FolderPlus,
  Layers,
  Network,
  PenTool,
  Search,
  Users,
} from "lucide-react";
import { projectAPI, type Project } from "@/lib/manuscript-api";

function UnauthenticatedLanding() {
  const featureBlocks = [
    {
      icon: Compass,
      title: "Purpose",
      desc: "明确阅读目标与研究问题方向，生成可追踪的目的卡片。",
    },
    {
      icon: Search,
      title: "Discover",
      desc: "管理检索记录、关键词与候选文献，沉淀可复用检索策略。",
    },
    {
      icon: BookOpen,
      title: "Read & Notes",
      desc: "围绕 PDF 阅读、标注、文献笔记与永久笔记形成知识资产。",
    },
    {
      icon: Network,
      title: "Expand",
      desc: "沿引文网络与主题关系扩展文献池，形成系统化阅读路径。",
    },
    {
      icon: BarChart3,
      title: "Visualize",
      desc: "将概念、证据与论证结构可视化，快速识别研究空白。",
    },
    {
      icon: PenTool,
      title: "Draft",
      desc: "把卡片与笔记回填到写作，完成从阅读到论文草稿的闭环。",
    },
  ];

  return (
    <div className="min-h-screen bg-[#061423] text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-[#0f2a45] via-[#0b1f34] to-[#111a26] p-8 md:p-12 overflow-hidden relative">
          <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

          <Badge className="bg-cyan-500/20 text-cyan-200 border-cyan-300/30">Research Workflow Platform</Badge>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            从文献检索到论文草稿，
            <span className="text-cyan-300">一条工作流完成</span>
          </h1>
          <p className="mt-4 max-w-2xl text-slate-300 text-base md:text-lg">
            这个系统围绕学术阅读和写作设计：目标定义、文献发现、深度阅读、知识扩展、证据可视化、结构化写作，全部在一个项目里沉淀。
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth/register">
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold">
                免费开始
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button variant="outline" className="border-slate-500/40 text-slate-100 hover:bg-slate-800/60">
                登录已有账号
              </Button>
            </Link>
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
      </div>
    </div>
  );
}

function AuthenticatedLanding() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const totalProjects = useMemo(() => projects.length, [projects.length]);

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
    const nextTitle = title.trim();
    if (!nextTitle) {
      toast.error("请输入项目名称");
      return;
    }

    const id = `proj-${Date.now()}`;
    setCreating(true);
    try {
      await projectAPI.ensure({ id, title: nextTitle, description: description.trim() || undefined });
      toast.success("项目已创建");
      setTitle("");
      setDescription("");
      await loadProjects();
      navigate(`/workflow/${id}/1`);
    } catch {
      toast.error("创建项目失败，请稍后重试");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-slate-700/50 bg-gradient-to-r from-[#10243a] via-[#102b3f] to-[#172b34] p-6">
          <p className="text-xs text-cyan-300 tracking-wider uppercase">Project Management</p>
          <h1 className="text-3xl font-bold text-slate-100 mt-2">从新项目开始你的研究工作流</h1>
          <p className="text-sm text-slate-300 mt-2 max-w-2xl">
            先创建项目，再进入 Purpose → Discover → Read → Expand → Visualize → Draft。所有文献、卡片、笔记和草稿都归属于项目。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-1 border-slate-700/50 bg-[#0a1528]">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-cyan-300" />
                新建项目
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="项目名称（必填）"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <Input
                placeholder="研究目标（可选）"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <Button className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900" onClick={() => void handleCreateProject()} disabled={creating}>
                {creating ? "创建中..." : "创建并进入 Step 1"}
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-slate-700/50 bg-[#0a1528]">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-300" />
                  我的项目
                </span>
                <Badge variant="secondary">{totalProjects} 个项目</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingProjects ? (
                <p className="text-sm text-slate-400">加载项目中...</p>
              ) : projects.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-600 p-6 text-center">
                  <p className="text-sm text-slate-300">还没有项目，先在左侧创建你的第一个研究项目。</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div key={project.id} className="rounded-lg border border-slate-700/60 p-4 bg-slate-900/30">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-100">{project.title}</h3>
                          <p className="text-xs text-slate-400 mt-1">{project.description || "暂无研究目标描述"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => navigate(`/workflow/${project.id}/1`)}>
                            <ArrowRight className="h-3 w-3 mr-1" />
                            进入工作流
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate("/artifacts?tab=all")}>
                            <FileText className="h-3 w-3 mr-1" />
                            Artifacts
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => navigate("/projects/members")}>
                            <Users className="h-3 w-3 mr-1" />
                            成员管理
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
    </AppLayout>
  );
}

export default function IndexPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#061423] text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-300">正在加载...</p>
      </div>
    );
  }

  if (!user) {
    return <UnauthenticatedLanding />;
  }

  return <AuthenticatedLanding />;
}
