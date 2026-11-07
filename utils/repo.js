// 数据层统一入口。页面只认这一层，不直接碰 data/*.js 和 wx storage。
//
// 接口约定：读同步、写异步。
// 读（offers / popular / votes / history）必须能同步拿到，页面才能在 onShow 里直接算；
// 写（castVote / toggleFav ...）返回 Promise，本地先落地、云端在后台补同步，
// 失败也不回滚本地，避免没网就不能用。
//
// 现在只有 local 实现。接上云服务后新增 cloud 实现，保持同一组签名，
// 切换只改本文件底部的 active 指向，页面一行不用动。

const DATA = require('../data/offers.js');
const POPULAR = require('../data/popular.js');
const store = require('./store.js');

// 内存缓存：云端拉到新数据时整体替换，页面下次 refresh 即可见
const mem = {
  offers: DATA.offers,
  popular: POPULAR,
  fetchedAt: DATA.fetchedAt,
  sources: DATA.sources
};

// 云端票数聚合：{ offerId: [c0,c1,c2,c3] }。为 null 时全部按本机票算。
let aggregates = null;

// ---------- 读 ----------

function offers() {
  return mem.offers;
}

function popular() {
  return mem.popular;
}

function fetchedAt() {
  return mem.fetchedAt;
}

function sources() {
  return mem.sources;
}

function offerById(id) {
  return mem.offers.filter(function (o) { return o.id === id; })[0] || null;
}

function popularById(id) {
  return mem.popular.filter(function (m) { return m.id === id; })[0] || null;
}

// 任意 id 都尽量还原成可读名字，找不到就退回 id 本身
function nameOf(id) {
  const o = offerById(id);
  if (o) return o.name;
  const m = popularById(id);
  if (m) return m.name;
  return id;
}

// ---------- 写：评级 ----------

// 第 0 档不是「最差评价」，而是纠错标记：指这条信息本身有问题（额度/期限/门槛不符）
const TIER_NAMES = ['小杯作者', '中杯', '大杯', '超大杯'];
// 档位 key 的顺序就是票数数组的顺序，两者必须同源，改档位只能改这两行
const TIER_KEYS = ['spit', 'mid', 'big', 'xl'];

// 票数数组的长度由档位数决定，不要在页面里写死 [0,0,0,0]
function emptyCounts() {
  return TIER_KEYS.map(function () { return 0; });
}

// 旧数据结构里长度不对的票数数组，补齐或截断到当前档位数
function normalizeCounts(c) {
  const base = emptyCounts();
  if (!Array.isArray(c)) return base;
  for (let i = 0; i < base.length; i++) {
    base[i] = typeof c[i] === 'number' ? c[i] : 0;
  }
  return base;
}

// 一人一条，改票时把旧票退掉。这条不变式放在数据层，
// 以后云端同步时两端用的是同一套规则，不会各算各的。
function castVote(id, idx) {
  const votes = store.getVotes();
  const cur = votes[id] || { c: emptyCounts(), mine: -1 };
  const c = normalizeCounts(cur.c);
  if (cur.mine >= 0 && c[cur.mine] > 0) c[cur.mine] -= 1;
  c[idx] += 1;
  votes[id] = { c: c, mine: idx };
  store.setVotes(votes);

  // 乐观更新聚合，让天梯在下次拉取前就反映这一票
  if (aggregates) {
    if (!aggregates[id]) aggregates[id] = emptyCounts();
    const agg = aggregates[id];
    if (cur.mine >= 0 && agg[cur.mine] > 0) agg[cur.mine] -= 1;
    if (idx >= 0 && idx < agg.length) agg[idx] += 1;
  }

  const offer = offerById(id);
  const payload = {
    type: 'tier',
    id: id,
    name: offer ? offer.name : id,
    value: TIER_NAMES[idx] || ''
  };
  store.addHistory(payload);
  // 本地已生效；登录状态下顺手推云端，失败不影响本地
  pushQuietly(cloudData.pushVote(id, idx).then(function () {
    return cloudData.pushActivity(payload);
  }));

  return Promise.resolve(votes);
}

function getVotes() {
  const local = store.getVotes();
  if (!aggregates) return local;
  // 有云端聚合就以聚合为准（含所有人），「我投了哪档」仍取本机
  const out = {};
  Object.keys(local).forEach(function (id) {
    out[id] = { c: aggregates[id] || local[id].c, mine: local[id].mine };
  });
  Object.keys(aggregates).forEach(function (id) {
    if (!out[id]) out[id] = { c: aggregates[id], mine: -1 };
  });
  return out;
}

function clearVotes() {
  store.clearVotes();
  return Promise.resolve();
}

// ---------- 写：最爱榜 ----------

function getFavLog() {
  return store.getFav().log;
}

function hasFav(id) {
  return getFavLog().some(function (r) { return r.id === id; });
}

// 再点一次是撤回，和原来的交互一致
function toggleFav(id, name) {
  const log = getFavLog().slice();
  const i = log.findIndex(function (r) { return r.id === id; });

  if (i >= 0) {
    log.splice(i, 1);
    store.setFav({ log: log });
    const undo = { type: 'fav', id: id, name: name || nameOf(id), value: '撤回' };
    store.addHistory(undo);
    pushQuietly(cloudData.removeFav(id).then(function () {
      return cloudData.pushActivity(undo);
    }));
    return Promise.resolve({ voted: false });
  }

  log.push({ id: id, ts: Date.now() });
  store.setFav({ log: log });
  const vote = { type: 'fav', id: id, name: name || nameOf(id), value: '投一票' };
  store.addHistory(vote);
  pushQuietly(cloudData.pushFav(id).then(function () {
    return cloudData.pushActivity(vote);
  }));
  return Promise.resolve({ voted: true });
}

