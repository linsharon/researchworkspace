import { FormEvent, useState } from "react";
import { Quote } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import NoteTagInput from "./NoteTagInput";

export interface LiteratureNote {
  title: string;
  doiOrUrl: string;
  pageNumber: string;
  keywords: string[];
  contentGist: string;
  originalQuote: string;
}

interface LiteratureNoteFormProps {
  initialValue?: Partial<LiteratureNote>;
  onSubmit?: (note: LiteratureNote) => void | Promise<void>;
}

const defaultNote: LiteratureNote = {
  title: "",
  doiOrUrl: "",
  pageNumber: "",
  keywords: [],
  contentGist: "",
  originalQuote: "",
};

export function LiteratureNoteForm({ initialValue, onSubmit }: LiteratureNoteFormProps) {
  const [form, setForm] = useState<LiteratureNote>({ ...defaultNote, ...initialValue });
  const [errors, setErrors] = useState<Partial<Record<keyof LiteratureNote, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (value: LiteratureNote) => {
    const nextErrors: Partial<Record<keyof LiteratureNote, string>> = {};

    if (!value.title.trim()) {
      nextErrors.title = "Title is required (Author-Year).";
    }
    if (!value.contentGist.trim()) {
      nextErrors.contentGist = "Content Gist is required.";
    }
    if (!value.originalQuote.trim()) {
      nextErrors.originalQuote = "Original Quote is required.";
    }

    return nextErrors;
  };

  const updateField = <K extends keyof LiteratureNote>(key: K, value: LiteratureNote[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(form);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!onSubmit) return;

    try {
      setSubmitting(true);
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden border-slate-700/50 bg-slate-800/40/80 shadow-sm backdrop-blur-sm">
      <div className="flex">
        <div className="flex w-14 shrink-0 items-center justify-center border-r border-slate-700/50 bg-gradient-to-b from-slate-200 to-slate-100">
          <Quote className="h-5 w-5 text-slate-600" />
        </div>

        <div className="flex-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-slate-100">Literature Note</CardTitle>
            <CardDescription className="text-slate-600">
              Capture source-grounded observations with quote-level fidelity.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {form.originalQuote.trim() ? (
                <div className="rounded-md border border-slate-700/50 bg-slate-800 px-3 py-2">
                  <p className="mb-1 text-xs font-medium text-slate-500">Auto-quoted selection</p>
                  <p className="text-sm italic text-slate-700">"{form.originalQuote}"</p>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="lit-title">Title (Author-Year)</Label>
                  <Input
                    id="lit-title"
                    placeholder="e.g., Smith-2021"
                    value={form.title}
                    onChange={event => updateField("title", event.target.value)}
                  />
                  {errors.title ? <p className="text-xs text-rose-600">{errors.title}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lit-doi">DOI / URL</Label>
                  <Input
                    id="lit-doi"
                    placeholder="https://doi.org/..."
                    value={form.doiOrUrl}
                    onChange={event => updateField("doiOrUrl", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lit-page">Page Number</Label>
                  <Input
                    id="lit-page"
                    placeholder="e.g., 42"
                    value={form.pageNumber}
                    onChange={event => updateField("pageNumber", event.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="lit-keywords">Keywords</Label>
                  <NoteTagInput
                    onChange={keywords => updateField("keywords", keywords)}
                    placeholder="Type keyword and press Enter"
                    tags={form.keywords}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lit-gist">Content Gist</Label>
                <Textarea
                  id="lit-gist"
                  rows={4}
                  placeholder="Summarize why this passage matters in your own words."
                  value={form.contentGist}
                  onChange={event => updateField("contentGist", event.target.value)}
                />
                {errors.contentGist ? (
                  <p className="text-xs text-rose-600">{errors.contentGist}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lit-quote">Original Quote</Label>
                <Textarea
                  id="lit-quote"
                  rows={5}
                  placeholder="Paste exact quotation from the source."
                  value={form.originalQuote}
                  onChange={event => updateField("originalQuote", event.target.value)}
                />
                {errors.originalQuote ? (
                  <p className="text-xs text-rose-600">{errors.originalQuote}</p>
                ) : null}
              </div>

              <div className="flex justify-end">
                <Button disabled={submitting} type="submit">
                  {submitting ? "Saving..." : "Save Literature Note"}
                </Button>
              </div>
            </form>
          </CardContent>
        </div>
      </div>
    </Card>
  );
}

export default LiteratureNoteForm;