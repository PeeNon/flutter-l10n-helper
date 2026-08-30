import * as vscode from "vscode";

export interface LocalizationReference {
  key: string;
  documentUri: vscode.Uri;
  range: vscode.Range;
  pattern: "gen-l10n" | "context-extension";
}

export interface LocalizationReferenceScanner {
  scan(document: vscode.TextDocument): LocalizationReference[];
}
