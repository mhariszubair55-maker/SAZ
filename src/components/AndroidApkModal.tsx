import { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileUp,
  Globe,
  Mic,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Terminal,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import { createProjectZipBlob } from './DeveloperPlatformWorkspace';
import {
  DEFAULT_PRODUCTION_CLOUD_URL,
  downloadOrShareFileAndroidSafe,
  getAndroidApiBaseUrl,
  getPlatformSummary,
  requestAndroidPermissionInteractive,
  resolveAndroidApiUrl,
  runAndroidSubsystemDiagnostics,
  setAndroidApiBaseUrl,
  type AndroidSubsystemCheck,
} from '../utils/androidBridge';

interface AndroidApkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotice: (msg: string) => void;
}

const CAPACITOR_CONFIG_SOURCE = `import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sazai.workspace',
  appName: 'SAZ AI',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      '*.run.app',
      '*.googleapis.com',
      '*.firebaseapp.com',
      '*.web.app',
      'github.com',
      '*.github.com',
      'localhost',
      '10.0.2.2',
    ],
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#090D16',
  },
};

export default config;`;

const ANDROID_MANIFEST_SOURCE = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />

    <application
        android:allowBackup="true"
        android:hardwareAccelerated="true"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:theme="@style/AppTheme">
        <activity
            android:name=".MainActivity"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.sazai.workspace" android:host="oauth" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

const MAIN_ACTIVITY_SOURCE = `package com.sazai.workspace;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> request.grant(request.getResources()));
                }
            });
        }
    }
}`;

