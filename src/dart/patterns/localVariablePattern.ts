import * as vscode from "vscode";
import { LocalizationReference } from "../localizationReference";

export class LocalVariablePattern {
  private static readonly PATTERN =
    /(?:^|[\s(,=])(\w+)\.([A-Za-z_]\w*)/g;

  private static readonly LOCALIZATION_ALIASES = new Set([
    "l10n",
    "localizations",
    "loc",
    "strings",
    "translations",
    "i18n",
    "arb",
  ]);

  scan(document: vscode.TextDocument): LocalizationReference[] {
    const references: LocalizationReference[] = [];
    const text = document.getText();
    let match: RegExpExecArray | null;

    LocalVariablePattern.PATTERN.lastIndex = 0;
    while ((match = LocalVariablePattern.PATTERN.exec(text)) !== null) {
      const receiver = match[1];
      if (!LocalVariablePattern.LOCALIZATION_ALIASES.has(receiver)) {
        continue;
      }

      const key = match[2];
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
