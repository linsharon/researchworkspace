import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export const repoRoot = "/workspaces/researchworkspace";
export const frontendRoot = path.join(repoRoot, "app/frontend");
export const frontendSrcRoot = path.join(frontendRoot, "src");
export const auditCsvPath = path.join(repoRoot, "reports/i18n/1frontend_translation_audit.csv");
export const seedCsvPath = path.join(repoRoot, "reports/i18n/research workspace EN-CN texts.csv");

const requireFromFrontend = createRequire(path.join(frontendRoot, "package.json"));
export const ts = requireFromFrontend("typescript");

export const defaultTargetFiles = [
  "app/frontend/src/pages/ArtifactCenter.tsx",
  "app/frontend/src/pages/WorkflowWorkspace.tsx",
];

const translatableJsxAttributes = new Set([
  "title",
  "placeholder",
  "alt",
  "aria-label",
  "label",
]);

const uiCallNames = new Set(["alert", "confirm", "prompt"]);
const uiPropertyCallOwners = new Set(["toast"]);

export function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

export function parseCliTargetFiles(argv) {
  const fileArg = argv.find((arg) => arg.startsWith("--files="));
  if (!fileArg) return defaultTargetFiles;
  return fileArg
    .slice("--files=".length)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/^\.\//, ""));
}

