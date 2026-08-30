import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { TranslationIndex } from "../arb/translationIndex";
import { LocalizationProject } from "../arb/arbModels";

export class ExtractToArbCommand {
  private translationIndex: TranslationIndex;
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

  async execute(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "dart") {
      vscode.window.showWarningMessage(
        "Flutter L10n Helper: Select a string in a Dart file to extract."
      );
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    const stringMatch = selectedText.match(/^['"](.+)['"]$/);
    if (!stringMatch) {
      vscode.window.showWarningMessage(
        "Flutter L10n Helper: Select a quoted string to extract."
      );
      return;
    }

    const originalString = stringMatch[1];

    const key = await vscode.window.showInputBox({
      prompt: "Enter the translation key name",
      placeHolder: "e.g. connectWearable",
      value: this.suggestKey(originalString),
      validateInput: (value) => {
        if (!/^[A-Za-z_]\w*$/.test(value)) {
          return "Key must be a valid Dart identifier";
        }
        return null;
      },
    });

    if (!key) {
      return;
    }

    const description = await vscode.window.showInputBox({
      prompt: "Enter a description for this translation (optional)",
      placeHolder: "e.g. Action to connect wearable device",
    });

    const project = this.getProject();
    if (!project) {
      vscode.window.showWarningMessage(
        "Flutter L10n Helper: No project detected."
      );
      return;
    }

    const templateLocale = this.translationIndex.templateLocale;
    const edit = new vscode.WorkspaceEdit();

    edit.replace(
      editor.document.uri,
      selection,
      `context.l10n.${key}`
    );

    const arbFiles = fs
      .readdirSync(project.arbDirectoryUri)
      .filter((f) => f.endsWith(".arb") && !f.startsWith("@"));

    for (const arbFile of arbFiles) {
      const filePath = path.join(project.arbDirectoryUri, arbFile);
      const content = fs.readFileSync(filePath, "utf-8");
      const locale = this.extractLocaleFromFileName(arbFile);

      const parsed = JSON.parse(content) as Record<string, unknown>;
      parsed[key] = locale === templateLocale ? originalString : originalString;

      if (locale === templateLocale) {
        const metadata: Record<string, unknown> = {};
        if (description) {
          metadata.description = description;
        }
        parsed[`@${key}`] = metadata;
      }

      const newContent = JSON.stringify(parsed, null, 2) + "\n";
      edit.replace(vscode.Uri.file(filePath), new vscode.Range(0, 0, Infinity, 0), newContent);
    }

    const success = await vscode.workspace.applyEdit(edit);
    if (success) {
      vscode.window.showInformationMessage(
        `Flutter L10n Helper: Extracted "${originalString}" to key "${key}".`
      );
    } else {
      vscode.window.showErrorMessage(
        "Flutter L10n Helper: Failed to extract string."
      );
    }
  }

  private suggestKey(text: string): string {
    const cleaned = text
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .map((word, index) => {
        const lower = word.toLowerCase();
        if (index === 0) {
          return lower;
        }
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join("");

    return cleaned || "newKey";
  }

  private extractLocaleFromFileName(fileName: string): string {
    const match = fileName.match(/^(?:app|strings|messages)_(\w+(?:_\w+)?)\.arb$/);
    if (match) {
      return match[1];
    }
    return "en";
  }
}
