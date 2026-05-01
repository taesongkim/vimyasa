#!/usr/bin/env bash
set -euo pipefail

# Surface failures clearly even when invoked through a pipe (e.g. `| tee`),
# which would otherwise let the wrapper shell report exit 0 and mask a real
# failure inside the script.
trap 'rc=$?; if [ $rc -ne 0 ]; then
  echo ""
  echo "=== RELEASE FAILED (exit $rc) ==="
  echo "If you piped this through tee/etc., the parent shell may report exit 0."
  echo "Re-run without piping, or set -o pipefail in the parent, to surface the real code."
fi' EXIT

DEFAULT_ENV="$HOME/DevProjects2/vimyasa support/notarize.env"
ENV_FILE="${VIMYASA_NOTARIZE_ENV:-$DEFAULT_ENV}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Notarization env file not found: $ENV_FILE"
  echo "Set VIMYASA_NOTARIZE_ENV to override the location."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

SIGNING_IDENTITY="Developer ID Application: Taesong Kim (SPJZZKVU87)"
REPO="taesongkim/vimyasa"
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

echo "=== Building artifacts (no publish) ==="
npm run build
# --publish never: build artifacts only. We sign+notarize+staple the DMG
# ourselves, regenerate the manifest with correct hashes, then publish via gh.
npx electron-builder --mac --publish never

# Sign + notarize + staple every DMG produced. electron-builder only handles
# the .app inside; the DMG itself comes out unsigned.
shopt -s nullglob
for dmg in release/*.dmg; do
  echo ""
  echo "=== Post-processing $dmg ==="
  echo "Signing DMG..."
  codesign --sign "$SIGNING_IDENTITY" --timestamp "$dmg"

  echo "Submitting DMG for notarization..."
  xcrun notarytool submit "$dmg" \
    --key "$APPLE_API_KEY" \
    --key-id "$APPLE_API_KEY_ID" \
    --issuer "$APPLE_API_ISSUER" \
    --wait

  echo "Stapling DMG..."
  xcrun stapler staple "$dmg"
done

echo ""
echo "=== Regenerating latest-mac.yml hashes ==="
node scripts/regenerate-manifest.cjs

# Replace any existing draft release for this version so we don't leave stale
# artifacts attached. Published releases (visible to users) are left alone —
# you should never re-use a version number for a published release.
echo ""
echo "=== Preparing GitHub release $TAG ==="
if gh release view "$TAG" --repo "$REPO" --json isDraft -q .isDraft 2>/dev/null | grep -q true; then
  echo "Existing draft for $TAG found; deleting before re-creating."
  gh release delete "$TAG" --repo "$REPO" --yes
fi

if gh release view "$TAG" --repo "$REPO" &>/dev/null; then
  echo "Release $TAG already exists and is published. Aborting — bump the version in package.json and try again."
  exit 1
fi

echo "Creating draft release $TAG..."
gh release create "$TAG" \
  --repo "$REPO" \
  --title "$VERSION" \
  --draft \
  --notes "Vimyasa $VERSION"

echo ""
echo "=== Uploading artifacts ==="
gh release upload "$TAG" --repo "$REPO" \
  release/Vimyasa-*.dmg \
  release/Vimyasa-*.dmg.blockmap \
  release/Vimyasa-*-mac.zip \
  release/Vimyasa-*-mac.zip.blockmap \
  release/latest-mac.yml

echo ""
echo "=== Done ==="
ls -lh release/*.dmg release/*.zip 2>/dev/null
echo ""
echo "Draft release: https://github.com/$REPO/releases/tag/$TAG"
echo "Edit the draft on GitHub to add release notes, then publish it."
