// Puts web/icons.js and web/gate.js into web/index.html and regenerates web/appHtml.js for the Android app.
// Run: node web/build.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
function inject(markers, file) {
  const code = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\s+$/, '');
  let start = -1;
  for (const m of markers) { start = html.indexOf(m); if (start >= 0) break; }
  if (start < 0) throw new Error('marker not found for ' + file);
  const end = html.indexOf('\n</script>', start);
  html = html.slice(0, start) + code + html.slice(end);
}
inject(['/* DropASize icons:'], 'icons.js');
inject(['/* DropASize app layer', '/* Nourish&Thrive app layer'], 'gate.js');
fs.writeFileSync(path.join(dir, 'index.html'), html);
fs.writeFileSync(path.join(dir, 'appHtml.js'), '// Generated from web/index.html by web/build.js. Do not edit by hand.\nexport default ' + JSON.stringify(html) + ';\n');
console.log('built', html.length);
