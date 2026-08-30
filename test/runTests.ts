import * as assert from "assert";
import * as path from "path";
import { ArbParser } from "../src/arb/arbParser";
import { TranslationIndex } from "../src/arb/translationIndex";
import { FlutterProjectDetector } from "../src/project/flutterProjectDetector";

// ============================================================
// ArbParser Tests
// ============================================================

const arbParser = new ArbParser();

console.log("=== ArbParser Tests ===\n");

// Test 1: Parse basic string keys
(() => {
  const content = JSON.stringify({ welcome: "Welcome", loginTitle: "Sign in" });
  const result = arbParser.parseArbFile("/test/app_en.arb", content, "en");
  assert.strictEqual(result.locale, "en");
  assert.strictEqual(result.entries.size, 2);
  assert.strictEqual(result.entries.get("welcome")?.values.get("en")?.text, "Welcome");
  console.log("  PASS: parses basic string keys");
})();

// Test 2: Ignore @@locale metadata
(() => {
  const content = JSON.stringify({ "@@locale": "en", welcome: "Welcome" });
  const result = arbParser.parseArbFile("/test/app_en.arb", content, "en");
  assert.strictEqual(result.entries.size, 1);
  assert.ok(!result.entries.has("@@locale"));
  console.log("  PASS: ignores @@locale metadata");
})();

// Test 3: Parse @metadata descriptions
(() => {
  const content = JSON.stringify({
    welcome: "Welcome",
    "@welcome": { description: "Greeting displayed on the home screen" },
  });
  const result = arbParser.parseArbFile("/test/app_en.arb", content, "en");
  const entry = result.entries.get("welcome");
  assert.ok(entry);
  assert.strictEqual(entry.description, "Greeting displayed on the home screen");
  console.log("  PASS: parses @metadata descriptions");
})();

// Test 4: Parse placeholders from metadata
(() => {
  const content = JSON.stringify({
    itemCount: "{count, plural, =0{No items} other{{count} items}}",
    "@itemCount": {
      description: "Pluralized item count",
      placeholders: { count: { type: "int" } },
    },
  });
  const result = arbParser.parseArbFile("/test/app_en.arb", content, "en");
  const entry = result.entries.get("itemCount");
  assert.ok(entry);
  assert.strictEqual(entry.placeholders.size, 1);
  const ph = entry.placeholders.get("count");
  assert.ok(ph);
  assert.strictEqual(ph.type, "int");
  console.log("  PASS: parses placeholders from metadata");
})();

// Test 5: Parse placeholder examples
(() => {
  const content = JSON.stringify({
    error: "Error on {serverName}",
    "@error": {
      placeholders: {
        serverName: { type: "String", example: "api.example.com" },
      },
    },
  });
  const result = arbParser.parseArbFile("/test/app_en.arb", content, "en");
  const entry = result.entries.get("error");
  assert.ok(entry);
  const ph = entry.placeholders.get("serverName");
  assert.ok(ph);
  assert.strictEqual(ph.type, "String");
  assert.strictEqual(ph.example, "api.example.com");
  console.log("  PASS: parses placeholder examples");
})();

// Test 6: Handle malformed JSON gracefully
(() => {
  const content = "{ invalid json";
  const result = arbParser.parseArbFile("/test/app_en.arb", content, "en");
  assert.strictEqual(result.entries.size, 0);
  console.log("  PASS: handles malformed JSON gracefully");
})();

// Test 7: Skip non-string translation values
(() => {
  const content = JSON.stringify({ welcome: "Welcome", count: 42, nested: { key: "value" } });
  const result = arbParser.parseArbFile("/test/app_en.arb", content, "en");
  assert.strictEqual(result.entries.size, 1);
  assert.ok(result.entries.has("welcome"));
  console.log("  PASS: skips non-string translation values");
})();

// Test 8: Track source ranges
(() => {
  const content = '{\n  "welcome": "Welcome"\n}';
  const result = arbParser.parseArbFile("/test/app_en.arb", content, "en");
  const entry = result.entries.get("welcome");
  assert.ok(entry);
  const tv = entry.values.get("en");
  assert.ok(tv);
  assert.ok(tv.keyRange.start >= 0);
  assert.ok(tv.keyRange.end > tv.keyRange.start);
  assert.ok(tv.valueRange.start >= 0);
  assert.ok(tv.valueRange.end > tv.valueRange.start);
  console.log("  PASS: tracks source ranges for keys and values");
})();

// ============================================================
// FlutterProjectDetector Locale Extraction Tests
// ============================================================

const detector = new FlutterProjectDetector();

console.log("\n=== FlutterProjectDetector Locale Extraction Tests ===\n");

const localeTests: [string, string][] = [
  ["app_en.arb", "en"],
  ["app_th.arb", "th"],
  ["app_km.arb", "km"],
  ["app_en_US.arb", "en_US"],
  ["app_pt_BR.arb", "pt_BR"],
  ["messages.arb", "en"],
];

