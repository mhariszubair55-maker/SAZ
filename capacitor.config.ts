import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.sazai.workspace',
  appName: 'SAZ AI',
  webDir: 'dist',
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
    ...(serverUrl ? { url: serverUrl, cleartext: true } : {}),
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
    backgroundColor: '#090D16',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#090D16',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
