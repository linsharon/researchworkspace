import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FilePlus2, RefreshCw, RotateCcw, Search, Share2, Trash2, Upload, FolderArchive, ListChecks } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import {
  documentAPI,
  type DocumentAccessLevel,
  type DocumentItem,
  type DocumentPermission,
  type DocumentShareItem,
  type DocumentStatus,
  type UserSearchItem,
  type DocumentVersionItem,
} from "@/lib/document-api";

const PAGE_SIZE = 12;

const statusOptions: Array<{ label: string; value: DocumentStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Review", value: "review" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const permissionOptions: DocumentPermission[] = ["private", "team", "public"];

function readableDate(value: string | undefined | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
}

function renderHighlightedSnippet(value: string) {
  const parts = value.split(/(\[\[.*?\]\])/g).filter(Boolean);

  return parts.map((part, index) => {
    const isHighlight = part.startsWith("[[") && part.endsWith("]]");
    const text = isHighlight ? part.slice(2, -2) : part;

    if (isHighlight) {
      return (
        <mark key={`${text}-${index}`} className="rounded bg-amber-400/20 px-1 text-amber-200">
          {text}
        </mark>
      );
    }

    return <span key={`${text}-${index}`}>{text}</span>;
  });
}

export default function DocumentCenter() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadingDocumentId, setUploadingDocumentId] = useState<string | null>(null);
  const [uploadTargetDoc, setUploadTargetDoc] = useState<DocumentItem | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [permissionFilter, setPermissionFilter] = useState<DocumentPermission | "all">("all" as DocumentPermission | "all");
  const [createdFromFilter, setCreatedFromFilter] = useState("");
  const [createdToFilter, setCreatedToFilter] = useState("");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const [recycleLoading, setRecycleLoading] = useState(false);
  const [recycleItems, setRecycleItems] = useState<DocumentItem[]>([]);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [newPermission, setNewPermission] = useState<DocumentPermission>("private");

  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [versions, setVersions] = useState<DocumentVersionItem[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [shareDoc, setShareDoc] = useState<DocumentItem | null>(null);
  const [shares, setShares] = useState<DocumentShareItem[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shareQuery, setShareQuery] = useState("");
  const [shareCandidates, setShareCandidates] = useState<UserSearchItem[]>([]);
  const [shareSearchLoading, setShareSearchLoading] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<UserSearchItem | null>(null);
  const [newGrantLevel, setNewGrantLevel] = useState<DocumentAccessLevel>("read");

  const totalPages = useMemo(() => Math.max(Math.ceil(total / PAGE_SIZE), 1), [total]);
  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset]);

  const loadDocuments = async (nextOffset = offset) => {
    setLoading(true);
    try {
      const response = await documentAPI.search({
        q: query || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        tag: tagFilter || undefined,
        permission: permissionFilter === "all" ? undefined : permissionFilter,
        created_from: createdFromFilter || undefined,
        created_to: createdToFilter || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setDocuments(response.items);
      setTotal(response.total);
      setOffset(nextOffset);
    } catch (error) {
      console.error(error);
      toast.error(isZh ? "加载文档失败" : isZh ? "加载文档失败" : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const loadRecycleBin = async () => {
    setRecycleLoading(true);
    try {
      const response = await documentAPI.recycleBin({ limit: 10, offset: 0 });
      setRecycleItems(response.items);
    } catch (error) {
      console.error(error);
      toast.error(isZh ? "加载回收站失败" : isZh ? "加载回收站失败" : "Failed to load recycle bin");
    } finally {
      setRecycleLoading(false);
    }
  };

  const loadVersions = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setVersionsLoading(true);
    try {
      const data = await documentAPI.listVersions(doc.id);
      setVersions(data);
    } catch (error) {
      console.error(error);
      toast.error(isZh ? "加载版本失败" : isZh ? "加载版本失败" : "Failed to load versions");
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const loadShares = async (doc: DocumentItem) => {
    setShareDoc(doc);
    setSharesLoading(true);
    setShareQuery("");
    setShareCandidates([]);
    setSelectedCandidate(null);
    setNewGrantLevel("read");
    try {
      const data = await documentAPI.listShares(doc.id);
      setShares(data);
    } catch (error) {
      console.error(error);
      toast.error(isZh ? "加载共享失败" : isZh ? "加载共享失败" : "Failed to load shares");
      setShares([]);
    } finally {
      setSharesLoading(false);
    }
  };

  const handleGrantShare = async () => {
    if (!shareDoc || !selectedCandidate?.id) {
      toast.error(isZh ? "请选择要授权的用户" : isZh ? "请选择要授权的用户" : "Please select a user to grant access");
      return;
    }
    try {
      await documentAPI.grantShare(shareDoc.id, {
        grantee_user_id: selectedCandidate.id,
        access_level: newGrantLevel,
      });
      toast.success(isZh ? "授权成功" : isZh ? "授权成功" : "Access granted");
      setShareQuery("");
      setShareCandidates([]);
      setSelectedCandidate(null);
      await loadShares(shareDoc);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to grant access");
    }
  };

  const handleRevokeShare = async (granteeUserId: string) => {
    if (!shareDoc) return;
    try {
      await documentAPI.revokeShare(shareDoc.id, granteeUserId);
      toast.success(isZh ? "权限被撤销" : isZh ? "权限被撤销" : "Access revoked");
      await loadShares(shareDoc);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to revoke access");
    }
  };

  useEffect(() => {
    const keyword = shareQuery.trim();
    if (!keyword || keyword.length < 2) {
      setShareCandidates([]);
      setShareSearchLoading(false);
      return;
    }

    let active = true;
    setShareSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const users = await documentAPI.searchUsers(keyword, 8);
        if (active) {
          setShareCandidates(users);
        }
      } catch (error) {
        if (active) {
          setShareCandidates([]);
        }
      } finally {
        if (active) {
          setShareSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [shareQuery]);

  useEffect(() => {
    void loadDocuments(0);
    void loadRecycleBin();
  }, []);

  const handleCreateDocument = async () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error(isZh ? "文档标题是必须的" : isZh ? "文档标题是必须的" : "Document title is required");
      return;
    }

    const tags = newTags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setCreating(true);
    try {
      if (newPermission === "team" && !newProjectId.trim()) {
        toast.error(isZh ? "团队文档需要项目ID" : isZh ? "团队文档需要项目ID" : "Team document requires a project ID");
        return;
      }
      await documentAPI.create({
        title,
        description: newDescription.trim() || undefined,
        tags,
        project_id: newProjectId.trim() || undefined,
        permission: newPermission,
      });
      setNewTitle("");
      setNewDescription("");
      setNewTags("");
      setNewProjectId("");
      setNewPermission("private");
      toast.success(isZh ? "文档创建成功" : isZh ? "文档创建成功" : "Document created");
      await loadDocuments(0);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to create document");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (doc: DocumentItem) => {
    try {
      await documentAPI.softDelete(doc.id);
      toast.success(isZh ? "已移至回收站" : isZh ? "已移至回收站" : "Moved to recycle bin");
      await loadDocuments(Math.max(0, offset));
      await loadRecycleBin();
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
        setVersions([]);
      }
    } catch (error) {
      console.error(error);
      toast.error(isZh ? "删除文档失败" : isZh ? "删除文档失败" : "Failed to delete document");
    }
  };

  const handleRestore = async (doc: DocumentItem) => {
    try {
      await documentAPI.restore(doc.id);
      toast.success(isZh ? "文档已恢复" : isZh ? "文档已恢复" : "Document restored");
      await loadDocuments(0);
      await loadRecycleBin();
    } catch (error) {
      console.error(error);
      toast.error(isZh ? "恢复文档失败" : isZh ? "恢复文档失败" : "Failed to restore document");
    }
  };

  const handleStatusChange = async (doc: DocumentItem, status: DocumentStatus) => {
    try {
      await documentAPI.changeStatus(doc.id, status);
      toast.success(isZh ? "状态已更新" : isZh ? "状态已更新" : "Status updated");
      await loadDocuments(offset);
      if (selectedDoc?.id === doc.id) {
        const refreshed = await documentAPI.search({ q: doc.title, limit: 1, offset: 0 });
        const latest = refreshed.items.find((item) => item.id === doc.id);
        if (latest) setSelectedDoc(latest);
      }
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to update status");
    }
  };

  const handleUploadFile = async (doc: DocumentItem, file: File) => {
    setUploadingDocumentId(doc.id);
    try {
      const init = await documentAPI.uploadInit(doc.id, {
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        bucket_name: "documents",
      });

      await documentAPI.uploadToPresignedUrl(init.upload_url, file);

      await documentAPI.uploadComplete(doc.id, {
        bucket_name: init.bucket_name,
        object_key: init.object_key,
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        change_note: `Uploaded via browser at ${new Date().toISOString()}`,
      });

      toast.success(isZh ? "文件上传成功并追加版本" : isZh ? "文件上传成功并追加版本" : "File uploaded and version appended");
      if (selectedDoc?.id === doc.id) {
        await loadVersions(doc);
      }
      await loadDocuments(offset);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to upload file");
    } finally {
      setUploadingDocumentId(null);
      setUploadTargetDoc(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSelectUploadDocument = (doc: DocumentItem) => {
    setUploadTargetDoc(doc);
    fileInputRef.current?.click();
  };

  const triggerBrowserDownload = (url: string, filename: string) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleDownload = async (params: {
    documentId: string;
    versionId?: string;
    filename: string;
    requestKey: string;
  }) => {
    setDownloadingKey(params.requestKey);
    try {
      const response = await documentAPI.getDocumentDownloadUrl(params.documentId, params.versionId ? { version_id: params.versionId } : undefined);
      if (!response.download_url) {
        toast.error(isZh ? "下载链接不可用" : isZh ? "下载链接不可用" : "Download URL is unavailable");
        return;
      }
      triggerBrowserDownload(response.download_url, params.filename);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to download file");
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleRestoreVersion = async (doc: DocumentItem, version: DocumentVersionItem) => {
    try {
      await documentAPI.restoreVersion(doc.id, version.id, {
        change_note: `Restored from v${version.version_number}`,
      });
      toast.success(`Restored ${doc.title} to v${version.version_number}`);
      await loadVersions(doc);
      await loadDocuments(offset);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to restore version");
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">{isZh ? "文档中心" : "Document Center"}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Production document metadata management with search, status workflow, recycle bin and versions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/artifacts">
              <Button variant="outline" size="sm">
                <ListChecks className="w-4 h-4 mr-1" /> Artifacts
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => { void loadDocuments(offset); void loadRecycleBin(); }}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file || !uploadTargetDoc) return;
            void handleUploadFile(uploadTargetDoc, file);
          }}
        />

        <Card className="border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{isZh ? "创建文档" : "Create Document"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={isZh ? "标题" : isZh ? "标题" : "Title"} />
              <Select value={newPermission} onValueChange={(v) => setNewPermission(v as DocumentPermission)}>
                <SelectTrigger>
                  <SelectValue placeholder={isZh ? "权限" : isZh ? "权限" : isZh ? "权限" : "Permission"} />
                </SelectTrigger>
                <SelectContent>
                  {permissionOptions.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input value={newProjectId} onChange={(e) => setNewProjectId(e.target.value)} placeholder={isZh ? "项目ID（团队权限需要）" : isZh ? "项目ID（团队权限需要）" : "Project ID (required for team permission)"} />
            <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder={isZh ? "描述" : isZh ? "描述" : "Description"} />
            <Input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder={isZh ? "标签（逗号分隔）" : isZh ? "标签（逗号分隔）" : "Tags (comma separated)"} />
            <Button size="sm" onClick={() => void handleCreateDocument()} disabled={creating}>
              <FilePlus2 className="w-4 h-4 mr-1" /> {creating ? "Creating..." : "Create"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <Card className="border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{isZh ? "搜索文档" : "Search Documents"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-500" />
                    <Input
                      className="pl-8"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={isZh ? "按标题/描述搜索" : isZh ? "按标题/描述搜索" : "Search by title/description"}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentStatus | "all") }>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={isZh ? "状态" : isZh ? "状态" : "Status"} />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={permissionFilter} onValueChange={(v) => setPermissionFilter(v as DocumentPermission | "all") }>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={isZh ? "权限" : "Permission"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{isZh ? "所有权限" : "All Permissions"}</SelectItem>
                      {permissionOptions.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Input
                    className="min-w-[180px] flex-1"
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    placeholder={isZh ? "按标签过滤" : isZh ? "按标签过滤" : "Filter by tag"}
                  />
                  <Input
                    className="w-[180px]"
                    type="date"
                    value={createdFromFilter}
                    onChange={(e) => setCreatedFromFilter(e.target.value)}
                  />
                  <Input
                    className="w-[180px]"
                    type="date"
                    value={createdToFilter}
                    onChange={(e) => setCreatedToFilter(e.target.value)}
                  />
                  <Button onClick={() => void loadDocuments(0)} size="sm">Apply</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setTagFilter("");
                      setStatusFilter("all");
                      setPermissionFilter("all");
                      setCreatedFromFilter("");
                      setCreatedToFilter("");
                      void loadDocuments(0);
                    }}
                  >
                    Reset
                  </Button>
                </div>

                {loading ? (
                  <p className="text-sm text-slate-400">{isZh ? "加载文档中..." : "Loading documents..."}</p>
                ) : (
                  <div className="space-y-2">
                    {documents.length === 0 && <p className="text-sm text-slate-500">No documents found.</p>}
                    {documents.map((doc) => (
                      <div key={doc.id} className="p-3 rounded border border-slate-700/50 bg-slate-900/40">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-medium text-slate-100">{doc.title}</h3>
                              <Badge variant="secondary">{doc.status}</Badge>
                              <Badge variant="outline">{doc.permission}</Badge>
                              <Badge variant="outline">{doc.effective_access_level}</Badge>
                            </div>
                            <p className="text-xs text-slate-400">Updated: {readableDate(doc.updated_at)}</p>
                            <p className="text-xs text-slate-500">Owner: {doc.owner_user_id}{doc.project_id ? ` | Project: ${doc.project_id}` : ""}</p>
                            {doc.search_highlight && (
                              <p className="text-xs leading-5 text-slate-300">
                                Match: {renderHighlightedSnippet(doc.search_highlight)}
                              </p>
                            )}
                            {doc.tags?.length > 0 && (
                              <p className="text-xs text-slate-500">Tags: {doc.tags.join(", ")}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Select value={doc.status} onValueChange={(v) => void handleStatusChange(doc, v as DocumentStatus)} disabled={doc.effective_access_level === "read"}>
                              <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {statusOptions.filter((item) => item.value !== "all").map((item) => (
                                  <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" onClick={() => void loadVersions(doc)}>
                              Versions
                            </Button>
                            <Button variant="outline" size="sm" disabled={!doc.is_owner} onClick={() => void loadShares(doc)}>
                              <Share2 className="w-3 h-3 mr-1" />
                              Share
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!doc.bucket_name || !doc.object_key || downloadingKey === `doc-${doc.id}`}
                              onClick={() => void handleDownload({
                                documentId: doc.id,
                                filename: `${doc.title}.bin`,
                                requestKey: `doc-${doc.id}`,
                              })}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              {downloadingKey === `doc-${doc.id}` ? "Downloading..." : "Download"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={uploadingDocumentId === doc.id || doc.effective_access_level === "read"}
                              onClick={() => handleSelectUploadDocument(doc)}
                            >
                              <Upload className="w-3 h-3 mr-1" />
                              {uploadingDocumentId === doc.id ? "Uploading..." : "Upload Version"}
                            </Button>
                            <Button variant="destructive" size="sm" disabled={!doc.is_owner} onClick={() => void handleDelete(doc)}>
                              <Trash2 className="w-3 h-3 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Total: {total}</span>
                  <span>Page {currentPage} / {totalPages}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset === 0 || loading}
                      onClick={() => void loadDocuments(Math.max(0, offset - PAGE_SIZE))}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={offset + PAGE_SIZE >= total || loading}
                      onClick={() => void loadDocuments(offset + PAGE_SIZE)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderArchive className="w-4 h-4" /> Recycle Bin
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recycleLoading ? (
                  <p className="text-sm text-slate-400">{isZh ? "加载回收站中..." : "Loading recycle bin..."}</p>
                ) : recycleItems.length === 0 ? (
                  <p className="text-sm text-slate-500">{isZh ? "回收站为空。" : "Recycle bin is empty."}</p>
                ) : (
                  recycleItems.map((doc) => (
                    <div key={doc.id} className="p-2 border border-slate-700/50 rounded flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm text-slate-200">{doc.title}</p>
                        <p className="text-xs text-slate-500">Deleted at: {readableDate(doc.deleted_at)}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => void handleRestore(doc)}>
                        <RotateCcw className="w-3 h-3 mr-1" /> Restore
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-700/50 h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isZh ? "版本历史" : "Version History"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedDoc && <p className="text-sm text-slate-500">Select a document to view versions.</p>}
              {selectedDoc && (
                <>
                  <div className="text-xs text-slate-400">Document: {selectedDoc.title}</div>
                  {versionsLoading ? (
                    <p className="text-sm text-slate-400">{isZh ? "加载版本中..." : "Loading versions..."}</p>
                  ) : versions.length === 0 ? (
                    <p className="text-sm text-slate-500">{isZh ? "暂无版本。" : "No versions yet."}</p>
                  ) : (
                    versions.map((version) => (
                      <div key={version.id} className="p-2 rounded border border-slate-700/50 bg-slate-900/40">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">v{version.version_number}</Badge>
                          <span className="text-[10px] text-slate-500">{readableDate(version.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{version.filename}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {version.object_key || "(no object key)"}
                        </p>
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!version.bucket_name || !version.object_key || downloadingKey === `version-${version.id}`}
                            onClick={() => void handleDownload({
                              documentId: version.document_id,
                              versionId: version.id,
                              filename: version.filename,
                              requestKey: `version-${version.id}`,
                            })}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            {downloadingKey === `version-${version.id}` ? "Downloading..." : "Download Version"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={selectedDoc?.effective_access_level === "read"}
                            onClick={() => void handleRestoreVersion(selectedDoc, version)}
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Restore Version
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-700/50 h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{isZh ? "访问共享" : "Access Sharing"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!shareDoc && <p className="text-sm text-slate-500">Select a document and click Share to manage access.</p>}
              {shareDoc && (
                <>
                  <div className="text-xs text-slate-400">Document: {shareDoc.title}</div>

                  <div className="flex gap-1 flex-wrap">
                    <Input
                      className="flex-1 min-w-[140px] h-7 text-xs"
                      placeholder={isZh ? "按邮箱/姓名搜索用户" : isZh ? "按电子邮件/姓名搜索用户" : "Search user by email/name"}
                      value={shareQuery}
                      onChange={(e) => {
                        setShareQuery(e.target.value);
                        setSelectedCandidate(null);
                      }}
                    />
                    <Select value={newGrantLevel} onValueChange={(v) => setNewGrantLevel(v as DocumentAccessLevel)}>
                      <SelectTrigger className="w-[90px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="read">{isZh ? "阅读" : "Read"}</SelectItem>
                        <SelectItem value="edit">{isZh ? "编辑" : "Edit"}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-7 text-xs" onClick={() => void handleGrantShare()}>
                      Grant
                    </Button>
                  </div>

                  {shareSearchLoading && <p className="text-[11px] text-slate-400">Searching users...</p>}
                  {!shareSearchLoading && shareQuery.trim().length >= 2 && shareCandidates.length === 0 && (
                    <p className="text-[11px] text-slate-500">{isZh ? "没有匹配您查询的用户。" : "No users matched your query."}</p>
                  )}
                  {shareCandidates.length > 0 && (
                    <div className="space-y-1">
                      {shareCandidates.map((candidate) => {
                        const isSelected = selectedCandidate?.id === candidate.id;
                        return (
                          <button
                            key={candidate.id}
                            type="button"
                            className={`w-full text-left p-1.5 rounded border text-xs transition ${
                              isSelected
                                ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                                : "border-slate-700/50 bg-slate-900/40 text-slate-300 hover:border-slate-500/60"
                            }`}
                            onClick={() => setSelectedCandidate(candidate)}
                          >
                            <div className="font-medium truncate">{candidate.email}</div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {candidate.name || "(no name)"} · {candidate.id}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {selectedCandidate && (
                    <p className="text-[11px] text-emerald-300">
                      Selected: {selectedCandidate.email} ({selectedCandidate.id})
                    </p>
                  )}

                  {sharesLoading ? (
                    <p className="text-xs text-slate-400">Loading…</p>
                  ) : shares.length === 0 ? (
                    <p className="text-xs text-slate-500">{isZh ? "没有激活的共享。" : "No active shares."}</p>
                  ) : (
                    shares.map((s) => (
                      <div key={s.grantee_user_id} className="flex items-center justify-between p-1.5 rounded border border-slate-700/50 bg-slate-900/40">
                        <div className="text-xs text-slate-300 truncate max-w-[140px]" title={s.grantee_user_id}>
                          {s.grantee_email || s.grantee_name || s.grantee_user_id}
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-[10px] py-0">{s.access_level}</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 text-slate-400 hover:text-red-400"
                            onClick={() => void handleRevokeShare(s.grantee_user_id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
