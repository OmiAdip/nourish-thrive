# Nourish&Thrive (Android)

The Nourish&Thrive app as an Android app.

- `web/index.html` is the app itself (login, saving to Supabase, AI coach).
- `web/appHtml.js` is the same page packed for the Android app. Rebuild it after changing `index.html`:
  `node -e "const fs=require('fs');fs.writeFileSync('web/appHtml.js','// Generated from web/index.html. Do not edit by hand.\nexport default '+JSON.stringify(fs.readFileSync('web/index.html','utf8'))+';\n')"`
- `web/admin.html` is the coach panel (at /admin on the test website).
- After changing `web/gate.js`, run `node web/build.js`.
- `App.js` shows the page full screen on the phone.
- Every push to `main` builds a new APK on Expo (see the Actions tab). Download it from expo.dev.

Backend: Supabase project `jzctsfvowmuowfxaiayy` (tables `profiles`, `user_data`; edge function `ai`).
