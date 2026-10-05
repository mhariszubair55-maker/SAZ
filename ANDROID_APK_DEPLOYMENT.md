# SAZ AI — Android APK Deployment & Production Build Guide

SAZ AI is configured with a **Capacitor 7 Android Hybrid Wrapper** (`com.sazai.workspace`) that keeps the existing full-stack React 19 + Three.js + Express web application 100% intact while packaging the client into a native Android APK / AAB with full support for:
- **Authentication**: Firebase Email/Password, Google Sign-In, and GitHub Sign-In with automatic Android WebView `signInWithRedirect` fallback and persistent Capacitor `Preferences` session storage.
- **API Communication**: Automatic `/api/*` request routing from the native Android APK (`https://localhost`) to your deployed SAZ AI Cloud Backend (`VITE_API_BASE_URL` or runtime configurable server URL) with CORS preflight support and tenant authentication headers (`X-User-Uid`, `X-User-Email`, `Authorization`).
- **File Upload & Download**: Native Android `<a download>` interceptor powered by `@capacitor/filesystem` + `@capacitor/share` (with Web Share API fallback) so exporting `.zip` source code, `.mp4` videos, `.wav` Urdu/English voiceovers, and `.png` renders works reliably on Android 10–15+.
- **Media Playback & Lip-Sync**: Hardware-accelerated WebGL2 (`Three.js` 3D Character Conversation Studio) + automatic WebAudio / HTML5 `<audio>` & `<video>` gesture unlocker + `setMediaPlaybackRequiresUserGesture(false)` in `MainActivity.java`.
- **Android Runtime Permissions**: Configured in `AndroidManifest.xml` (`INTERNET`, `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `CAMERA`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`) with WebRTC `PermissionRequest` bridge in `MainActivity.java`.
- **Responsive Android UI**: Edge-to-edge `viewport-fit=cover` layout, safe-area insets, Android hardware Back button handler (`@capacitor/app`), and native dark status bar (`#090D16`).

---

## 1. Prerequisites

Ensure the following tools are installed on your build machine:
1. **Node.js 20+** and **npm**
2. **Java Development Kit (JDK 17)**:
   ```bash
   java -version
   # Should report OpenJDK 17.x
   ```
3. **Android Studio (Ladybug / Koala or newer)** or **Android SDK Command-Line Tools** with:
   - Android SDK Platform 35 (`compileSdkVersion = 35`, `targetSdkVersion = 35`)
   - Android SDK Build-Tools 35.0.0+
   - `ANDROID_HOME` environment variable set to your Android SDK path.

---

## 2. Configure the Production Backend URL

Because the Android APK runs locally on the user's phone (`https://localhost` inside Capacitor's WebView), all `/api/*` calls (Gemini AI, Imagen 3, Veo 3.1, Urdu/English TTS, Audio Vault, GitHub sync) are routed to your hosted SAZ AI backend server.

1. Set `VITE_API_BASE_URL` in your `.env` file before building:
   ```env
   VITE_API_BASE_URL="https://ais-pre-ew4gmlev63jbbiqm2uwken-148639739030.asia-east1.run.app"
   ```
   *(Users can also change or test the Backend Server URL anytime inside the app via the **Android APK** button in the top header.)*

2. If using **Google Sign-In / Firebase Auth** inside the APK, add `localhost` to your **Firebase Console -> Authentication -> Settings -> Authorized domains**, and register your Android app package `com.sazai.workspace` with your debug/release SHA-1 fingerprint in **Firebase Project Settings -> Your Apps -> Android App**.

---

## 3. Step-by-Step: Build Debug APK (`app-debug.apk`)

Run the following commands from the project root to build the web assets, sync them into the Android project, and compile an installable Debug APK:

```bash
# 1. Install dependencies
npm install

# 2. Build production web bundle (dist/) and sync with Capacitor Android
npm run android:sync

# 3. Compile the Debug APK via Gradle
npm run android:apk:debug
```

### Output Location
Once Gradle finishes, your installable Debug APK is located at:
```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### Install Directly on a Connected Android Phone via USB (ADB)
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Step-by-Step: Build Signed Production Release APK (`app-release.apk`)

To distribute SAZ AI outside of debug mode or upload to the Google Play Store:

### Step 4A: Generate a Signing Keystore (One-Time)
```bash
keytool -genkey -v \
  -keystore saz-ai-release-key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias sazai
```

### Step 4B: Build Signed Release APK via Environment Variables
`android/app/build.gradle` automatically reads your keystore credentials from environment variables when present:

```bash
export ANDROID_KEYSTORE_PATH="/absolute/path/to/saz-ai-release-key.jks"
export ANDROID_KEYSTORE_PASSWORD="your_keystore_password"
export ANDROID_KEY_ALIAS="sazai"
export ANDROID_KEY_PASSWORD="your_key_password"

# Build web bundle, sync Capacitor, and assemble signed release APK
npm run android:apk:release
```

### Output Location
- **Signed Release APK**:
  `android/app/build/outputs/apk/release/app-release.apk`
- **Google Play App Bundle (AAB)** (via `npm run android:bundle:release`):
  `android/app/build/outputs/bundle/release/app-release.aab`

---

## 5. Opening in Android Studio (Visual IDE Workflow)

If you prefer building, profiling, or running on an Android Emulator from Android Studio:

```bash
npm run build
npx cap sync android
npx cap open android
```

In Android Studio:
1. Wait for Gradle Sync to finish.
2. Select **Build $\rightarrow$ Build Bundle(s) / APK(s) $\rightarrow$ Build APK(s)**.
3. Click **Locate** in the notification toast to open `app-debug.apk`.
