// Health Connect's "privacy policy" link (permissions rationale) opens MainActivity
// (the intent filter and Android 14+ alias come from the react-native-health-connect plugin).
// Google requires that screen to show the privacy policy, so open it in the browser.
const { withMainActivity } = require('@expo/config-plugins');

const URL = 'https://omiadip.github.io/nourish-thrive/privacy.html#health-connect';
const HELPER = `
  // Health Connect permissions rationale: show the privacy policy.
  private fun ntHealthRationale(i: android.content.Intent?): Boolean {
    val a = i?.action
    if (a != "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" && a != "android.intent.action.VIEW_PERMISSION_USAGE") return false
    try { startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("${URL}"))) } catch (e: Exception) {}
    return true
  }

  override fun onNewIntent(intent: android.content.Intent) {
    super.onNewIntent(intent)
    ntHealthRationale(intent)
  }
`;

module.exports = (config) =>
  withMainActivity(config, (c) => {
    let src = c.modResults.contents;
    if (c.modResults.language !== 'kt') throw new Error('withHealthRationale: expected Kotlin MainActivity');
    if (src.includes('ntHealthRationale')) return c;
    if (/override fun onNewIntent/.test(src)) throw new Error('withHealthRationale: MainActivity already has onNewIntent');
    const call = /(super\.onCreate\([^)]*\))/;
    if (!call.test(src)) throw new Error('withHealthRationale: super.onCreate not found');
    src = src.replace(call, '$1\n    if (ntHealthRationale(intent)) finish()');
    src = src.replace(/class MainActivity[^{]*\{/, (m) => m + HELPER);
    c.modResults.contents = src;
    return c;
  });
