export interface LocalizationProject {
  rootUri: string;
  arbDirectoryUri: string;
  templateArbFile: string;
  templateLocale: string;
  outputLocalizationFile: string;
  supportedLocales: string[];
}

export interface TranslationValue {
  locale: string;
  text: string;
  fileUri: string;
  keyRange: { start: number; end: number };
  valueRange: { start: number; end: number };
}

export interface ArbPlaceholder {
  name: string;
  type?: string;
  example?: string;
}

export interface TranslationEntry {
  key: string;
  values: Map<string, TranslationValue>;
  description?: string;
  placeholders: Map<string, ArbPlaceholder>;
}

export interface LocalizationReference {
  key: string;
  documentUri: string;
  range: { start: number; end: number };
  pattern: "gen-l10n" | "context-extension";
}

export interface L10nConfig {
  arbDir?: string;
  templateArbFile?: string;
  outputLocalizationFile?: string;
  syntheticLocalizationsTemplateClass?: string;
}

export interface ArbparsedFile {
  locale: string;
  fileName: string;
  entries: Map<string, TranslationEntry>;
  rawContent: string;
}
