import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { FlutterProjectDetector } from "../project/flutterProjectDetector";
import { ArbParser } from "../arb/arbParser";
import { TranslationIndex } from "../arb/translationIndex";
import { LocalizationProject } from "../arb/arbModels";

export class ShowProjectInfoCommand {
  private detector = new FlutterProjectDetector();
  private arbParser = new ArbParser();
  private translationIndex = new TranslationIndex();
  private project: LocalizationProject | undefined;

  async execute(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage(
        "Flutter L10n Helper: No workspace folder found."
      );
      return;
    }

    let detectedProject: LocalizationProject | undefined;
    for (const folder of workspaceFolders) {
      detectedProject = await this.detector.detectProject(folder);
      if (detectedProject) {
        break;
      }
    }

    if (!detectedProject) {
      vscode.window.showWarningMessage(
        "Flutter L10n Helper: No Flutter localization project detected."
      );
      return;
    }

    this.project = detectedProject;
    this.translationIndex.clear();

    const arbFiles = fs
      .readdirSync(detectedProject.arbDirectoryUri)
      .filter((f) => f.endsWith(".arb") && !f.startsWith("@"));

    for (const arbFile of arbFiles) {
      const filePath = path.join(
        detectedProject.arbDirectoryUri,
        arbFile
      );
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = this.arbParser.parseArbFile(filePath, content);
      this.translationIndex.addParsedFile(parsed);
    }

    this.translationIndex.setTemplateLocale(
      detectedProject.templateLocale
    );

    const missingTranslations =
      this.translationIndex.getMissingTranslations();
    const totalMissing = missingTranslations.reduce(
      (sum, item) => sum + item.missingLocales.length,
      0
    );

    const message = [
      `Flutter L10n project detected`,
      ``,
      `ARB directory: ${path.relative(
        detectedProject.rootUri,
        detectedProject.arbDirectoryUri
      )}`,
      `Template file: ${detectedProject.templateArbFile}`,
      `Template locale: ${detectedProject.templateLocale}`,
      `Supported locales: ${detectedProject.supportedLocales.join(
        ", "
      )}`,
      `Translation keys: ${this.translationIndex.translationCount}`,
      `Missing translations: ${totalMissing}`,
    ].join("\n");

    vscode.window.showInformationMessage(message, { modal: true });
  }

  getProject(): LocalizationProject | undefined {
    return this.project;
  }

  getTranslationIndex(): TranslationIndex {
    return this.translationIndex;
  }
}
