import * as vscode from "vscode";
import * as fs from "fs";
import {
  TranslationEntry,
  TranslationValue,
  ArbPlaceholder,
  ArbparsedFile,
} from "./arbModels";
import { FlutterProjectDetector } from "../project/flutterProjectDetector";

export class ArbParser {
  private detector = new FlutterProjectDetector();

  parseArbFile(
    filePath: string,
    content: string,
    locale?: string
  ): ArbparsedFile {
    const detectedLocale =
      locale || this.detector.extractLocaleFromFileName(
        filePath.split("/").pop() || ""
      );

    const entries = new Map<string, TranslationEntry>();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return {
        locale: detectedLocale,
        fileName: filePath.split("/").pop() || "",
        entries,
        rawContent: content,
      };
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith("@@")) {
        continue;
      }

      if (key.startsWith("@")) {
        const translationKey = key.substring(1);
        let entry = entries.get(translationKey);
        if (!entry) {
          entry = {
            key: translationKey,
            values: new Map(),
            placeholders: new Map(),
          };
          entries.set(translationKey, entry);
        }
        if (typeof value === "object" && value !== null) {
          const meta = value as Record<string, unknown>;
          if (typeof meta.description === "string") {
            entry.description = meta.description;
          }
          if (meta.placeholders && typeof meta.placeholders === "object") {
            const placeholders = meta.placeholders as Record<
              string,
              unknown
            >;
            for (const [phName, phValue] of Object.entries(placeholders)) {
              if (typeof phValue === "object" && phValue !== null) {
                const ph = phValue as Record<string, unknown>;
                const placeholder: ArbPlaceholder = {
                  name: phName,
                };
                if (typeof ph.type === "string") {
                  placeholder.type = ph.type;
                }
                if (typeof ph.example === "string") {
                  placeholder.example = ph.example;
                }
                entry.placeholders.set(phName, placeholder);
              }
            }
          }
        }
        continue;
      }

      if (typeof value !== "string") {
        continue;
      }

      let entry = entries.get(key);
      if (!entry) {
        entry = {
          key,
          values: new Map(),
          placeholders: new Map(),
        };
        entries.set(key, entry);
      }

      const keyRange = this.findKeyRange(content, key);
      const valueRange = this.findValueRange(content, key, value);

      const translationValue: TranslationValue = {
        locale: detectedLocale,
        text: value,
        fileUri: filePath,
        keyRange,
        valueRange,
      };
      entry.values.set(detectedLocale, translationValue);
    }

    return {
      locale: detectedLocale,
      fileName: filePath.split("/").pop() || "",
      entries,
      rawContent: content,
    };
  }

  private findKeyRange(content: string, key: string): { start: number; end: number } {
    const regex = new RegExp(`"${this.escapeRegex(key)}"\\s*:`, "g");
    const match = regex.exec(content);
    if (match) {
      return { start: match.index, end: match.index + match[0].length };
    }
    return { start: 0, end: 0 };
  }

  private findValueRange(
    content: string,
    key: string,
    value: string
  ): { start: number; end: number } {
    const keyRegex = new RegExp(
      `"${this.escapeRegex(key)}"\\s*:\\s*"`,
      "g"
    );
    const keyMatch = keyRegex.exec(content);
    if (keyMatch) {
      const valueStart = keyMatch.index + keyMatch[0].length;
      const valueEnd = valueStart + value.length;
      return { start: valueStart, end: valueEnd };
    }
    return { start: 0, end: 0 };
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
