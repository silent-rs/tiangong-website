#!/usr/bin/env node
// 从官方插件目录生成网站使用的插件目录快照。
//
// 页面优先在浏览器中实时拉取 OSS 目录（OSS 已对官网域名开放 CORS），
// 拉取失败时回退到本脚本生成的快照，因此快照仍需在部署时刷新。
//
// 输出：
//   plugins.json          快照（JSON，便于外部引用）
//   assets/plugins.js     快照 + 展示元数据（页面以 <script> 加载，本地 file:// 预览可用）
//
// 用法：node scripts/build-plugins.mjs [catalog.json 本地路径]
// 不传参数时从官方地址下载。

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
await import(pathToFileURL(join(root, 'assets/catalog.js')).href);
const { CATALOG_URL, build } = globalThis.TiangongCatalog;

async function loadCatalog(localPath) {
  if (localPath) return JSON.parse(await readFile(localPath, 'utf8'));
  const res = await fetch(`${CATALOG_URL}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`下载插件目录失败：HTTP ${res.status}`);
  return res.json();
}

const catalog = await loadCatalog(process.argv[2]);
const meta = JSON.parse(await readFile(join(root, 'scripts/plugin-meta.json'), 'utf8'));
const { unknown, ...snapshot } = build(catalog, meta);

await writeFile(join(root, 'plugins.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
await writeFile(
  join(root, 'assets/plugins.js'),
  '// 由 scripts/build-plugins.mjs 生成，请勿手改\n' +
    `window.TIANGONG_PLUGIN_META = ${JSON.stringify(meta)};\n` +
    `window.TIANGONG_PLUGINS = ${JSON.stringify(snapshot)};\n`,
);
console.log(`已生成插件目录快照：${snapshot.plugins.length} 个插件`);
if (unknown.length) {
  console.warn(`以下插件缺少 scripts/plugin-meta.json 文案，使用目录原始描述：${unknown.join(', ')}`);
}
