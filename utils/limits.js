// 操作频率限制 · 阈值与本地计数。
//
// 分工：
//   - 本文件只放「阈值常量 + 纯本地计数」，零云依赖，浏览链路不碰它。
//   - 软阈值（SOFT_LIMIT）：本机 storage 记当月投票+收藏次数，达到就禁用按钮并提示。
//   - 硬阈值（HARD_LIMIT）：在 repo.js 写入口用 activity 表按 owner_id 当月行数校验，
//     仅登录用户生效（未登录写不了云，本地软计数已够用）。
//
// ⚠️ 硬阈值只是「客户端校验，不是服务端强制」：懂技术的人绕过小程序直接调
//    workbuddy 云 API 就能绕过本检查。真正的服务端硬限制需要 SECURITY DEFINER
//    函数或数据库触发器，属于「改云端」，本次不做（按红线需另行确认）。
//    不要把它描述成不可绕过的服务端限制。
//
// 口径：与 activity 表一致——投票 / 改票 / 收藏 / 撤回都算一次；清空本机不算
//      （clearVotes/clearFav 只清本地、不写 activity）。跨月自动归零。

const SOFT_LIMIT = 30;
const HARD_LIMIT = 50;
const KEY = 'egg_limit_v1'; // { month: 'YYYY-MM', count: n, ts: 最近一次时间 }

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function monthKey(d) {
  const x = d || new Date();
  return x.getFullYear() + '-' + pad(x.getMonth() + 1);
}

// 当月 1 号 00:00 的毫秒时间戳，给云端 activity 按月过滤用
function monthStartMs(d) {
  const x = d || new Date();
  return new Date(x.getFullYear(), x.getMonth(), 1, 0, 0, 0, 0).getTime();
}

function read() {
  const now = new Date();
  const mk = monthKey(now);
  let raw = null;
  try {
    raw = wx.getStorageSync(KEY);
  } catch (e) {
    raw = null;
  }
  // 跨月（或字段异常）→ 视为新月份，计数从 0 起
  if (!raw || raw.month !== mk || typeof raw.count !== 'number' || raw.count < 0) {
    return { month: mk, count: 0, ts: 0 };
  }
  return { month: mk, count: raw.count, ts: raw.ts || 0 };
}

function localCount() {
  return read().count;
}

function softReached() {
  return localCount() >= SOFT_LIMIT;
}

// 记一次写操作。返回记完之后的当月次数。
function bumpLocal() {
  const r = read();
  r.count += 1;
  r.ts = Date.now();
  try {
    wx.setStorageSync(KEY, r);
  } catch (e) {
    // 写失败不阻断交互：最多是软计数没记住，云端硬阈值仍兜底
  }
  return r.count;
}

// 供页面判断是否把投票/收藏按钮置灰。只读、零副作用。
function limitState() {
  return { reached: softReached(), count: localCount(), soft: SOFT_LIMIT };
}

const SOFT_MSG = '本月操作已达上限，下月 1 号恢复';
const HARD_MSG = '本月操作已达上限，下月 1 号恢复';

module.exports = {
  SOFT_LIMIT: SOFT_LIMIT,
  HARD_LIMIT: HARD_LIMIT,
  KEY: KEY,
  monthKey: monthKey,
  monthStartMs: monthStartMs,
  localCount: localCount,
  softReached: softReached,
  bumpLocal: bumpLocal,
  limitState: limitState,
  SOFT_MSG: SOFT_MSG,
  HARD_MSG: HARD_MSG
};
