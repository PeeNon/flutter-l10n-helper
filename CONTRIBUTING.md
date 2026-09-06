# Contributing to Flutter L10n Helper

Thanks for your interest in contributing! This guide will help you get started.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/flutter-l10n-helper.git
   cd flutter-l10n-helper
   ```
3. **Install** dependencies:
   ```bash
   npm install
   ```
4. **Build** the extension:
   ```bash
   npm run compile
   ```
5. **Open** the project in VS Code and press `F5` to launch the Extension Development Host

## How to Contribute

### Reporting Bugs

- Open an issue on [GitHub](https://github.com/PeeNon/flutter-l10n-helper/issues)
- Include your VS Code version, Flutter version, and extension version
- Provide steps to reproduce the problem
- Share relevant ARB file content and Dart code (remove sensitive data)

### Suggesting Features

- Open an issue on [GitHub](https://github.com/PeeNon/flutter-l10n-helper/issues)
- Describe the problem you're trying to solve
- Explain your proposed solution

### Submitting Code Changes

1. Find an issue to work on, or open a new one
2. Create a branch from `main`:
   ```bash
   git checkout -b fix/your-branch-name
   ```
3. Make your changes
4. Run lint and tests:
   ```bash
   npm run lint
   npm test
   ```
5. Commit your changes
6. Push to your fork and open a Pull Request

## Development

### Project Structure

```
src/
├── extension.ts          # Main activation
├── arb/                  # ARB parsing and indexing
├── dart/                 # Dart file scanning
├── commands/             # VS Code commands
├── providers/            # Editor providers (hover, completion, etc.)
├── diagnostics/          # Validation and diagnostics
├── configuration/        # Settings reader
├── project/              # Flutter project detection
└── utils/                # Shared utilities
```

### Commands

| Command | Description |
|---------|-------------|
| `npm run compile` | Build with esbuild (production) |
| `npm run watch` | Build in watch mode |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |
| `npm run package:vsix` | Package the extension |

### Code Style

- Follow the existing code patterns
- Run `npm run lint` before submitting
- Keep changes focused — one feature or fix per PR

### Testing

- Run `npm test` to execute all unit tests
- Test your changes manually in the Extension Development Host (`F5`)
- Test with a real Flutter project if possible

## Pull Request Guidelines

- Keep PRs focused on a single change
- Describe what you changed and why
- Include screenshots if adding UI features
- Make sure `npm run lint` and `npm test` pass
- Update documentation if adding new features or commands

## Release Process (Maintainer)

Releases are handled by the maintainer using the release script:

```bash
./release.sh <version>
```

This will:
1. Bump the version in `package.json`
2. Run lint, build, and tests
3. Package the VSIX
4. Create a git commit and tag
5. Push to GitHub (triggers CI/CD)
6. Publish to Open VSX Registry

## Questions?

If you have questions about contributing, feel free to open an issue on [GitHub](https://github.com/PeeNon/flutter-l10n-helper/issues).
