import {
  BookMarked,
  Bot,
  Highlighter,
  Languages,
  Lightbulb,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export interface FloatingAnnotationMenuProps {
  isOpen: boolean;
  x: number;
  y: number;
  onHighlight: () => void;
  onAddNote: () => void;
  onTranslate: () => void;
  onExplain: () => void;
  onSaveConcept: () => void;
  onClose: () => void;
}

export default function FloatingAnnotationMenu({
  isOpen,
  x,
  y,
  onHighlight,
  onAddNote,
  onTranslate,
  onExplain,
  onSaveConcept,
  onClose,
}: FloatingAnnotationMenuProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="absolute z-30 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 text-white shadow-2xl backdrop-blur"
      onMouseDown={event => event.preventDefault()}
      style={{ left: x, top: y }}
    >
      <Button className="h-8 gap-1.5 px-2 text-xs text-white hover:bg-slate-800" onClick={onHighlight} size="sm" type="button" variant="ghost">
        <Highlighter className="h-3.5 w-3.5 text-yellow-300" />
        Highlight
      </Button>

      <Button className="h-8 gap-1.5 px-2 text-xs text-white hover:bg-slate-800" onClick={onAddNote} size="sm" type="button" variant="ghost">
        <BookMarked className="h-3.5 w-3.5 text-sky-300" />
        Add Note
      </Button>

      <Button className="h-8 gap-1.5 px-2 text-xs text-white hover:bg-slate-800" onClick={onTranslate} size="sm" type="button" variant="ghost">
        <Languages className="h-3.5 w-3.5 text-emerald-300" />
        Translate
      </Button>

      <Button className="h-8 gap-1.5 px-2 text-xs text-white hover:bg-slate-800" onClick={onExplain} size="sm" type="button" variant="ghost">
        <Bot className="h-3.5 w-3.5 text-cyan-200" />
        Explain
      </Button>

      <Button className="h-8 gap-1.5 px-2 text-xs text-white hover:bg-slate-800" onClick={onSaveConcept} size="sm" type="button" variant="ghost">
        <Lightbulb className="h-3.5 w-3.5 text-amber-300" />
        Save Concept
      </Button>

      <div className="mx-1 h-5 w-px bg-slate-700" />

      <Button className="h-8 w-8 p-0 text-white hover:bg-slate-800" onClick={onClose} size="sm" type="button" variant="ghost">
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
