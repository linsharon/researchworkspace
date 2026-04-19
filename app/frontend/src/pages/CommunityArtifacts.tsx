import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, Globe, Package, Search } from "lucide-react";
import { ARTIFACT_TYPE_META, type Artifact, type ArtifactPackage } from "@/lib/data";

const COMMUNITY_PACKAGES_KEY = "rw-community-packages";
const ARTIFACTS_STORAGE_KEY = "rw-artifacts";
const ARTIFACTS_UPDATED_EVENT = "artifacts-updated";
const DEFAULT_AVATAR_URL = "https://api.dicebear.com/7.x/avataaars/svg?seed=default";

export default function CommunityArtifacts() {
  const [packages, setPackages] = useState<ArtifactPackage[]>([]);
  const [query, setQuery] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<ArtifactPackage | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const loadPackages = () => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      const list = Array.isArray(parsed) ? (parsed as ArtifactPackage[]) : [];
      setPackages(list.filter((pkg) => pkg.shared));
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
    if (typeof window === "undefined") return;
    try {
      const saved = window.localStorage.getItem(ARTIFACTS_STORAGE_KEY);
      const current = saved ? (JSON.parse(saved) as Artifact[]) : [];
      const unpacked = pkg.artifacts.map((artifact) => ({
        ...artifact,
        id: `${artifact.id}-community-${Date.now()}`,
        title: `${artifact.title} (Community)`,
      }));
      window.localStorage.setItem(ARTIFACTS_STORAGE_KEY, JSON.stringify([...current, ...unpacked]));
      window.dispatchEvent(new CustomEvent(ARTIFACTS_UPDATED_EVENT));
      
      // Also mark as downloaded in packages
      const allSaved = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const allPackages: ArtifactPackage[] = allSaved ? JSON.parse(allSaved) : [];
      const updated = allPackages.map((p) =>
        p.id === pkg.id ? { ...p, source: "downloaded" as const } : p
      );
      window.localStorage.setItem(COMMUNITY_PACKAGES_KEY, JSON.stringify(updated));
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPackages.map((pkg) => {
            const typeCount = pkg.artifacts.reduce<Record<string, number>>((acc, artifact) => {
              const label = ARTIFACT_TYPE_META[artifact.type].label;
              acc[label] = (acc[label] || 0) + 1;
              return acc;
            }, {});

            return (
              <Card key={pkg.id} className="border-slate-700/50 bg-[#0d1b30] flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base text-slate-100">{pkg.name}</CardTitle>
                  </div>
                  <p className="text-xs text-slate-400">{pkg.description || "No description"}</p>
                  <p className="text-[11px] text-slate-500">{pkg.artifacts.length} artifacts · {pkg.createdAt}</p>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 flex flex-col">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(typeCount).map(([label, count]) => (
                      <Badge key={label} variant="secondary" className="text-[10px] px-2 py-0.5">
                        {label} ({count})
                      </Badge>
                    ))}
                  </div>

                  {/* Author Section */}
                  <div className="mt-auto p-3 rounded-lg bg-slate-900/60 border border-slate-700/50">
                    <p className="text-[10px] font-medium text-slate-400 mb-2">Shared by</p>
                    <div className="flex items-center gap-2">
                      <img
                        src={pkg.authorAvatar || DEFAULT_AVATAR_URL}
                        alt={pkg.authorUsername}
                        className="w-8 h-8 rounded-full object-cover border border-slate-600"
                      />
                      <div className="flex-1">
                        <Link to={`/user-profile/${pkg.authorId}`}>
                          <p className="text-sm text-cyan-300 hover:text-cyan-200 font-medium truncate">
                            {pkg.authorUsername}
                          </p>
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <Dialog open={showPreview && selectedPackage?.id === pkg.id} onOpenChange={setShowPreview}>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => setSelectedPackage(pkg)}
                        >
                          <Package className="w-3.5 h-3.5 mr-1.5" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{pkg.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-slate-400">{pkg.description}</p>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-200 mb-2">Artifacts ({pkg.artifacts.length})</h4>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                              {pkg.artifacts.map((artifact) => (
                                <div key={artifact.id} className="p-2 rounded border border-slate-700/50 bg-slate-900/40">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="font-medium text-slate-200 text-sm">{artifact.title}</p>
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                      {ARTIFACT_TYPE_META[artifact.type].label}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-400">{artifact.description}</p>
                                  {artifact.content && (
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{artifact.content}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      className="text-xs h-7 bg-cyan-600 hover:bg-cyan-700 text-white"
                      onClick={() => handleDownloadPackage(pkg)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download
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
      </div>
    </AppLayout>
  );
}
