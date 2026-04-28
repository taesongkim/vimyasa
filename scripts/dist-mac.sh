#!/usr/bin/env bash
set -euo pipefail

DEFAULT_ENV="/Users/taesongkim/DevProjects2/vimyasa support/notarize.env"
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

npm run build
npx electron-builder --mac --publish always

# electron-builder signs and notarizes the .app, but not the DMG itself.
# Sign + notarize + staple every DMG produced so Gatekeeper accepts the
# DMG on first download (no "unidentified developer" warning).
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
echo "=== Done ==="
ls -lh release/*.dmg release/*.zip 2>/dev/null
