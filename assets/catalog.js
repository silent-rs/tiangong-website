// 插件目录转换逻辑：浏览器（实时拉取）与 scripts/build-plugins.mjs（部署快照）共用。
// 不使用 import/export，浏览器以普通 <script> 加载，Node 以 import() 加载后从 globalThis 读取。
(function (root) {
  const CATALOG_URL =
    'https://silent-tiangong.oss-cn-hangzhou.aliyuncs.com/plugins-index/catalog.json';

  const PLATFORM_LABEL = {
    'darwin-aarch64': 'macos',
    'darwin-x86_64': 'macos',
    'windows-x86_64': 'windows',
    'linux-x86_64': 'linux',
  };

  function platformsOf(plugin) {
    const keys = Object.keys(plugin.sidecars || {});
    // 没有原生 sidecar（纯 UI / WASM）或声明 any 的插件不受平台限制。
    if (keys.length === 0 || keys.includes('any')) return ['macos', 'windows', 'linux'];
    return [...new Set(keys.map((k) => PLATFORM_LABEL[k]).filter(Boolean))];
  }

  function kindOf(plugin) {
    const parts = [];
    if (plugin.wasm) parts.push('WASM');
    if (Object.keys(plugin.sidecars || {}).length > 0) parts.push('Sidecar');
    if (Object.keys(plugin.ui || {}).length > 0) parts.push('UI');
    return parts.length ? parts.join(' + ') : '声明式';
  }

  // catalog：OSS 上的 catalog.json；meta：scripts/plugin-meta.json
  function build(catalog, meta, generatedAt) {
    if (!catalog || !Array.isArray(catalog.plugins)) throw new Error('插件目录格式不正确');
    const plugins = [];
    const unknown = [];
    for (const p of catalog.plugins) {
      if (!p || !p.id) continue;
      const m = meta.plugins[p.id];
      if (m && m.deprecated) continue;
      if (!m) unknown.push(p.id);
      plugins.push({
        id: p.id,
        name: (m && m.title) || p.name || p.id,
        version: p.version,
        summary: (m && m.summary) || p.description || '',
        description: p.description || '',
        category: (m && m.category) || 'agent',
        featured: (m && m.featured) || null,
        rank: m && typeof m.rank === 'number' ? m.rank : 99,
        platforms: platformsOf(p),
        platformNote: (m && m.platformNote) || {},
        kind: kindOf(p),
      });
    }
    plugins.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
    return {
      generatedAt: generatedAt || new Date().toISOString(),
      source: CATALOG_URL,
      categories: meta.categories,
      plugins,
      unknown,
    };
  }

  root.TiangongCatalog = { CATALOG_URL, build };
})(typeof window !== 'undefined' ? window : globalThis);
