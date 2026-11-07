#!/usr/bin/env python3
"""
抓取 cyber-egg 公开清单并转换成 data/offers-extra.js。

用法（在工程根目录执行）：
    python scripts/build-extra.py

输出：
    data/offers-extra.js   ← 自动生成，勿手改

如果只想看变化不写文件：
    python scripts/build-extra.py --dry
"""

import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timedelta, timezone

SRC = "https://raw.githubusercontent.com/maoyu92/cyber-egg/master/data/offers.json"

# GitHub raw 在部分网络下会被重置，依次回退到 jsDelivr / ghproxy 镜像（内容同源同分支）
MIRRORS = [
    "https://fastly.jsdelivr.net/gh/maoyu92/cyber-egg@master/data/offers.json",
    "https://gcore.jsdelivr.net/gh/maoyu92/cyber-egg@master/data/offers.json",
    "https://ghproxy.net/https://raw.githubusercontent.com/maoyu92/cyber-egg/master/data/offers.json",
]
OUT = os.path.join("data", "offers-extra.js")
OFFERS_JS = os.path.join("data", "offers.js")

# 这几家的条目已在天梯里手写过更详细版本，跳过避免重复
SKIP_PROVIDERS = {"LibTV", "OpenRouter"}

CN_VENDORS = ("阶跃", "云知声", "智谱", "阿里", "商汤", "小米", "蚂蚁", "腾讯",
              "月之暗面", "百川", "讯飞", "字节", "百度", "华为", "寒武纪")
FOREIGN_VENDORS = ("OpenRouter", "OpenAI", "Google", "Cloudflare", "Arena",
                   "LMArena", "OpenCode")


def gate_level(item):
    """按「用户实际要做哪几步」判等级，比看文案关键词准。"""
    steps = " ".join(item.get("how_to_get") or [])
    limits = item.get("limits") or ""
    if "实名" in steps or "实名" in limits:
        return 2
    if "会员" in steps or "购买" in steps or "付费" in steps:
        return 4
    if "申请" in steps or "创始人" in steps or "仅限" in steps or "仅限" in limits:
        return 3
    if "注册" in steps or "登录" in steps:
        return 1
    return 0


def domestic(provider):
    if any(k in provider for k in CN_VENDORS):
        return "direct"
    if any(k in provider for k in FOREIGN_VENDORS):
        return "proxy"
    return "unknown"


def delivery(category, provider):
    if "Arena" in provider:
        return "web"
    return {"api": "api", "app": "client", "relay": "api", "discount": "web"}.get(category, "web")


def clip(text, n, ellipsis="…"):
    text = text or ""
    return text if len(text) <= n else text[:n] + ellipsis


def convert(items):
    out = []
    for it in items:
        if it.get("provider") in SKIP_PROVIDERS:
            continue
        steps = it.get("how_to_get") or []
        gate = (steps[0] if steps else "") or (it.get("limits") or "详见官方页")
        models = it.get("models") or []
        scope = ("、".join(models[:6]) + ("…" if len(models) > 6 else "")) if models \
            else (it.get("summary") or "以官方为准")
        urls = it.get("urls") or {}
        out.append({
            "id": "ce-" + it["id"],
            "name": it["name"],
            "provider": it["provider"],
            "kind": "deal",
            "state": "live" if it.get("status") == "active" else "ended",
            "quota": clip(it.get("quota") or it.get("summary"), 120),
            "gate": clip(gate, 46),
            "gateLevel": gate_level(it),
            "term": ("截至 " + it["end"]) if it.get("end") else "官方未标注截止",
            "conf": "官方" if it.get("verified_at") else "转述",
            "paid": False,
            "copy": urls.get("official") or "",
            "copyLabel": "复制官方链接",
            "deliv": delivery(it.get("category"), it.get("provider") or ""),
            "domestic": domestic(it.get("provider") or ""),
            "scope": clip(scope, 70),
            "endDate": it.get("end"),
            "verifiedAt": it.get("verified_at"),
        })
    out.sort(key=lambda x: (x["state"] != "live", x["endDate"] or "9999-12-31"))
    return out


def render(rows):
    lines = [
        "// 由 cyber-egg 公开清单（data/offers.json）自动转换，勿手改。",
        "// 重新生成：python scripts/build-extra.py",
        "module.exports = [",
    ]
    for o in rows:
        lines.append("  " + json.dumps(o, ensure_ascii=False) + ",")
    lines.append("];")
    return "\n".join(lines) + "\n"


def fetch_payload():
    """先打主源，失败再走镜像，全部失败才报错。"""
    last = None
    for url in [SRC] + MIRRORS:
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                raw = r.read().decode("utf-8")
            data = json.loads(raw)
            if url != SRC:
                print("主源不可达，已改用镜像：" + url)
            return data
        except Exception as e:
            last = e
            print("抓取失败（%s）：%s" % (url.split("/")[2], e.__class__.__name__))
    raise SystemExit("全部数据源均不可用：%s" % last)


def main():
    dry = "--dry" in sys.argv
    payload = fetch_payload()
    items = payload if isinstance(payload, list) else \
        (payload.get("offers") or payload.get("data") or [])

    rows = convert(items)
    live = sum(1 for o in rows if o["state"] == "live")

    old_ids = set()
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as f:
            text = f.read()
        for line in text.splitlines():
            line = line.strip()
            if line.startswith("{") and line.endswith(","):
                try:
                    old_ids.add(json.loads(line[:-1])["id"])
                except Exception:
                    pass

    new_ids = {o["id"] for o in rows}
    added = new_ids - old_ids
    removed = old_ids - new_ids

    print("源条目 %d，转换后 %d（在架 %d，已结束 %d）" % (len(items), len(rows), live, len(rows) - live))
    if old_ids:
        print("新增 %d 条，消失 %d 条" % (len(added), len(removed)))
        for i in sorted(added)[:10]:
            print("  + " + i)
        for i in sorted(removed)[:10]:
            print("  - " + i)

    if dry:
        print("--dry：未写入文件")
        return

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(render(rows))
    print("已写入 " + OUT)

    # 同步更新时间戳：页面右上角显示的就是这个值，
    # 每次数据更新必须跟着走，否则用户会以为数据没刷新。
    stamp = datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%d %H:%M")
    src = open(OFFERS_JS, encoding="utf-8", newline="").read()
    new_src, n = re.subn(
        r"fetchedAt:\s*'[^']*'",
        "fetchedAt: '%s'" % stamp,
        src,
        count=1,
    )
    if n:
        open(OFFERS_JS, "w", encoding="utf-8", newline="").write(new_src)
        print("时间戳已同步为 %s（北京时间）" % stamp)
    else:
        print("警告：没找到 fetchedAt 字段，时间戳未同步")


if __name__ == "__main__":
    main()
