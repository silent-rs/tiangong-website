// 天工官网交互：插件目录渲染、筛选搜索、进场动效与复制
(() => {
  const PLATFORM = { macos: 'macOS', windows: 'Win', linux: 'Linux' };
  const LIVE_TIMEOUT_MS = 8000;

  // ── 导航阴影 ────────────────────────────────
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── 进场动效 ────────────────────────────────
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  document.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el));
  const stage = document.querySelector('.hero-stage');
  if (stage) requestAnimationFrame(() => setTimeout(() => stage.classList.add('in'), 200));

  // ── 复制命令 ────────────────────────────────
  const copy = document.querySelector('.copy');
  copy?.addEventListener('click', async () => {
    const text = [...document.querySelectorAll('.terminal-snippet code')]
      .map((el) => el.innerText)
      .join('\n')
      .split('\n')
      .filter((l) => l.trim() && !l.trim().startsWith('#'))
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      copy.textContent = '已复制';
    } catch {
      copy.textContent = '复制失败';
    }
    setTimeout(() => (copy.textContent = '复制'), 1600);
  });

  // ── 插件目录 ────────────────────────────────
  // 先用部署时生成的快照立即渲染，再在后台实时拉取 OSS 目录；
  // 拉取成功则替换为最新数据，失败（网络、CORS、格式异常）则保持快照。
  const grid = document.querySelector('.plugin-grid');
  const chips = document.querySelector('.chips');
  const search = document.querySelector('.search input');
  const metaLine = document.querySelector('.catalog-meta');
  const counter = document.querySelector('[data-count="plugins"]');
  if (!grid || !chips || !search) return;

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  let data = window.TIANGONG_PLUGINS || null;
  let source = 'snapshot';
  let active = 'all';

  const countOf = (id) => (id === 'all' ? data.plugins.length : data.plugins.filter((p) => p.category === id).length);

  function renderChips() {
    const categories = [{ id: 'all', name: '全部' }, ...data.categories];
    if (active !== 'all' && countOf(active) === 0) active = 'all';
    chips.innerHTML = categories
      .filter((c) => countOf(c.id) > 0)
      .map(
        (c) =>
          `<button class="chip" role="tab" type="button" data-id="${esc(c.id)}" aria-selected="${c.id === active}">${esc(c.name)}<span class="n">${countOf(c.id)}</span></button>`,
      )
      .join('');
  }

  function card(p, i) {
    const hot = p.featured === '首推';
    const plats = ['macos', 'windows', 'linux']
      .filter((k) => p.platforms.includes(k))
      .map((k) => {
        const note = p.platformNote && p.platformNote[k];
        return `<i class="${note ? 'limited' : ''}" title="${esc(note ? `${PLATFORM[k]}：${note}` : PLATFORM[k])}">${PLATFORM[k]}${note ? '*' : ''}</i>`;
      })
      .join('');
    const initial = esc(String(p.name).slice(0, 1).toUpperCase());
    return `
      <article class="plugin${hot ? ' is-hot' : ''}" style="animation-delay:${Math.min(i, 12) * 30}ms">
        <div class="plugin-top">
          <span class="plugin-icon" aria-hidden="true">${initial}</span>
          <div>
            <div class="plugin-name">${esc(p.name)}</div>
            <div class="plugin-id">${esc(p.id)}</div>
          </div>
          ${p.featured ? `<span class="plugin-badge">${esc(p.featured)}</span>` : ''}
        </div>
        <p>${esc(p.summary)}</p>
        <div class="plugin-foot">
          <span class="ver">v${esc(p.version)}</span>
          <span>·</span>
          <span>${esc(p.kind)}</span>
          <span class="plat">${plats}</span>
        </div>
      </article>`;
  }

  function renderGrid() {
    const q = search.value.trim().toLowerCase();
    const list = data.plugins.filter(
      (p) =>
        (active === 'all' || p.category === active) &&
        (!q || [p.id, p.name, p.summary, p.description].some((s) => String(s).toLowerCase().includes(q))),
    );
    grid.innerHTML = list.length ? list.map(card).join('') : '<p class="empty">没有匹配的插件</p>';
  }

  function renderMeta() {
    if (counter) counter.textContent = String(data.plugins.length);
    if (!metaLine) return;
    const label =
      source === 'live'
        ? '实时数据来自官方插件目录'
        : `数据来自官方插件目录快照 · 更新于 ${new Date(data.generatedAt).toLocaleDateString('zh-CN')}`;
    metaLine.textContent = `${label} · * 表示该平台能力受限`;
    metaLine.dataset.source = source;
  }

  function renderAll() {
    renderChips();
    renderGrid();
    renderMeta();
  }

  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    active = btn.dataset.id;
    chips.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    renderGrid();
  });
  search.addEventListener('input', renderGrid);

  if (data) {
    renderAll();
  } else {
    grid.innerHTML = '<p class="empty">正在加载插件目录…</p>';
  }

  async function loadLive() {
    const lib = window.TiangongCatalog;
    const pluginMeta = window.TIANGONG_PLUGIN_META;
    if (!lib || !pluginMeta || typeof fetch !== 'function') return;
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), LIVE_TIMEOUT_MS);
    try {
      const res = await fetch(lib.CATALOG_URL, { cache: 'no-cache', signal: ctrl ? ctrl.signal : undefined });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = lib.build(await res.json(), pluginMeta);
      if (!next.plugins.length) throw new Error('目录为空');
      data = next;
      source = 'live';
      renderAll();
    } catch (err) {
      console.info('[天工] 实时插件目录不可用，使用快照：', err && err.message ? err.message : err);
      if (!data) grid.innerHTML = '<p class="empty">插件目录加载失败，请前往 GitHub 查看。</p>';
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  loadLive();
})();
