# 天工官网

天工（Tiangong）的宣传站点，纯静态页面，由 GitHub Pages 托管，不依赖构建工具和外部字体。

## 目录

```text
index.html                 页面
assets/style.css           样式
assets/main.js             交互：插件目录渲染（实时拉取 + 快照回退）、筛选搜索、进场动效
assets/catalog.js          插件目录转换逻辑（浏览器与构建脚本共用）
assets/plugins.js          插件目录快照与展示元数据（脚本生成，勿手改）
assets/img/                界面截图
assets/video/              Computer Use 演示录屏（macOS 系统录屏，2 倍速）
plugins.json               插件目录快照（JSON 形式，便于外部引用）
scripts/build-plugins.mjs  从官方插件目录生成快照
scripts/plugin-meta.json   插件分类、排序、推荐标记与展示文案
.github/workflows/pages.yml  部署到 GitHub Pages，并每天刷新一次插件目录
```

## 插件目录

页面在浏览器中**实时读取**官方插件目录（OSS `plugins-index/catalog.json`，已对 `https://silent-rs.github.io` 开放 CORS）：

1. 先用部署时生成的快照（`assets/plugins.js`）立即渲染，避免白屏；
2. 后台拉取 OSS 目录（8 秒超时），成功后替换为最新数据，页面底部显示「实时数据来自官方插件目录」；
3. 拉取失败（网络、CORS、格式异常）时保持快照，并显示快照日期。

转换逻辑在 `assets/catalog.js`，浏览器与 `scripts/build-plugins.mjs` 共用，实时与快照的展示结果一致。

新增官方插件后：

1. 在 `scripts/plugin-meta.json` 补充分类与展示文案（不补也能显示，使用目录原始描述）；
2. 下线的插件标记 `"deprecated": true`，页面不再展示。

修改 `plugin-meta.json` 后需要重新部署，浏览器端使用的是随快照一起发布的元数据。

> 本地预览的来源（如 `http://localhost:4173`）不在 OSS 跨域白名单内，实时拉取会被浏览器拦截，页面会显示快照数据，属于预期行为。

## 本地预览

```bash
node scripts/build-plugins.mjs   # 刷新插件目录（需要 Node 18+）
python3 -m http.server 4173      # 打开 http://localhost:4173
```

直接双击 `index.html` 也能预览。

## 部署

在仓库 Settings → Pages 中把 Source 设为 **GitHub Actions**，推送到 `main` 后自动部署。
