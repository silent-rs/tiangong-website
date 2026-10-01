// 天工官网交互：插件目录渲染、筛选搜索、进场动效与复制
(() => {
  const data = window.TIANGONG_PLUGINS;
  const PLATFORM = { macos: 'macOS', windows: 'Win', linux: 'Linux' };

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
  const observe = (root = document) => root.querySelectorAll('.reveal:not(.in)').forEach((el) => io.observe(el));
  observe();
  const stage = document.querySelector('.hero-stage');
  if (stage) requestAnimationFrame(() => setTimeout(() => stage.classList.add('in'), 200));

  // ── 插件目录 ────────────────────────────────
  const grid = document.querySelector('.plugin-grid');
  const chips = document.querySelector('.chips');
  const search = document.querySelector('.search input');
  const meta = document.querySelector('.catalog-meta');
  if (!grid || !data) {
    if (grid) grid.innerHTML = '<p class="empty">插件目录加载失败，请前往 GitHub 查看。</p>';
    return;
  }

  const counter = document.querySelector('[data-count="plugins"]');
  if (counter) counter.textContent = String(data.plugins.length);

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const categories = [{ id: 'all', name: '全部' }, ...data.categories];
  const countOf = (id) => (id === 'all' ? data.plugins.length : data.plugins.filter((p) => p.category === id).length);
  let active = 'all';

  chips.innerHTML = categories
    .filter((c) => countOf(c.id) > 0)
    .map(
      (c) =>
        `<button class="chip" role="tab" type="button" data-id="${c.id}" aria-selected="${c.id === active}">${esc(c.name)}<span class="n">${countOf(c.id)}</span></button>`,
    )
    .join('');

  chips.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    active = btn.dataset.id;
    chips.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    render();
  });
  search.addEventListener('input', render);

  function card(p, i) {
    const hot = p.featured === '首推';
    const plats = ['macos', 'windows', 'linux']
      .filter((k) => p.platforms.includes(k))
      .map((k) => {
        const note = p.platformNote?.[k];
        return `<i class="${note ? 'limited' : ''}" title="${esc(note ? `${PLATFORM[k]}：${note}` : PLATFORM[k])}">${PLATFORM[k]}${note ? '*' : ''}</i>`;
      })
      .join('');
    const initial = esc(p.name.replace(/^[A-Za-z]/, (c) => c.toUpperCase()).slice(0, 1));
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

  function render() {
    const q = search.value.trim().toLowerCase();
    const list = data.plugins.filter(
      (p) =>
        (active === 'all' || p.category === active) &&
        (!q || [p.id, p.name, p.summary, p.description].some((s) => String(s).toLowerCase().includes(q))),
    );
    grid.innerHTML = list.length ? list.map(card).join('') : '<p class="empty">没有匹配的插件</p>';
  }
  render();

  const when = new Date(data.generatedAt);
  meta.textContent = `数据来自官方插件目录 · 更新于 ${when.toLocaleDateString('zh-CN')} · * 表示该平台能力受限`;

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
})();
