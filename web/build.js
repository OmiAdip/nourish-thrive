// Puts web/gate.js into web/index.html and regenerates web/appHtml.js for the Android app.
// Run: node web/build.js
const fs = require('fs');
const path = require('path');
const dir = __dirname;
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
const gate = fs.readFileSync(path.join(dir, 'gate.js'), 'utf8');
const start = html.indexOf('/* Nourish&Thrive app layer');
const end = html.indexOf('\n</script>', start);
if (start < 0 || end < 0) throw new Error('gate markers not found');
html = html.slice(0, start) + gate.replace(/\s+$/, '') + html.slice(end);
fs.writeFileSync(path.join(dir, 'index.html'), html);
fs.writeFileSync(path.join(dir, 'appHtml.js'), '// Generated from web/index.html by web/build.js. Do not edit by hand.\nexport default ' + JSON.stringify(html) + ';\n');
console.log('built', html.length);
