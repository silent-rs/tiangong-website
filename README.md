# 天工官网

天工（Tiangong）的宣传站点，纯静态页面，由 GitHub Pages 托管，不依赖构建工具和外部字体。

## 目录

```text
index.html                 页面
assets/style.css           样式
assets/main.js             交互：插件目录渲染、筛选搜索、进场动效
assets/plugins.js          插件目录快照（脚本生成，勿手改）
assets/img/                界面截图
assets/video/              Computer Use 演示录屏（macOS 系统录屏，2 倍速）
plugins.json               插件目录快照（JSON 形式，便于外部引用）
scripts/build-plugins.mjs  从官方插件目录生成快照
scripts/plugin-meta.json   插件分类、排序、推荐标记与展示文案
.github/workflows/pages.yml  部署到 GitHub Pages，并每天刷新一次插件目录
```

## 插件目录

官方插件目录（OSS 上的 `plugins-index/catalog.json`）没有开放 CORS，页面无法在浏览器中直接拉取，
因此在部署时由 `scripts/build-plugins.mjs` 生成静态快照。新增官方插件后：

1. 在 `scripts/plugin-meta.json` 补充分类与展示文案（不补也能显示，使用目录原始描述）；
2. 下线的插件标记 `"deprecated": true`，页面不再展示。

## 本地预览

```bash
node scripts/build-plugins.mjs   # 刷新插件目录（需要 Node 18+）
python3 -m http.server 4173      # 打开 http://localhost:4173
```

直接双击 `index.html` 也能预览。

## 部署

在仓库 Settings → Pages 中把 Source 设为 **GitHub Actions**，推送到 `main` 后自动部署。
