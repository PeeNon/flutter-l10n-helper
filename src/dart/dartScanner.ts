import * as vscode from "vscode";
import {
  LocalizationReference,
  LocalizationReferenceScanner,
} from "./localizationReference";
import { GenL10nPattern } from "./patterns/genL10nPattern";
import { ContextExtensionPattern } from "./patterns/contextExtensionPattern";
import { LocalVariablePattern } from "./patterns/localVariablePattern";

const EXCLUDED_PATTERNS = [
  "**/.dart_tool/**",
  "**/build/**",
  "**/*.g.dart",
  "**/*.freezed.dart",
  "**/*.mocks.dart",
];

export class DartScanner implements LocalizationReferenceScanner {
  private genL10nPattern = new GenL10nPattern();
  private contextExtensionPattern = new ContextExtensionPattern();
  private localVariablePattern = new LocalVariablePattern();

  scan(document: vscode.TextDocument): LocalizationReference[] {
    if (document.languageId !== "dart") {
      return [];
    }

    if (this.isExcluded(document.uri)) {
      return [];
    }

    const references: LocalizationReference[] = [
      ...this.genL10nPattern.scan(document),
      ...this.contextExtensionPattern.scan(document),
      ...this.localVariablePattern.scan(document),
    ];

    return references;
  }

  private isExcluded(uri: vscode.Uri): boolean {
    const path = uri.fsPath;
    return EXCLUDED_PATTERNS.some((pattern) => {
      const globPattern = pattern
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, "[^/]");
      return new RegExp(globPattern).test(path);
    });
  }
}
