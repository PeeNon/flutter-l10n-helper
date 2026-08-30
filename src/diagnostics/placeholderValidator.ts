import * as vscode from "vscode";
import { TranslationIndex } from "../arb/translationIndex";
import { DartScanner } from "../dart/dartScanner";
import { ArbPlaceholder } from "../arb/arbModels";

export class PlaceholderValidator {
  validate(
    key: string,
    value: string,
    placeholders: Map<string, ArbPlaceholder>
  ): string[] {
    const errors: string[] = [];
    const usedPlaceholders = this.extractPlaceholders(value);

    for (const phName of usedPlaceholders) {
      if (!placeholders.has(phName)) {
        errors.push(
          `Placeholder "{${phName}}" is used in translation but not defined in metadata`
        );
      }
    }

    for (const [phName] of placeholders) {
      if (!usedPlaceholders.includes(phName)) {
        errors.push(
          `Placeholder "${phName}" is defined in metadata but not used in translation`
        );
      }
    }

    return errors;
  }

  private extractPlaceholders(value: string): string[] {
    const placeholders: string[] = [];
    const regex = /\{(\w+)(?:,\s*\w+(?:,\s*[^}]+)?)?\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value)) !== null) {
      placeholders.push(match[1]);
    }
    return placeholders;
  }
}
