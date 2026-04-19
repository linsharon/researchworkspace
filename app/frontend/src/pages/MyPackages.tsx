import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Package, Edit2, Trash2, Search, Sparkles, Download as DownloadIcon } from "lucide-react";
import { type ArtifactPackage, ARTIFACT_TYPE_META } from "@/lib/data";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const COMMUNITY_PACKAGES_KEY = "rw-community-packages";

export default function MyPackages() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [packages, setPackages] = useState<ArtifactPackage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "" });
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("created");

  const loadPackages = () => {
    if (typeof window === "undefined" || !user) return;
    try {
      const saved = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const allPackages: ArtifactPackage[] = saved ? JSON.parse(saved) : [];
      
      // Load all packages for this user (both created and downloaded)
      const userPackages = allPackages.filter((pkg) => {
        // Created packages belong to current user
        if (pkg.type === "created" && pkg.ownerId === user.id) return true;
        // Downloaded packages might have been added by current user (we track by presence in user's list)
        // For downloaded, we include all with type "downloaded" that are in the global storage
        return pkg.type === "downloaded";
      });

      setPackages(userPackages);
    } catch {
      setPackages([]);
    }
  };

  useEffect(() => {
    loadPackages();
  }, [user?.id]);

  const createdPackages = useMemo(() => {
    return packages.filter((pkg) => pkg.type === "created" && pkg.ownerId === user?.id);
  }, [packages, user?.id]);

  const downloadedPackages = useMemo(() => {
    return packages.filter((pkg) => pkg.type === "downloaded");
  }, [packages]);

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

  const handleStartEdit = (pkg: ArtifactPackage) => {
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
      const allPackages: ArtifactPackage[] = saved ? JSON.parse(saved) : [];
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
      toast.success("Package updated successfully");
    } catch {
      toast.error("Failed to save package");
    }

    setShowEditDialog(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setPackages((prev) => prev.filter((pkg) => pkg.id !== id));
    try {
      const saved = window.localStorage.getItem(COMMUNITY_PACKAGES_KEY);
      const allPackages: ArtifactPackage[] = saved ? JSON.parse(saved) : [];
      const filtered = allPackages.filter((pkg) => pkg.id !== id);
      window.localStorage.setItem(COMMUNITY_PACKAGES_KEY, JSON.stringify(filtered));
      toast.success("Package deleted successfully");
    } catch {
      toast.error("Failed to delete package");
    }
  };

  const handleDownloadPackage = (pkg: ArtifactPackage) => {
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pkg.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderPackageCard = (pkg: ArtifactPackage, isOwner: boolean) => {
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
              <p>{pkg.ownerName}</p>
            </div>
          )}
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={() => handleDownloadPackage(pkg)}
            >
              <DownloadIcon className="w-3.5 h-3.5 mr-1" />
              Download
            </Button>
          </div>
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
            {packages.length} packages
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

        {/* Tabs */}
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

          {/* Created Packages Tab */}
          <TabsContent value="created" className="space-y-4">
            {filteredCreatedPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCreatedPackages.map((pkg) => renderPackageCard(pkg, true))}
              </div>
            ) : (
              <div className="text-center py-16 border border-slate-700/50 rounded-lg bg-slate-800/30">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  {query.trim() ? "No created packages match your search" : "You haven't created any packages yet"}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Downloaded Packages Tab */}
          <TabsContent value="downloaded" className="space-y-4">
            {filteredDownloadedPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredDownloadedPackages.map((pkg) => renderPackageCard(pkg, false))}
              </div>
            ) : (
              <div className="text-center py-16 border border-slate-700/50 rounded-lg bg-slate-800/30">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  {query.trim() ? "No downloaded packages match your search" : "You haven't downloaded any packages yet"}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Package Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Package</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Package Name</label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Package name"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Package description"
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-slate-700/50 bg-slate-900/50 text-slate-100 text-sm resize-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white flex-1"
                >
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
