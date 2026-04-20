import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/lib/i18n";
import {
  projectAPI,
  type Project,
  type ProjectMember,
  type ProjectMemberRole,
  type UserSearchItem,
} from "@/lib/manuscript-api";

export default function ProjectMembers() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const { user } = useAuth();
  const isPremiumUser = Boolean(user?.is_premium) || user?.role === "admin";
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [candidates, setCandidates] = useState<UserSearchItem[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<UserSearchItem | null>(null);
  const [grantRole, setGrantRole] = useState<ProjectMemberRole>("viewer");

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const result = await projectAPI.list();
      setProjects(result);
      if (!selectedProjectId && result.length > 0) {
        setSelectedProjectId(result[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error(isZh ? "项目加载失败" : isZh ? "项目加载失败" : isZh ? "项目加载失败" : "Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadMembers = async (projectId: string) => {
    if (!projectId) {
      setMembers([]);
      return;
    }

    setLoadingMembers(true);
    try {
      const result = await projectAPI.listMembers(projectId);
      setMembers(result);
    } catch (error) {
      console.error(error);
      toast.error(isZh ? "项目成员加载失败" : isZh ? "项目成员加载失败" : isZh ? "项目成员加载失败" : "Failed to load project members");
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedProjectId) {
      toast.error(isZh ? "请先选择一个项目" : isZh ? "请先选择一个项目" : isZh ? "请先选择一个项目" : "Please select a project first");
      return;
    }
    if (!selectedCandidate) {
      toast.error(isZh ? "请选择一个用户" : isZh ? "请选择一个用户" : isZh ? "请选择一个用户" : "Please select a user");
      return;
    }

    try {
      await projectAPI.addMember(selectedProjectId, {
        user_id: selectedCandidate.id,
        role: grantRole,
      });
      toast.success(isZh ? "项目成员更新" : isZh ? "项目成员更新" : isZh ? "项目成员更新" : "Project member updated");
      setSearchQuery("");
      setCandidates([]);
      setSelectedCandidate(null);
      setGrantRole("viewer");
      await loadMembers(selectedProjectId);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to add member");
    }
  };

  const handleRoleChange = async (member: ProjectMember, role: ProjectMemberRole) => {
    if (!selectedProjectId) return;
    try {
      await projectAPI.updateMember(selectedProjectId, member.user_id, { role });
      toast.success(isZh ? "成员角色更新" : isZh ? "成员角色更新" : isZh ? "成员角色更新" : "Member role updated");
      await loadMembers(selectedProjectId);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to update member role");
    }
  };

  const handleRemoveMember = async (member: ProjectMember) => {
    if (!selectedProjectId) return;
    try {
      await projectAPI.removeMember(selectedProjectId, member.user_id);
      toast.success(isZh ? "成员已移除" : isZh ? "成员已移除" : isZh ? "成员已移除" : "Member removed");
      await loadMembers(selectedProjectId);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to remove member");
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      void loadMembers(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const keyword = searchQuery.trim();
    if (!keyword || keyword.length < 2) {
      setCandidates([]);
      setSearchLoading(false);
      return;
    }

    let active = true;
    setSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const users = await projectAPI.searchUsers(keyword, 8);
        if (active) {
          setCandidates(users);
        }
      } catch (error) {
        if (active) {
          setCandidates([]);
        }
      } finally {
        if (active) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  return (
    <AppLayout>
      {!isPremiumUser ? (
        <div className="p-6 max-w-4xl mx-auto space-y-4">
          <Card className="border-cyan-500/30 bg-cyan-500/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-cyan-900/60 text-cyan-300 border-cyan-700/40">{isZh ? "仅限高级版" : "Premium Only"}</Badge>
                <CardTitle className="text-slate-100">{isZh ? "团队仅限高级用户使用" : "Team is available for Premium users only"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-300">
                Upgrade to Premium to manage project members, assign viewer or editor roles, and collaborate on manuscript and team-scoped documents.
              </p>
              <Link to="/premium">
                <Button className="bg-cyan-600 hover:bg-cyan-700 text-white">{isZh ? "查看高级版详情" : "View Premium details"}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      ) : (
      <div className="p-6 max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">{isZh ? "项目团队管理" : "Project Team Management"}</h1>
            <p className="text-xs text-slate-400 mt-1">{isZh ? "管理稿件和团队范围内文档的查看者/编辑者协作。" : "Manage viewer/editor collaboration for manuscript and team-scoped documents."}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { void loadProjects(); if (selectedProjectId) void loadMembers(selectedProjectId); }}>
            Refresh
          </Button>
        </div>

        <Card className="border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isZh ? "当前项目" : "Current Project"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="max-w-xl">
                <SelectValue placeholder={loadingProjects ? "Loading projects..." : "Select project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title} ({project.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProject && (
              <p className="text-xs text-slate-400">
                {selectedProject.description || "No description"}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-slate-700/50 h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isZh ? "添加/更新成员" : "Add / Update Member"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSelectedCandidate(null);
                }}
                placeholder={isZh ? "按电子邮件/姓名搜索用户" : isZh ? "按电子邮件/姓名搜索用户" : isZh ? "按邮箱/姓名搜索用户" : "Search user by email/name"}
              />
              {searchLoading && <p className="text-xs text-slate-400">Searching users...</p>}
              {!searchLoading && searchQuery.trim().length >= 2 && candidates.length === 0 && (
                <p className="text-xs text-slate-500">{isZh ? "未找到用户。" : "No users found."}</p>
              )}
              {candidates.length > 0 && (
                <div className="space-y-1 max-h-44 overflow-auto">
                  {candidates.map((candidate) => {
                    const selected = selectedCandidate?.id === candidate.id;
                    return (
                      <button
                        key={candidate.id}
                        type="button"
                        onClick={() => setSelectedCandidate(candidate)}
                        className={`w-full rounded border p-2 text-left text-xs transition ${selected ? "border-cyan-400 bg-cyan-400/10" : "border-slate-700/50 hover:bg-slate-800/40"}`}
                      >
                        <div className="text-slate-100">{candidate.email}</div>
                        <div className="text-slate-400">{candidate.name || candidate.id}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 items-center">
                <Select value={grantRole} onValueChange={(value) => setGrantRole(value as ProjectMemberRole)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">{isZh ? "查看者" : "viewer"}</SelectItem>
                    <SelectItem value="editor">{isZh ? "编辑者" : "editor"}</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => void handleAddMember()} disabled={!selectedCandidate || !selectedProjectId}>
                  Save Member
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">{isZh ? "查看者: 只读, 编辑者: 可以修改手稿数据和团队文档。" : "viewer: read-only, editor: can modify manuscript data and team documents."}</p>
            </CardContent>
          </Card>

          <Card className="border-slate-700/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isZh ? "成员" : "Members"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loadingMembers && <p className="text-sm text-slate-400">Loading members...</p>}
              {!loadingMembers && members.length === 0 && (
                <p className="text-sm text-slate-500">{isZh ? "没有明确的成员。项目所有者总是拥有完全访问权限。" : "No explicit members. Project owner always has full access."}</p>
              )}
              {!loadingMembers && members.map((member) => (
                <div key={member.id} className="rounded border border-slate-700/50 p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm text-slate-200">{member.email || member.user_id}</p>
                      <p className="text-xs text-slate-500">{member.name || member.user_id}</p>
                    </div>
                    <Badge variant="outline">{member.role}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Select value={member.role} onValueChange={(value) => void handleRoleChange(member, value as ProjectMemberRole)}>
                      <SelectTrigger className="w-[150px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">{isZh ? "查看者" : "viewer"}</SelectItem>
                        <SelectItem value="editor">{isZh ? "编辑者" : "editor"}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="destructive" size="sm" onClick={() => void handleRemoveMember(member)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </AppLayout>
  );
}
