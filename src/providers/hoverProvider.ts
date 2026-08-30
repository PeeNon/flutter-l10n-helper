import * as vscode from "vscode";
import { TranslationIndex } from "../arb/translationIndex";
import { DartScanner } from "../dart/dartScanner";

export class HoverProvider implements vscode.HoverProvider {
  private dartScanner = new DartScanner();
  private translationIndex: TranslationIndex;

  constructor(translationIndex: TranslationIndex) {
    this.translationIndex = translationIndex;
  }

  updateTranslationIndex(index: TranslationIndex): void {
    this.translationIndex = index;
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Hover> {
    const references = this.dartScanner.scan(document);
    const reference = references.find((ref) =>
      ref.range.contains(position)
    );

    if (!reference) {
      return undefined;
    }

    const entry = this.translationIndex.getEntry(reference.key);
    if (!entry) {
      const markdown = new vscode.MarkdownString();
      markdown.isTrusted = true;
      markdown.appendMarkdown(`**${reference.key}**\n\n`);
      markdown.appendMarkdown(`⚠️ Key not found in ARB files\n\n`);
      markdown.appendMarkdown(
        `💡 [Create this key](command:flutterL10n.addTranslationKey?${this.encodeArgs(reference.key)})`
      );
      return new vscode.Hover(markdown);
    }

    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    markdown.appendMarkdown(`**${reference.key}**\n\n`);

    const locales = this.translationIndex.supportedLocales;
    for (const locale of locales) {
      const value = entry.values.get(locale);
      if (value) {
        const escaped = this.escapeMarkdown(value.text);
        const flag = this.getLocaleFlag(locale);
        markdown.appendMarkdown(
          `${flag} **${locale}**: ${escaped}  [✏️](command:flutterL10n.editTranslation?${this.encodeArgs(reference.key, locale)})\n\n`
        );
      } else {
        markdown.appendMarkdown(
          `⚠️ **${locale}**: Missing  [➕](command:flutterL10n.editTranslation?${this.encodeArgs(reference.key, locale)})\n\n`
        );
      }
    }

    if (entry.description) {
      markdown.appendMarkdown(`---\n\n`);
      markdown.appendMarkdown(`📝 ${entry.description}\n\n`);
    }

    if (entry.placeholders.size > 0) {
      markdown.appendMarkdown(`---\n\n`);
      markdown.appendMarkdown(`**Placeholders:**\n\n`);
      for (const [name, ph] of entry.placeholders) {
        const type = ph.type ? ` (${ph.type})` : "";
        const example = ph.example ? ` — e.g. \`${ph.example}\`` : "";
        markdown.appendMarkdown(`- \`${name}\`${type}${example}\n`);
      }
    }

    return new vscode.Hover(markdown);
  }

  private encodeArgs(key: string, locale?: string): string {
    const args: Record<string, string> = { key };
    if (locale) {
      args.locale = locale;
    }
    return encodeURIComponent(JSON.stringify(args));
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*`~[\]]/g, "\\$&");
  }

  private getLocaleFlag(locale: string): string {
    const flags: Record<string, string> = {
      en: "🇬🇧",
      km: "🇰🇭",
      th: "🇹🇭",
      ja: "🇯🇵",
      ko: "🇰🇷",
      zh: "🇨🇳",
      es: "🇪🇸",
      fr: "🇫🇷",
      de: "🇩🇪",
      pt: "🇵🇹",
      vi: "🇻🇳",
      id: "🇮🇩",
      ms: "🇲🇾",
      ar: "🇸🇦",
      hi: "🇮🇳",
    };
    const base = locale.split("_")[0].toLowerCase();
    return flags[base] || "🌐";
  }
}
