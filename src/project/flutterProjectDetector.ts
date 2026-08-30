import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { LocalizationProject, L10nConfig } from "../arb/arbModels";

export class FlutterProjectDetector {
  async detectProject(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<LocalizationProject | undefined> {
    const pubspecPath = path.join(workspaceFolder.uri.fsPath, "pubspec.yaml");
    if (!fs.existsSync(pubspecPath)) {
      return undefined;
    }

    const pubspecContent = fs.readFileSync(pubspecPath, "utf-8");
    const pubspec = yaml.parse(pubspecContent);
    if (!pubspec?.dependencies?.flutter && !pubspec?.environment?.sdk) {
      return undefined;
    }

    const l10nConfig = await this.readL10nConfig(workspaceFolder);
    const arbDir = this.resolveArbDirectory(workspaceFolder, l10nConfig);
    const templateFile = l10nConfig?.templateArbFile || "app_en.arb";
    const templateLocale = this.extractLocaleFromFileName(templateFile);
    const outputFile =
      l10nConfig?.outputLocalizationFile || "app_localizations.dart";

    if (!fs.existsSync(arbDir)) {
      return undefined;
    }

    const supportedLocales = this.findSupportedLocales(arbDir, templateFile);

    return {
      rootUri: workspaceFolder.uri.fsPath,
      arbDirectoryUri: arbDir,
      templateArbFile: templateFile,
      templateLocale,
      outputLocalizationFile: outputFile,
      supportedLocales,
    };
  }

  private async readL10nConfig(
    workspaceFolder: vscode.WorkspaceFolder
  ): Promise<L10nConfig | undefined> {
    const l10nYamlPath = path.join(
      workspaceFolder.uri.fsPath,
      "l10n.yaml"
    );
    if (!fs.existsSync(l10nYamlPath)) {
      return undefined;
    }

    const content = fs.readFileSync(l10nYamlPath, "utf-8");
    return yaml.parse(content) as L10nConfig;
  }

  private resolveArbDirectory(
    workspaceFolder: vscode.WorkspaceFolder,
    config?: L10nConfig
  ): string {
    if (config?.arbDir) {
      return path.join(workspaceFolder.uri.fsPath, config.arbDir);
    }
    return path.join(workspaceFolder.uri.fsPath, "lib", "l10n");
  }

  extractLocaleFromFileName(fileName: string): string {
    const prefixMatch = fileName.match(
      /^(?:app|strings|messages)_(\w+(?:_\w+)?)\.arb$/
    );
    if (prefixMatch) {
      return prefixMatch[1];
    }
    return "en";
  }

  private findSupportedLocales(
    arbDir: string,
    templateFile: string
  ): string[] {
    const locales: string[] = [];
    const files = fs.readdirSync(arbDir);
    for (const file of files) {
      if (!file.endsWith(".arb") || file.startsWith("@")) {
        continue;
      }
      const locale = this.extractLocaleFromFileName(file);
      if (!locales.includes(locale)) {
        locales.push(locale);
      }
    }
    return locales;
  }
}
