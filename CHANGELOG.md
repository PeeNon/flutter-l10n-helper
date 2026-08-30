# Changelog

All notable changes to the **Flutter L10n Helper** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-30

### Added

- Automatic Flutter project detection via `l10n.yaml` and `pubspec.yaml`
- ARB file parsing with metadata, descriptions, and placeholder extraction
- Translation index with locale tracking and missing translation detection
- Inline translation annotations in the editor
- Hover provider showing all available translations, descriptions, and placeholders
- Go-to-definition navigation to ARB entries
- Auto-completion after `context.l10n.` and `AppLocalizations.of(context)!.`
- Code actions: create missing key, add locale, copy key, open template, add metadata
- Diagnostics for missing keys, missing locales, and placeholder mismatches
- Commands: Show Project Info, Refresh Index, Select Locale, Add Key, Extract to ARB, Rename Key, Find Missing, Find Unused, Show Report
- File watchers with debounced refresh for ARB and l10n.yaml changes
- Support for `AppLocalizations.of(context)!.key` and `context.l10n.key` patterns
- Support for regional locales (e.g. `en_US`, `pt_BR`)
- Configuration settings for enabling/disabling features
- Fixture project for testing with English and Khmer locales
