import * as vscode from "vscode";
import { TranslationIndex } from "../arb/translationIndex";
import { DartScanner } from "../dart/dartScanner";

const DECORATION_TYPE = vscode.window.createTextEditorDecorationType({
  after: {
    color: new vscode.ThemeColor("editorCodeLens.foreground"),
    fontStyle: "italic",
    margin: "0 0 0 1em",
  },
});

export class InlineDecorationProvider {
  private decorationType = DECORATION_TYPE;
  private dartScanner = new DartScanner();
  private translationIndex: TranslationIndex;
  private displayLocale: string;
  private maxLength: number;

  constructor(
    translationIndex: TranslationIndex,
    displayLocale: string,
    maxLength: number
  ) {
    this.translationIndex = translationIndex;
    this.displayLocale = displayLocale;
    this.maxLength = maxLength;
  }

  updateSettings(displayLocale: string, maxLength: number): void {
    this.displayLocale = displayLocale;
    this.maxLength = maxLength;
  }

  updateTranslationIndex(index: TranslationIndex): void {
    this.translationIndex = index;
  }

  updateDecorations(editor: vscode.TextEditor): void {
    if (!editor.document.fileName.endsWith(".dart")) {
      return;
    }

    const references = this.dartScanner.scan(editor.document);
    const decorations: vscode.DecorationOptions[] = [];

    for (const ref of references) {
      const entry = this.translationIndex.getEntry(ref.key);
      if (!entry) {
        continue;
      }

      const translationValue = entry.values.get(this.displayLocale);
      if (!translationValue) {
        continue;
      }

      let displayText = translationValue.text;
      if (displayText.length > this.maxLength) {
        displayText = displayText.substring(0, this.maxLength) + "...";
      }

      displayText = this.escapeMarkdown(displayText);

      decorations.push({
        range: ref.range,
        renderOptions: {
          after: {
            contentText: ` ${displayText}`,
          },
        },
      });
    }

    editor.setDecorations(this.decorationType, decorations);
  }

  updateAllDecorations(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.updateDecorations(editor);
    }
  }

  dispose(): void {
    this.decorationType.dispose();
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*`~]/g, "\\$&");
  }
}
