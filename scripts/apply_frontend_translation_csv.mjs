import fs from "node:fs";
import path from "node:path";

const repoRoot = "/workspaces/researchworkspace";
const csvPath = path.join(repoRoot, "reports/i18n/1frontend_translation_audit.csv");
const i18nFile = path.join(repoRoot, "app/frontend/src/lib/i18n.tsx");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function encodeDoubleQuoted(value) {
  return JSON.stringify(value);
}

function encodeSingleQuoted(value) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}'`;
}

function detectQuote(value) {
  const first = value?.[0];
  return first === "'" ? "'" : '"';
}

function encodeWithQuote(value, quote) {
  return quote === "'" ? encodeSingleQuoted(value) : encodeDoubleQuoted(value);
}

function parseCsv(text) {
  const rows = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      current.push(field);
      field = "";
      continue;
    }

    if (char === '\n') {
      current.push(field);
      rows.push(current);
      current = [];
      field = "";
      continue;
    }

    if (char === '\r') {
      continue;
    }

    field += char;
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

function loadTranslationRows() {
  const raw = fs.readFileSync(csvPath, "utf8").replace(/^\uFEFF/, "");
  const rows = parseCsv(raw);
  const header = rows.shift() || [];
  const normalizedHeader = header.map((cell) => cell.replace(/^\uFEFF/, "").trim());
  const indexByName = new Map();

  normalizedHeader.forEach((name, index) => {
    if (name && !indexByName.has(name)) {
      indexByName.set(name, index);
    }
  });

  const sourceTypeIndex = indexByName.get("source_type") ?? 0;
  const identifierIndex = indexByName.get("identifier") ?? 1;
  const fileIndex = indexByName.get("file") ?? 3;
  const lineIndex = indexByName.get("line") ?? 4;
  const englishIndex = indexByName.get("english") ?? 5;
  const desiredIndex = indexByName.get("desired_chinese") ?? 6;

  return rows
    .filter((row) => row.length > 0)
    .map((row) => ({
      sourceType: (row[sourceTypeIndex] || "").trim(),
      identifier: (row[identifierIndex] || "").trim(),
      file: (row[fileIndex] || "").trim(),
      line: Number.parseInt((row[lineIndex] || "0").trim(), 10),
      english: row[englishIndex] || "",
      desiredChinese: row[desiredIndex] || "",
    }))
    .filter((row) => row.sourceType && row.file && row.desiredChinese.trim());
}

function ensureUseI18n(filePath, content) {
  if (!/\.(ts|tsx)$/.test(filePath)) {
    return content;
  }

  if (!content.includes("function") && !content.includes("=>")) {
    return content;
  }

  if (!content.includes('useI18n')) {
    const importLine = 'import { useI18n } from "@/lib/i18n";\n';
    const lastImportMatch = [...content.matchAll(/^import .*;$/gm)].pop();
    if (lastImportMatch) {
      const insertIndex = (lastImportMatch.index ?? 0) + lastImportMatch[0].length + 1;
      content = `${content.slice(0, insertIndex)}${importLine}${content.slice(insertIndex)}`;
    } else {
      content = `${importLine}${content}`;
    }
  }

  const lines = content.split("\n");
  const componentLinePatterns = [
    /^export default function [A-Z][A-Za-z0-9_]*\([^)]*\)\s*\{$/,
    /^export function [A-Z][A-Za-z0-9_]*\([^)]*\)\s*\{$/,
    /^function [A-Z][A-Za-z0-9_]*\([^)]*\)\s*\{$/,
    /^const [A-Z][A-Za-z0-9_]*(?::[^=\n]+)?\s*=\s*\([^)]*\)\s*=>\s*\{$/,
  ];

  for (let index = 0; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!componentLinePatterns.some((pattern) => pattern.test(trimmed))) {
      continue;
    }
    lines.splice(index + 1, 0, '  const { lang } = useI18n();', '  const isZh = lang === "zh";');
    return lines.join("\n");
  }

  return lines.join("\n");
}

function ensureIsZh(filePath, content) {
  if (content.includes('const isZh = lang === "zh";')) {
    return content;
  }

  if (content.includes('const { lang } = useI18n();')) {
    return content.replace('const { lang } = useI18n();', 'const { lang } = useI18n();\n  const isZh = lang === "zh";');
  }

  return ensureUseI18n(filePath, content);
}

