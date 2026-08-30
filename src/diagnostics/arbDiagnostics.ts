import * as vscode from "vscode";

export interface ArbparsedResult {
  locale: string;
  fileName: string;
  entries: Map<string, { key: string; isString: boolean }>;
  diagnostics: vscode.Diagnostic[];
}

export class Aragnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("flutterL10n.arb");
  }

  validateArbFile(
    document: vscode.TextDocument,
    content: string
  ): vscode.Diagnostic[] {
    const diagnostics: vscode.Diagnostic[] = [];

    try {
      JSON.parse(content);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Invalid JSON syntax";
      const diagnostic = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 0),
        `Invalid ARB syntax: ${message}`,
        vscode.DiagnosticSeverity.Error
      );
      diagnostic.source = "flutter-l10n";
      diagnostics.push(diagnostic);
      return diagnostics;
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;
    const translationKeys: string[] = [];
    const metadataKeys: string[] = [];

    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith("@@")) {
        continue;
      }

      if (key.startsWith("@")) {
        metadataKeys.push(key.substring(1));
        const translationKey = key.substring(1);
        if (!parsed.hasOwnProperty(translationKey)) {
          const range = this.findKeyRange(document, key);
          diagnostics.push(
            new vscode.Diagnostic(
              range,
              `Metadata key "${key}" has no corresponding translation key "${translationKey}"`,
              vscode.DiagnosticSeverity.Warning
            )
          );
        }
        continue;
      }

      translationKeys.push(key);

      if (typeof value !== "string") {
        const range = this.findKeyRange(document, key);
        diagnostics.push(
          new vscode.Diagnostic(
            range,
            `Translation key "${key}" has a non-string value`,
            vscode.DiagnosticSeverity.Error
          )
        );
      }
    }

    for (const key of translationKeys) {
      const metadataKey = `@${key}`;
      if (!parsed.hasOwnProperty(metadataKey)) {
        const meta = parsed[metadataKey] as Record<string, unknown> | undefined;
        if (meta && meta.placeholders) {
          const range = this.findKeyRange(document, key);
          diagnostics.push(
            new vscode.Diagnostic(
              range,
              `Translation key "${key}" with placeholders should have metadata with description`,
              vscode.DiagnosticSeverity.Information
            )
          );
        }
      }
    }

    for (const key of metadataKeys) {
      if (!translationKeys.includes(key)) {
        // Already handled above
      }
    }

    return diagnostics;
  }

  updateDiagnostics(
    document: vscode.TextDocument,
    diagnostics: vscode.Diagnostic[]
  ): void {
    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  clearDiagnostics(document: vscode.TextDocument): void {
    this.diagnosticCollection.delete(document.uri);
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
  }

  private findKeyRange(
    document: vscode.TextDocument,
    key: string
  ): vscode.Range {
    const text = document.getText();
    const regex = new RegExp(
      `"${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*:`,
      "g"
    );
    const match = regex.exec(text);
    if (match) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      return new vscode.Range(startPos, endPos);
    }
    return new vscode.Range(0, 0, 0, 0);
  }
}
