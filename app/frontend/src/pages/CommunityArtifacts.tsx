import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Globe, Package, Search } from "lucide-react";
import { ARTIFACT_TYPE_META, type Artifact } from "@/lib/data";

type ArtifactPackage = {
  id: string;
  name: string;
  description: string;
  artifacts: Artifact[];
  createdAt: string;
  shared: boolean;
};

const COMMUNITY_PACKAGES_KEY = "rw-community-packages";
const ARTIFACTS_STORAGE_KEY = "rw-artifacts";
const ARTIFACTS_UPDATED_EVENT = "artifacts-updated";

export default function CommunityArtifacts() {
  const [packages, setPackages] = useState<ArtifactPackage[]>([]);
  const [query, setQuery] = useState("");

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
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pkg.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUnpackToMyArtifacts = (pkg: ArtifactPackage) => {
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
              <Card key={pkg.id} className="border-slate-700/50 bg-[#0d1b30]">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base text-slate-100">{pkg.name}</CardTitle>
                    <Badge variant="outline" className="text-emerald-300 border-emerald-500/40">Shared</Badge>
                  </div>
                  <p className="text-xs text-slate-400">{pkg.description || "No description"}</p>
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
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleDownloadPackage(pkg)}>
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download Package
                    </Button>
                    <Button size="sm" className="text-xs h-7 bg-cyan-600 hover:bg-cyan-700 text-white" onClick={() => handleUnpackToMyArtifacts(pkg)}>
                      <Package className="w-3.5 h-3.5 mr-1.5" />
                      Unpack to My Artifacts
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