for (const [input, expected] of localeTests) {
  const result = detector.extractLocaleFromFileName(input);
  assert.strictEqual(result, expected, `extractLocaleFromFileName("${input}") = "${result}", expected "${expected}"`);
  console.log(`  PASS: extractLocaleFromFileName("${input}") = "${expected}"`);
}

// ============================================================
// TranslationIndex Tests
// ============================================================

console.log("\n=== TranslationIndex Tests ===\n");

function createParsedFile(locale: string, entries: Record<string, string>) {
  const entryMap = new Map();
  for (const [key, text] of Object.entries(entries)) {
    const tv = {
      locale,
      text,
      fileUri: `/test/app_${locale}.arb`,
      keyRange: { start: 0, end: 0 },
      valueRange: { start: 0, end: 0 },
    };
    entryMap.set(key, {
      key,
      values: new Map([[locale, tv]]),
      placeholders: new Map(),
    });
  }
  return { locale, fileName: `app_${locale}.arb`, entries: entryMap, rawContent: JSON.stringify(entries) };
}

// Test: Add parsed files and track locales
(() => {
  const index = new TranslationIndex();
  index.addParsedFile(createParsedFile("en", { welcome: "Welcome" }));
  index.addParsedFile(createParsedFile("th", { welcome: "ยินดีต้อนรับ" }));
  assert.deepStrictEqual(index.supportedLocales, ["en", "th"]);
  console.log("  PASS: tracks locales from multiple files");
})();

// Test: Count translation keys
(() => {
  const index = new TranslationIndex();
  index.addParsedFile(createParsedFile("en", { welcome: "Welcome", login: "Sign in" }));
  assert.strictEqual(index.translationCount, 2);
  console.log("  PASS: counts translation keys");
})();

// Test: Retrieve entries by key
(() => {
  const index = new TranslationIndex();
  index.addParsedFile(createParsedFile("en", { welcome: "Welcome" }));
  const entry = index.getEntry("welcome");
  assert.ok(entry);
  assert.strictEqual(entry.values.get("en")?.text, "Welcome");
  console.log("  PASS: retrieves entries by key");
})();

// Test: Detect missing translations
(() => {
  const index = new TranslationIndex();
  index.addParsedFile(createParsedFile("en", { welcome: "Welcome" }));
  index.addParsedFile(createParsedFile("th", {}));
  const missing = index.getMissingTranslations();
  assert.strictEqual(missing.length, 1);
  assert.strictEqual(missing[0].key, "welcome");
  assert.deepStrictEqual(missing[0].missingLocales, ["th"]);
  console.log("  PASS: detects missing translations");
})();

// Test: No missing translations when all locales present
(() => {
  const index = new TranslationIndex();
  index.addParsedFile(createParsedFile("en", { welcome: "Welcome" }));
  index.addParsedFile(createParsedFile("th", { welcome: "ยินดีต้อนรับ" }));
  const missing = index.getMissingTranslations();
  assert.strictEqual(missing.length, 0);
  console.log("  PASS: no missing translations when all locales present");
})();

// Test: Clear index
(() => {
  const index = new TranslationIndex();
  index.addParsedFile(createParsedFile("en", { welcome: "Welcome" }));
  assert.strictEqual(index.translationCount, 1);
  index.clear();
  assert.strictEqual(index.translationCount, 0);
  assert.deepStrictEqual(index.supportedLocales, []);
  console.log("  PASS: clears index");
})();

// ============================================================
// Dart Scanner Tests (regex-based, no VS Code API needed)
// ============================================================

console.log("\n=== Dart Scanner Pattern Tests ===\n");

// Test gen-l10n pattern
(() => {
  const pattern = /AppLocalizations\.of\s*\([^)]*\)\s*!?\s*\.\s*([A-Za-z_]\w*)/g;
  const testCases: [string, string[]][] = [
    ["AppLocalizations.of(context)!.welcome", ["welcome"]],
    ["AppLocalizations.of(context).loginTitle", ["loginTitle"]],
    ["AppLocalizations.of(context)!.connectionError", ["connectionError"]],
    [
      "Text(AppLocalizations.of(context)!.welcome) and AppLocalizations.of(context)!.login",
      ["welcome", "login"],
    ],
  ];

  for (const [input, expectedKeys] of testCases) {
    const keys: string[] = [];
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(input)) !== null) {
      keys.push(match[1]);
    }
    assert.deepStrictEqual(keys, expectedKeys, `Pattern failed for: ${input}`);
    console.log(`  PASS: gen-l10n pattern extracts [${expectedKeys.join(", ")}] from "${input.substring(0, 50)}..."`);
  }
})();

// Test context-extension pattern
(() => {
  const pattern = /context\.l10n\.([A-Za-z_]\w*)/g;
  const testCases: [string, string[]][] = [
    ["context.l10n.welcome", ["welcome"]],
    ["Text(context.l10n.loginTitle)", ["loginTitle"]],
    [
      "Text(context.l10n.welcome) and Text(context.l10n.login)",
      ["welcome", "login"],
    ],
  ];

  for (const [input, expectedKeys] of testCases) {
    const keys: string[] = [];
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(input)) !== null) {
      keys.push(match[1]);
    }
    assert.deepStrictEqual(keys, expectedKeys, `Pattern failed for: ${input}`);
    console.log(`  PASS: context-extension pattern extracts [${expectedKeys.join(", ")}] from "${input.substring(0, 50)}..."`);
  }
})();

