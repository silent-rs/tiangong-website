#!/usr/bin/env node
// 从官方插件目录生成网站使用的 plugins.json。
// 官方目录（OSS）未开放 CORS，页面无法在浏览器里直接拉取，因此在构建时生成静态快照。
//
// 用法：node scripts/build-plugins.mjs [catalog.json 本地路径]
// 不传参数时从官方地址下载。

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const CATALOG_URL =
  'https://silent-tiangong.oss-cn-hangzhou.aliyuncs.com/plugins-index/catalog.json';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PLATFORM_LABEL = {
  'darwin-aarch64': 'macos',
  'darwin-x86_64': 'macos',
  'windows-x86_64': 'windows',
  'linux-x86_64': 'linux',
};

async function loadCatalog(localPath) {
  if (localPath) return JSON.parse(await readFile(localPath, 'utf8'));
  const res = await fetch(`${CATALOG_URL}?t=${Date.now()}`);
  if (!res.ok) throw new Error(`下载插件目录失败：HTTP ${res.status}`);
  return res.json();
}

function platformsOf(plugin) {
  const keys = Object.keys(plugin.sidecars ?? {});
  // 没有原生 sidecar（纯 UI / WASM）或声明 any 的插件不受平台限制。
  if (keys.length === 0 || keys.includes('any')) return ['macos', 'windows', 'linux'];
  return [...new Set(keys.map((k) => PLATFORM_LABEL[k]).filter(Boolean))];
}

function kindOf(plugin) {
  const hasUi = Object.keys(plugin.ui ?? {}).length > 0;
  const hasSidecar = Object.keys(plugin.sidecars ?? {}).length > 0;
  const hasWasm = Boolean(plugin.wasm);
  const parts = [];
  if (hasWasm) parts.push('WASM');
  if (hasSidecar) parts.push('Sidecar');
  if (hasUi) parts.push('UI');
  return parts.length ? parts.join(' + ') : '声明式';
}

const catalog = await loadCatalog(process.argv[2]);
const meta = JSON.parse(await readFile(join(root, 'scripts/plugin-meta.json'), 'utf8'));

const plugins = [];
const unknown = [];
for (const p of catalog.plugins ?? []) {
  const m = meta.plugins[p.id];
  if (m?.deprecated) continue;
  if (!m) unknown.push(p.id);
  plugins.push({
    id: p.id,
    name: m?.title ?? p.name ?? p.id,
    version: p.version,
    summary: m?.summary ?? p.description ?? '',
    description: p.description ?? '',
    category: m?.category ?? 'agent',
    featured: m?.featured ?? null,
    rank: m?.rank ?? 99,
    platforms: platformsOf(p),
    platformNote: m?.platformNote ?? {},
    kind: kindOf(p),
  });
}
plugins.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));

const out = {
  generatedAt: new Date().toISOString(),
  source: CATALOG_URL,
  categories: meta.categories,
  plugins,
};
await writeFile(join(root, 'plugins.json'), `${JSON.stringify(out, null, 2)}\n`);
// 同时输出脚本形式，页面通过 <script> 加载，本地 file:// 预览也能直接使用。
await writeFile(
  join(root, 'assets/plugins.js'),
  `// 由 scripts/build-plugins.mjs 生成，请勿手改\nwindow.TIANGONG_PLUGINS = ${JSON.stringify(out)};\n`,
);
console.log(`已生成 plugins.json：${plugins.length} 个插件`);
if (unknown.length) {
  console.warn(`以下插件缺少 scripts/plugin-meta.json 文案，使用目录原始描述：${unknown.join(', ')}`);
}
