import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { TranslationIndex } from "../arb/translationIndex";
import { LocalizationProject } from "../arb/arbModels";
import { FlutterProjectDetector } from "../project/flutterProjectDetector";
import { runGenL10n } from "../utils/flutterRunner";

export class EditTranslationCommand {
  private translationIndex: TranslationIndex;
  private getProject: () => LocalizationProject | undefined;
  private detector = new FlutterProjectDetector();

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

  async execute(key?: string, locale?: string): Promise<void> {
    if (!key) {
      return;
    }

    const project = this.getProject();
    if (!project) {
      vscode.window.showWarningMessage(
        "Flutter L10n Helper: No Flutter project detected."
      );
      return;
    }

    const entry = this.translationIndex.getEntry(key);
    if (!entry) {
      vscode.window.showWarningMessage(
        `Flutter L10n Helper: Key "${key}" not found.`
      );
      return;
    }

    let targetLocale = locale;
    if (!targetLocale) {
      const locales = Array.from(entry.values.keys());
      if (locales.length === 0) {
        vscode.window.showWarningMessage(
          `Flutter L10n Helper: No translations found for "${key}".`
        );
        return;
      }
      if (locales.length === 1) {
        targetLocale = locales[0];
      } else {
        targetLocale = await vscode.window.showQuickPick(locales, {
          placeHolder: `Select locale to edit "${key}"`,
        });
      }
    }

    if (!targetLocale) {
      return;
    }

    const currentValue = entry.values.get(targetLocale);
    if (!currentValue) {
      const add = await vscode.window.showWarningMessage(
        `Flutter L10n Helper: "${key}" has no translation for "${targetLocale}".`,
        "Add Translation"
      );
      if (add === "Add Translation") {
        await this.addTranslation(project, key, targetLocale);
      }
      return;
    }

    const newValue = await vscode.window.showInputBox({
      prompt: `Edit "${key}" (${targetLocale})`,
      value: currentValue.text,
      validateInput: (val) => {
        if (val.trim().length === 0) {
          return "Translation cannot be empty";
        }
        return null;
      },
    });

    if (newValue === undefined || newValue === currentValue.text) {
      return;
    }

    await this.updateArbFile(project, key, targetLocale, newValue);
  }

  private async addTranslation(
    project: LocalizationProject,
    key: string,
    locale: string
  ): Promise<void> {
    const newValue = await vscode.window.showInputBox({
      prompt: `Enter translation for "${key}" (${locale})`,
      validateInput: (val) => {
        if (val.trim().length === 0) {
          return "Translation cannot be empty";
        }
        return null;
      },
    });

    if (!newValue) {
      return;
    }

    await this.updateArbFile(project, key, locale, newValue);
  }

  private async updateArbFile(
    project: LocalizationProject,
    key: string,
    locale: string,
    newValue: string
  ): Promise<void> {
    const arbFiles = fs
      .readdirSync(project.arbDirectoryUri)
      .filter((f) => f.endsWith(".arb") && !f.startsWith("@"));

    const targetFile = arbFiles.find((f) => {
      const fileLocale = this.detector.extractLocaleFromFileName(f);
      return fileLocale === locale;
    });

    if (!targetFile) {
      vscode.window.showWarningMessage(
        `Flutter L10n Helper: No ARB file found for locale "${locale}".`
      );
      return;
    }

    const filePath = path.join(project.arbDirectoryUri, targetFile);
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content) as Record<string, unknown>;

    parsed[key] = newValue;

    const newContent = JSON.stringify(parsed, null, 2) + "\n";
    fs.writeFileSync(filePath, newContent, "utf-8");

    const fileUri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(fileUri);
    await doc.save();

    await runGenL10n(project.rootUri);

    vscode.window.showInformationMessage(
      `Flutter L10n Helper: Updated "${key}" in ${targetFile}`
    );
  }
}
