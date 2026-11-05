import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'vn.chuaannhien.app',
  appName: 'Chùa An Nhiên',
  webDir: 'dist',
  backgroundColor: '#1a120c',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#1a120c',
  },
  ios: {
    backgroundColor: '#1a120c',
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: false,
      backgroundColor: '#1a120c',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1a120c',
      overlaysWebView: false,
    },
  },
};

export default config;