function replaceZhDictionaryEntry(content, key, desiredChinese) {
  const zhStart = content.indexOf("const zh: TranslationDict = {");
  if (zhStart === -1) return content;
  const dictEnd = content.indexOf("\n};", zhStart);
  const dictBody = content.slice(zhStart, dictEnd);
  const pattern = new RegExp(`(^\\s*"${escapeRegExp(key)}":\\s*)("(?:\\\\.|[^"\\\\])*")(,?\\s*$)`, "m");
  if (!pattern.test(dictBody)) {
    return content;
  }
  const nextBody = dictBody.replace(pattern, (_, prefix, existing, suffix) => `${prefix}${encodeDoubleQuoted(desiredChinese)}${suffix}`);
  return `${content.slice(0, zhStart)}${nextBody}${content.slice(dictEnd)}`;
}

function replaceInlineTr(content, row) {
  const pattern = new RegExp(`tr\\(\\s*(["'])${escapeRegExp(row.english)}\\1\\s*,\\s*(["'])(.*?)\\2\\s*\\)`);
  return content.replace(pattern, (_, quoteEn, quoteZh) => `tr(${encodeWithQuote(row.english, quoteEn)}, ${encodeWithQuote(row.desiredChinese, quoteZh)})`);
}

function replaceInlineTernary(content, row) {
  const pattern = new RegExp(`((?:isZh|lang\\s*===\\s*["']zh["'])\\s*\\?\\s*)(["'])(.*?)\\2(\\s*:\\s*)(["'])${escapeRegExp(row.english)}\\5`);
  return content.replace(pattern, (_, prefix, zhQuote, _oldZh, middle, enQuote) => `${prefix}${encodeWithQuote(row.desiredChinese, zhQuote)}${middle}${encodeWithQuote(row.english, enQuote)}`);
}

function replaceEnglishOnlyLiteral(content, row) {
  const attrPattern = new RegExp(`([A-Za-z_:][A-Za-z0-9_:.\-]*)=(["'])${escapeRegExp(row.english)}\\2`);
  if (attrPattern.test(content)) {
    return content.replace(attrPattern, (_, attrName) => `${attrName}={isZh ? ${encodeDoubleQuoted(row.desiredChinese)} : ${encodeDoubleQuoted(row.english)}}`);
  }

  const literalPatterns = [new RegExp(`(["'])${escapeRegExp(row.english)}\\1`)];

  for (const pattern of literalPatterns) {
    const match = content.match(pattern);
    if (!match) continue;
    const quote = detectQuote(match[0]);
    return content.replace(pattern, `isZh ? ${encodeWithQuote(row.desiredChinese, quote)} : ${encodeWithQuote(row.english, quote)}`);
  }

  return content;
}

function replaceEnglishOnlyJsxText(content, row) {
  const pattern = new RegExp(`>(\\s*)${escapeRegExp(row.english)}(\\s*)<`);
  if (!pattern.test(content)) {
    return content;
  }
  return content.replace(pattern, `>$1{isZh ? ${encodeDoubleQuoted(row.desiredChinese)} : ${encodeDoubleQuoted(row.english)}}$2<`);
}

function applyRowsToFile(filePath, rows) {
  const absolutePath = path.join(repoRoot, filePath);
  let content = fs.readFileSync(absolutePath, "utf8");

  const needsIsZh = rows.some((row) => row.sourceType.startsWith("english_only"));
  if (needsIsZh && absolutePath !== i18nFile) {
    content = ensureIsZh(absolutePath, content);
  }

  for (const row of rows) {
    const before = content;

    if (row.sourceType === "i18n_key") {
      content = replaceZhDictionaryEntry(content, row.identifier, row.desiredChinese);
    } else if (row.sourceType === "inline_tr") {
      content = replaceInlineTr(content, row);
    } else if (row.sourceType === "inline_ternary") {
      content = replaceInlineTernary(content, row);
    } else if (row.sourceType === "english_only_literal") {
      content = replaceEnglishOnlyLiteral(content, row);
    } else if (row.sourceType === "english_only_jsx_text") {
      content = replaceEnglishOnlyJsxText(content, row);
    }

    if (before === content) {
      console.warn(`Unchanged: ${row.sourceType} ${row.identifier}`);
    }
  }

  fs.writeFileSync(absolutePath, content, "utf8");
}

function main() {
  const rows = loadTranslationRows();
  const byFile = new Map();

  for (const row of rows) {
    const bucket = byFile.get(row.file) || [];
    bucket.push(row);
    byFile.set(row.file, bucket);
  }

  for (const [filePath, fileRows] of byFile.entries()) {
    applyRowsToFile(filePath, fileRows);
  }

  console.log(`Applied ${rows.length} translations across ${byFile.size} files.`);
}

main();