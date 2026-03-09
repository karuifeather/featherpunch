#!/usr/bin/env bash
# Build a release APK locally. Requires: yarn deps, Android SDK, Java 17.
# If android/ is missing, runs expo prebuild first. Creates debug keystore for signing if missing.

set -e
cd "$(dirname "$0")/.."

# Prefer Java 17 for Android/RN builds (required for React Native Gradle plugin)
if [[ -z "$JAVA_HOME" || ! -x "$JAVA_HOME/bin/javac" ]]; then
  for candidate in /usr/lib/jvm/java-17-temurin-jdk /usr/lib/jvm/java-17-openjdk; do
    if [[ -x "$candidate/bin/javac" ]]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

if [[ -n "$JAVA_HOME" ]]; then
  echo "Using JAVA_HOME=$JAVA_HOME"
  "$JAVA_HOME/bin/java" -version 2>&1 || true
else
  echo "Warning: JAVA_HOME not set. Install JDK 17 and set JAVA_HOME if the build fails."
fi

if [[ ! -d android ]]; then
  echo "android/ not found. Running: npx expo prebuild --platform android --no-install"
  npx expo prebuild --platform android --no-install
fi

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
if [[ ! -f android/local.properties ]]; then
  echo "sdk.dir=$ANDROID_HOME" > android/local.properties
fi

# Create debug keystore for release signing if missing (same as CI)
if [[ ! -f android/app/debug.keystore ]]; then
  echo "Creating debug keystore for release signing..."
  keytool -genkeypair -v -storetype PKCS12 \
    -keystore android/app/debug.keystore \
    -storepass android -alias androiddebugkey -keypass android \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Android Debug,O=Android,C=US"
fi

cd android
./gradlew assembleRelease --no-daemon

APK=app/build/outputs/apk/release/app-release.apk
if [[ -f "$APK" ]]; then
  echo ""
  echo "APK built: android/$APK"
  cp "$APK" ../featherpunch.apk
  echo "Copied to: featherpunch.apk"
fi
