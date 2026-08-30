import { TranslationEntry, ArbparsedFile } from "./arbModels";

export class TranslationIndex {
  private entries = new Map<string, TranslationEntry>();
  private parsedFiles: ArbparsedFile[] = [];
  private _supportedLocales: string[] = [];
  private _templateLocale: string = "en";

  get supportedLocales(): string[] {
    return [...this._supportedLocales];
  }

  get templateLocale(): string {
    return this._templateLocale;
  }

  get translationCount(): number {
    return this.entries.size;
  }

  addParsedFile(parsed: ArbparsedFile): void {
    this.parsedFiles.push(parsed);
    if (!this._supportedLocales.includes(parsed.locale)) {
      this._supportedLocales.push(parsed.locale);
    }

    for (const [key, entry] of parsed.entries) {
      let existing = this.entries.get(key);
      if (!existing) {
        existing = {
          key,
          values: new Map(),
          placeholders: new Map(),
          description: entry.description,
        };
        this.entries.set(key, existing);
      }

      for (const [locale, value] of entry.values) {
        existing.values.set(locale, value);
      }

      if (entry.description && !existing.description) {
        existing.description = entry.description;
      }

      for (const [phName, ph] of entry.placeholders) {
        if (!existing.placeholders.has(phName)) {
          existing.placeholders.set(phName, ph);
        }
      }
    }
  }

  setTemplateLocale(locale: string): void {
    this._templateLocale = locale;
  }

  getEntry(key: string): TranslationEntry | undefined {
    return this.entries.get(key);
  }

  getAllEntries(): Map<string, TranslationEntry> {
    return new Map(this.entries);
  }

  hasKey(key: string): boolean {
    return this.entries.has(key);
  }

  getMissingKeys(): string[] {
    const missing: string[] = [];
    for (const [key, entry] of this.entries) {
      if (entry.values.size === 0) {
        missing.push(key);
      }
    }
    return missing;
  }

  getMissingTranslations(): Array<{ key: string; missingLocales: string[] }> {
    const result: Array<{ key: string; missingLocales: string[] }> = [];
    for (const [key, entry] of this.entries) {
      const missingLocales: string[] = [];
      for (const locale of this._supportedLocales) {
        if (!entry.values.has(locale)) {
          missingLocales.push(locale);
        }
      }
      if (missingLocales.length > 0) {
        result.push({ key, missingLocales });
      }
    }
    return result;
  }

  clear(): void {
    this.entries.clear();
    this.parsedFiles = [];
    this._supportedLocales = [];
  }
}
