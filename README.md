# Flutter L10n Helper

Understand and maintain Flutter ARB translations directly inside VS Code.

> Inspired by the convenience of localization-assistance extensions and purpose-built for Flutter `gen_l10n`.

## Features

- **Inline Translations** — see translations next to localization keys in your editor
- **Hover Details** — view all locales, descriptions, and placeholders on hover
- **Go to Definition** — navigate from Dart code to the ARB entry with Cmd/Ctrl+Click
- **Auto Completion** — get suggestions after `context.l10n.` and `AppLocalizations.of(context)!.`
- **Diagnostics** — detect missing keys, missing locales, and placeholder mismatches
- **Quick Fixes** — create keys, add locales, extract strings, and more
- **Translation Report** — view completion status across all locales
- **Find Unused Keys** — identify keys that are defined but never used

## Supported Flutter Structure

```
flutter_project/
├── l10n.yaml
├── pubspec.yaml
└── lib/
    ├── l10n/
    │   ├── app_en.arb
    │   ├── app_km.arb
    │   └── ...
    └── screens/
        └── home_screen.dart
```

## Supported Dart Patterns

```dart
// gen_l10n pattern
AppLocalizations.of(context)!.welcome
AppLocalizations.of(context).welcome

// context extension pattern
context.l10n.welcome
```

## Installation

1. Open VS Code
2. Press `Cmd+Shift+X` (macOS) or `Ctrl+Shift+X` (Windows/Linux)
3. Search for "Flutter L10n Helper"
4. Click **Install**

Or install the `.vsix` file:

```bash
code --install-extension flutter-l10n-helper-0.1.1.vsix
```

## Commands

| Command | Description |
|---------|-------------|
| `Flutter L10n: Show Project Information` | Display detected project details |
| `Flutter L10n: Refresh Translation Index` | Force re-index all ARB files |
| `Flutter L10n: Select Display Locale` | Choose which locale to show inline |
| `Flutter L10n: Add Translation Key` | Add a new key to all ARB files |
| `Flutter L10n: Extract Text to ARB` | Extract a hardcoded string to ARB |
| `Flutter L10n: Rename Translation Key` | Rename a key across all files |
| `Flutter L10n: Find Missing Translations` | List keys missing from some locales |
| `Flutter L10n: Find Unused Keys` | Find keys not used in Dart code |
| `Flutter L10n: Show Translation Report` | Show completion percentage per locale |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `flutterL10n.enabled` | `true` | Enable or disable the extension |
| `flutterL10n.arbDirectory` | `""` | ARB directory path (auto-detected from l10n.yaml) |
| `flutterL10n.templateLocale` | `""` | Template locale (auto-detected) |
| `flutterL10n.displayLocale` | `"en"` | Locale for inline annotations |
| `flutterL10n.inlineAnnotations.enabled` | `true` | Show inline translations |
| `flutterL10n.inlineAnnotations.maxLength` | `60` | Max characters before truncation |
| `flutterL10n.diagnostics.missingKeys` | `true` | Show diagnostics for missing keys |
| `flutterL10n.diagnostics.missingLocales` | `true` | Show diagnostics for missing locales |
| `flutterL10n.diagnostics.placeholderMismatch` | `true` | Show diagnostics for placeholder errors |
| `flutterL10n.exclude` | `["**/build/**", ...]` | Glob patterns to exclude |

## Known Limitations

- Does not support GetX, easy_localization, or custom JSON/YAML localization frameworks
- Does not support Android XML or iOS `.strings` localization
- Does not edit generated localization Dart files
- Does not support multiline or unusual Dart expressions
- No automatic machine translation
- No cloud accounts or remote storage

## Privacy

This extension operates completely locally. It makes no network requests, collects no translation content, collects no file paths or source code, and includes no telemetry.

## Development

To run the extension locally:

1. Clone the repository:
   ```bash
   git clone https://github.com/PeeNon/flutter-l10n-helper.git
   cd flutter-l10n-helper
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build:
   ```bash
   npm run compile
   ```
4. Open in VS Code and press `F5` to launch the Extension Development Host

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run compile` | Build with esbuild (production) |
| `npm run watch` | Build in watch mode |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |
| `npm run package:vsix` | Package the extension |

## Releasing

Releases are handled by the maintainer using the release script:

```bash
./release.sh <version>
# Example: ./release.sh 0.2.0
```

This will:
1. Bump the version in `package.json`
2. Run lint, build, and tests
3. Package the VSIX
4. Create a git commit and tag
5. Push to GitHub (triggers CI/CD)
6. Publish to Open VSX Registry

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

## License

[MIT](LICENSE)
