/*
 * Erzeugt dist/index.html für die Veröffentlichung als Claude-Artifact.
 * Artifacts bekommen <!doctype>/<head>/<body> automatisch – daher nur den <body>-Inhalt
 * plus <title>, Metas und Stylesheet übernehmen. CSS/JS werden beim Publish als `files` mitgegeben.
 *
 * Aufruf: docker run --rm -v "$PWD":/app -w /app node:22-alpine node tools/build-artifact.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const body = src.split('<body>')[1].split('</body>')[0];
const head = [
  '<title>Ischias-Training</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<meta name="theme-color" content="#2a8c80">',
  '<link rel="stylesheet" href="css/styles.css">',
  '',
].join('\n');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), head + body);
console.log('dist/index.html erstellt');
