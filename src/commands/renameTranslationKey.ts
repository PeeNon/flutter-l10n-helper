import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { TranslationIndex } from "../arb/translationIndex";
import { LocalizationProject } from "../arb/arbModels";
import { DartScanner } from "../dart/dartScanner";

export class RenameTranslationKeyCommand {
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

  async execute(oldKey?: string): Promise<void> {
    if (!oldKey) {
      oldKey = await vscode.window.showInputBox({
        prompt: "Enter the current translation key name",
        placeHolder: "e.g. welcome",
      });
    }

    if (!oldKey) {
      return;
    }

    const entry = this.translationIndex.getEntry(oldKey);
    if (!entry) {
      vscode.window.showWarningMessage(
        `Flutter L10n Helper: Key "${oldKey}" not found in ARB files.`
      );
      return;
    }

    const newKey = await vscode.window.showInputBox({
      prompt: `Rename "${oldKey}" to`,
      placeHolder: "e.g. welcomeMessage",
      validateInput: (value) => {
        if (!/^[A-Za-z_]\w*$/.test(value)) {
          return "Key must be a valid Dart identifier";
        }
        if (value === oldKey) {
          return "New key must be different from the current key";
        }
        if (this.translationIndex.hasKey(value)) {
          return `Key "${value}" already exists`;
        }
        return null;
      },
    });

    if (!newKey) {
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `Rename "${oldKey}" to "${newKey}" across all ARB and Dart files?`,
      { modal: true },
      "Rename"
    );

    if (confirm !== "Rename") {
      return;
    }

    const project = this.getProject();
    if (!project) {
      vscode.window.showWarningMessage(
        "Flutter L10n Helper: No project detected."
      );
      return;
    }

    const edit = new vscode.WorkspaceEdit();

    const arbFiles = fs
      .readdirSync(project.arbDirectoryUri)
      .filter((f) => f.endsWith(".arb") && !f.startsWith("@"));

    for (const arbFile of arbFiles) {
      const filePath = path.join(project.arbDirectoryUri, arbFile);
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(content) as Record<string, unknown>;

      if (parsed.hasOwnProperty(oldKey)) {
        parsed[newKey] = parsed[oldKey];
        delete parsed[oldKey];
      }

      const oldMetaKey = `@${oldKey}`;
      const newMetaKey = `@${newKey}`;
      if (parsed.hasOwnProperty(oldMetaKey)) {
        parsed[newMetaKey] = parsed[oldMetaKey];
        delete parsed[oldMetaKey];
      }

      const newContent = JSON.stringify(parsed, null, 2) + "\n";
      edit.replace(
        vscode.Uri.file(filePath),
        new vscode.Range(0, 0, Infinity, 0),
        newContent
      );
    }

    const dartFiles = await vscode.workspace.findFiles("**/*.dart", "**/build/**");
    for (const dartUri of dartFiles) {
      try {
        const document = await vscode.workspace.openTextDocument(dartUri);
        const text = document.getText();
        const references = this.dartScanner.scan(document);

        const oldRefs = references.filter((ref) => ref.key === oldKey);
        for (let i = oldRefs.length - 1; i >= 0; i--) {
          const ref = oldRefs[i];
          edit.replace(
            dartUri,
            ref.range,
            newKey
          );
        }
      } catch {
        // Skip files that can't be opened
      }
    }

    const success = await vscode.workspace.applyEdit(edit);
    if (success) {
      vscode.window.showInformationMessage(
        `Flutter L10n Helper: Renamed "${oldKey}" to "${newKey}".`
      );
    } else {
      vscode.window.showErrorMessage(
        "Flutter L10n Helper: Failed to rename translation key."
      );
    }
  }
}
