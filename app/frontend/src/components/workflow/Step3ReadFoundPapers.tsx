/**
 * Step 3: Read Found Papers
 * Display entry papers and expanded papers for reading
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, ArrowRight, AlertCircle } from "lucide-react";
import { paperAPI } from "@/lib/manuscript-api";
import type { Paper } from "@/lib/manuscript-api";

interface Step3Props {
  projectId: string;
}

export default function Step3ReadFoundPapers({ projectId }: Step3Props) {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"entry" | "expanded" | "all">(
    "all"
  );

  useEffect(() => {
    loadPapers();
  }, [projectId]);

  const loadPapers = async () => {
    try {
      setLoading(true);
      const entryPapers = await paperAPI.listEntryPapers(projectId);
      setPapers(entryPapers);
    } catch (error) {
      console.error("Failed to load papers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPapers = papers.filter((paper) => {
    if (selectedTab === "entry") return paper.is_entry_paper;
    if (selectedTab === "expanded") return paper.is_expanded_paper;
    return true;
  });

  const handleReadPaper = (paperId: string) => {
    navigate(`/paper-read/${projectId}/${paperId}`);
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Read Found Papers</h1>
            <p className="text-gray-600">
              Deep read and annotate your entry and expanded papers
            </p>
          </div>
        </div>
      </div>

      {/* Alert if no papers */}
      {papers.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800">
              No papers marked as entry or expanded. Go back to Step 2 to mark papers.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Papers List */}
      {papers.length > 0 && (
        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">
              All ({papers.length})
            </TabsTrigger>
            <TabsTrigger value="entry">
              Entry ({papers.filter((p) => p.is_entry_paper).length})
            </TabsTrigger>
            <TabsTrigger value="expanded">
              Expanded ({papers.filter((p) => p.is_expanded_paper).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedTab} className="space-y-4">
            {filteredPapers.map((paper) => (
              <Card
                key={paper.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleReadPaper(paper.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg hover:text-blue-600 transition-colors">
                        {paper.title}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-2">
                        {paper.authors.join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {paper.is_entry_paper && (
                        <Badge variant="default" className="bg-blue-600">
                          Entry Paper
                        </Badge>
                      )}
                      {paper.is_expanded_paper && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          Expanded
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`${
                          paper.reading_status === "Completed"
                            ? "bg-green-50 text-green-700"
                            : paper.reading_status === "Reading"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {paper.reading_status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    {paper.year && <span>{paper.year}</span>}
                    {paper.journal && <span>{paper.journal}</span>}
                    {paper.discovery_path && (
                      <span className="text-blue-600">
                        Discovery: {paper.discovery_path}
                      </span>
                    )}
                  </div>

                  {/* Abstract */}
                  {paper.abstract && (
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {paper.abstract}
                    </p>
                  )}

                  {/* Discovery Note */}
                  {paper.discovery_note && (
                    <div className="p-3 bg-gray-50 rounded text-sm text-gray-600 italic">
                      Note: {paper.discovery_note}
                    </div>
                  )}

                  {/* Relevance if completed */}
                  {paper.reading_status === "Completed" && paper.relevance && (
                    <div className="text-sm">
                      <span className="text-gray-600">Relevance: </span>
                      <Badge
                        variant="outline"
                        className={`${
                          paper.relevance === "high"
                            ? "bg-red-50 text-red-700"
                            : paper.relevance === "medium"
                            ? "bg-yellow-50 text-yellow-700"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {paper.relevance === "high"
                          ? "High (Core)"
                          : paper.relevance === "medium"
                          ? "Medium (Useful)"
                          : "Low (Peripheral)"}
                      </Badge>
                    </div>
                  )}

                  {/* Read Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReadPaper(paper.id);
                      }}
                    >
                      Open for Reading <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredPapers.length === 0 && (
              <div className="text-center py-12 text-gray-600">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>No papers in this category</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
