import * as vscode from "vscode";

export interface ExtensionSettings {
  enabled: boolean;
  arbDirectory: string;
  templateLocale: string;
  displayLocale: string;
  inlineAnnotationsEnabled: boolean;
  inlineAnnotationsMaxLength: number;
  diagnosticsMissingKeys: boolean;
  diagnosticsMissingLocales: boolean;
  diagnosticsPlaceholderMismatch: boolean;
  exclude: string[];
}

export class ExtensionConfig {
  getSettings(): ExtensionSettings {
    const config = vscode.workspace.getConfiguration("flutterL10n");
    return {
      enabled: config.get<boolean>("enabled", true),
      arbDirectory: config.get<string>("arbDirectory", ""),
      templateLocale: config.get<string>("templateLocale", ""),
      displayLocale: config.get<string>("displayLocale", "en"),
      inlineAnnotationsEnabled: config.get<boolean>(
        "inlineAnnotations.enabled",
        true
      ),
      inlineAnnotationsMaxLength: config.get<number>(
        "inlineAnnotations.maxLength",
        60
      ),
      diagnosticsMissingKeys: config.get<boolean>(
        "diagnostics.missingKeys",
        true
      ),
      diagnosticsMissingLocales: config.get<boolean>(
        "diagnostics.missingLocales",
        true
      ),
      diagnosticsPlaceholderMismatch: config.get<boolean>(
        "diagnostics.placeholderMismatch",
        true
      ),
      exclude: config.get<string[]>("exclude", [
        "**/build/**",
        "**/.dart_tool/**",
        "**/*.g.dart",
        "**/*.freezed.dart",
      ]),
    };
  }
}
