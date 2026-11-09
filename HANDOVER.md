# 鼠鼠的AI笔记 · 项目交接文档

> 用途：把当前会话的全部背景交给另一台设备上的 Agent。读这份文件即可接手，不需要重放对话。
> 最后更新：2026-11-09

## 一句话现状

个人主体的微信小程序，聚合公开 AI 平台的免费试用信息。代码、自动化数据链路、上传通道都已打通；**卡在备案 + 微信登录绑定**，绑定没做完之前投票只存本机。

## 关键标识

| 项 | 值 |
|---|---|
| 小程序名称 | 鼠鼠的AI笔记（备案中，个人主体） |
| AppID | `wx0dd88c155c0eb962` |
| 云服务应用 | `wbapp_r68wPNDXdc6LVrOths0ghs` |
| 云 API | `https://mp-api.app.workbuddy.host` |
| 当前版本 | 1.1.2（已上传微信开发版） |

**凭证**：小程序上传私钥在 `C:/Users/30309/WorkBuddy/AAA/_cache/private.wx0dd88c155c0eb962.key`，**不入库**。AppSecret 绝不写进任何文件、任何提交。

## 代码与仓库

```
本地工程   C:/Users/30309/WorkBuddy/AAA/token-arena
GitCode    https://gitcode.com/yiyiJason/everydaytokens.git        (origin)
GitHub     https://github.com/JasonChenccc/Mouse-mouse-hoard-hoard-hoard.git (github)
```

每次改动要同步三个地方：`git push origin main` + `git push github main` + 上传微信。GitHub 偶尔 502，重试即可。

## 数据链路（无人值守，已跑通）

```
每天 08:00 (UTC 0:00)  GitHub Actions daily-update
  → scripts/build-extra.py 抓 cyber-egg 清单
  → scripts/emit-json.js 校验并导出 data/offers.json
  → 有变化才 commit（权限 contents: write；push 用 origin HEAD:main）
  → 刷新 jsDelivr 缓存
小程序启动
  → ghproxy.net 实时读 GitHub raw（主）
  → fastly.jsdelivr.net（备，对 @main 有长缓存，可能落后一天）
  → 云端 offers 表（备）
  → 主包 54 条（最终兜底）
```

**注意**：jsDelivr 对 `@main` 的「分支→commit」解析层缓存 purge 清不掉，所以主源用 ghproxy。

Actions 运行结果可匿名查：
`https://api.github.com/repos/JasonChenccc/Mouse-mouse-hoard-hoard-hoard/actions/runs`

## 数据库

WorkBuddy 托管 Serverless BaaS（PostgreSQL + PostgREST + RLS），**没有自建后端、没有云函数**。

| 表 | 权限 |
|---|---|
| `offers` | 公开读，客户端不可写（历史 57 行，含 3 条已 ended） |
| `votes` / `favs` / `profiles` / `activity` | 仅 `owner_id = auth.uid()` 可读写 |

`owner_id` 由 `DEFAULT auth.uid()` 填充，客户端传不了。`vote_stats()` / `fav_stats(since_ts)` 是 `SECURITY DEFINER` 函数，只返回计数、不返回用户身份。

前端三层：`utils/cloud.js`（SDK 单例）→ `utils/cloud-data.js`（字段翻译）→ `utils/repo.js`（门面，页面只认它）。**读同步、写异步**，写等云端完成才 resolve。

## 已完成

- 砍掉番茄钟（含专注态 GIF），包体从 1108KB 降到 ~998KB
- 投票 / 最爱榜接全站聚合，30 秒轮询，有变化才重绘
- 投完票立即重拉聚合（修过"读到写入前旧票"的时序 bug）
- 最爱榜票数用「云端聚合 ∪ 本机记录」（修过空对象 truthy 导致恒为 0 的 bug）
- 天梯、最爱榜下拉刷新，15 秒节流
- 未登录不允许新投票 / 新投最爱；撤回不需要登录
- 登录失败改弹窗展示完整原因
- 详情页复制按钮文案写死（修过 `copyLabel` 字段不存在导致黑底无字）
- 名称统一为「鼠鼠的AI笔记」
- CI 上传链路：`scripts/upload.js`，一条命令完成 npm 构建 + 上传

## 当前阻塞（最重要）

**微信登录报「小程序未授权给 WorkBuddy」**，云端 `votes/favs/profiles/activity` 四张表全为 0，所有投票只存本机。

原因：认证页「微信 已开启」只是**开关**，不等于**绑定**。绑定发生在应用卡预览面板右上角「分享 / Share」的 trial/binding 流程里，必须本人点、本人扫码授权。

**验证方式**：绑定后点微信登录成功 → 投一票 → 查 `SELECT count(*) FROM votes`，有数字才是真通。

## 待办

1. 备案重新提交后接审核电话（上次因无人接听被驳两条）
2. 完成小程序绑定 → 验证登录与投票上云
3. 备案通过 → 版本管理提交审核 → 发布
4. 旧 WorkBuddy 定时任务还没关（现在和 GitHub Actions 双写，验完再关）
5. tabBar 图标在预览器里裂，真机正常；8 个 PNG 已验证完好（81×81 RGBA），属预览器问题，暂不动

## 红线与约束

- **包体 < 2MB**：`package-lock.json`（515KB）、`node_modules`、`scripts`、`.github`、`.git`、`data/offers.json` 都已排除
- **miniprogram-ci 在 devDependencies**，不能挪到 dependencies（否则 npm 构建会打出 20MB）
- **不改 `head`**，前端样式沿用现有体系
- **不动云端 Origin / applicationId**，换了应用 ID 云登录会直接废
- 微信 request 合法域名清单：`mp-api.app.workbuddy.host`、`gitcode.com`、`api.gitcode.com`、`fastly.jsdelivr.net`、`ghproxy.net`
- 名称/简介/备案备注一律**个人口吻**，禁止出现「用户/服务/交易/付费/积分/会员」

## 常用命令

```bash
cd C:/Users/30309/WorkBuddy/AAA/token-arena

# 上传新版本到微信开发版
node scripts/upload.js 1.1.3 "改了什么"

# 生成静态 JSON（本地校验用）
node scripts/emit-json.js

# 抓最新源数据
python scripts/build-extra.py

# 同步两端
git push origin main && git push github main
```

## 文件地图

| 文件 | 职责 |
|---|---|
| `utils/repo.js` | 数据门面，所有页面通过它读写 |
| `utils/cloud-data.js` | 云端字段翻译 + 双源 CDN 回退 |
| `utils/cloud.js` | SDK 单例、wx.login 换会话 |
| `scripts/upload.js` | CI 上传 |
| `scripts/emit-json.js` | 导出 JSON + 校验闸门 |
| `scripts/build-extra.py` | 抓取上游并清洗 |
| `.github/workflows/daily.yml` | 每日定时任务 |
| `project.config.json` | appid + 打包排除清单 |
| `data/offers.json` | CDN 数据源（不进包） |
