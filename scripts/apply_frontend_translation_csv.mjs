import fs from "node:fs";
import path from "node:path";
import {
  applyTextReplacements,
  auditCsvPath,
  buildConditionalExpression,
  buildConditionalExpressionWithCondition,
  collectAstCandidates,
  loadCsvRows,
  parseCliTargetFiles,
  repoRoot,
  stringifyNodeText,
} from "./frontend_i18n_ast_shared.mjs";

function loadTranslationRows() {
  const rows = loadCsvRows(auditCsvPath);
  const header = rows.shift() || [];
  const indexByName = Object.fromEntries(
    header.map((cell, index) => [String(cell).replace(/^\uFEFF/, "").trim(), index])
  );

  return rows
    .filter((row) => row.length > 0)
    .map((row) => ({
      sourceType: (row[indexByName.source_type] || "").trim(),
      identifier: (row[indexByName.identifier] || "").trim(),
      file: (row[indexByName.file] || "").trim(),
      english: row[indexByName.english] || "",
      desiredChinese: row[indexByName.desired_chinese] || "",
    }))
    .filter((row) => row.sourceType && row.file && row.desiredChinese.trim());
}

function applyRowsToFile(filePath, rows) {
  const absolutePath = path.join(repoRoot, filePath);
  const content = fs.readFileSync(absolutePath, "utf8");
  const { candidates } = collectAstCandidates(filePath, content);
  const candidateByIdentifier = new Map(candidates.map((candidate) => [candidate.identifier, candidate]));
  const replacements = [];

  for (const row of rows) {
    const candidate = candidateByIdentifier.get(row.identifier);
    if (!candidate) {
      console.warn(`Unmatched: ${row.sourceType} ${row.identifier}`);
      continue;
    }

    if (row.sourceType === "inline_tr" || row.sourceType === "inline_ternary") {
      const replacementText = row.sourceType === "inline_tr"
        ? stringifyNodeText(row.desiredChinese)
        : buildConditionalExpressionWithCondition(candidate.conditionText || "isZh", row.desiredChinese, row.english);
      replacements.push({
        start: row.sourceType === "inline_tr" ? candidate.chineseNode.getStart() : candidate.node.getStart(),
        end: row.sourceType === "inline_tr" ? candidate.chineseNode.getEnd() : candidate.node.getEnd(),
        text: replacementText,
      });
      continue;
    }

    if (row.sourceType === "english_only_jsx_text") {
      replacements.push({
        start: candidate.node.getStart(),
        end: candidate.node.getEnd(),
        text: `{${buildConditionalExpression(row.desiredChinese, row.english)}}`,
      });
      continue;
    }

    if (row.sourceType === "english_only_literal") {
      const replacementText = buildConditionalExpression(row.desiredChinese, row.english);
      replacements.push({
        start: candidate.node.getStart(),
        end: candidate.node.getEnd(),
        text: candidate.literalKind === "jsx-attr" ? `{${replacementText}}` : replacementText,
      });
    }
  }

  fs.writeFileSync(absolutePath, applyTextReplacements(content, replacements), "utf8");
}

function main() {
  const rows = loadTranslationRows();
  const targetFiles = new Set(parseCliTargetFiles(process.argv.slice(2)));
  const byFile = new Map();

  for (const row of rows) {
    if (!targetFiles.has(row.file)) continue;
    const bucket = byFile.get(row.file) || [];
    bucket.push(row);
    byFile.set(row.file, bucket);
  }

  for (const [filePath, fileRows] of byFile.entries()) {
    applyRowsToFile(filePath, fileRows);
  }

  const appliedCount = [...byFile.values()].reduce((sum, fileRows) => sum + fileRows.length, 0);
  console.log(`Applied ${appliedCount} AST translations across ${byFile.size} files.`);
}

main();
