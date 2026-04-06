import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilePlus2, RefreshCw, RotateCcw, Search, Trash2, Upload, FolderArchive, ListChecks } from "lucide-react";
import {
  documentAPI,
  type DocumentItem,
  type DocumentPermission,
  type DocumentStatus,
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

export default function DocumentCenter() {
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);

  const [recycleLoading, setRecycleLoading] = useState(false);
  const [recycleItems, setRecycleItems] = useState<DocumentItem[]>([]);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newPermission, setNewPermission] = useState<DocumentPermission>("private");

  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [versions, setVersions] = useState<DocumentVersionItem[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const totalPages = useMemo(() => Math.max(Math.ceil(total / PAGE_SIZE), 1), [total]);
  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset]);

  const loadDocuments = async (nextOffset = offset) => {
    setLoading(true);
    try {
      const response = await documentAPI.search({
        q: query || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setDocuments(response.items);
      setTotal(response.total);
      setOffset(nextOffset);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load documents");
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
      toast.error("Failed to load recycle bin");
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
      toast.error("Failed to load versions");
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  useEffect(() => {
    void loadDocuments(0);
    void loadRecycleBin();
  }, []);

  const handleCreateDocument = async () => {
    const title = newTitle.trim();
    if (!title) {
      toast.error("Document title is required");
      return;
    }

    const tags = newTags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    setCreating(true);
    try {
      await documentAPI.create({
        title,
        description: newDescription.trim() || undefined,
        tags,
        permission: newPermission,
      });
      setNewTitle("");
      setNewDescription("");
      setNewTags("");
      setNewPermission("private");
      toast.success("Document created");
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
      toast.success("Moved to recycle bin");
      await loadDocuments(Math.max(0, offset));
      await loadRecycleBin();
      if (selectedDoc?.id === doc.id) {
        setSelectedDoc(null);
        setVersions([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete document");
    }
  };

  const handleRestore = async (doc: DocumentItem) => {
    try {
      await documentAPI.restore(doc.id);
      toast.success("Document restored");
      await loadDocuments(0);
      await loadRecycleBin();
    } catch (error) {
      console.error(error);
      toast.error("Failed to restore document");
    }
  };

  const handleStatusChange = async (doc: DocumentItem, status: DocumentStatus) => {
    try {
      await documentAPI.changeStatus(doc.id, status);
      toast.success("Status updated");
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

  const handleSimulateUploadComplete = async (doc: DocumentItem) => {
    const stamp = Date.now();
    const objectKey = `documents/${doc.owner_user_id}/${doc.id}/manual-v${stamp}.pdf`;
    try {
      await documentAPI.uploadComplete(doc.id, {
        bucket_name: "documents",
        object_key: objectKey,
        filename: `manual-v${stamp}.pdf`,
        content_type: "application/pdf",
        size_bytes: 1024,
        change_note: "Manual upload-complete simulation",
      });
      toast.success("Version appended via upload-complete");
      if (selectedDoc?.id === doc.id) {
        await loadVersions(doc);
      }
      await loadDocuments(offset);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || "Failed to append version");
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Document Center</h1>
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

        <Card className="border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" />
              <Select value={newPermission} onValueChange={(v) => setNewPermission(v as DocumentPermission)}>
                <SelectTrigger>
                  <SelectValue placeholder="Permission" />
                </SelectTrigger>
                <SelectContent>
                  {permissionOptions.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description" />
            <Input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="Tags (comma separated)" />
            <Button size="sm" onClick={() => void handleCreateDocument()} disabled={creating}>
              <FilePlus2 className="w-4 h-4 mr-1" /> {creating ? "Creating..." : "Create"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <Card className="border-slate-700/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Search Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="w-4 h-4 absolute left-2 top-2.5 text-slate-500" />
                    <Input
                      className="pl-8"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by title/description"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentStatus | "all") }>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={() => void loadDocuments(0)} size="sm">Apply</Button>
                </div>

                {loading ? (
                  <p className="text-sm text-slate-400">Loading documents...</p>
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
                            </div>
                            <p className="text-xs text-slate-400">Updated: {readableDate(doc.updated_at)}</p>
                            {doc.tags?.length > 0 && (
                              <p className="text-xs text-slate-500">Tags: {doc.tags.join(", ")}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Select value={doc.status} onValueChange={(v) => void handleStatusChange(doc, v as DocumentStatus)}>
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
                            <Button variant="outline" size="sm" onClick={() => void handleSimulateUploadComplete(doc)}>
                              <Upload className="w-3 h-3 mr-1" /> Add Version
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => void handleDelete(doc)}>
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
                  <p className="text-sm text-slate-400">Loading recycle bin...</p>
                ) : recycleItems.length === 0 ? (
                  <p className="text-sm text-slate-500">Recycle bin is empty.</p>
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
              <CardTitle className="text-sm">Version History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedDoc && <p className="text-sm text-slate-500">Select a document to view versions.</p>}
              {selectedDoc && (
                <>
                  <div className="text-xs text-slate-400">Document: {selectedDoc.title}</div>
                  {versionsLoading ? (
                    <p className="text-sm text-slate-400">Loading versions...</p>
                  ) : versions.length === 0 ? (
                    <p className="text-sm text-slate-500">No versions yet.</p>
                  ) : (
                    versions.map((version) => (
                      <div key={version.id} className="p-2 rounded border border-slate-700/50 bg-slate-900/40">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">v{version.version_number}</Badge>
                          <span className="text-[10px] text-slate-500">{readableDate(version.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1">{version.filename}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {version.object_key || "(no object key)"}
                        </p>
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
