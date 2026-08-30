import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { TranslationIndex } from "../arb/translationIndex";
import { LocalizationProject } from "../arb/arbModels";
import { DartScanner } from "../dart/dartScanner";

export class FindUnusedKeysCommand {
  private translationIndex: TranslationIndex;
  private getProject: () => LocalizationProject | undefined;
  private dartScanner = new DartScanner();

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

  async execute(): Promise<void> {
    const project = this.getProject();
    if (!project) {
      vscode.window.showWarningMessage(
        "Flutter L10n Helper: No project detected."
      );
      return;
    }

    const allKeys = new Set(this.translationIndex.getAllEntries().keys());
    const usedKeys = new Set<string>();

    const dartFiles = await vscode.workspace.findFiles(
      "**/*.dart",
      "**/build/**"
    );

    for (const dartUri of dartFiles) {
      try {
        const document = await vscode.workspace.openTextDocument(dartUri);
        const references = this.dartScanner.scan(document);
        for (const ref of references) {
          usedKeys.add(ref.key);
        }
      } catch {
        // Skip files that can't be opened
      }
    }

    const unusedKeys: string[] = [];
    for (const key of allKeys) {
      if (!usedKeys.has(key)) {
        unusedKeys.push(key);
      }
    }

    if (unusedKeys.length === 0) {
      vscode.window.showInformationMessage(
        "Flutter L10n Helper: All translation keys are in use."
      );
      return;
    }

    const message = `Found ${unusedKeys.length} unused translation key(s):\n\n${unusedKeys.join("\n")}`;
    vscode.window.showInformationMessage(message, { modal: true });
  }
}
