# 数据抓取与更新

这份文档记录**已经跑通过一次**的取数路径。照这个做，不用重新推导，能省掉大部分试错。

## 三个数据源

| 源 | 结构 | 稳定性 | 拿什么 |
|---|---|---|---|
| `https://raw.githubusercontent.com/maoyu92/cyber-egg/master/data/offers.json` | 纯 JSON | 高 | 32 条 AI 权益，字段齐全（额度、起止、门槛、官方链接、核实时间），**首选** |
| `https://openrouter.ai/api/v1/models` | 纯 JSON | 高 | 454 个模型，`pricing` 为 0 或 id 带 `:free` 的就是免费 |
| `https://saibodan.com/` | HTML | 低，改版即坏 | 每日新增活动；目前靠人工摘取，未做自动解析 |

**优先顺序：cyber-egg → OpenRouter → saibodan。** 前两个有 schema，能全自动；第三个只能人看。

## 已跑通的步骤

### 1. 刷新外部清单（cyber-egg）

```bash
cd token-arena
python scripts/build-extra.py --dry   # 先看变化，不写文件
python scripts/build-extra.py         # 确认后写入 data/offers-extra.js
```

脚本会打印「新增 N 条 / 消失 N 条」并列出 id，方便判断是不是上游改版了。

### 2. 刷新 OpenRouter 免费模型

```bash
curl -s --max-time 30 "https://openrouter.ai/api/v1/models" -o or_all.json
python - <<'PY'
import json
d = json.load(open('or_all.json', encoding='utf-8'))['data']
def z(v): return v in ('0', '0.0', '0.00', '0.0000')
free = [m for m in d if z(m.get('pricing', {}).get('prompt', '1'))
                      and z(m.get('pricing', {}).get('completion', '1'))]
print(len(free), '个零价模型')
for m in free:
    print(m['id'], m.get('context_length'))
PY
```

### 3. 人工看 saibodan

浏览器打开首页，看「今日更新」里的 新增 / 更新 / 结束，只把**这三类**记进 `data/offers.js` 的手写数组。这一层不自动化——它的信息是「本轮抓到的原文」，没有稳定结构，硬抓会错。

## 字段映射（cyber-egg → 本项目）

| cyber-egg | 本项目 | 说明 |
|---|---|---|
| `category: api` | `deliv: 'api'` | |
| `category: app` | `deliv: 'client'` | |
| `category: relay` | `deliv: 'api'` | 中转站也是走接口 |
| `category: discount` | `deliv: 'web'` | |
| `how_to_get[0]` | `gate` | 第一步就是用户最先遇到的坎 |
| `how_to_get` / `limits` 关键词 | `gateLevel` | 实名→2，会员/付费→4，申请/仅限→3，注册→1 |
| `end` | `endDate` | 日历靠这个字段画点 |
| `verified_at` | `conf` | 有核实时间记「官方」，否则「转述」 |
| `urls.official` | `copy` | 详情页的领取入口 |

## 踩过的坑

1. **只按 `:free` 过滤会漏 25%。** 零定价模型有 16 个，带 `:free` 后缀的只有 12 个——隐身模型和 Google 的音频模型没有后缀。必须按 `pricing` 判断。
2. **cyber-egg 里 LibTV / OpenRouter 两家和手写条目重复。** 脚本里用 `SKIP_PROVIDERS` 跳过，别重复收录。
3. **门槛分级不能只看文案关键词。** 「限时」「限免」里都有「限」字，按字面匹配会把免费活动误判成「要申请」。按 `how_to_get` 的实际步骤判。
4. **`end` 为 null 是常态**，不是数据缺失。OpenRouter 的「限时免费」官方从不写截止日，这类在日历上标不出来，如实显示「未标注」即可。

## 定时任务

已配置每天 08:00 跑一次 `scripts/build-extra.py`，输出变更摘要。它只改 `data/offers-extra.js`（自动生成的文件），不动手写的 `data/offers.js`。

回到预览需要重新走一次应用注册（工程目录没变的话直接点应用卡的分享即可）。
