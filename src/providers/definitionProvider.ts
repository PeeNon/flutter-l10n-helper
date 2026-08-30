import * as vscode from "vscode";
import { TranslationIndex } from "../arb/translationIndex";
import { DartScanner } from "../dart/dartScanner";
import * as fs from "fs";

export class DefinitionProvider implements vscode.DefinitionProvider {
  private dartScanner = new DartScanner();
  private translationIndex: TranslationIndex;

  constructor(translationIndex: TranslationIndex) {
    this.translationIndex = translationIndex;
  }

  updateTranslationIndex(index: TranslationIndex): void {
    this.translationIndex = index;
  }

  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Definition> {
    const references = this.dartScanner.scan(document);
    const reference = references.find((ref) =>
      ref.range.contains(position)
    );

    if (!reference) {
      return undefined;
    }

    const entry = this.translationIndex.getEntry(reference.key);
    if (!entry) {
      return undefined;
    }

    const templateLocale = this.translationIndex.templateLocale;
    const templateValue = entry.values.get(templateLocale);

    if (!templateValue) {
      return undefined;
    }

    const filePath = templateValue.fileUri;
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    const keyRange = templateValue.keyRange;
    const fileUri = vscode.Uri.file(filePath);

    const startPos = new vscode.Position(0, 0);
    const endPos = new vscode.Position(0, 0);

    let targetRange = new vscode.Range(startPos, endPos);
    let targetSelectionRange = new vscode.Range(startPos, endPos);

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const keyRegex = new RegExp(
        `"${reference.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`,
        "g"
      );
      const match = keyRegex.exec(content);
      if (match) {
        const lineStart = content.substring(0, match.index).split("\n").length - 1;
        const colStart = match.index - content.lastIndexOf("\n", match.index - 1) - 1;
        const colEnd = colStart + match[0].length;

        const start = new vscode.Position(lineStart, colStart);
        const end = new vscode.Position(lineStart, colEnd);
        targetRange = new vscode.Range(start, end);
        targetSelectionRange = new vscode.Range(start, end);
      }
    } catch {
      // Fall back to start of file
    }

    return new vscode.Location(fileUri, targetRange);
  }
}
