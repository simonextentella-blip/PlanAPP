// Crea un unico file HTML autosufficiente (JS, icone e immagini incorporati)
// a partire dall'export web di Expo, per l'anteprima nel browser.
// Uso: npx expo export --platform web --output-dir dist && node scripts/build-preview.mjs
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map((m) => m[1]);

let js = scripts.map((src) => fs.readFileSync(path.join(dist, src), 'utf8')).join('\n;\n');
js = js.replace(/"(\/assets\/[^"]+)"/g, (_, url) => {
  const file = path.join(dist, url);
  if (url.endsWith('.ttf')) {
    if (!url.includes('/Ionicons.')) return '""';
    return `"data:font/ttf;base64,${fs.readFileSync(file).toString('base64')}"`;
  }
  if (url.endsWith('.png') && fs.existsSync(file)) {
    return `"data:image/png;base64,${fs.readFileSync(file).toString('base64')}"`;
  }
  return `"${url}"`;
});
// Evita che "</script>" dentro il codice chiuda il tag.
js = js.replace(/<\/script/gi, '<\\/script');

// Pagina per l'anteprima: senza <html>/<head>/<body>, che aggiunge la piattaforma.
const out = `<title>PlanApp</title>
<style>
  html, body { height: 100%; }
  body { overflow: hidden; background: #F4F5F2; color: #111827; color-scheme: light; }
  #root { display: flex; height: 100%; flex: 1; }
</style>
<div id="root"></div>
<script>${js}</script>
`;

fs.mkdirSync('preview', { recursive: true });
fs.writeFileSync('preview/index.html', out);
console.log(`preview/index.html: ${(out.length / 1024 / 1024).toFixed(2)} MB`);