function clearFav() {
  store.setFav({ log: [] });
  return Promise.resolve();
}

// ---------- 影响记录 ----------

function getHistory() {
  return store.getHistory();
}

function setHistory(rows) {
  store.setHistory(rows);
}

function addHistory(row) {
  store.addHistory(row);
}

function clearHistory() {
  store.clearHistory();
}

// ---------- 本机设置 ----------

function getMyId() {
  return store.getMyId();
}

function setMyId(v) {
  store.setMyId(v);
  pushQuietly(cloudData.pushProfile((v || '').trim()));
}

function getFont() {
  return store.getFont();
}

function setFont(v) {
  store.setFont(v);
}

// ---------- 云端接入点 ----------

const cloud = require('./cloud.js');
const cloudData = require('./cloud-data.js');

let online = false;

function isOnline() {
  return online;
}

// 云端拉到新数据后调用：整体替换缓存。
// 页面不需要知道数据从哪来，下次 onShow 调 offers() 就是新的。
function replaceData(next) {
  if (next && Array.isArray(next.offers) && next.offers.length) {
    mem.offers = next.offers;
  }
  if (next && Array.isArray(next.popular) && next.popular.length) {
    mem.popular = next.popular;
  }
  if (next && next.fetchedAt) mem.fetchedAt = next.fetchedAt;
  if (next && next.sources) mem.sources = next.sources;
}

// 拉一次全站票数聚合。失败就保持 null，天梯退回本机票。
function refreshAggregates() {
  return cloudData.pullVoteStats().then(function (r) {
    if (!r.ok) return false;
    const map = {};
    r.data.forEach(function (row) {
      const id = row.offer_id;
      if (!map[id]) map[id] = emptyCounts();
      const t = Number(row.tier);
      if (t >= 0 && t < map[id].length) map[id][t] = Number(row.cnt) || 0;
    });
    aggregates = map;
    return true;
  }).catch(function () {
    return false;
  });
}

// 启动时拉一次云端条目。失败就继续用主包里的 54 条，不抛异常。
function bootstrap() {
  return cloudData.pullOffers().then(function (r) {
    if (!r.ok) return { ok: false, message: r.message };
    replaceData({ offers: r.data });
    return { ok: true, count: r.data.length };
  }).catch(function (e) {
    return { ok: false, message: e && e.message };
  });
}

// 登录后：先把本地已有的票推上去（避免被云端覆盖掉），再拉云端合并
function syncAfterLogin() {
  const votes = store.getVotes();
  const favs = store.getFav().log;
  const jobs = [];

  Object.keys(votes).forEach(function (id) {
    const rec = votes[id];
    if (rec && rec.mine >= 0) jobs.push(cloudData.pushVote(id, rec.mine));
  });
  favs.forEach(function (f) {
    jobs.push(cloudData.pushFav(f.id));
  });

  return Promise.all(jobs).then(function () {
    online = true;
    return cloudData.pullVotes();
  }).then(function (r) {
    if (r && r.ok && r.data.length) {
      const next = {};
      r.data.forEach(function (row) {
        const c = emptyCounts();
        c[row.tier] = 1;
        next[row.offer_id] = { c: c, mine: row.tier };
      });
      store.setVotes(next);
    }
    return { ok: true };
  }).catch(function () {
    online = false;
    return { ok: false };
  });
}

// 恢复登录状态（不弹登录框）
function restoreSession() {
  return cloud.session().then(function (s) {
    online = !!s;
    return online;
  }).catch(function () {
    online = false;
    return false;
  });
}

// 主动登录
function login() {
  return cloud.signIn().then(function (r) {
    if (!r.ok) return r;
    return syncAfterLogin().then(function () {
      return { ok: true };
    });
  });
}

// 写云端时不阻塞本地：失败只记录，不回滚
function pushQuietly(promise) {
  if (!online) return;
  try {
    promise.catch(function () {});
  } catch (e) {
    // ignore
  }
}


module.exports = {
  offers: offers,
  popular: popular,
  fetchedAt: fetchedAt,
  sources: sources,
  offerById: offerById,
  popularById: popularById,
  nameOf: nameOf,

  getVotes: getVotes,
  castVote: castVote,
  clearVotes: clearVotes,

  getFavLog: getFavLog,
  hasFav: hasFav,
  toggleFav: toggleFav,
  clearFav: clearFav,

  getHistory: getHistory,
  setHistory: setHistory,
  addHistory: addHistory,
  clearHistory: clearHistory,

  getMyId: getMyId,
  setMyId: setMyId,
  getFont: getFont,
  setFont: setFont,

  replaceData: replaceData,
  bootstrap: bootstrap,
  refreshAggregates: refreshAggregates,
  login: login,
  restoreSession: restoreSession,
  isOnline: isOnline,
  TIER_NAMES: TIER_NAMES,
  TIER_KEYS: TIER_KEYS,
  emptyCounts: emptyCounts,
  normalizeCounts: normalizeCounts
};
