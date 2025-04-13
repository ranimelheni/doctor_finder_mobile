import { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.example.doctorfinder',
  appName: 'Doctor Finder Pro',
  webDir: 'www',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#3880ff',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: KeyboardResize.Ionic ,
      resizeOnFullScreen: true,
    }
  },
  android: {
    
    appendUserAgent: 'DoctorFinderApp',
    backgroundColor: '#3880ff'
  }
};

export default config;