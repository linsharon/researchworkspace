import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

interface NoteTagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function NoteTagInput({
  tags,
  onChange,
  placeholder,
}: NoteTagInputProps) {
  const { lang } = useI18n();
  const isZh = lang === "zh";
  const resolvedPlaceholder = placeholder || (isZh ? "输入关键词并按回车" : isZh ? "输入关键词后按回车键" : isZh ? "输入关键词后按回车键" : "Type keyword and press Enter");
  const [value, setValue] = useState("");

  const addTag = () => {
    const next = value.trim();
    if (!next) return;
    if (tags.includes(next)) {
      setValue("");
      return;
    }
    onChange([...tags, next]);
    setValue("");
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(item => item !== tag));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <Badge className="gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200" key={tag} variant="secondary">
            {tag}
            <button
              aria-label={`Remove keyword ${tag}`}
              className="rounded-sm text-slate-500 hover:text-rose-600"
              onClick={() => removeTag(tag)}
              type="button"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          className="h-9"
          onChange={event => setValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          placeholder={resolvedPlaceholder}
          value={value}
        />
        <Button onClick={addTag} size="sm" type="button" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
