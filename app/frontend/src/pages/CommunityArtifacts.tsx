import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, Globe, Package, Search, User2, ArrowRight } from "lucide-react";
import { ARTIFACT_TYPE_META, type Artifact } from "@/lib/data";

type ArtifactPackage = {
  id: string;
  name: string;
  description: string;
  artifacts: Artifact[];
  createdAt: string;
  shared: boolean;
  ownerId: string;
  ownerName: string;
};

type UserProfile = {
  userId: string;
  email: string;
  username: string;
  bio: string;
  avatarUrl: string;
  isPublic: boolean;
  updatedAt: string;
};

const COMMUNITY_PACKAGES_KEY = "rw-community-packages";
const ARTIFACTS_STORAGE_KEY = "rw-artifacts";
const ARTIFACTS_UPDATED_EVENT = "artifacts-updated";
const USER_PROFILES_KEY = "rw-user-profiles";

export default function CommunityArtifacts() {
  const [packages, setPackages] = useState<ArtifactPackage[]>([]);
  const [query, setQuery] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

  const loadPackages = () => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      const list = Array.isArray(parsed) ? (parsed as ArtifactPackage[]) : [];
      setPackages(list.filter((pkg) => pkg.shared));

      // Load user profiles
      const profilesStr = window.localStorage.getItem(USER_PROFILES_KEY);
      const profiles: Record<string, UserProfile> = profilesStr ? JSON.parse(profilesStr) : {};
      setUserProfiles(profiles);
    } catch {
      setPackages([]);
    }
  };

  useEffect(() => {
    loadPackages();
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

  const handleDownloadPackage = (pkg: ArtifactPackage) => {
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pkg.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const handleUnpackToMyArtifacts = (pkg: ArtifactPackage) => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
      const current = saved ? (JSON.parse(saved) as Artifact[]) : [];
      const unpacked = pkg.artifacts.map((artifact) => ({
        ...artifact,
        id: `${artifact.id}-community-${Date.now()}`,
        title: `${artifact.title} (from ${pkg.ownerName})`,
      }));
      window.localStorage.setItem(ARTIFACTS_STORAGE_KEY, JSON.stringify([...current, ...unpacked]));
      window.dispatchEvent(new CustomEvent(ARTIFACTS_UPDATED_EVENT));
      // Close dialog after unpacking
      setSelectedPackageId(null);
    } catch {
      // ignore
    }
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-7 h-7 text-cyan-400" />
            <div>
              <h1 className="text-xl font-bold text-slate-100">Community Artifacts</h1>
              <p className="text-sm text-slate-500">Shared artifact packages from the community.</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredPackages.length} packages
          </Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search packages, artifacts, categories..."
            className="pl-9 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => {
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
                  <p className="text-[11px] text-slate-500">{pkg.artifacts.length} artifacts · {pkg.createdAt}</p>
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
                      variant="outline"
                      className="text-xs h-7 flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPackage(pkg);
                      }}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7 flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpackToMyArtifacts(pkg);
                      }}
                    >
                      <Package className="w-3.5 h-3.5 mr-1.5" />
                      Unpack
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
            <p className="text-sm text-slate-400">No shared packages found.</p>
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
                  <h3 className="text-sm font-semibold text-slate-100">Artifacts ({selectedPackage.artifacts.length})</h3>
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
                    variant="outline"
                    className="text-xs flex-1"
                    onClick={() => handleDownloadPackage(selectedPackage)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Download Package
                  </Button>
                  <Button
                    size="sm"
                    className="text-xs flex-1 bg-cyan-600 hover:bg-cyan-700 text-white"
                    onClick={() => handleUnpackToMyArtifacts(selectedPackage)}
                  >
                    <Package className="w-3.5 h-3.5 mr-1.5" />
                    Unpack to My Artifacts
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
