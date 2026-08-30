import * as vscode from "vscode";
import { TranslationIndex } from "../arb/translationIndex";

export class CompletionProvider implements vscode.CompletionItemProvider {
  private translationIndex: TranslationIndex;
  private displayLocale: string;

  constructor(translationIndex: TranslationIndex, displayLocale: string) {
    this.translationIndex = translationIndex;
    this.displayLocale = displayLocale;
  }

  updateTranslationIndex(index: TranslationIndex): void {
    this.translationIndex = index;
  }

  updateDisplayLocale(locale: string): void {
    this.displayLocale = locale;
  }

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.CompletionItem[]> {
    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    const l10nMatch = textBeforeCursor.match(/context\.l10n\.(\w*)$/);
    if (l10nMatch) {
      return this.getCompletionItems();
    }

    const ofMatch = textBeforeCursor.match(
      /AppLocalizations\.of\s*\([^)]*\)\s*!?\s*\.(\w*)$/
    );
    if (ofMatch) {
      return this.getCompletionItems();
    }

    return undefined;
  }

  private getCompletionItems(): vscode.CompletionItem[] {
    const items: vscode.CompletionItem[] = [];
    const entries = this.translationIndex.getAllEntries();

    for (const [key, entry] of entries) {
      const item = new vscode.CompletionItem(
        key,
        vscode.CompletionItemKind.Property
      );

      const translationValue = entry.values.get(this.displayLocale);
      if (translationValue) {
        item.detail = translationValue.text;
      }

      if (entry.description) {
        item.documentation = entry.description;
      }

      if (entry.placeholders.size > 0) {
        const phNames = Array.from(entry.placeholders.keys()).join(", ");
        item.documentation = (item.documentation || "") + `\nPlaceholders: ${phNames}`;
      }

      items.push(item);
    }

    return items;
  }
}
