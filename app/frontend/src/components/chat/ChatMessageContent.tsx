import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ChatMessageContentProps {
  content: string;
  role: "user" | "assistant";
}

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);

  return tokens.map((token, index) => {
    if (token.startsWith("**") && token.endsWith("**")) {
      return <strong key={`${token}-${index}`} className="font-semibold text-white">{token.slice(2, -2)}</strong>;
    }

    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code key={`${token}-${index}`} className="rounded bg-slate-950/70 px-1.5 py-0.5 text-[0.9em] text-cyan-200">
          {token.slice(1, -1)}
        </code>
      );
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={`${token}-${index}`}
          className="text-cyan-300 underline underline-offset-2"
          href={linkMatch[2]}
          rel="noreferrer"
          target="_blank"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return token;
  });
}

function renderAssistantBlock(block: string, index: number) {
  const trimmed = block.trim();
  const lines = trimmed.split("\n").map(line => line.trim()).filter(Boolean);

  if (lines.length === 0) {
    return null;
  }

  if (/^#{1,3}\s+/.test(trimmed)) {
    const level = trimmed.match(/^#+/)?.[0].length ?? 1;
    const content = trimmed.replace(/^#{1,3}\s+/, "");
    const className = level === 1 ? "text-base font-semibold text-white" : "text-sm font-semibold text-cyan-100";
    return <h4 key={index} className={className}>{renderInline(content)}</h4>;
  }

  if (lines.every(line => /^[-*•]\s+/.test(line))) {
    return (
      <ul key={index} className="space-y-1 pl-5 text-white/95 list-disc marker:text-cyan-300">
        {lines.map((line, lineIndex) => (
          <li key={lineIndex}>{renderInline(line.replace(/^[-*•]\s+/, ""))}</li>
        ))}
      </ul>
    );
  }

  if (lines.every(line => /^\d+[.)]\s+/.test(line))) {
    return (
      <ol key={index} className="space-y-1 pl-5 text-white/95 list-decimal marker:text-cyan-300">
        {lines.map((line, lineIndex) => (
          <li key={lineIndex}>{renderInline(line.replace(/^\d+[.)]\s+/, ""))}</li>
        ))}
      </ol>
    );
  }

  if (lines.every(line => /^>\s+/.test(line))) {
    return (
      <blockquote key={index} className="border-l-2 border-cyan-400/60 pl-3 italic text-slate-200">
        {lines.map((line, lineIndex) => (
          <p key={lineIndex}>{renderInline(line.replace(/^>\s+/, ""))}</p>
        ))}
      </blockquote>
    );
  }

  return (
    <p key={index} className="whitespace-pre-wrap text-white/95">
      {renderInline(trimmed)}
    </p>
  );
}

export default function ChatMessageContent({ content, role }: ChatMessageContentProps) {
  if (role === "user") {
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  }

  const blocks = content.replace(/\r\n/g, "\n").split(/\n\s*\n/);

  return (
    <div className={cn("space-y-3 text-sm leading-7", content === "…" && "animate-pulse text-slate-300")}>
      {blocks.map((block, index) => renderAssistantBlock(block, index))}
    </div>
  );
}