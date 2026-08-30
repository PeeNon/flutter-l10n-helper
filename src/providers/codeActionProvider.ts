import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { TranslationIndex } from "../arb/translationIndex";
import { DartScanner } from "../dart/dartScanner";
import { LocalizationProject } from "../arb/arbModels";

export class CodeActionProvider implements vscode.CodeActionProvider {
  static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
  ];

  private translationIndex: TranslationIndex;
  private dartScanner = new DartScanner();
  private getProject: () => LocalizationProject | undefined;

  constructor(
    translationIndex: TranslationIndex,
    getProject: () => LocalizationProject | undefined
  ) {
    this.translationIndex = translationIndex;
    this.getProject = getProject;
  }

  updateTranslationIndex(index: TranslationIndex): void {
    this.translationIndex = index;
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection
  ): vscode.ProviderResult<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];
    const references = this.dartScanner.scan(document);

    const referenceAtRange = references.find((ref) =>
      ref.range.intersection(range)
    );

    if (referenceAtRange) {
      const entry = this.translationIndex.getEntry(referenceAtRange.key);

      if (!entry) {
        actions.push(this.createMissingKeyAction(document, referenceAtRange.key));
      } else {
        const missingLocaleAction = this.createAddMissingLocaleAction(
          document,
          entry.key
        );
        if (missingLocaleAction) {
          actions.push(missingLocaleAction);
        }

        actions.push(this.createEditTranslationAction(entry.key));
        actions.push(this.createCopyKeyAction(entry.key));
        actions.push(this.createOpenTemplateAction(document, entry.key));

        if (entry.placeholders.size > 0 && !entry.description) {
          actions.push(this.createAddMetadataAction(document, entry.key));
        }
      }
    }

    return actions;
  }

  private createMissingKeyAction(
    document: vscode.TextDocument,
    key: string
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Create translation key "${key}" in ARB files`,
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      command: "flutterL10n.addTranslationKey",
      title: `Add "${key}" to ARB files`,
      arguments: [key],
    };

    return action;
  }

  private createAddMissingLocaleAction(
    document: vscode.TextDocument,
    key: string
  ): vscode.CodeAction | undefined {
    const entry = this.translationIndex.getEntry(key);
    if (!entry) {
      return undefined;
    }

    const missingLocales = this.translationIndex.supportedLocales.filter(
      (locale) => !entry.values.has(locale)
    );

    if (missingLocales.length === 0) {
      return undefined;
    }

    const templateValue = entry.values.get(
      this.translationIndex.templateLocale
    );
    if (!templateValue) {
      return undefined;
    }

    const action = new vscode.CodeAction(
      `Add missing locale translations for "${key}"`,
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      command: "flutterL10n.addTranslationKey",
      title: `Add "${key}" to missing locales`,
      arguments: [key],
    };

    return action;
  }

  private createCopyKeyAction(key: string): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Copy localization key "${key}"`,
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      command: "flutterL10n.copyKey",
      title: `Copy "${key}"`,
      arguments: [key],
    };

    return action;
  }

  private createOpenTemplateAction(
    document: vscode.TextDocument,
    key: string
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Open template translation for "${key}"`,
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      command: "flutterL10n.openTemplate",
      title: `Open "${key}" in template`,
      arguments: [key],
    };

    return action;
  }

  private createAddMetadataAction(
    document: vscode.TextDocument,
    key: string
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Add metadata for "${key}"`,
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      command: "flutterL10n.addMetadata",
      title: `Add metadata for "${key}"`,
      arguments: [key],
    };

    return action;
  }

  private createEditTranslationAction(key: string): vscode.CodeAction {
    const action = new vscode.CodeAction(
      `Edit translation for "${key}"`,
      vscode.CodeActionKind.QuickFix
    );

    action.command = {
      command: "flutterL10n.editTranslation",
      title: `Edit "${key}"`,
      arguments: [key],
    };

    return action;
  }
}
