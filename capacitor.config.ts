import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.autodapper.app',
  appName: 'Dapper',
  webDir: 'dist/public',
  // Load the web app from the deployed server so all API calls work on iOS
  // without needing a local bundle rebuild. Update this URL after each deployment.
  server: {
    url: 'https://a7eec9ce-0b5d-4409-9681-64f5c754e78f-00-30wf35ixkqm2a.janeway.replit.dev',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    scrollEnabled: false,
    preferredContentMode: 'mobile',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
