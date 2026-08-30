import * as vscode from "vscode";
import { TranslationIndex } from "../arb/translationIndex";

export class ShowTranslationReportCommand {
  private translationIndex: TranslationIndex;

  constructor(translationIndex: TranslationIndex) {
    this.translationIndex = translationIndex;
  }

  updateTranslationIndex(index: TranslationIndex): void {
    this.translationIndex = index;
  }

  async execute(): Promise<void> {
    const locales = this.translationIndex.supportedLocales;
    const allEntries = this.translationIndex.getAllEntries();
    const totalKeys = allEntries.size;

    if (totalKeys === 0) {
      vscode.window.showInformationMessage(
        "Flutter L10n Helper: No translation keys found."
      );
      return;
    }

    const lines: string[] = [];
    lines.push("Flutter L10n Translation Report");
    lines.push("=".repeat(40));
    lines.push("");

    for (const locale of locales) {
      let count = 0;
      for (const [, entry] of allEntries) {
        if (entry.values.has(locale)) {
          count++;
        }
      }
      const percentage = Math.round((count / totalKeys) * 100);
      const bar = "█".repeat(Math.round(percentage / 5)) + "░".repeat(20 - Math.round(percentage / 5));
      lines.push(`${locale.toUpperCase()}: ${bar} ${count}/${totalKeys} (${percentage}%)`);
    }

    lines.push("");
    lines.push("-".repeat(40));

    const missingTranslations = this.translationIndex.getMissingTranslations();
    if (missingTranslations.length > 0) {
      lines.push("");
      lines.push(`Missing translations: ${missingTranslations.length} keys`);
      for (const item of missingTranslations.slice(0, 10)) {
        lines.push(`  - ${item.key}: missing ${item.missingLocales.join(", ")}`);
      }
      if (missingTranslations.length > 10) {
        lines.push(`  ... and ${missingTranslations.length - 10} more`);
      }
    } else {
      lines.push("");
      lines.push("All translations are complete!");
    }

    vscode.window.showInformationMessage(lines.join("\n"), { modal: true });
  }
}
