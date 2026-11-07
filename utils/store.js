const KEY = 'egg_ladder_votes_v1';
const FAV_KEY = 'egg_fav_v1';
const FONT_KEY = 'egg_font_v1';
const ID_KEY = 'egg_myid_v1';
const HISTORY_KEY = 'egg_history_v1';

// 我的 ID：只存一个名字，不碰头像
function getMyId() {
  try {
    return wx.getStorageSync(ID_KEY) || '';
  } catch (e) {
    return '';
  }
}

function setMyId(v) {
  try {
    wx.setStorageSync(ID_KEY, (v || '').trim());
  } catch (e) {
    // ignore
  }
}

// 影响记录：每次评级 / 投最爱都留一条，供「我的影响」回看
function getHistory() {
  try {
    const h = wx.getStorageSync(HISTORY_KEY);
    return Array.isArray(h) ? h : [];
  } catch (e) {
    return [];
  }
}

function addHistory(row) {
  const h = getHistory();
  h.unshift({
    type: row.type,
    id: row.id,
    name: row.name,
    value: row.value,
    ts: Date.now()
  });
  // 只留最近 200 条，避免本机缓存无限增长
  const cut = h.slice(0, 200);
  try {
    wx.setStorageSync(HISTORY_KEY, cut);
  } catch (e) {
    // ignore
  }
}

function clearHistory() {
  try {
    wx.removeStorageSync(HISTORY_KEY);
  } catch (e) {
    // ignore
  }
}

function setHistory(h) {
  try {
    wx.setStorageSync(HISTORY_KEY, Array.isArray(h) ? h : []);
  } catch (e) {
    // ignore
  }
}

function getFont() {
  try {
    const v = wx.getStorageSync(FONT_KEY);
    return v === 'fs-s' || v === 'fs-l' ? v : '';
  } catch (e) {
    return '';
  }
}

function setFont(v) {
  try {
    wx.setStorageSync(FONT_KEY, v || '');
  } catch (e) {
    // ignore
  }
}

// 旧版是三档 [中,大,超大]，新版四档 [臭小,中,大,超大]。
// 读取时就地迁移，避免已有投票丢失。
function migrate(rec) {
  if (!rec || !rec.c) return null;
  if (rec.c.length === 4) return rec;
  if (rec.c.length === 3) {
    return {
      c: [0, rec.c[0], rec.c[1], rec.c[2]],
      mine: typeof rec.mine === 'number' && rec.mine >= 0 ? rec.mine + 1 : -1
    };
  }
  return null;
}

function getVotes() {
  let raw = {};
  try {
    raw = wx.getStorageSync(KEY) || {};
  } catch (e) {
    raw = {};
  }
  const out = {};
  Object.keys(raw).forEach(function (id) {
    const rec = migrate(raw[id]);
    if (rec) out[id] = rec;
  });
  return out;
}

function setVotes(votes) {
  try {
    wx.setStorageSync(KEY, votes);
  } catch (e) {
    // 写失败不阻断交互
  }
}

// 最爱榜：记录每一票的模型与时间，周榜/月榜按时间窗口统计。
// 一个人对同一个模型只计一次，再点一次是撤回。
function getFav() {
  let raw = null;
  try {
    raw = wx.getStorageSync(FAV_KEY);
  } catch (e) {
    raw = null;
  }
  if (raw && Array.isArray(raw.log)) {
    return { log: raw.log };
  }
  // 旧格式 {pick, counts} → 迁移成一条记录
  if (raw && raw.pick) {
    return { log: [{ id: raw.pick, ts: Date.now() }] };
  }
  return { log: [] };
}

function setFav(fav) {
  try {
    wx.setStorageSync(FAV_KEY, fav);
  } catch (e) {
    // ignore
  }
}

function hasVoted(id) {
  return getFav().log.some(function (r) { return r.id === id; });
}

function clearVotes() {
  try {
    wx.removeStorageSync(KEY);
    wx.removeStorageSync(FAV_KEY);
  } catch (e) {
    // ignore
  }
}

module.exports = {
  KEY, FAV_KEY, FONT_KEY, ID_KEY, HISTORY_KEY,
  getVotes, setVotes, getFav, setFav, hasVoted,
  getFont, setFont, getMyId, setMyId,
  getHistory, addHistory, setHistory, clearHistory,
  clearVotes
};
