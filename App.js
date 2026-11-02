import { useEffect, useRef } from 'react';
import { BackHandler, Linking, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import appHtml from './web/appHtml';

// The app's own address inside the phone. It never loads from the internet;
// it just gives the page a stable home so its saved data stays put.
const BASE_URL = 'https://app.nourishthrive.local/';
const BG = '#F4F6F2';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

function isOwnPage(url) {
  return !url || url === 'about:blank' || url.startsWith(BASE_URL) || url.startsWith('data:') || url.startsWith('blob:');
}

// Reminders the page asks for (like "1 hour to go" on a fast) are scheduled on the phone,
// so they arrive even when the app is closed.
async function ensurePermission() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders', importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

async function handleMessage(raw) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (!msg || typeof msg.id !== 'string') return;
  if (msg.type === 'cancel') {
    await Notifications.cancelScheduledNotificationAsync(msg.id).catch(() => {});
    return;
  }
  if (msg.type === 'notify') {
    const at = Number(msg.at);
    if (!at || at <= Date.now()) return;
    if (!(await ensurePermission())) return;
    await Notifications.cancelScheduledNotificationAsync(msg.id).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: msg.id,
      content: { title: String(msg.title || 'DropASize').slice(0, 80), body: String(msg.body || '').slice(0, 240) },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: 'reminders' },
    });
  }
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
          onMessage={(e) => { handleMessage(e.nativeEvent.data).catch(() => {}); }}
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
