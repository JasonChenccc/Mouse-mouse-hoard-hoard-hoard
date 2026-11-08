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

// 内容源走静态 JSON：每天由 GitCode 流水线更新，不需要发版。
// 拉不到就返回 ok:false，调用方继续往下一级回退。
//
// GitCode 没有匿名可读的 raw 地址（/raw/ 返回的是网页），
// 但 contents API 可以匿名读，代价是内容被 base64 包了一层，需要解码。
// 若以后改走 jsDelivr，把 SOURCE 换成 kind:'raw' 即可，取数逻辑不用动。
const b64 = require('./b64.js');

const SOURCE = {
  kind: 'gitcode-api',
  url: 'https://api.gitcode.com/api/v5/repos/yiyiJason/everydaytokens/contents/data/offers.json?ref=main'
};

function parseBody(body) {
  if (!body) return null;
  // contents API：{ encoding: 'base64', content: '...' }
  if (SOURCE.kind === 'gitcode-api') {
    if (body.encoding === 'base64' && typeof body.content === 'string') {
      const text = b64.b64ToUtf8(body.content.replace(/\s/g, ''));
      if (!text) return null;
      try { return JSON.parse(text); } catch (e) { return null; }
    }
    return null;
  }
  // 直出 JSON 的源（jsDelivr / 自建）
  return typeof body === 'string' ? JSON.parse(body) : body;
}

function pullOffersFromCdn() {
  return new Promise(function (resolve) {
    if (typeof wx === 'undefined' || typeof wx.request !== 'function') {
      resolve({ ok: false, message: '非小程序环境' });
      return;
    }
    // 按天带版本号，避免 CDN 整天返回同一份旧缓存
    const d = new Date();
    const v = '' + d.getFullYear() + (d.getMonth() + 1) + d.getDate();
    wx.request({
      url: SOURCE.url + '&v=' + v,
      method: 'GET',
      timeout: 8000,
      header: { Accept: 'application/json' },
      success: function (res) {
        if (res.statusCode !== 200) {
          resolve({ ok: false, message: 'CDN HTTP ' + res.statusCode });
          return;
        }
        let body = null;
        try {
          body = parseBody(res.data);
        } catch (e) {
          body = null;
        }
        if (!body || !Array.isArray(body.offers) || !body.offers.length) {
          resolve({ ok: false, message: 'CDN 数据无效' });
          return;
        }
        resolve({ ok: true, data: body });
      },
      fail: function (e) {
        resolve({ ok: false, message: (e && e.errMsg) || 'CDN 不可达' });
      }
    });
  });
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
