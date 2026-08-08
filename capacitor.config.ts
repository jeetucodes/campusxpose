import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.campusxpose.app',
  appName: 'campusxpose',
  webDir: '.output/public',
  server: {
    url: 'https://campusxpose.online',
    cleartext: true
  }
};
export default config;
