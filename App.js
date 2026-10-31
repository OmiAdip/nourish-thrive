import { useEffect, useRef } from 'react';
import { BackHandler, Linking, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import appHtml from './web/appHtml';

// The app's own address inside the phone. It never loads from the internet;
// it just gives the page a stable home so its saved data stays put.
const BASE_URL = 'https://app.nourishthrive.local/';
const BG = '#F7F5F0';

function isOwnPage(url) {
  return !url || url === 'about:blank' || url.startsWith(BASE_URL) || url.startsWith('data:') || url.startsWith('blob:');
}

export default function App() {
  const webRef = useRef(null);
  const canGoBack = useRef(false);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <WebView
          ref={webRef}
          style={styles.web}
          originWhitelist={['*']}
          source={{ html: appHtml, baseUrl: BASE_URL }}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          setSupportMultipleWindows={false}
          overScrollMode="never"
          onNavigationStateChange={(s) => { canGoBack.current = s.canGoBack; }}
          onShouldStartLoadWithRequest={(req) => {
            if (isOwnPage(req.url)) return true;
            // Shop links, email links and so on open in the phone's own apps.
            Linking.openURL(req.url).catch(() => {});
            return false;
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  web: { flex: 1, backgroundColor: BG },
});
