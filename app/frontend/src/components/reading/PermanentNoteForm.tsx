import { FormEvent, useMemo, useState } from "react";
import { GitBranchPlus, Link2, Plus, Trash2 } from "lucide-react";

import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import NoteTagInput from "./NoteTagInput";
import { useI18n } from "@/lib/i18n";

export type LinkRelationType = "Supports" | "Contradicts" | "Refines";

export interface PermanentNoteLink {
  targetNoteId: string;
  relationType: LinkRelationType;
}

export interface PermanentNote {
  atomicTitle: string;
  mainArgument: string;
  retrievalTrigger: string;
  keywords: string[];
  links: PermanentNoteLink[];
  evidenceLiteratureNoteId: string;
}

export interface NoteOption {
  id: string;
  label: string;
}

interface PermanentNoteFormProps {
  existingNoteOptions: NoteOption[];
  literatureNoteOptions: NoteOption[];
  initialValue?: Partial<PermanentNote>;
  onSubmit?: (note: PermanentNote) => void | Promise<void>;
}

const defaultPermanentNote: PermanentNote = {
  atomicTitle: "",
  mainArgument: "",
  retrievalTrigger: "",
  keywords: [],
  links: [],
  evidenceLiteratureNoteId: "",
};

export function PermanentNoteForm({
  existingNoteOptions,
  literatureNoteOptions,
  initialValue,
  onSubmit,
}: PermanentNoteFormProps) {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const [form, setForm] = useState<PermanentNote>({
    ...defaultPermanentNote,
    ...initialValue,
    links: initialValue?.links ?? [],
  });
  const [errors, setErrors] = useState<{ atomicTitle?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const noteIdOptions = useMemo(
    () => existingNoteOptions.map(option => ({ value: option.id, label: option.label })),
    [existingNoteOptions]
  );
  const evidenceOptions = useMemo(
    () => literatureNoteOptions.map(option => ({ value: option.id, label: option.label })),
    [literatureNoteOptions]
  );

  const updateLink = (index: number, nextLink: PermanentNoteLink) => {
    setForm(prev => ({
      ...prev,
      links: prev.links.map((item, currentIndex) => (currentIndex === index ? nextLink : item)),
    }));
  };

  const removeLink = (index: number) => {
    setForm(prev => ({
      ...prev,
      links: prev.links.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const addLink = () => {
    setForm(prev => ({
      ...prev,
      links: [...prev.links, { targetNoteId: "", relationType: "Supports" }],
    }));
  };

  const validate = (value: PermanentNote) => {
    const nextErrors: { atomicTitle?: string } = {};
    const title = value.atomicTitle.trim();

    if (!title) {
      nextErrors.atomicTitle = "Atomic Title is required.";
      return nextErrors;
    }

    if (title.endsWith("?")) {
      nextErrors.atomicTitle = "Atomic Title should be a declarative statement, not a question.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!onSubmit) return;

    const payload: PermanentNote = {
      ...form,
      atomicTitle: form.atomicTitle.trim(),
      mainArgument: form.mainArgument.trim(),
      retrievalTrigger: form.retrievalTrigger.trim(),
      keywords: form.keywords,
      links: form.links.filter(link => link.targetNoteId.trim().length > 0),
    };

    try {
      setSubmitting(true);
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-emerald-200 bg-emerald-50/40 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-cyan-400">{isZh ? "永久笔记" : "Permanent Note"}</CardTitle>
            <CardDescription className="text-cyan-600">
              Distill an atomic claim, then wire it into your note network.
            </CardDescription>
          </div>
          <div className="rounded-lg border border-emerald-300 bg-[#0d1b30] p-2">
            <GitBranchPlus className="h-5 w-5 text-emerald-700" />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="perm-title">{isZh ? "原子标题（陈述句）" : "Atomic Title (Declarative Statement)"}</Label>
            <Input
              id="perm-title"
              placeholder={isZh ? "例如，知识工作者以原子笔记的粒度更好地保留想法。" : "e.g., Knowledge workers retain ideas better with atomic note granularity."}
              value={form.atomicTitle}
              onChange={event => {
                setForm(prev => ({ ...prev, atomicTitle: event.target.value }));
                setErrors(prev => ({ ...prev, atomicTitle: undefined }));
              }}
            />
            {errors.atomicTitle ? <p className="text-xs text-rose-600">{errors.atomicTitle}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="perm-main">{isZh ? "主要论点" : "Main Argument"}</Label>
            <Textarea
              id="perm-main"
              rows={7}
              placeholder={`# Core Claim\n\nExplain your argument in markdown...\n\n- Mechanism\n- Constraints\n- Implication`}
              value={form.mainArgument}
              onChange={event => setForm(prev => ({ ...prev, mainArgument: event.target.value }))}
            />
            <p className="text-xs text-slate-500">{isZh ? "Markdown编辑器占位符：如有需要，稍后用富编辑器替换。" : "Markdown editor placeholder: replace with rich editor later if needed."}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="perm-trigger">{isZh ? "检索触发器" : "Retrieval Trigger"}</Label>
            <Input
              id="perm-trigger"
              placeholder={isZh ? "什么查询、上下文或问题应该显示这条笔记？" : "What query, context, or problem should surface this note?"}
              value={form.retrievalTrigger}
              onChange={event => setForm(prev => ({ ...prev, retrievalTrigger: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="perm-keywords">{isZh ? "关键词" : "Keywords"}</Label>
            <NoteTagInput
              onChange={keywords => setForm(prev => ({ ...prev, keywords }))}
              placeholder={isZh ? "输入关键词后按回车键" : "Type keyword and press Enter"}
              tags={form.keywords}
            />
          </div>

          <section className="space-y-3 rounded-lg border border-emerald-200 bg-[#0d1b30] p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">{isZh ? "双向链接" : "Bidirectional Links"}</h3>
              <Button className="gap-1" onClick={addLink} size="sm" type="button" variant="outline">
                <Plus className="h-4 w-4" /> Add Link
              </Button>
            </div>

            {form.links.length === 0 ? (
              <p className="text-sm text-slate-500">{isZh ? "还没有链接。至少添加一个以在您的图中定位此笔记。" : "No links yet. Add at least one to position this note in your graph."}</p>
            ) : null}

            <div className="space-y-3">
              {form.links.map((link, index) => (
                <div className="grid gap-2 rounded-md border border-slate-700/50 p-3 md:grid-cols-[1fr_180px_auto]" key={`${index}-${link.targetNoteId}`}>
                  <Combobox
                    options={noteIdOptions}
                    placeholder={isZh ? "搜索笔记ID..." : "Search note ID..."}
                    searchPlaceholder="Search notes by ID/title"
                    emptyText="No matching notes"
                    value={link.targetNoteId}
                    onValueChange={value => updateLink(index, { ...link, targetNoteId: value })}
                  />

                  <Select
                    value={link.relationType}
                    onValueChange={(value: LinkRelationType) =>
                      updateLink(index, { ...link, relationType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isZh ? "关系" : "Relation"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Supports">{isZh ? "支持" : "Supports"}</SelectItem>
                      <SelectItem value="Contradicts">{isZh ? "互相矛盾" : "Contradicts"}</SelectItem>
                      <SelectItem value="Refines">{isZh ? "细化" : "Refines"}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    className="md:justify-self-end"
                    onClick={() => removeLink(index)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-slate-500" />
                  </Button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-lg border border-slate-700/50 bg-[#0d1b30] p-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-100">{isZh ? "证据链接" : "Evidence Link"}</h3>
            </div>

            <Combobox
              options={evidenceOptions}
              placeholder={isZh ? "附加一个文献笔记作为证据" : "Attach one Literature Note as evidence"}
              searchPlaceholder="Search literature notes"
              emptyText="No literature notes found"
              value={form.evidenceLiteratureNoteId}
              onValueChange={value => setForm(prev => ({ ...prev, evidenceLiteratureNoteId: value }))}
            />
          </section>

          <div className="flex justify-end">
            <Button disabled={submitting} type="submit">
              {submitting ? "Saving..." : "Save Permanent Note"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default PermanentNoteForm;