import * as vscode from "vscode";
import { TranslationIndex } from "../arb/translationIndex";
import { DartScanner } from "../dart/dartScanner";
import { PlaceholderValidator } from "./placeholderValidator";
import { ExtensionConfig } from "../configuration/extensionConfig";

export class DartDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private dartScanner = new DartScanner();
  private placeholderValidator = new PlaceholderValidator();
  private translationIndex: TranslationIndex;
  private config: ExtensionConfig;

  constructor(
    translationIndex: TranslationIndex,
    config: ExtensionConfig
  ) {
    this.translationIndex = translationIndex;
    this.config = config;
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("flutterL10n.dart");
  }

  updateTranslationIndex(index: TranslationIndex): void {
    this.translationIndex = index;
  }

  validateDocument(document: vscode.TextDocument): vscode.Diagnostic[] {
    if (document.languageId !== "dart") {
      return [];
    }

    const settings = this.config.getSettings();
    const diagnostics: vscode.Diagnostic[] = [];
    const references = this.dartScanner.scan(document);

    for (const ref of references) {
      const entry = this.translationIndex.getEntry(ref.key);

      if (!entry) {
        if (settings.diagnosticsMissingKeys) {
          const diagnostic = new vscode.Diagnostic(
            ref.range,
            `Localization key "${ref.key}" is not defined in ARB files`,
            vscode.DiagnosticSeverity.Error
          );
          diagnostic.source = "flutter-l10n";
          diagnostics.push(diagnostic);
        }
        continue;
      }

      const templateLocale = this.translationIndex.templateLocale;
      const templateValue = entry.values.get(templateLocale);

      if (templateValue && settings.diagnosticsPlaceholderMismatch) {
        const errors = this.placeholderValidator.validate(
          ref.key,
          templateValue.text,
          entry.placeholders
        );
        for (const error of errors) {
          const diagnostic = new vscode.Diagnostic(
            ref.range,
            error,
            vscode.DiagnosticSeverity.Error
          );
          diagnostic.source = "flutter-l10n";
          diagnostics.push(diagnostic);
        }
      }

      if (settings.diagnosticsMissingLocales) {
        const supportedLocales = this.translationIndex.supportedLocales;
        const missingLocales: string[] = [];
        for (const locale of supportedLocales) {
          if (locale !== templateLocale && !entry.values.has(locale)) {
            missingLocales.push(locale);
          }
        }
        if (missingLocales.length > 0) {
          const diagnostic = new vscode.Diagnostic(
            ref.range,
            `Key "${ref.key}" is missing translations for: ${missingLocales.join(", ")}`,
            vscode.DiagnosticSeverity.Warning
          );
          diagnostic.source = "flutter-l10n";
          diagnostics.push(diagnostic);
        }
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

  validateAllOpenDocuments(): void {
    for (const document of vscode.workspace.textDocuments) {
      if (document.languageId === "dart") {
        const diagnostics = this.validateDocument(document);
        this.updateDiagnostics(document, diagnostics);
      }
    }
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
  }
}
