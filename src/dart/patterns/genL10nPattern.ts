import * as vscode from "vscode";
import { LocalizationReference } from "../localizationReference";

export class GenL10nPattern {
  private static readonly PATTERN =
    /AppLocalizations\.of\s*\([^)]*\)\s*!?\s*\.\s*([A-Za-z_]\w*)/g;

  scan(document: vscode.TextDocument): LocalizationReference[] {
    const references: LocalizationReference[] = [];
    const text = document.getText();
    let match: RegExpExecArray | null;

    GenL10nPattern.PATTERN.lastIndex = 0;
    while ((match = GenL10nPattern.PATTERN.exec(text)) !== null) {
      const key = match[1];
      const keyStart = match.index + match[0].length - key.length;
      const keyEnd = keyStart + key.length;

      const startPos = document.positionAt(keyStart);
      const endPos = document.positionAt(keyEnd);
      const range = new vscode.Range(startPos, endPos);

      references.push({
        key,
        documentUri: document.uri,
        range,
        pattern: "gen-l10n",
      });
    }

    return references;
  }
}
