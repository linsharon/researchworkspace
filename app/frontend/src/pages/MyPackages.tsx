import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Edit2, Trash2, Search, Sparkles, Download as DownloadIcon, ArrowRight, Box } from "lucide-react";
import { type Artifact, type ArtifactPackage, ARTIFACT_TYPE_META } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { type UserProfileSummary, userProfileApi } from "@/lib/user-profile-api";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const COMMUNITY_PACKAGES_KEY = "rw-community-packages";
const MY_DOWNLOADED_PACKAGES_KEY = "rw-my-downloaded-packages";
const ARTIFACTS_STORAGE_KEY = "rw-artifacts";
const ARTIFACTS_UPDATED_EVENT = "artifacts-updated";

type UserProfileMap = Record<string, UserProfileSummary>;

type EditFormState = {
  name: string;
  description: string;
  selectedArtifactIds: string[];
};

type UnpackConflictState = {
  pkg: ArtifactPackage;
  duplicateCount: number;
  duplicateKeys: string[];
};

export default function MyPackages() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [query, setQuery] = useState("");
  const [createdPackages, setCreatedPackages] = useState<ArtifactPackage[]>([]);
  const [downloadedPackages, setDownloadedPackages] = useState<ArtifactPackage[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ArtifactPackage | null>(null);
  const [activeTab, setActiveTab] = useState("created");
  const [cardPageSize, setCardPageSize] = useState<30 | 60 | "all">(30);
  const [createdPage, setCreatedPage] = useState(1);
  const [downloadedPage, setDownloadedPage] = useState(1);
  const [profiles, setProfiles] = useState<UserProfileMap>({});
  const [editForm, setEditForm] = useState<EditFormState>({
    name: "",
    description: "",
    selectedArtifactIds: [],
  });
  const [unpackConflict, setUnpackConflict] = useState<UnpackConflictState | null>(null);
  const [showUnpackConflictDialog, setShowUnpackConflictDialog] = useState(false);

  const loadPackages = async () => {
    if (typeof window === "undefined" || !user) return;
    try {
      const communityStr = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const allCommunity: ArtifactPackage[] = communityStr ? JSON.parse(communityStr) : [];
      const mine = allCommunity.filter(
        (pkg) => pkg.ownerId === user.id && (pkg.type === "created" || !pkg.type)
      );
      setCreatedPackages(mine);

      const downloadedStr = window.localStorage.getItem(MY_DOWNLOADED_PACKAGES_KEY);
      const downloadedMap: Record<string, ArtifactPackage[]> = downloadedStr ? JSON.parse(downloadedStr) : {};
      const myDownloaded = downloadedMap[user.id] || [];
      setDownloadedPackages(myDownloaded);

      const ownerIds = [...mine, ...myDownloaded].map((pkg) => pkg.ownerId);
      const profileMap = await userProfileApi.getPublicProfiles(ownerIds);
      setProfiles(profileMap);
    } catch {
      setCreatedPackages([]);
      setDownloadedPackages([]);
      setProfiles({});
    }
  };

  useEffect(() => {
    void loadPackages();
  }, [user?.id]);

  const filteredCreatedPackages = useMemo(() => {
    if (!query.trim()) return createdPackages;
    const q = query.trim().toLowerCase();
    return createdPackages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q)
    );
  }, [createdPackages, query]);

  const filteredDownloadedPackages = useMemo(() => {
    if (!query.trim()) return downloadedPackages;
    const q = query.trim().toLowerCase();
    return downloadedPackages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q) ||
        pkg.ownerName.toLowerCase().includes(q)
    );
  }, [downloadedPackages, query]);

  const activePackages = activeTab === "created" ? filteredCreatedPackages : filteredDownloadedPackages;
  const activePage = activeTab === "created" ? createdPage : downloadedPage;
  const totalCardPages = cardPageSize === "all" ? 1 : Math.max(1, Math.ceil(activePackages.length / cardPageSize));
  const currentCardPage = Math.min(activePage, totalCardPages);

  const pagedCreatedPackages = useMemo(() => {
    if (cardPageSize === "all") return filteredCreatedPackages;
    const start = (createdPage - 1) * cardPageSize;
    return filteredCreatedPackages.slice(start, start + cardPageSize);
  }, [filteredCreatedPackages, cardPageSize, createdPage]);

  const pagedDownloadedPackages = useMemo(() => {
    if (cardPageSize === "all") return filteredDownloadedPackages;
    const start = (downloadedPage - 1) * cardPageSize;
    return filteredDownloadedPackages.slice(start, start + cardPageSize);
  }, [filteredDownloadedPackages, cardPageSize, downloadedPage]);

  useEffect(() => {
    setCreatedPage(1);
    setDownloadedPage(1);
  }, [query, cardPageSize]);

  useEffect(() => {
    const createdTotalPages = cardPageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredCreatedPackages.length / cardPageSize));
    if (createdPage > createdTotalPages) {
      setCreatedPage(createdTotalPages);
    }
    const downloadedTotalPages = cardPageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredDownloadedPackages.length / cardPageSize));
    if (downloadedPage > downloadedTotalPages) {
      setDownloadedPage(downloadedTotalPages);
    }
  }, [cardPageSize, createdPage, downloadedPage, filteredCreatedPackages.length, filteredDownloadedPackages.length]);

  const saveCreatedPackages = (next: ArtifactPackage[]) => {
    if (typeof window === "undefined" || !user) return;
    const communityStr = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
    const allCommunity: ArtifactPackage[] = communityStr ? JSON.parse(communityStr) : [];

    const mineIds = new Set(createdPackages.map((pkg) => pkg.id));
    const untouched = allCommunity.filter((pkg) => !mineIds.has(pkg.id));
    const merged = [...untouched, ...next];

    window.localStorage.setItem(COMMUNITY_PACKAGES_KEY, JSON.stringify(merged));
    setCreatedPackages(next);
  };

  const saveDownloadedPackages = (next: ArtifactPackage[]) => {
    if (typeof window === "undefined" || !user) return;
    const downloadedStr = window.localStorage.getItem(MY_DOWNLOADED_PACKAGES_KEY);
    const downloadedMap: Record<string, ArtifactPackage[]> = downloadedStr ? JSON.parse(downloadedStr) : {};
    downloadedMap[user.id] = next;
    window.localStorage.setItem(MY_DOWNLOADED_PACKAGES_KEY, JSON.stringify(downloadedMap));
    setDownloadedPackages(next);
  };

  const handleStartEdit = (pkg: ArtifactPackage) => {
    setEditingPackage(pkg);
    setEditForm({
      name: pkg.name,
      description: pkg.description,
      selectedArtifactIds: pkg.artifacts.map((artifact) => artifact.id),
    });
    setShowEditDialog(true);
  };

  const toggleArtifactSelection = (artifactId: string) => {
    setEditForm((prev) => {
      const selected = prev.selectedArtifactIds.includes(artifactId)
        ? prev.selectedArtifactIds.filter((id) => id !== artifactId)
        : [...prev.selectedArtifactIds, artifactId];
      return { ...prev, selectedArtifactIds: selected };
    });
  };

  const handleSaveEdit = () => {
    if (!editingPackage || !editForm.name.trim()) return;

    const selectedSet = new Set(editForm.selectedArtifactIds);
    const nextArtifacts = editingPackage.artifacts.filter((artifact) => selectedSet.has(artifact.id));

    const next = createdPackages.map((pkg) =>
      pkg.id === editingPackage.id
        ? {
            ...pkg,
            name: editForm.name.trim(),
            description: editForm.description.trim(),
            artifacts: nextArtifacts,
          }
        : pkg
    );

    saveCreatedPackages(next);
    toast.success(isZh ? "创建的套餐已更新" : isZh ? "创建的套餐已更新" : isZh ? "创建的套餐已更新" : "Created package updated");
    setShowEditDialog(false);
    setEditingPackage(null);
  };

  const handleDeleteCreated = (id: string) => {
    const next = createdPackages.filter((pkg) => pkg.id !== id);
    saveCreatedPackages(next);
    toast.success(isZh ? "创建的产集被删除" : isZh ? "创建的产集被删除" : isZh ? "创建的产集被删除" : "Created package deleted");
  };

  const handleUnshareCreated = (id: string) => {
    const next = createdPackages.map((pkg) =>
      pkg.id === id ? { ...pkg, shared: false } : pkg
    );
    saveCreatedPackages(next);
    toast.success(isZh ? "产集现在是未共享状态" : isZh ? "产集现在是未共享状态" : isZh ? "产集现在是未共享状态" : "Package is now unshared");
  };

  const handleRemoveDownloaded = (id: string) => {
    const next = downloadedPackages.filter((pkg) => pkg.id !== id);
    saveDownloadedPackages(next);
    toast.success(isZh ? "已从下载的产集中移除" : isZh ? "已从下载的产集中移除" : isZh ? "已从下载的产集中移除" : "Removed from downloaded packages");
  };

  const buildArtifactFingerprint = (artifact: Artifact) => {
    const title = (artifact.title || "").trim().toLowerCase();
    const description = (artifact.description || "").trim().toLowerCase();
    const content = (artifact.content || "").trim().toLowerCase();
    return `${artifact.type}::${title}::${description}::${content}`;
  };

  const importArtifactFromPackage = (artifact: Artifact, ownerName: string) => ({
    ...artifact,
    id: `${artifact.id}-unpack-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: `${artifact.title} (from ${ownerName})`,
  });

  const applyUnpackStrategy = (
    pkg: ArtifactPackage,
    mode: "keep-mine" | "use-community",
    duplicateKeys: string[]
  ) => {
    if (typeof window === "undefined") return;
    const duplicateSet = new Set(duplicateKeys);

    try {
      const savedArtifacts = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
      const currentArtifacts: Artifact[] = savedArtifacts ? JSON.parse(savedArtifacts) : [];

      const importedArtifacts = pkg.artifacts.map((artifact) => importArtifactFromPackage(artifact, pkg.ownerName));

      let finalArtifacts: Artifact[] = currentArtifacts;
      let importedCount = 0;
      let replacedCount = 0;

      if (mode === "keep-mine") {
        const nonDuplicateImports = importedArtifacts.filter(
          (artifact) => !duplicateSet.has(buildArtifactFingerprint(artifact))
        );
        importedCount = nonDuplicateImports.length;
        finalArtifacts = [...currentArtifacts, ...nonDuplicateImports];
      } else {
        const beforeCount = currentArtifacts.length;
        const mineWithoutDuplicates = currentArtifacts.filter(
          (artifact) => !duplicateSet.has(buildArtifactFingerprint(artifact))
        );
        replacedCount = beforeCount - mineWithoutDuplicates.length;
        importedCount = importedArtifacts.length;
        finalArtifacts = [...mineWithoutDuplicates, ...importedArtifacts];
      }

      window.localStorage.setItem(ARTIFACTS_STORAGE_KEY, JSON.stringify(finalArtifacts));
      window.dispatchEvent(new CustomEvent(ARTIFACTS_UPDATED_EVENT));

      if (mode === "keep-mine") {
        toast.success(`Imported ${importedCount} new artifacts, kept your ${duplicateKeys.length} duplicates`);
      } else {
        toast.success(`Imported ${importedCount} artifacts and replaced ${replacedCount} duplicates`);
      }
    } catch {
      toast.error(isZh ? "无法解压产集" : isZh ? "无法解压产集" : isZh ? "无法解压产集" : isZh ? "无法解压产集" : isZh ? "无法解压产集" : isZh ? "无法解压产集" : "Failed to unpack package");
    }
  };

  const handleUnpackToArtifactCenter = (pkg: ArtifactPackage) => {
    if (typeof window === "undefined") return;
    try {
      const savedArtifacts = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
      const currentArtifacts: Artifact[] = savedArtifacts ? JSON.parse(savedArtifacts) : [];

      const currentFingerprintSet = new Set(currentArtifacts.map(buildArtifactFingerprint));
      const duplicateKeys = pkg.artifacts
        .map(buildArtifactFingerprint)
        .filter((fingerprint) => currentFingerprintSet.has(fingerprint));

      if (duplicateKeys.length > 0) {
        setUnpackConflict({
          pkg,
          duplicateCount: duplicateKeys.length,
          duplicateKeys,
        });
        setShowUnpackConflictDialog(true);
        return;
      }

      applyUnpackStrategy(pkg, "keep-mine", []);
    } catch {
      toast.error("Failed to unpack package");
    }
  };

  const renderPackageCard = (pkg: ArtifactPackage, variant: "created" | "downloaded") => {
    const typeCount = pkg.artifacts.reduce<Record<string, number>>((acc, artifact) => {
      const label = ARTIFACT_TYPE_META[artifact.type].label;
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
    const profile = profiles[pkg.ownerId];

    return (
      <Card key={pkg.id} className="border-slate-700/50 bg-[#0d1b30] hover:border-slate-300 transition-all">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-100">{pkg.name}</CardTitle>
          <p className="text-xs text-slate-400 mt-1">{pkg.description || "No description"}</p>
          <p className="text-[11px] text-slate-500">
            {pkg.artifacts.length} artifacts · {pkg.createdAt} · {pkg.downloadCount || 0} downloads
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(typeCount).map(([label, count]) => (
              <Badge key={label} variant="secondary" className="text-[10px] px-2 py-0.5">
                {label} ({count})
              </Badge>
            ))}
          </div>

          <div className="p-2 rounded border border-slate-700/50 bg-slate-800/30">
            <Link to={`/profile/${pkg.ownerId}`} className="flex items-center gap-2 hover:bg-slate-700/40 p-1.5 rounded transition-colors">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={profile?.avatarUrl} alt={pkg.ownerName} />
                <AvatarFallback className="bg-cyan-500/20 text-cyan-200 text-sm font-semibold">
                  {pkg.ownerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{pkg.ownerName}</p>
                <p className="text-[10px] text-slate-400 truncate">{pkg.ownerId}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </Link>
          </div>

          {variant === "created" ? (
            <div className="flex gap-1.5 pt-1">
              <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => handleStartEdit(pkg)}>
                <Edit2 className="w-3.5 h-3.5 mr-1" />
                Edit
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => handleUnshareCreated(pkg.id)}>
                Unshare
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 flex-1 text-red-500 hover:text-red-400" onClick={() => handleDeleteCreated(pkg.id)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            </div>
          ) : (
            <div className="flex gap-1.5 pt-1">
              <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={() => handleUnpackToArtifactCenter(pkg)}>
                <Box className="w-3.5 h-3.5 mr-1" />
                Unpack to Artifact Center
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 flex-1 text-red-500 hover:text-red-400" onClick={() => handleRemoveDownloaded(pkg.id)}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Remove
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-7 h-7 text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-100">{isZh ? "我的产集" : "My Packages"}</h1>
              <p className="text-sm text-slate-500">{isZh ? "管理您创建和下载的产集" : "Manage your created and downloaded packages"}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredCreatedPackages.length + filteredDownloadedPackages.length} packages
          </Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isZh ? "搜索产集..." : isZh ? "搜索产集..." : isZh ? "搜索产集..." : "Search packages..."}
            className="pl-9 text-sm"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="created" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Created Packages ({filteredCreatedPackages.length})
            </TabsTrigger>
            <TabsTrigger value="downloaded" className="flex items-center gap-2">
              <DownloadIcon className="w-4 h-4" />
              Downloaded Packages ({filteredDownloadedPackages.length})
            </TabsTrigger>
          </TabsList>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-800/20 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>{isZh ? "每页卡片数" : "Cards per page"}</span>
              <Select value={String(cardPageSize)} onValueChange={(value) => setCardPageSize(value === "all" ? "all" : (Number(value) as 30 | 60))}>
                <SelectTrigger className="h-7 w-[90px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="all">{isZh ? "全部" : "All"}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>
                {cardPageSize === "all"
                  ? `Showing all ${activePackages.length} packages`
                  : `Page ${currentCardPage}/${totalCardPages} · ${activePackages.length} packages`}
              </span>
              {cardPageSize !== "all" && totalCardPages > 1 ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={currentCardPage <= 1}
                    onClick={() => activeTab === "created" ? setCreatedPage((prev) => Math.max(1, prev - 1)) : setDownloadedPage((prev) => Math.max(1, prev - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={currentCardPage >= totalCardPages}
                    onClick={() => activeTab === "created" ? setCreatedPage((prev) => Math.min(totalCardPages, prev + 1)) : setDownloadedPage((prev) => Math.min(totalCardPages, prev + 1))}
                  >
                    Next
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <TabsContent value="created" className="space-y-4">
            {filteredCreatedPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedCreatedPackages.map((pkg) => renderPackageCard(pkg, "created"))}
              </div>
            ) : (
              <div className="text-center py-16 border border-slate-700/50 rounded-lg bg-slate-800/30">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  {query.trim() ? "No created packages match your search" : "No created packages yet"}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="downloaded" className="space-y-4">
            {filteredDownloadedPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pagedDownloadedPackages.map((pkg) => renderPackageCard(pkg, "downloaded"))}
              </div>
            ) : (
              <div className="text-center py-16 border border-slate-700/50 rounded-lg bg-slate-800/30">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  {query.trim() ? "No downloaded packages match your search" : "No downloaded packages yet"}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{isZh ? "编辑创建的产集" : "Edit Created Package"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">{isZh ? "产集名称" : "Package Name"}</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={isZh ? "产集名" : isZh ? "产集名" : isZh ? "产集名" : "Package name"}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">{isZh ? "描述" : "Description"}</label>
                <Input
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={isZh ? "产集描述" : isZh ? "产集描述" : isZh ? "产集描述" : "Package description"}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">{isZh ? "包含的产件" : "Included Artifacts"}</label>
                <ScrollArea className="h-52 rounded border border-slate-700/50 bg-slate-900/30 p-2">
                  <div className="space-y-1.5">
                    {(editingPackage?.artifacts || []).map((artifact) => {
                      const selected = editForm.selectedArtifactIds.includes(artifact.id);
                      return (
                        <button
                          key={artifact.id}
                          type="button"
                          onClick={() => toggleArtifactSelection(artifact.id)}
                          className={`w-full text-left px-2 py-1.5 rounded border text-xs transition-colors ${
                            selected
                              ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-100"
                              : "border-slate-700/40 bg-slate-800/30 text-slate-300"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{artifact.title}</span>
                            <Badge variant="secondary" className="text-[9px]">
                              {ARTIFACT_TYPE_META[artifact.type].label}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="text-xs" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white flex-1" onClick={handleSaveEdit}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showUnpackConflictDialog} onOpenChange={setShowUnpackConflictDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{isZh ? "检测到重复的产件" : "Duplicate Artifacts Detected"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Found <span className="font-semibold text-cyan-300">{unpackConflict?.duplicateCount || 0}</span> duplicate records between this community package and your Artifact Center.
              </p>
              <p className="text-xs text-slate-400">
                Choose which version to keep for duplicates:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  className="justify-start text-left h-auto py-2"
                  onClick={() => {
                    if (!unpackConflict) return;
                    applyUnpackStrategy(unpackConflict.pkg, "keep-mine", unpackConflict.duplicateKeys);
                    setShowUnpackConflictDialog(false);
                    setUnpackConflict(null);
                  }}
                >
                  Keep My Version
                </Button>
                <Button
                  className="justify-start text-left h-auto py-2 bg-cyan-600 hover:bg-cyan-700 text-white"
                  onClick={() => {
                    if (!unpackConflict) return;
                    applyUnpackStrategy(unpackConflict.pkg, "use-community", unpackConflict.duplicateKeys);
                    setShowUnpackConflictDialog(false);
                    setUnpackConflict(null);
                  }}
                >
                  Use Community Package Version
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-left h-auto py-2 text-slate-400"
                  onClick={() => {
                    setShowUnpackConflictDialog(false);
                    setUnpackConflict(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
