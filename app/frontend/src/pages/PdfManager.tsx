import { useCallback, useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Eye,
  FileText,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { pdfAPI, PDFFileInfo } from "@/lib/pdf-api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function PdfManager() {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [files, setFiles] = useState<PDFFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pdfAPI.list();
      setFiles(res.files);
    } catch {
      setError(isZh ? "无法加载PDF列表。请确保后端正在运行。" : isZh ? "无法加载PDF列表。请确保后端正在运行。" : "Failed to load PDF list. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError(isZh ? "请选择有效的PDF文件。" : isZh ? "请选择有效的PDF文件。" : "Please select a valid PDF file.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const res = await pdfAPI.upload(file);
      showSuccess(`"${res.filename}" uploaded successfully (${formatBytes(res.size)})`);
      await fetchFiles();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Upload failed. Please try again.";
      setError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Delete "${filename}"?`)) return;
    try {
      await pdfAPI.delete(filename);
      showSuccess(`"${filename}" deleted.`);
      if (viewingFile === filename) setViewingFile(null);
      await fetchFiles();
    } catch {
      setError(isZh ? "删除文件失败。" : isZh ? "删除文件失败。" : "Failed to delete file.");
    }
  };

  const handleDownload = (filename: string) => {
    const a = document.createElement("a");
    a.href = pdfAPI.downloadUrl(filename);
    a.download = filename;
    a.click();
  };

  // Drag & drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full gap-4 p-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              PDF Manager
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Upload, view, and download research PDF files.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 text-green-700 px-4 py-2 text-sm">
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        <div className="flex gap-4 flex-1 min-h-0">
          {/* Left: Upload + File List */}
          <div className="flex flex-col gap-4 w-80 shrink-0">
            {/* Upload area */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Upload PDF
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    dragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  )}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                  <p className="text-xs text-slate-500">
                    {uploading
                      ? "Uploading…"
                      : "Drag & drop or click to select a PDF"}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* File list */}
            <Card className="flex-1 min-h-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Uploaded Files
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <p className="text-xs text-slate-400 text-center py-6">Loading…</p>
                ) : files.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">
                    No PDF files yet. Upload one above.
                  </p>
                ) : (
                  <ScrollArea className="h-[340px]">
                    <div className="divide-y divide-slate-100">
                      {files.map((f) => (
                        <div
                          key={f.filename}
                          className={cn(
                            "px-4 py-3 hover:bg-slate-50 transition-colors",
                            viewingFile === f.filename && "bg-blue-50"
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              className="flex items-center gap-2 text-left flex-1 min-w-0 group"
                              onClick={() =>
                                setViewingFile(
                                  viewingFile === f.filename ? null : f.filename
                                )
                              }
                            >
                              <FileText className="w-4 h-4 shrink-0 text-red-500" />
                              <span className="text-xs font-medium text-slate-800 truncate group-hover:text-blue-600">
                                {f.filename}
                              </span>
                            </button>
                            <div className="flex gap-1 shrink-0">
                              <button
                                className="p-1 rounded hover:bg-blue-100 text-slate-400 hover:text-blue-600"
                                title={isZh ? "查看" : isZh ? "查看" : "View"}
                                onClick={() =>
                                  setViewingFile(
                                    viewingFile === f.filename ? null : f.filename
                                  )
                                }
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-green-100 text-slate-400 hover:text-green-600"
                                title={isZh ? "下载" : isZh ? "下载" : "Download"}
                                onClick={() => handleDownload(f.filename)}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500"
                                title={isZh ? "删除" : isZh ? "删除" : "Delete"}
                                onClick={() => handleDelete(f.filename)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-1 pl-6">
                            <span className="text-[10px] text-slate-400">
                              {formatBytes(f.size)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatDate(f.uploaded_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <Separator orientation="vertical" />

          {/* Right: PDF Viewer */}
          <div className="flex-1 min-w-0 flex flex-col">
            <Card className="flex-1 flex flex-col min-h-0">
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {viewingFile ? (
                    <span className="truncate">{viewingFile}</span>
                  ) : (
                    "PDF Viewer"
                  )}
                  {viewingFile && (
                    <div className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => handleDownload(viewingFile)}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setViewingFile(null)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-2 min-h-0">
                {viewingFile ? (
                  <iframe
                    key={viewingFile}
                    src={pdfAPI.viewUrl(viewingFile)}
                    title={viewingFile}
                    className="w-full h-full rounded border border-slate-200 min-h-[500px]"
                    style={{ height: "calc(100vh - 260px)" }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
                    <FileText className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm">{isZh ? "从列表中选择一个文件以在此处查看" : "Select a file from the list to view it here"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
