// 云端读写。只做「翻译」和「报告成败」，不在这里做业务判断。
// 所有函数返回 { ok, data?, message? }，调用方决定失败时怎么降级。
const cloud = require('./cloud.js');

// 数据库是 snake_case，页面要 camelCase，转换只在这一处做
function toOffer(r) {
  return {
    id: r.id,
    name: r.name,
    provider: r.provider,
    kind: r.kind,
    state: r.state,
    quota: r.quota,
    gate: r.gate,
    gateLevel: typeof r.gate_level === 'number' ? r.gate_level : 0,
    term: r.term,
    conf: r.conf,
    paid: !!r.paid,
    copy: r.copy_url || '',
    deliv: r.deliv,
    domestic: r.domestic,
    scope: r.scope,
    endDate: r.end_date || null
  };
}

function fail(e, where) {
  return { ok: false, message: (e && e.message) || (where + ' 失败') };
}

// 条目是公开只读的，不登录也能拉
async function pullOffers() {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { data, error } = await c.database
      .from('offers')
      .select('*')
      .order('state', { ascending: true })
      .limit(500);
    if (error) return fail(error, '拉取条目');
    const rows = (data || []).map(toOffer);
    if (!rows.length) return { ok: false, message: '云端还没有条目' };
    return { ok: true, data: rows };
  } catch (e) {
    return fail(e, '拉取条目');
  }
}

// 一人一票：唯一约束 (owner_id, offer_id)，这里用 upsert 让改票覆盖旧值
async function pushVote(offerId, tier) {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { error } = await c.database
      .from('votes')
      .upsert({ offer_id: offerId, tier: tier }, { onConflict: 'owner_id,offer_id' });
    if (error) return fail(error, '保存评级');
    return { ok: true };
  } catch (e) {
    return fail(e, '保存评级');
  }
}

async function pullVotes() {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { data, error } = await c.database.from('votes').select('offer_id, tier');
    if (error) return fail(error, '拉取我的评级');
    return { ok: true, data: data || [] };
  } catch (e) {
    return fail(e, '拉取我的评级');
  }
}

async function pushFav(modelId) {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { error } = await c.database
      .from('favs')
      .upsert({ model_id: modelId }, { onConflict: 'owner_id,model_id' });
    if (error) return fail(error, '保存最爱票');
    return { ok: true };
  } catch (e) {
    return fail(e, '保存最爱票');
  }
}

async function removeFav(modelId) {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { error } = await c.database.from('favs').delete().eq('model_id', modelId);
    if (error) return fail(error, '撤回最爱票');
    return { ok: true };
  } catch (e) {
    return fail(e, '撤回最爱票');
  }
}

async function pullFavs() {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { data, error } = await c.database.from('favs').select('model_id, created_at');
    if (error) return fail(error, '拉取我的最爱票');
    return { ok: true, data: data || [] };
  } catch (e) {
    return fail(e, '拉取我的最爱票');
  }
}

async function pushProfile(displayName) {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { error } = await c.database
      .from('profiles')
      .upsert({ display_name: displayName }, { onConflict: 'owner_id' });
    if (error) return fail(error, '保存 ID');
    return { ok: true };
  } catch (e) {
    return fail(e, '保存 ID');
  }
}

async function pullProfile() {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { data, error } = await c.database
      .from('profiles')
      .select('display_name')
      .maybeSingle();
    if (error) return fail(error, '拉取 ID');
    return { ok: true, data: data || null };
  } catch (e) {
    return fail(e, '拉取 ID');
  }
}

async function pushActivity(row) {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { error } = await c.database.from('activity').insert({
      kind: row.type,
      target_id: row.id,
      target_name: row.name,
      value: row.value
    });
    if (error) return fail(error, '记录影响');
    return { ok: true };
  } catch (e) {
    return fail(e, '记录影响');
  }
}

async function pullActivity() {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { data, error } = await c.database
      .from('activity')
      .select('kind, target_id, target_name, value, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) return fail(error, '拉取影响记录');
    return { ok: true, data: data || [] };
  } catch (e) {
    return fail(e, '拉取影响记录');
  }
}

// 内容源：优先 ghproxy（实时回源，能立刻拿到最新 commit），
// jsDelivr 兜底（快，但对 @main 有长缓存，可能落后一天）。
const SOURCES = [
  'https://ghproxy.net/https://raw.githubusercontent.com/JasonChenccc/Mouse-mouse-hoard-hoard-hoard/main/data/offers.json',
  'https://fastly.jsdelivr.net/gh/JasonChenccc/Mouse-mouse-hoard-hoard-hoard@main/data/offers.json'
];

function parseBody(body) {
  if (!body) return null;
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch (e) { return null; }
  }
  return body;
}

function fetchOne(url) {
  return new Promise(function (resolve) {
    wx.request({
      url: url,
      method: 'GET',
      timeout: 8000,
      header: { Accept: 'application/json' },
      success: function (res) {
        const d = parseBody(res.data);
        if (res.statusCode !== 200 || !d || !Array.isArray(d.offers) || !d.offers.length) {
          resolve({ ok: false });
          return;
        }
        resolve({ ok: true, data: d });
      },
      fail: function () {
        resolve({ ok: false });
      }
    });
  });
}

// 依次试每个源，第一个拿到的就用
function pullOffersFromCdn() {
  if (typeof wx === 'undefined' || typeof wx.request !== 'function') {
    return Promise.resolve({ ok: false, message: '非小程序环境' });
  }
  let i = 0;
  function next() {
    if (i >= SOURCES.length) return Promise.resolve({ ok: false, message: '所有内容源不可用' });
    return fetchOne(SOURCES[i++]).then(function (r) {
      return r.ok ? r : next();
    });
  }
  return next();
}

// 跨用户票数聚合。votes 表本身只让读自己的，这里走 SECURITY DEFINER 函数，
// 只返回「某条目某档几票」，不带任何人的 openid。
async function pullVoteStats() {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const { data, error } = await c.database.rpc('vote_stats');
    if (error) return fail(error, '拉取票数统计');
    return { ok: true, data: data || [] };
  } catch (e) {
    return fail(e, '拉取票数统计');
  }
}

// 最爱榜的全站票数。同样走 SECURITY DEFINER，只给计数不给用户。
// sinceTs 传周/月的起始时间，传空则统计全部。
async function pullFavStats(sinceTs) {
  const c = cloud.get();
  if (!c) return { ok: false, message: '云服务未就绪' };
  try {
    const args = sinceTs ? { since_ts: new Date(sinceTs).toISOString() } : { since_ts: '1970-01-01T00:00:00Z' };
    const { data, error } = await c.database.rpc('fav_stats', args);
    if (error) return fail(error, '拉取最爱票统计');
    return { ok: true, data: data || [] };
  } catch (e) {
    return fail(e, '拉取最爱票统计');
  }
}

module.exports = {
  pullOffers: pullOffers,
  pullOffersFromCdn: pullOffersFromCdn,
  pullVoteStats: pullVoteStats,
  pullFavStats: pullFavStats,
  pushVote: pushVote,
  pullVotes: pullVotes,
  pushFav: pushFav,
  removeFav: removeFav,
  pullFavs: pullFavs,
  pushProfile: pushProfile,
  pullProfile: pullProfile,
  pushActivity: pushActivity,
  pullActivity: pullActivity
};
