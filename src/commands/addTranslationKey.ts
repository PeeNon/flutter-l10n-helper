import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { TranslationIndex } from "../arb/translationIndex";
import { LocalizationProject } from "../arb/arbModels";
import { runGenL10n } from "../utils/flutterRunner";

export class AddTranslationKeyCommand {
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

  async execute(key?: string): Promise<void> {
    if (!key) {
      key = await vscode.window.showInputBox({
        prompt: "Enter the translation key name",
        placeHolder: "e.g. welcomeMessage",
        validateInput: (value) => {
          if (!/^[A-Za-z_]\w*$/.test(value)) {
            return "Key must start with a letter or underscore and contain only letters, numbers, and underscores";
          }
          return null;
        },
      });
    }

    if (!key) {
      return;
    }

    const project = this.getProject();
    if (!project) {
      vscode.window.showWarningMessage(
        "Flutter L10n Helper: No project detected."
      );
      return;
    }

    const templateLocale = this.translationIndex.templateLocale;
    const entry = this.translationIndex.getEntry(key);

    let value: string | undefined;
    if (entry) {
      const templateValue = entry.values.get(templateLocale);
      value = templateValue?.text;
    }

    if (!value) {
      value = await vscode.window.showInputBox({
        prompt: `Enter the translation value for "${key}" (${templateLocale})`,
        placeHolder: "e.g. Welcome to our app",
      });
    }

    if (!value) {
      return;
    }

    const arbFiles = fs
      .readdirSync(project.arbDirectoryUri)
      .filter((f) => f.endsWith(".arb") && !f.startsWith("@"));

    for (const arbFile of arbFiles) {
      const filePath = path.join(project.arbDirectoryUri, arbFile);
      const content = fs.readFileSync(filePath, "utf-8");
      const locale = this.extractLocaleFromFileName(arbFile);

      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (locale === templateLocale) {
        parsed[key] = value;
        parsed[`@${key}`] = {
          description: `TODO: Add description for ${key}`,
        };
      } else {
        parsed[key] = value;
      }

      const newContent = JSON.stringify(parsed, null, 2) + "\n";
      fs.writeFileSync(filePath, newContent, "utf-8");
    }

    for (const arbFile of arbFiles) {
      const filePath = path.join(project.arbDirectoryUri, arbFile);
      const fileUri = vscode.Uri.file(filePath);
      const doc = await vscode.workspace.openTextDocument(fileUri);
      await doc.save();
    }

    await runGenL10n(project.rootUri);

    vscode.window.showInformationMessage(
      `Flutter L10n Helper: Key "${key}" added to ${arbFiles.length} ARB files`
    );
  }

  private extractLocaleFromFileName(fileName: string): string {
    const match = fileName.match(/^(?:app|strings|messages)_(\w+(?:_\w+)?)\.arb$/);
    if (match) {
      return match[1];
    }
    return "en";
  }
}
