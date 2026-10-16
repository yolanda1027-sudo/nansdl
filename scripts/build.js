// 打包：把兩個 JSON 內嵌成 <script type="application/json">，src 的 JS 合成一支 script，輸出單一 dist/index.html。
// 輸出檔不含 <!doctype>／<html>／<body>：artifact 發布時會自動包上外框。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');

// 依相依順序排列；import 行拿掉、export 關鍵字拿掉
const modules = ['src/validate.js', 'src/scoring.js', 'src/growth.js', 'src/input.js', 'src/result.js', 'src/app.js'];
const js = modules
  .map((p) => `// ---- ${p} ----\n` + read(p)
    .replace(/^import[^;]+;\s*$/gm, '')
    .replace(/^export\s+/gm, ''))
  .join('\n');

const safeJson = (p) => JSON.stringify(JSON.parse(read(p))).replace(/</g, '\\u003c');
const companions = JSON.parse(read('data/companions.json'));

const html = read('src/page.html')
  .replace('__RULES__', () => safeJson('data/rules.json'))
  .replace('__COMPANIONS__', () => safeJson('data/companions.json'))
  .replace('__CHECKED_AT__', () => companions.checkedAt)
  .replace('__SCRIPT__', () => `(() => {\n'use strict';\n${js}\nboot();\n})();`);

mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/index.html', root), html);
console.log(`dist/index.html ${(html.length / 1024).toFixed(1)} KB`);
