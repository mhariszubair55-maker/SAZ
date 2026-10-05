#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-debug}"
API_URL="${VITE_API_BASE_URL:-https://ais-pre-ew4gmlev63jbbiqm2uwken-148639739030.asia-east1.run.app}"

echo "========================================================"
echo " SAZ AI — Android APK Build Pipeline ($MODE)"
echo " Target Cloud API: $API_URL"
echo "========================================================"

echo "[1/3] Building production Vite web bundle (dist/)..."
VITE_API_BASE_URL="$API_URL" npm run build

echo "[2/3] Syncing web assets & Capacitor plugins to android/..."
npx cap sync android

echo "[3/3] Running Android Gradle build ($MODE)..."
cd android
if [ "$MODE" = "release" ]; then
  ./gradlew assembleRelease
  echo "Done! Release APK generated at: android/app/build/outputs/apk/release/app-release.apk"
else
  ./gradlew assembleDebug
  echo "Done! Debug APK generated at: android/app/build/outputs/apk/debug/app-debug.apk"
fi