export function parseCsv(text) {
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

    if (char === ",") {
      current.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      current.push(field);
      rows.push(current);
      current = [];
      field = "";
      continue;
    }

    if (char === "\r") {
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

export function encodeCsv(rows) {
  return `${rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(",")
    )
    .join("\n")}\n`;
}

export function loadCsvRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return parseCsv(raw);
}

export function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

export function hasAlphabetic(value) {
  return /[A-Za-z]/.test(value);
}

export function getLine(sourceFile, position) {
  return sourceFile.getLineAndCharacterOfPosition(position).line + 1;
}

export function decodeLiteralNode(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

export function isZhCondition(node) {
  if (!node) return false;
  if (ts.isIdentifier(node)) {
    return node.text === "isZh";
  }
  if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken) {
    return false;
  }

  const left = node.left;
  const right = node.right;
  if (
    ts.isIdentifier(left) &&
    left.text === "lang" &&
    ts.isStringLiteral(right) &&
    right.text === "zh"
  ) {
    return true;
  }
  if (
    ts.isIdentifier(right) &&
    right.text === "lang" &&
    ts.isStringLiteral(left) &&
    left.text === "zh"
  ) {
    return true;
  }
  return false;
}

function extractZhConditionalPair(node) {
  if (!ts.isConditionalExpression(node) || !isZhCondition(node.condition)) {
    return null;
  }

  const chinese = decodeLiteralNode(node.whenTrue);
  if (!chinese) return null;

  const english = decodeLiteralNode(node.whenFalse);
  if (english) {
    return { english, chinese };
  }

  const nested = extractZhConditionalPair(node.whenFalse);
  if (nested) {
    return { english: nested.english, chinese };
  }

  return null;
}

function getTagName(tagName) {
  if (ts.isIdentifier(tagName)) return tagName.text;
  if (ts.isPropertyAccessExpression(tagName)) return tagName.name.text;
  return null;
}

function getCallName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

function isUiCallExpression(node) {
  if (!ts.isCallExpression(node)) return false;
  if (ts.isIdentifier(node.expression)) {
    return uiCallNames.has(node.expression.text);
  }
  if (ts.isPropertyAccessExpression(node.expression)) {
    return (
      ts.isIdentifier(node.expression.expression) &&
      uiPropertyCallOwners.has(node.expression.expression.text)
    );
  }
  return false;
}

function candidateIdentifier(filePath, line, sourceType, ordinal) {
  return `${toPosix(filePath)}:${line}:${sourceType}:${ordinal}`;
}

function pushCandidate(candidates, counters, filePath, sourceFile, sourceType, english, currentChinese, extra) {
  const normalizedEnglish = normalizeWhitespace(english || "");
  if (!normalizedEnglish || !hasAlphabetic(normalizedEnglish)) return;
  const line = getLine(sourceFile, extra.node.getStart(sourceFile));
  const counterKey = `${sourceType}:${line}`;
  const ordinal = (counters.get(counterKey) || 0) + 1;
  counters.set(counterKey, ordinal);
  candidates.push({
    sourceType,
    identifier: candidateIdentifier(filePath, line, sourceType, ordinal),
    statusCurrent: currentChinese ? "translated" : "untranslated",
    file: toPosix(filePath),
    line,
    english: normalizedEnglish,
    currentChinese: currentChinese || "",
    desiredChinese: currentChinese || "",
    notes: extra.notes || "",
    ...extra,
  });
}

export function collectAstCandidates(filePath, content) {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const candidates = [];
  const counters = new Map();

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const callName = getCallName(node.expression);
      if (
        callName === "tr" &&
        node.arguments.length >= 2 &&
        decodeLiteralNode(node.arguments[0]) &&
        decodeLiteralNode(node.arguments[1])
      ) {
        pushCandidate(candidates, counters, filePath, sourceFile, "inline_tr", decodeLiteralNode(node.arguments[0]), decodeLiteralNode(node.arguments[1]), {
          node,
          englishNode: node.arguments[0],
          chineseNode: node.arguments[1],
        });
        return;
      } else if (isUiCallExpression(node) && node.arguments.length >= 1 && decodeLiteralNode(node.arguments[0])) {
        pushCandidate(candidates, counters, filePath, sourceFile, "english_only_literal", decodeLiteralNode(node.arguments[0]), "", {
          node: node.arguments[0],
          literalKind: "call-arg",
          notes: `ui-call:${callName || "call"}`,
        });
      }
    }

    if (ts.isConditionalExpression(node) && isZhCondition(node.condition)) {
      const conditionalPair = extractZhConditionalPair(node);
      if (conditionalPair && hasAlphabetic(conditionalPair.english)) {
        pushCandidate(candidates, counters, filePath, sourceFile, "inline_ternary", conditionalPair.english, conditionalPair.chinese, {
          node,
          englishNode: node.whenFalse,
          chineseNode: node.whenTrue,
          conditionText: node.condition.getText(sourceFile),
        });
      }
      return;
    }

    if (ts.isJsxAttribute(node) && translatableJsxAttributes.has(node.name.text) && node.initializer) {
      if (ts.isStringLiteral(node.initializer)) {
        pushCandidate(candidates, counters, filePath, sourceFile, "english_only_literal", node.initializer.text, "", {
          node: node.initializer,
          literalKind: "jsx-attr",
          attributeName: node.name.text,
        });
      }
    }

    if (ts.isJsxText(node)) {
      const text = normalizeWhitespace(node.getText(sourceFile));
      if (text && hasAlphabetic(text)) {
        const parentTag = ts.isJsxElement(node.parent) ? getTagName(node.parent.openingElement.tagName) : null;
        if (parentTag !== "style" && parentTag !== "script") {
          pushCandidate(candidates, counters, filePath, sourceFile, "english_only_jsx_text", text, "", {
            node,
            literalKind: "jsx-text",
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { sourceFile, candidates };
}

export function loadSeedTranslations() {
  const rows = loadCsvRows(seedCsvPath);
  if (!rows.length) return new Map();
  const header = rows.shift() || [];
  const indexByName = Object.fromEntries(header.map((name, index) => [String(name).replace(/^\uFEFF/, ""), index]));
  const byEnglish = new Map();

  for (const row of rows) {
    const english = normalizeWhitespace(row[indexByName.english] || "");
    const desiredChinese = normalizeWhitespace(row[indexByName.desired_chinese] || "");
    if (!english || !desiredChinese) continue;
    if (!byEnglish.has(english)) {
      byEnglish.set(english, desiredChinese);
    }
  }

  return byEnglish;
}

export function loadExistingAuditRows() {
  const rows = loadCsvRows(auditCsvPath);
  if (!rows.length) return new Map();
  const header = rows.shift() || [];
  const indexByName = Object.fromEntries(header.map((name, index) => [String(name).replace(/^\uFEFF/, ""), index]));
  const byIdentifier = new Map();

  for (const row of rows) {
    const identifier = row[indexByName.identifier] || "";
    if (!identifier) continue;
    byIdentifier.set(identifier, {
      desiredChinese: row[indexByName.desired_chinese] || "",
      currentChinese: row[indexByName.current_chinese] || "",
    });
  }

  return byIdentifier;
}

export function stringifyNodeText(value) {
  return JSON.stringify(value);
}

export function buildConditionalExpression(chinese, english) {
  return `isZh ? ${stringifyNodeText(chinese)} : ${stringifyNodeText(english)}`;
}

export function buildConditionalExpressionWithCondition(conditionText, chinese, english) {
  return `${conditionText} ? ${stringifyNodeText(chinese)} : ${stringifyNodeText(english)}`;
}

export function applyTextReplacements(content, replacements) {
  const sorted = [...replacements].sort((left, right) => right.start - left.start);
  let next = content;
  for (const replacement of sorted) {
    next = `${next.slice(0, replacement.start)}${replacement.text}${next.slice(replacement.end)}`;
  }
  return next;
}