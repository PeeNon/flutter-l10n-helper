import * as vscode from "vscode";
import { LocalizationReference } from "../localizationReference";

export class ContextExtensionPattern {
  private static readonly PATTERN = /context\.l10n\.([A-Za-z_]\w*)/g;

  scan(document: vscode.TextDocument): LocalizationReference[] {
    const references: LocalizationReference[] = [];
    const text = document.getText();
    let match: RegExpExecArray | null;

    ContextExtensionPattern.PATTERN.lastIndex = 0;
    while ((match = ContextExtensionPattern.PATTERN.exec(text)) !== null) {
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
        pattern: "context-extension",
      });
    }

    return references;
  }
}
