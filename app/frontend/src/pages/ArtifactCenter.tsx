import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Archive,
  Clock,
  Edit,
  Eye,
  FileText,
  GitCompare,
  Map,
  PenTool,
  Search,
  Sparkles,
} from "lucide-react";
import {
  DUMMY_ARTIFACTS,
  ARTIFACT_TYPE_META,
  STEP_META,
  type ArtifactType,
} from "@/lib/data";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "purpose", label: "Purpose" },
  { value: "search", label: "Search" },
  { value: "notes", label: "Notes" },
  { value: "visual", label: "Visual" },
  { value: "drafts", label: "Drafts" },
];

const FILTER_MAP: Record<string, ArtifactType[]> = {
  all: [],
  purpose: ["purpose"],
  search: ["keyword", "search-log", "entry-paper"],
  notes: ["literature-note", "permanent-note"],
  visual: ["visualization"],
  drafts: ["rq-draft", "writing-block", "writing-draft"],
};

export default function ArtifactCenter() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab") || "all";
  const [filter, setFilter] = useState(tabFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && FILTER_OPTIONS.some((o) => o.value === tab)) {
      setFilter(tab);
    }
  }, [searchParams]);

  const filteredArtifacts = DUMMY_ARTIFACTS.filter((a) => {
    const matchesFilter =
      filter === "all" || FILTER_MAP[filter]?.includes(a.type);
    const matchesSearch =
      !searchQuery ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const selected = DUMMY_ARTIFACTS.find((a) => a.id === selectedArtifact);

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2D6A4F] flex items-center justify-center">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Artifact Center
              </h1>
              <p className="text-sm text-slate-500">
                All your research outputs in one place
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {DUMMY_ARTIFACTS.length} artifacts
          </Badge>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artifacts..."
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex gap-1.5">
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={filter === opt.value ? "default" : "outline"}
                className={cn(
                  "text-xs",
                  filter === opt.value &&
                    "bg-[#1E3A5F] hover:bg-[#162d4a] text-white"
                )}
                onClick={() => setFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Artifact Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArtifacts.map((artifact) => {
            const typeMeta = ARTIFACT_TYPE_META[artifact.type];
            const stepMeta = STEP_META[artifact.sourceStep];
            return (
              <Dialog key={artifact.id}>
                <DialogTrigger asChild>
                  <div
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => setSelectedArtifact(artifact.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-2 py-0.5",
                          typeMeta.bgColor,
                          typeMeta.color
                        )}
                      >
                        {typeMeta.label}
                      </Badge>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        {stepMeta.icon} Step {artifact.sourceStep}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-slate-800 mb-1 group-hover:text-[#1E3A5F] transition-colors line-clamp-2">
                      {artifact.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {artifact.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {artifact.updatedAt}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-base">
                      {artifact.title}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          typeMeta.bgColor,
                          typeMeta.color
                        )}
                      >
                        {typeMeta.label}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Step {artifact.sourceStep}: {stepMeta.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {artifact.description}
                    </p>
                    {artifact.content && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {artifact.content}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      Last edited: {artifact.updatedAt}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                      <Button size="sm" variant="outline" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs">
                        <GitCompare className="w-3 h-3 mr-1" />
                        Compare
                      </Button>
                      {(artifact.type === "literature-note") && (
                        <Button size="sm" variant="outline" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Convert to Permanent Note
                        </Button>
                      )}
                      {(artifact.type === "permanent-note" ||
                        artifact.type === "literature-note") && (
                        <Button size="sm" variant="outline" className="text-xs">
                          <Map className="w-3 h-3 mr-1" />
                          Add to Visualization
                        </Button>
                      )}
                      {(artifact.type === "permanent-note" ||
                        artifact.type === "rq-draft") && (
                        <Button size="sm" variant="outline" className="text-xs">
                          <PenTool className="w-3 h-3 mr-1" />
                          Insert into Writing
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>

        {filteredArtifacts.length === 0 && (
          <div className="text-center py-16">
            <Archive className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              No artifacts found matching your criteria
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}