import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Edit2, Trash2, Search, Download, MessageCircle, X, Check } from "lucide-react";
import { type ArtifactPackage, ARTIFACT_TYPE_META } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";

const COMMUNITY_PACKAGES_KEY = "rw-community-packages";
const USER_PROFILES_KEY = "rw-user-profiles";
const CURRENT_USER_KEY = "rw-current-user";

export default function MyPackages() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [packages, setPackages] = useState<ArtifactPackage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [showEditDialog, setShowEditDialog] = useState(false);

  const loadPackages = () => {
    if (typeof window === "undefined" || !user) return;
    try {
      const saved = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const allPackages: ArtifactPackage[] = saved ? JSON.parse(saved) : [];
      
      const userPackages = allPackages.filter((pkg) => pkg.ownerId === user.id);

      setPackages(userPackages);
    } catch {
      setPackages([]);
    }
  };

  useEffect(() => {
    loadPackages();
  }, [user?.id]);

  const userPackages = useMemo(() => {
    if (!user) return [];
    return packages.filter((pkg) => pkg.authorId === user.id || pkg.source === "created");
  }, [packages, user]);

  const downloadedPackages = useMemo(() => {
    return packages.filter((pkg) => pkg.source === "downloaded");
  }, [packages]);

  const filteredUserPackages = useMemo(() => {
    if (!query.trim()) return userPackages;
    const q = query.trim().toLowerCase();
    return userPackages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q)
    );
  }, [userPackages, query]);

  const filteredDownloadedPackages = useMemo(() => {
    if (!query.trim()) return downloadedPackages;
    const q = query.trim().toLowerCase();
    return downloadedPackages.filter(
      (pkg) =>
        pkg.name.toLowerCase().includes(q) ||
        pkg.description.toLowerCase().includes(q) ||
        pkg.authorUsername.toLowerCase().includes(q)
    );
  }, [downloadedPackages, query]);

  const handleStartEdit = (pkg: LocalPackageData) => {
    setEditingId(pkg.id);
    setEditForm({ name: pkg.name, description: pkg.description });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editForm.name.trim()) return;
    
    setPackages((prev) =>
      prev.map((pkg) =>
        pkg.id === editingId
          ? {
              ...pkg,
              name: editForm.name.trim(),
              description: editForm.description.trim(),
            }
          : pkg
      )
    );

    try {
      const saved = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const allPackages: LocalPackageData[] = saved ? JSON.parse(saved) : [];
      const updated = allPackages.map((pkg) =>
        pkg.id === editingId
          ? {
              ...pkg,
              name: editForm.name.trim(),
              description: editForm.description.trim(),
            }
          : pkg
      );
      window.localStorage.setItem(COMMUNITY_PACKAGES_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    setShowEditDialog(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
    try {
      const saved = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const allPackages: LocalPackageData[] = saved ? JSON.parse(saved) : [];
      const filtered = allPackages.filter((pkg) => pkg.id !== id);
      window.localStorage.setItem(COMMUNITY_PACKAGES_KEY, JSON.stringify(filtered));
    } catch {
      // ignore
    }
  };

  const renderPackageCard = (pkg: LocalPackageData, isOwner: boolean) => {
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
            {isOwner && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleStartEdit(pkg)}
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-400"
                  onClick={() => handleDelete(pkg.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
          <p className="text-xs text-slate-400">{pkg.description || "No description"}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {pkg.artifacts.length} artifacts · {pkg.createdAt}
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
          {!isOwner && (
            <div className="p-2 rounded bg-slate-900/40 border border-slate-700/50 text-xs text-slate-300">
              <p className="font-medium mb-1">Shared by</p>
              <p>{pkg.authorUsername}</p>
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
              <h1 className="text-xl font-bold text-slate-100">My Packages</h1>
              <p className="text-sm text-slate-500">Manage your artifact packages</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {filteredUserPackages.length + filteredDownloadedPackages.length} packages
          </Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search packages..."
            className="pl-9 text-sm"
          />
        </div>

        {/* User's Created Packages */}
        {filteredUserPackages.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-300" />
              My Created Packages ({filteredUserPackages.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUserPackages.map((pkg) => renderPackageCard(pkg, true))}
            </div>
          </div>
        )}

        {/* Downloaded Packages */}
        {filteredDownloadedPackages.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-300" />
              Downloaded Packages ({filteredDownloadedPackages.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDownloadedPackages.map((pkg) => renderPackageCard(pkg, false))}
            </div>
          </div>
        )}

        {filteredUserPackages.length === 0 && filteredDownloadedPackages.length === 0 && (
          <div className="text-center py-16 border border-slate-700/50 rounded-lg bg-slate-800/30">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {query.trim() ? "No packages match your search" : "You have no packages yet"}
            </p>
          </div>
        )}

        {/* Edit Package Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Package Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Description</label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  className="text-sm min-h-[80px]"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                  onClick={handleSaveEdit}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Save Changes
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => setShowEditDialog(false)}
                >
                  <X className="w-3 h-3 mr-1" />
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
