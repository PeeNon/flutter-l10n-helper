#!/bin/bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
  echo "Usage: ./release.sh <version>"
  echo "Example: ./release.sh 0.1.2"
  exit 1
fi

echo "=== Flutter L10n Helper Release ==="
echo "Version: $VERSION"
echo ""

# 1. Bump version in package.json
echo "1. Bumping version to $VERSION..."
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# 2. Lint
echo "2. Linting..."
npm run lint

# 3. Build
echo "3. Building with esbuild..."
npm run compile

# 4. Test
echo "4. Testing..."
npm run pretest
node out/test/test/runTests.js

# 5. Package VSIX
echo "5. Packaging VSIX..."
npm run package:vsix

# 6. Git commit + tag
echo "6. Committing and tagging..."
git add package.json package-lock.json
git commit -m "release: v$VERSION"
git tag "v$VERSION"

# 7. Push
echo "7. Pushing to origin..."
git push origin main
git push origin "v$VERSION"

# 8. Publish to Open VSX
if [ -n "$OVSX_PAT" ]; then
  echo "8. Publishing to Open VSX..."
  npx ovsx publish "flutter-l10n-helper-$VERSION.vsix" -p "$OVSX_PAT"
else
  echo "8. Skipping Open VSX (OVSX_PAT not set)"
fi

echo ""
echo "=== Done! ==="
echo "GitHub Release: https://github.com/PeeNon/flutter-l10n-helper/releases/tag/v$VERSION"
echo "Open VSX: https://open-vsx.org/extension/vongsochnithpov/flutter-l10n-helper"