// ============================================================
// PlaceholderValidator Tests
// ============================================================

console.log("\n=== PlaceholderValidator Tests ===\n");

import { PlaceholderValidator } from "../src/diagnostics/placeholderValidator";
import { ArbPlaceholder } from "../src/arb/arbModels";

const placeholderValidator = new PlaceholderValidator();

// Test: No placeholders in value or metadata
(() => {
  const placeholders = new Map<string, ArbPlaceholder>();
  const errors = placeholderValidator.validate("welcome", "Welcome", placeholders);
  assert.strictEqual(errors.length, 0);
  console.log("  PASS: no errors when no placeholders");
})();

// ============================================================
// Local Variable Pattern Tests
// ============================================================

console.log("\n=== Local Variable Pattern Tests ===\n");

(() => {
  const pattern = /(?:^|[\s(,=])(\w+)\.([A-Za-z_]\w*)/g;
  const aliases = new Set(["l10n", "localizations", "loc", "strings", "translations", "i18n", "arb"]);
  const testCases: [string, string[]][] = [
    ["l10n.welcome", ["welcome"]],
    ["return l10n.learnCategoryHeart;", ["learnCategoryHeart"]],
    [
      "final l10n = context.l10n;\nreturn l10n.welcome;",
      ["welcome"],
    ],
    ["title: l10n.learnArticleSpo2Title,", ["learnArticleSpo2Title"]],
    ["return l10n.learnCategoryDevice;", ["learnCategoryDevice"]],
  ];

  for (const [input, expectedKeys] of testCases) {
    const keys: string[] = [];
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(input)) !== null) {
      if (aliases.has(match[1])) {
        keys.push(match[2]);
      }
    }
    assert.deepStrictEqual(keys, expectedKeys, `Local variable pattern failed for: ${input}`);
    console.log(`  PASS: local variable pattern extracts [${expectedKeys.join(", ")}] from "${input.substring(0, 50)}..."`);
  }
})();

// Test: Placeholder in value but not in metadata
(() => {
  const placeholders = new Map<string, ArbPlaceholder>();
  const errors = placeholderValidator.validate("error", "Error on {serverName}", placeholders);
  assert.ok(errors.length > 0);
  assert.ok(errors[0].includes("serverName"));
  assert.ok(errors[0].includes("not defined in metadata"));
  console.log("  PASS: detects placeholder in value not in metadata");
})();

// Test: Placeholder in metadata but not in value
(() => {
  const placeholders = new Map<string, ArbPlaceholder>([
    ["count", { name: "count", type: "int" }],
  ]);
  const errors = placeholderValidator.validate("itemCount", "No items", placeholders);
  assert.ok(errors.length > 0);
  assert.ok(errors[0].includes("count"));
  assert.ok(errors[0].includes("not used in translation"));
  console.log("  PASS: detects placeholder in metadata not in value");
})();

// Test: Matching placeholders
(() => {
  const placeholders = new Map<string, ArbPlaceholder>([
    ["count", { name: "count", type: "int" }],
  ]);
  const errors = placeholderValidator.validate(
    "itemCount",
    "{count, plural, =0{No items} other{{count} items}}",
    placeholders
  );
  assert.strictEqual(errors.length, 0);
  console.log("  PASS: no errors when placeholders match");
})();

// ============================================================
// Fixture File Tests
// ============================================================

console.log("\n=== Fixture File Tests ===\n");

import * as fs from "fs";

const fixtureDir = path.resolve(__dirname, "..", "..", "..", "test", "fixtures", "standard_gen_l10n");
const arbDir = path.join(fixtureDir, "lib", "l10n");

if (fs.existsSync(arbDir)) {
  const arbFiles = fs.readdirSync(arbDir).filter((f) => f.endsWith(".arb"));
  const index = new TranslationIndex();
  for (const arbFile of arbFiles) {
    const filePath = path.join(arbDir, arbFile);
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = arbParser.parseArbFile(filePath, content);
    index.addParsedFile(parsed);
  }

  assert.strictEqual(index.supportedLocales.length, 2, `Expected 2 locales, got ${index.supportedLocales.length}`);
  console.log(`  PASS: fixture has 2 locales (${index.supportedLocales.join(", ")})`);

  assert.ok(index.translationCount > 0, "Expected at least 1 translation key");
  console.log(`  PASS: fixture has ${index.translationCount} translation keys`);

  const missing = index.getMissingTranslations();
  assert.ok(missing.length === 0, `Expected 0 missing translations, got ${missing.length}`);
  console.log(`  PASS: fixture has 0 missing translations (all keys present in all locales)`);
} else {
  console.log("  SKIP: fixture directory not found");
}

console.log("\n=== All tests passed! ===\n");
