import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Package, Search, User2, ArrowRight, Crown } from "lucide-react";
import { ARTIFACT_TYPE_META, type Artifact, type ArtifactPackage } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { type UserProfileSummary, userProfileApi } from "@/lib/user-profile-api";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const COMMUNITY_PACKAGES_KEY = "rw-community-packages";
const MY_DOWNLOADED_PACKAGES_KEY = "rw-my-downloaded-packages";

export default function CommunityArtifacts() {
  const { user } = useAuth();
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const tr = (en: string, zh: string) => (isZh ? zh : en);
  const navigate = useNavigate();
  const isPremiumUser = Boolean(user?.is_premium) || user?.role === "admin";
  const [packages, setPackages] = useState<ArtifactPackage[]>([]);
  const [query, setQuery] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfileSummary>>({});
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [cardPageSize, setCardPageSize] = useState<30 | 60 | "all">(30);
  const [cardPage, setCardPage] = useState(1);

  const loadPackages = async () => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      const list = Array.isArray(parsed) ? (parsed as ArtifactPackage[]) : [];
      const filteredPackages = list.filter((pkg) => pkg.shared && (pkg.type === "created" || !pkg.type));
      setPackages(filteredPackages);

      const profiles = await userProfileApi.getPublicProfiles(filteredPackages.map((pkg) => pkg.ownerId));
      setUserProfiles(profiles);
    } catch {
      setPackages([]);
      setUserProfiles({});
    }
  };

  useEffect(() => {
    void loadPackages();
  }, []);

  const filteredPackages = useMemo(() => {
    if (!query.trim()) return packages;
    const q = query.trim().toLowerCase();
    return packages.filter((pkg) => {
      if (pkg.name.toLowerCase().includes(q) || pkg.description.toLowerCase().includes(q)) return true;
      return pkg.artifacts.some(
        (artifact) =>
          artifact.title.toLowerCase().includes(q) ||
          artifact.description.toLowerCase().includes(q) ||
          ARTIFACT_TYPE_META[artifact.type].label.toLowerCase().includes(q)
      );
    });
  }, [packages, query]);

  const totalCardPages = cardPageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredPackages.length / cardPageSize));
  const currentCardPage = Math.min(cardPage, totalCardPages);
  const pagedPackages = useMemo(() => {
    if (cardPageSize === "all") return filteredPackages;
    const start = (currentCardPage - 1) * cardPageSize;
    return filteredPackages.slice(start, start + cardPageSize);
  }, [filteredPackages, cardPageSize, currentCardPage]);

  useEffect(() => {
    setCardPage(1);
  }, [query, cardPageSize]);

  useEffect(() => {
    if (cardPage > totalCardPages) {
      setCardPage(totalCardPages);
    }
  }, [cardPage, totalCardPages]);

  const selectedPackage = selectedPackageId ? packages.find((p) => p.id === selectedPackageId) : null;
  const selectedOwnerProfile = selectedPackage ? userProfiles[selectedPackage.ownerId] : null;

  const typeCountForPackage = (pkg: ArtifactPackage) => {
    const counts: Record<string, number> = {};
    for (const artifact of pkg.artifacts) {
      const label = ARTIFACT_TYPE_META[artifact.type].label;
      counts[label] = (counts[label] || 0) + 1;
    }
    return counts;
  };

  const handleAddToMyPackages = (pkg: ArtifactPackage) => {
    if (typeof window === "undefined" || !user) return;
    try {
      const downloadedStr = window.localStorage.getItem(MY_DOWNLOADED_PACKAGES_KEY);
      const downloadedMap: Record<string, ArtifactPackage[]> = downloadedStr ? JSON.parse(downloadedStr) : {};
      const myDownloaded = downloadedMap[user.id] || [];

      const alreadyDownloaded = myDownloaded.some(
        (item) =>
          item.sourcePackageId === pkg.id ||
          item.id === pkg.id ||
          (item.ownerId === pkg.ownerId && item.name === pkg.name && item.createdAt === pkg.createdAt)
      );
      if (alreadyDownloaded) {
        toast.info(tr("Already in your downloaded packages", "已在你的已下载产物集中"));
        return;
      }

      if (!isPremiumUser && myDownloaded.length >= 2) {
        setShowUpgradeDialog(true);
        return;
      }

      const downloadedPkg: ArtifactPackage = {
        ...pkg,
        id: `pkg-downloaded-${Date.now()}`,
        type: "downloaded",
        sourcePackageId: pkg.id,
        downloadedBy: user.id,
        shared: false,
      };

      downloadedMap[user.id] = [...myDownloaded, downloadedPkg];
      window.localStorage.setItem(MY_DOWNLOADED_PACKAGES_KEY, JSON.stringify(downloadedMap));

      // Only increment download count in community packages; no other changes.
      const communityStr = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const communityPackages: ArtifactPackage[] = communityStr ? JSON.parse(communityStr) : [];
      const updatedCommunity = communityPackages.map((item) =>
        item.id === pkg.id ? { ...item, downloadCount: (item.downloadCount || 0) + 1 } : item
      );
      window.localStorage.setItem(COMMUNITY_PACKAGES_KEY, JSON.stringify(updatedCommunity));

      toast.success(tr("Added to My Packages", "已添加到我的产物集"));
      setSelectedPackageId(null);
    } catch {
      toast.error(tr("Failed to add package", "添加产物集失败"));
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-7 h-7 text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-100">{isZh ? "社区产集" : "Community Packages"}</h1>
              <p className="text-sm text-slate-500">{isZh ? "来自社区共享的产物集。" : "Shared packages from the community."}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredPackages.length} {tr("packages", "个产物集")}
          </Badge>
        </div>

        {!isPremiumUser && user ? (
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-cyan-100">{tr("Free accounts can add up to 2 community packages to My Packages.", "Free 账号最多可将 2 个社区产物集添加到我的产物集。")}</p>
              <p className="text-xs text-slate-300 mt-1">Upgrade to Premium to unlock Team access and higher package limits.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/premium")}
              className="shrink-0"
            >
              <Badge className="bg-cyan-900/60 text-cyan-300 border-cyan-700/40 cursor-pointer">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            </button>
          </div>
        ) : null}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("Search packages, artifacts, categories...", "搜索产物集、产物件、分类...")}
            className="pl-9 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-800/20 px-3 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Cards per page</span>
            <Select value={String(cardPageSize)} onValueChange={(value) => setCardPageSize(value === "all" ? "all" : (Number(value) as 30 | 60))}>
              <SelectTrigger className="h-7 w-[90px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30</SelectItem>
                <SelectItem value="60">60</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              {cardPageSize === "all"
                ? (isZh ? `显示全部 ${filteredPackages.length} 个产物集` : `Showing all ${filteredPackages.length} packages`)
                : (isZh
                  ? `第 ${currentCardPage}/${totalCardPages} 页 · ${filteredPackages.length} 个产物集`
                  : `Page ${currentCardPage}/${totalCardPages} · ${filteredPackages.length} packages`)}
            </span>
            {cardPageSize !== "all" && totalCardPages > 1 ? (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={currentCardPage <= 1} onClick={() => setCardPage((prev) => Math.max(1, prev - 1))}>
                  Prev
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" disabled={currentCardPage >= totalCardPages} onClick={() => setCardPage((prev) => Math.min(totalCardPages, prev + 1))}>
                  Next
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pagedPackages.map((pkg) => {
            const typeCount = typeCountForPackage(pkg);
            const ownerProfile = userProfiles[pkg.ownerId];

            return (
              <Card
                key={pkg.id}
                className="border-slate-700/50 bg-[#0d1b30] hover:border-slate-300 transition-all cursor-pointer"
                onClick={() => setSelectedPackageId(pkg.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-slate-100">{pkg.name}</CardTitle>
                  <p className="text-xs text-slate-400 mt-1">{pkg.description || "No description"}</p>
                  <p className="text-[11px] text-slate-500">
                    {pkg.artifacts.length} {tr("artifacts", "个产物件")} · {pkg.createdAt} · {pkg.downloadCount || 0} {tr("downloads", "次下载")}
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

                  {/* Owner Info */}
                  <div className="p-2 rounded border border-slate-700/50 bg-slate-800/30">
                    <Link to={`/profile/${pkg.ownerId}`} className="flex items-center gap-2 hover:bg-slate-700/40 p-1.5 rounded transition-colors">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarImage src={ownerProfile?.avatarUrl} alt={pkg.ownerName} />
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

                  <div className="flex gap-1.5 pt-1">
                    <Button
                      size="sm"
                      className="text-xs h-7 flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToMyPackages(pkg);
                      }}
                    >
                      <Package className="w-3.5 h-3.5 mr-1.5" />
                      {tr("Add to My Packages", "添加到我的产物集")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredPackages.length === 0 && (
          <div className="text-center py-16 border border-slate-700/50 rounded-lg bg-slate-800/30">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">{tr("No shared packages found.", "未找到共享产物集。")}</p>
          </div>
        )}

        {/* Package Preview Dialog */}
        <Dialog open={Boolean(selectedPackage)} onOpenChange={(open) => !open && setSelectedPackageId(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-lg">{selectedPackage?.name}</DialogTitle>
            </DialogHeader>
            {selectedPackage && (
              <div className="space-y-4">
                <div className="p-3 rounded border border-slate-700/50 bg-slate-800/30">
                  <p className="text-sm text-slate-300 mb-2">{selectedPackage.description || "No description"}</p>
                  <p className="text-xs text-slate-400">Created: {selectedPackage.createdAt}</p>
                </div>

                {/* Owner Card */}
                {selectedOwnerProfile?.isPublic && (
                  <Link to={`/profile/${selectedPackage.ownerId}`}>
                    <div className="p-3 rounded border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800/60 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedOwnerProfile.avatarUrl} alt={selectedPackage.ownerName} />
                          <AvatarFallback className="bg-cyan-500/20 text-cyan-200">
                            {selectedPackage.ownerName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-200">{selectedPackage.ownerName}</p>
                          {selectedOwnerProfile.bio && (
                            <p className="text-xs text-slate-400 truncate">{selectedOwnerProfile.bio}</p>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  </Link>
                )}

                {/* Artifacts List */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-100">{tr("Artifacts", "产物件")} ({selectedPackage.artifacts.length})</h3>
                  <ScrollArea className="h-[300px] rounded border border-slate-700/50 bg-slate-900/30 p-3">
                    <div className="space-y-2">
                      {selectedPackage.artifacts.map((artifact) => (
                        <div
                          key={artifact.id}
                          className="p-2 rounded border border-slate-700/50 bg-slate-800/40 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-slate-200">{artifact.title}</p>
                              <p className="text-slate-400 mt-0.5">{artifact.description}</p>
                            </div>
                            <Badge variant="secondary" className="text-[9px] shrink-0">
                              {ARTIFACT_TYPE_META[artifact.type].label}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-700/30">
                  <Button
                    size="sm"
                    className="text-xs flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={() => handleAddToMyPackages(selectedPackage)}
                  >
                    <Package className="w-3.5 h-3.5 mr-1.5" />
                    {tr("Add to My Packages", "添加到我的产物集")}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
          <AlertDialogContent className="bg-[#0b1f34] border-slate-700 text-slate-100">
            <AlertDialogHeader>
              <AlertDialogTitle>Upgrade to Premium</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                {tr(
                  "Free accounts can add at most 2 packages from Community Packages to My Packages. Upgrade to Premium to add more packages and unlock Team features.",
                  "Free 账号最多可将 2 个社区产物集添加到我的产物集。升级 Premium 以获得更高产物集额度和 Team 功能。"
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-start">
              <button type="button" onClick={() => navigate("/premium")}>
                <Badge className="bg-cyan-900/60 text-cyan-300 border-cyan-700/40 cursor-pointer">
                  <Crown className="w-3 h-3 mr-1" />
                  Premium
                </Badge>
              </button>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-600 text-slate-200">Maybe later</AlertDialogCancel>
              <AlertDialogAction
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-900"
                onClick={() => navigate("/premium")}
              >
                View Premium details
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
