import { useEffect, useRef } from 'react';
import { AppState, BackHandler, Linking, Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as WebBrowser from 'expo-web-browser';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
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

// Photos come from Android's system photo picker: no gallery or camera permission needed.
async function pickPhoto(id, web) {
  const send = (dataUrl) => web && web.injectJavaScript(`window.ntPicked&&window.ntPicked(${JSON.stringify(id)},${JSON.stringify(dataUrl)});true;`);
  try {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled || !res.assets || !res.assets[0]) return send(null);
    const a = res.assets[0];
    const ctx = ImageManipulator.manipulate(a.uri);
    if ((a.width || 0) > 1600) ctx.resize({ width: 1600 });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
    send('data:image/jpeg;base64,' + out.base64);
  } catch {
    send(null);
  }
}

// Google won't sign in inside a web view, so open it in a secure browser tab
// and pass the login back to the page when Google returns to dropasize://auth.
async function googleSignIn(url, web) {
  let hash = '';
  try {
    if (typeof url === 'string' && url.startsWith('https://jzctsfvowmuowfxaiayy.supabase.co/auth/v1/authorize')) {
      const res = await WebBrowser.openAuthSessionAsync(url, 'dropasize://auth');
      if (res.type === 'success' && res.url) {
        const i = res.url.indexOf('#');
        hash = i >= 0 ? res.url.slice(i + 1) : '';
      }
    }
  } catch {}
  if (web) web.injectJavaScript(`window.ntOAuth&&window.ntOAuth(${JSON.stringify(hash)});true;`);
}

// Health Connect (Android only): read daily step totals, nothing else.
// Loaded lazily: the native module is missing in Expo Go and on iPhone.
function hcLib() {
  if (Platform.OS !== 'android') return null;
  try { return require('react-native-health-connect'); } catch { return null; }
}
const STEPS = [{ accessType: 'read', recordType: 'Steps' }];

async function hcStatus() {
  const HC = hcLib();
  if (!HC) return 'none';
  try {
    const s = await HC.getSdkStatus();
    return s === HC.SdkAvailabilityStatus.SDK_AVAILABLE ? 'ok'
      : s === HC.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED ? 'update' : 'none';
  } catch { return 'none'; }
}

// Today plus the last 7 days, one total per local day: { 'YYYY-MM-DD': steps }.
async function hcReadSteps(HC) {
  const granted = await HC.getGrantedPermissions();
  if (!granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read')) return { error: 'denied' };
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 7);
  const rows = await HC.aggregateGroupByPeriod({
    recordType: 'Steps',
    timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: new Date().toISOString() },
    timeRangeSlicer: { period: 'DAYS', length: 1 },
  });
  const days = {};
  rows.forEach((r) => { days[String(r.startTime).slice(0, 10)] = Math.round(Number(r.result && r.result.COUNT_TOTAL) || 0); });
  return { days, at: Date.now() };
}

async function healthConnect(action, web) {
  const send = (r) => web && web.injectJavaScript(`window.ntHCResult&&window.ntHCResult(${JSON.stringify(r)});true;`);
  const status = await hcStatus();
  if (action === 'status') return send({ action, status });
  if (action === 'install') {
    Linking.openURL('market://details?id=com.google.android.apps.healthdata&url=healthconnect%3A%2F%2Fonboarding').catch(() => {});
    return send({ action, status });
  }
  if (status !== 'ok') return send({ action, status, error: 'unavailable' });
  const HC = hcLib();
  try {
    await HC.initialize();
    if (action === 'settings') { HC.openHealthConnectSettings(); return send({ action, status }); }
    // Revoking only takes full effect after the app restarts; the page stops syncing straight away.
    if (action === 'disconnect') { await HC.revokeAllPermissions().catch(() => {}); return send({ action, status }); }
    if (action === 'connect') await HC.requestPermission(STEPS);
    if (action === 'connect' || action === 'sync') return send({ action, status, ...(await hcReadSteps(HC)) });
  } catch (e) {
    send({ action, status, error: String((e && e.message) || e).slice(0, 200) });
  }
}

async function handleMessage(raw, web) {
  let msg;
  try { msg = JSON.parse(raw); } catch { return; }
  if (!msg || typeof msg.id !== 'string') return;
  if (msg.type === 'pick') { await pickPhoto(msg.id, web); return; }
  if (msg.type === 'google') { await googleSignIn(msg.url, web); return; }
  if (msg.type === 'hc') { await healthConnect(String(msg.action), web); return; }
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

  // Back in the foreground: let the page re-sync Health Connect steps if it is connected.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active' && webRef.current) webRef.current.injectJavaScript('window.ntHCForeground&&window.ntHCForeground();true;');
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
          onMessage={(e) => { handleMessage(e.nativeEvent.data, webRef.current).catch(() => {}); }}
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