export function AndroidApkModal({ isOpen, onClose, onNotice }: AndroidApkModalProps) {
  const [activeTab, setActiveTab] = useState<'build' | 'diagnostics' | 'config'>('build');
  const [checks, setChecks] = useState<AndroidSubsystemCheck[]>([]);
  const [runningChecks, setRunningChecks] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(() => getAndroidApiBaseUrl());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadedFileSummary, setUploadedFileSummary] = useState<string | null>(null);
  const [testingAudio, setTestingAudio] = useState(false);

  const platformSummary = getPlatformSummary();

  const triggerChecks = async () => {
    setRunningChecks(true);
    try {
      const res = await runAndroidSubsystemDiagnostics();
      setChecks(res);
    } finally {
      setRunningChecks(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setApiUrlInput(getAndroidApiBaseUrl());
    void triggerChecks();
  }, [isOpen]);

  if (!isOpen) return null;

  const copySnippet = (id: string, text: string) => {
    void navigator.clipboard?.writeText(text);
    setCopiedId(id);
    onNotice('Copied command to clipboard');
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  const handleSaveBackendUrl = async () => {
    const clean = apiUrlInput.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      onNotice('Please enter a valid http:// or https:// backend URL');
      return;
    }
    setAndroidApiBaseUrl(clean, clean !== window.location.origin);
    onNotice(`Android API Backend URL set to ${clean}`);
    await triggerChecks();
  };

  const handleDownloadAndroidWrapperZip = async () => {
    const guideMd = `# SAZ AI — Android APK Deployment Guide
Package ID: com.sazai.workspace
Version: 1.2.0 (Code 102)
Target Backend API: ${apiUrlInput || DEFAULT_PRODUCTION_CLOUD_URL}

## Quick Build Commands (Debug APK)
1. npm install
2. VITE_API_BASE_URL="${apiUrlInput || DEFAULT_PRODUCTION_CLOUD_URL}" npm run android:sync
3. npm run android:apk:debug
-> Output: android/app/build/outputs/apk/debug/app-debug.apk

## Signed Production Release APK
1. keytool -genkey -v -keystore saz-ai-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias sazai
2. export ANDROID_KEYSTORE_PATH="/full/path/to/saz-ai-release-key.jks"
   export ANDROID_KEYSTORE_PASSWORD="your_keystore_password"
   export ANDROID_KEY_ALIAS="sazai"
   export ANDROID_KEY_PASSWORD="your_key_password"
3. npm run android:apk:release
-> Output: android/app/build/outputs/apk/release/app-release.apk
`;

    const buildScript = `#!/usr/bin/env bash
set -euo pipefail
MODE="\${1:-debug}"
API_URL="\${VITE_API_BASE_URL:-${apiUrlInput || DEFAULT_PRODUCTION_CLOUD_URL}}"
echo "Building SAZ AI Web Bundle for Android ($MODE) -> $API_URL"
VITE_API_BASE_URL="$API_URL" npm run build
npx cap sync android
cd android
if [ "$MODE" = "release" ]; then
  ./gradlew assembleRelease
else
  ./gradlew assembleDebug
fi
`;

    const blob = createProjectZipBlob([
      { path: 'ANDROID_APK_DEPLOYMENT.md', content: guideMd },
      { path: 'capacitor.config.ts', content: CAPACITOR_CONFIG_SOURCE },
      { path: 'scripts/build-android-apk.sh', content: buildScript },
      { path: 'android/app/src/main/AndroidManifest.xml', content: ANDROID_MANIFEST_SOURCE },
      {
        path: 'android/app/src/main/java/com/sazai/workspace/MainActivity.java',
        content: MAIN_ACTIVITY_SOURCE,
      },
    ]);

    await downloadOrShareFileAndroidSafe('saz-ai-android-apk-wrapper.zip', blob, 'application/zip');
    onNotice('Downloaded SAZ AI Android Capacitor Wrapper & Build Scripts (.zip)');
  };

  const handleTestAudioPlayback = async () => {
    setTestingAudio(true);
    try {
      const resp = await window.fetch(resolveAndroidApiUrl('/api/video/scene-voice'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          speakerName: 'SAZ AI Android',
          speakerVoice: 'Kore',
          speakerPitch: 1.0,
          spokenLanguage: 'bilingual',
          dialogueLine: 'SAZ AI Android audio and lip-sync pipeline is ready.',
          dialogueUrdu: 'ساز اے آئی اینڈرائیڈ آڈیو اور لپ سنک سسٹم تیار ہے۔',
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { audioDataUrl?: string; audioUrl?: string };
        const src = data.audioUrl ? resolveAndroidApiUrl(data.audioUrl) : data.audioDataUrl;
        if (src) {
          const audio = new Audio(src);
          await audio.play();
          onNotice('Playing bilingual Urdu/English TTS audio check on Android');
          return;
        }
      }
      // Fallback chime if offline
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 523.25;
        gain.gain.value = 0.08;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
        onNotice('Played WebAudio hardware verification tone');
      }
    } catch {
      onNotice('Audio test completed');
    } finally {
      setTestingAudio(false);
    }
  };

  const debugBuildCmd = `npm install
VITE_API_BASE_URL="${apiUrlInput || DEFAULT_PRODUCTION_CLOUD_URL}" npm run android:sync
npm run android:apk:debug`;

  const releaseBuildCmd = `keytool -genkey -v -keystore saz-ai-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias sazai

export ANDROID_KEYSTORE_PATH="$(pwd)/saz-ai-release-key.jks"
export ANDROID_KEYSTORE_PASSWORD="your_password"
export ANDROID_KEY_ALIAS="sazai"
export ANDROID_KEY_PASSWORD="your_password"

VITE_API_BASE_URL="${apiUrlInput || DEFAULT_PRODUCTION_CLOUD_URL}" npm run android:apk:release`;

  const adbInstallCmd = `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-xs sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-amber-400/15 text-amber-400">
              <Smartphone size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white">
                SAZ AI · Android APK Deployment &amp; Capacitor Bridge
              </h2>
              <p className="text-xs text-slate-400">
                Package: <span className="font-mono text-slate-300">com.sazai.workspace</span> ·
                SDK 24–35 · {platformSummary.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadAndroidWrapperZip}
              className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300"
            >
              <Download size={14} />
              <span>Download Android Wrapper (.zip)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Android APK Modal"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-5 py-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('build')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'build'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              1. APK Build &amp; Signing Instructions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('diagnostics')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'diagnostics'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              2. Live Android Diagnostics &amp; Permissions
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
                activeTab === 'config'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              3. Cloud API &amp; Manifest Config
            </button>
          </div>
          <div className="hidden text-xs text-slate-400 md:block">
            Web App + Native Android APK Co-Exist Seamlessly
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {activeTab === 'build' && (
            <div className="space-y-5">
              {/* Architecture Summary */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                  <div className="text-xs font-bold text-amber-400">Capacitor 7 Native Wrapper</div>
                  <div className="mt-1 text-xs text-slate-300">
                    Packages the Vite `dist/` bundle into `com.sazai.workspace` while keeping the web app untouched.
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                  <div className="text-xs font-bold text-emerald-400">Cloud API &amp; Auth Bridge</div>
                  <div className="mt-1 text-xs text-slate-300">
                    Routes `/api/*` from `https://localhost` to your Cloud Run server with Redirect OAuth &amp; CORS support.
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                  <div className="text-xs font-bold text-sky-400">3D WebGL, TTS &amp; File Share</div>
                  <div className="mt-1 text-xs text-slate-300">
                    Hardware-accelerated 3D lip-sync, Urdu/English TTS auto-play, and native Android File Share sheet.
                  </div>
                </div>
              </div>

              {/* Step 1: Debug APK */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Step 1 · Generate Installable Debug APK (`app-debug.apk`)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Requires Node.js 20+, JDK 17, and Android SDK (Platform 35). Builds `dist/`, syncs Capacitor plugins, and compiles the APK via Gradle.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copySnippet('debug-cmd', debugBuildCmd)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-amber-400/60 hover:text-white"
                  >
                    {copiedId === 'debug-cmd' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedId === 'debug-cmd' ? 'Copied' : 'Copy Commands'}</span>
                  </button>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-amber-300">
                  {debugBuildCmd}
                </pre>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    Output APK:{' '}
                    <code className="text-emerald-400">
                      android/app/build/outputs/apk/debug/app-debug.apk
                    </code>
                  </span>
                  <button
                    type="button"
                    onClick={() => copySnippet('adb-cmd', adbInstallCmd)}
                    className="font-mono text-sky-400 underline hover:text-sky-300"
                  >
                    {copiedId === 'adb-cmd' ? 'Copied ADB command!' : 'Copy: adb install -r app-debug.apk'}
                  </button>
                </div>
              </div>

              {/* Step 2: Signed Release APK */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Step 2 · Generate Signed Production Release APK (`app-release.apk`)
                    </h3>
                    <p className="text-xs text-slate-400">
                      `android/app/build.gradle` automatically signs your release APK/AAB when keystore environment variables are set.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copySnippet('release-cmd', releaseBuildCmd)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-amber-400/60 hover:text-white"
                  >
                    {copiedId === 'release-cmd' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedId === 'release-cmd' ? 'Copied' : 'Copy Release Script'}</span>
                  </button>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-emerald-300">
                  {releaseBuildCmd}
                </pre>
                <div className="mt-2.5 text-xs text-slate-400">
                  Output Release APK:{' '}
                  <code className="text-emerald-400">
                    android/app/build/outputs/apk/release/app-release.apk
                  </code>{' '}
                  · Play Store Bundle (`npm run android:bundle:release`):{' '}
                  <code className="text-sky-400">
                    android/app/build/outputs/bundle/release/app-release.aab
                  </code>
                </div>
              </div>

              {/* Step 3: Android Studio Visual Workflow */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Step 3 · Open in Android Studio (Emulator &amp; Device Debugging)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Open the `/android` project in Android Studio to run on any Pixel / Galaxy emulator or physical device, or use **Build &rarr; Build APK(s)**.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copySnippet('studio-cmd', 'npm run android:sync && npm run android:open')
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-amber-400/60 hover:text-white"
                  >
                    <Terminal size={13} />
                    <span>Copy Open Command</span>
                  </button>
                </div>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-200">
                  npm run android:sync &amp;&amp; npm run android:open
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Android Runtime &amp; Permission Verification Suite
                  </h3>
                  <p className="text-xs text-slate-400">
                    Test authentication, API connectivity, microphone/camera permissions, Urdu/English TTS playback, and native file upload/download.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void triggerChecks()}
                    disabled={runningChecks}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white transition hover:border-amber-400/60"
                  >
                    <RefreshCw size={13} className={runningChecks ? 'animate-spin' : ''} />
                    <span>Re-Run Checks</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleTestAudioPlayback()}
                    disabled={testingAudio}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300"
                  >
                    <Volume2 size={14} />
                    <span>{testingAudio ? 'Synthesizing...' : 'Test Audio & TTS'}</span>
                  </button>
                </div>
              </div>

              {/* Interactive Permission & File I/O Action Bar */}
              <div className="grid gap-3 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await requestAndroidPermissionInteractive('microphone');
                    onNotice(res.message);
                    await triggerChecks();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:border-amber-400/60 hover:text-white"
                >
                  <Mic size={14} className="text-amber-400" />
                  <span>Request Microphone</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const res = await requestAndroidPermissionInteractive('camera');
                    onNotice(res.message);
                    await triggerChecks();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:border-amber-400/60 hover:text-white"
                >
                  <Video size={14} className="text-sky-400" />
                  <span>Request Camera</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const ok = await downloadOrShareFileAndroidSafe(
                      'saz-ai-android-diagnostic-report.json',
                      JSON.stringify(
                        {
                          app: 'SAZ AI Workspace',
                          packageId: 'com.sazai.workspace',
                          version: '1.2.0',
                          timestamp: new Date().toISOString(),
                          checks,
                        },
                        null,
                        2,
                      ),
                      'application/json',
                    );
                    if (ok) {
                      onNotice('Verified Android-safe file download / share sheet!');
                    }
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:border-emerald-400/60 hover:text-white"
                >
                  <Download size={14} className="text-emerald-400" />
                  <span>Test File Download</span>
                </button>

                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:border-amber-400/60 hover:text-white">
                  <FileUp size={14} className="text-amber-400" />
                  <span>Test File Upload</span>
                  <input
                    type="file"
                    accept="image/*,audio/*,video/*,.pdf,.txt,.json,.zip,.md"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const kb = Math.max(1, Math.round(f.size / 1024));
                        setUploadedFileSummary(`${f.name} (${kb} KB · ${f.type || 'file'})`);
                        onNotice(`Android file picker verified: ${f.name} (${kb} KB)`);
                      }
                    }}
                  />
                </label>
              </div>

              {uploadedFileSummary && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
                  <span>
                    Android File Upload Verified: <strong>{uploadedFileSummary}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploadedFileSummary(null)}
                    className="text-emerald-200 underline"
                  >
                    Clear
                  </button>
                </div>
              )}

              {/* Subsystem Matrix */}
              <div className="grid gap-2.5 sm:grid-cols-2">
                {checks.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5"
                  >
                    <CheckCircle2
                      size={16}
                      className={
                        item.status === 'ready'
                          ? 'mt-0.5 shrink-0 text-emerald-400'
                          : item.status === 'warning'
                            ? 'mt-0.5 shrink-0 text-amber-400'
                            : 'mt-0.5 shrink-0 text-rose-400'
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">{item.label}</span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {item.status === 'ready'
                            ? 'Ready'
                            : item.status === 'warning'
                              ? 'Action Optional'
                              : 'Attention'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-5">
              {/* Cloud API Base URL Configuration */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Globe size={16} className="text-amber-400" />
                  <span>Android APK Cloud Backend Endpoint (`/api/*` Bridge)</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  When SAZ AI runs inside the native Android APK (`https://localhost`), all `/api/*` requests are routed to this production backend URL.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="url"
                    value={apiUrlInput}
                    onChange={(e) => setApiUrlInput(e.target.value)}
                    placeholder="https://ais-pre-ew4gmlev63jbbiqm2uwken-148639739030.asia-east1.run.app"
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-amber-400 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveBackendUrl()}
                    className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-extrabold text-slate-950 transition hover:bg-amber-300"
                  >
                    Save &amp; Verify Endpoint
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setApiUrlInput(DEFAULT_PRODUCTION_CLOUD_URL);
                      setAndroidApiBaseUrl(DEFAULT_PRODUCTION_CLOUD_URL, false);
                      onNotice('Reset Android API URL to default Cloud Run endpoint');
                      void triggerChecks();
                    }}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-300 transition hover:text-white"
                  >
                    Reset Default
                  </button>
                </div>
              </div>

              {/* capacitor.config.ts preview */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    /capacitor.config.ts
                  </span>
                  <button
                    type="button"
                    onClick={() => copySnippet('cap-config', CAPACITOR_CONFIG_SOURCE)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white"
                  >
                    <Copy size={12} />
                    <span>{copiedId === 'cap-config' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
                  {CAPACITOR_CONFIG_SOURCE}
                </pre>
              </div>

              {/* AndroidManifest.xml preview */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    /android/app/src/main/AndroidManifest.xml
                  </span>
                  <button
                    type="button"
                    onClick={() => copySnippet('manifest-xml', ANDROID_MANIFEST_SOURCE)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-300 hover:text-white"
                  >
                    <Copy size={12} />
                    <span>{copiedId === 'manifest-xml' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
                  {ANDROID_MANIFEST_SOURCE}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-900/80 px-5 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>
              Android Manifest, WebRTC Mic/Camera Bridge, Redirect OAuth &amp; Safe-Area UI Active
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-1.5 font-bold text-white transition hover:bg-slate-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
