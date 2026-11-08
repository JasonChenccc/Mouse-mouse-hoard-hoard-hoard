const MASCOT = require('../../data/mascot.js');
const repo = require('../../utils/repo.js');
const labels = require('../../utils/labels.js');
const clock = require('../../utils/clock.js');

// 搜索别名：让「讯飞」「spark」「gemini」这类叫法都能命中
const ALIAS = {
  xfyun: '讯飞 iflytek spark 星火 星辰 xingchen maas 10亿',
  coze: '扣子 coze 字节 积分',
  videogen: 'videogen 视频 credits',
  modian: '墨点 书生 sage shlab 公测',
  base44: 'base44 建站 创业',
  libtv: 'libtv liblib 哩布 视频 双十一',
  kuku: '库库 kuku 百度 积分',
  'zcode-comp': 'zcode 智谱 zhipu glm 补偿',
  'zcode-weekend': 'zcode 智谱 zhipu glm'
};

// 档位表、门槛文案、可信度样式统一从 labels 取，页面不再各写一份
const TIERS = labels.TIERS;
const GATE_LABEL = labels.GATE;
const CONF_CLS = labels.CONF_CLS;
const DELIV_TEXT = labels.DELIV_TEXT;
const TIER_N = repo.TIER_KEYS.length;

// votes: { id: { c:[spit,mid,big,xl], mine:0-3 } }
function statOf(votes, id) {
  const rec = votes[id];
  const v = rec && rec.c ? repo.normalizeCounts(rec.c) : repo.emptyCounts();
  let n = 0;
  for (let i = 0; i < TIER_N; i++) n += v[i];
  if (!n) {
    return { n: 0, mode: -1, ratio: 0, contested: false, score: 0, v: v };
  }
  let best = 0;
  for (let i = 1; i < TIER_N; i++) {
    if (v[i] > v[best]) best = i;
  }
  const ratio = v[best] / n;
  let sum = 0;
  for (let i = 0; i < TIER_N; i++) sum += v[i] * (i + 1);
  return {
    n: n,
    mode: best,
    ratio: ratio,
    // 超过一半才算定档，否则标为「分歧」，不硬塞进任何一档
    contested: ratio <= 0.5,
    score: sum / n,
    v: v
  };
}

// 幻神：超大杯里占比最高且过半，独占；并列则空置
function pickGod(votes) {
  const cands = [];
  repo.offers().forEach(function (o) {
    if (o.state !== 'live' || o.paid) return;
    const s = statOf(votes, o.id);
    if (s.n > 0 && s.mode === 3 && s.ratio > 0.5) cands.push({ o: o, s: s });
  });
  if (!cands.length) return null;
  cands.sort(function (a, b) {
    return b.s.ratio - a.s.ratio || b.s.score - a.s.score || b.s.n - a.s.n;
  });
  if (cands.length > 1) {
    const a = cands[0].s;
    const b = cands[1].s;
    if (Math.abs(a.ratio - b.ratio) < 1e-9 && Math.abs(a.score - b.score) < 1e-9 && a.n === b.n) {
      return null;
    }
  }
  return cands[0];
}

Page({
  data: {
    fetchedAt: repo.fetchedAt(),
    refreshClock: '',
    freshness: '',
    sources: repo.sources(),
    mascot: MASCOT.empty,
    fontClass: '',
    query: '',
    resultCount: 0,
    hint: '',
    tierFilter: 'all',
    delivFilter: 'all',
    god: null,
    list: [],
    stats: { deal: 0, model: 0, ended: 0, rated: 0, total: 0 },
    rules: labels.RULES,
    tierTabs: [{ k: 'all', t: '全部' }, { k: 'none', t: '未评级' }].concat(
      TIERS.map(function (t) { return { k: t.k, t: t.n }; })
    ),
    delivTabs: [
      { k: 'all', t: '全部' },
      { k: 'api', t: DELIV_TEXT.api },
      { k: 'client', t: DELIV_TEXT.client },
      { k: 'web', t: DELIV_TEXT.web },
      { k: 'ended', t: '已结束' }
    ]
  },

  onLoad: function () {
    this.refresh();
  },

  onShow: function () {
    this.setData({ fontClass: repo.getFont() });
    this.tick();
    this.startTicker();
    this.refresh();
    // 进页面立即拉一次全站票数，别人刚投的票也能看到
    this.syncVotes();
  },

  onHide: function () {
    this.stopTicker();
  },

  onUnload: function () {
    this.stopTicker();
  },

  // 具体时刻 + 会自己往前走的相对时间，每 30 秒重算
  tick: function () {
    const s = clock.stamp();
    this.setData({
      fetchedAt: s,
      refreshClock: clock.clockOf(s),
      freshness: clock.freshOf(s)
    });
  },

  startTicker: function () {
    const self = this;
    this.stopTicker();
    this.ticker = setInterval(function () {
      self.tick();
      // 每 30 秒顺带拉一次全站票数，别人的新票最多延迟一个周期
      self.syncVotes();
    }, 30000);
  },

  // 拉全站票数；有变化才重绘，避免无谓重排
  syncVotes: function () {
    const self = this;
    return repo.refreshAggregates().then(function (changed) {
      if (changed) self.refresh();
    }).catch(function () {});
  },

  stopTicker: function () {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  },

  onShowUpdated: function () {
    wx.showModal({
      title: '数据更新时间',
      content: clock.stamp() + '（北京时间）\n数据来源：' + repo.sources() + '\n每天 08:00 自动抓取，这个时间会跟着同步。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  refresh: function () {
    const votes = repo.getVotes();
    const tierFilter = this.data.tierFilter;
    const delivFilter = this.data.delivFilter;

    const rows = repo.offers().map(function (o) {
      return { o: o, s: statOf(votes, o.id) };
    }).filter(function (x) {
      const o = x.o;
      const s = x.s;
      // 形态筛选（已结束单独作为一档）
      if (delivFilter === 'ended') {
        if (o.state !== 'ended') return false;
      } else {
        if (o.state === 'ended') return false;
        if (delivFilter !== 'all' && o.deliv !== delivFilter) return false;
      }
      // 档位筛选
      if (tierFilter === 'all') return true;
      if (tierFilter === 'none') return s.n === 0;
      if (s.n === 0) return false;
      if (s.contested) return false;
      return TIERS[s.mode].k === tierFilter;
    });

    // 关键词搜索：名称 / 厂商 / ID / 额度说明 / 期限 / 别名 都能命中
    const q = (this.data.query || '').trim().toLowerCase();
    const matched = q ? rows.filter(function (x) {
      const o = x.o;
      const hay = (o.name + ' ' + o.provider + ' ' + o.id + ' ' +
        (o.scope || '') + ' ' + (o.quota || '') + ' ' + (o.term || '') + ' ' +
        (ALIAS[o.id] || '')).toLowerCase();
      return hay.indexOf(q) >= 0;
    }) : rows;

    // 天梯里没有，但最爱榜里有 —— 给个去处，别让用户以为是空的
    let hint = '';
    if (q && matched.length === 0) {
      const hits = repo.popular().filter(function (m) {
        return (m.name + ' ' + m.provider + ' ' + m.id).toLowerCase().indexOf(q) >= 0;
      });
      if (hits.length) {
        const names = hits.slice(0, 3).map(function (m) { return m.name; }).join('、');
        hint = '天梯里没有，最爱榜里有 ' + hits.length + ' 个：' + names;
      }
    }

    matched.sort(function (A, B) {
      const a = A.s;
      const b = B.s;
      const ra = a.n === 0 ? 50 : (a.contested ? 40 : 3 - a.mode);
      const rb = b.n === 0 ? 50 : (b.contested ? 40 : 3 - b.mode);
      if (ra !== rb) return ra - rb;
      if (Math.abs(b.ratio - a.ratio) > 1e-9) return b.ratio - a.ratio;
      if (Math.abs(b.score - a.score) > 1e-9) return b.score - a.score;
      if (b.n !== a.n) return b.n - a.n;
      return 0;
    });

    const list = matched.map(function (x) {
      const o = x.o;
      const s = x.s;
      const rec = votes[o.id];
      const p = function (i) {
        return s.n ? (s.v[i] / s.n * 100).toFixed(1) : 0;
      };
      let tierText = '未评级';
      let tierKey = 'none';
      if (o.state === 'ended') {
        tierText = '已结束';
        tierKey = 'ended';
      } else if (s.n > 0) {
        if (s.contested) {
          tierText = '分歧';
          tierKey = 'contested';
        } else {
          tierText = TIERS[s.mode].n;
          tierKey = TIERS[s.mode].k;
        }
      }
      return {
        id: o.id,
        name: o.name,
        provider: o.provider,
        quota: o.quota,
        gate: o.gate,
        gateTag: GATE_LABEL[o.gateLevel] || '',
        delivKey: o.deliv || 'api',
        delivText: DELIV_TEXT[o.deliv] || 'API',
        term: o.term,
        conf: o.conf,
        confCls: CONF_CLS[o.conf] || 'mid',
        tierText: tierText,
        tierKey: tierKey,
        myVote: rec && typeof rec.mine === 'number' ? rec.mine : -1,
        people: s.n,
        scoreText: s.n ? s.score.toFixed(2) : '',
        bar0: p(0),
        bar1: p(1),
        bar2: p(2),
        bar3: p(3),
        paid: !!o.paid,
        dead: o.state === 'ended',
        copy: o.copy,
        copyLabel: o.copyLabel
      };
    });

    const liveOffers = repo.offers().filter(function (o) { return o.state === 'live'; });
    const rated = repo.offers().filter(function (o) { return statOf(votes, o.id).n > 0; }).length;
    const g = pickGod(votes);

    this.setData({
      list: list,
      resultCount: matched.length,
      hint: hint,
      god: g ? {
        name: g.o.name,
        provider: g.o.provider,
        quota: g.o.quota.length > 30 ? g.o.quota.slice(0, 30) + '…' : g.o.quota,
        people: g.s.n,
        ratio: Math.round(g.s.ratio * 100)
      } : null,
      stats: {
        api: liveOffers.filter(function (o) { return o.deliv === 'api'; }).length,
        client: liveOffers.filter(function (o) { return o.deliv === 'client'; }).length,
        web: liveOffers.filter(function (o) { return o.deliv === 'web'; }).length,
        rated: rated,
        total: repo.offers().length
      }
    });
  },

  onPreviewMascot: function () {
    const src = this.data.mascot.image;
    if (!src) return;
    if (typeof wx.previewImage === 'function') {
      wx.previewImage({ urls: [src], current: src });
      return;
    }
    wx.showToast({ title: '当前环境不支持查看大图', icon: 'none' });
  },

  onSearch: function (e) {
    this.setData({ query: e.detail.value }, this.refresh);
  },

  onClearSearch: function () {
    if (!this.data.query) return;
    this.setData({ query: '' }, this.refresh);
  },

  onOpen: function (e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({
      url: '/pages/detail/detail?id=' + encodeURIComponent(id)
    });
  },

  onTierTab: function (e) {
    const k = e.currentTarget.dataset.k;
    if (k === this.data.tierFilter) return;
    this.setData({ tierFilter: k }, this.refresh);
  },

  onDelivTab: function (e) {
    const k = e.currentTarget.dataset.k;
    if (k === this.data.delivFilter) return;
    this.setData({ delivFilter: k }, this.refresh);
  },

  onVote: function (e) {
    const ds = e.currentTarget.dataset;
    const id = ds.id;
    const idx = Number(ds.idx);
    const offer = repo.offers().filter(function (o) { return o.id === id; })[0];
    if (!offer || offer.state !== 'live') {
      wx.showToast({ title: '已结束，不能再评', icon: 'none' });
      return;
    }
    const cur = repo.getVotes()[id];
    if (cur && cur.mine === idx) return;

    const self = this;
    const label = TIERS[idx] ? TIERS[idx].n : '';
    const isFlag = idx === 0;
    wx.showModal({
      title: isFlag ? '标记信息有问题' : '确认评级',
      content: isFlag
        ? '标记后这条会显示「小杯作者」，提示别人这条信息可能不准。之后还能改。'
        : '确定要把它评为「' + label + '」吗？之后还能改。',
      confirmText: isFlag ? '标记' : '确定',
      cancelText: '再想想',
      confirmColor: '#1c1c1a',
      success: function (res) {
        if (!res.confirm) return;
        self.commitVote(id, idx);
      }
    });
  },

  commitVote: function (id, idx) {
    const self = this;
    // 一人一票、改票退旧票的规则收在 repo 里，页面只表达「我要投这一档」
    repo.castVote(id, idx).then(function () {
      if (typeof wx.vibrateShort === 'function') {
        wx.vibrateShort({ type: 'light', fail: function () {} });
      }
      // 云端已写完，重拉一次就能看到含这一票的全站票数
      return repo.refreshAggregates();
    }).then(function () {
      self.refresh();
      wx.showToast({ title: '已评为' + (TIERS[idx] ? TIERS[idx].n : ''), icon: 'none' });
    }).catch(function () {
      self.refresh();
    });
  },

  onCopy: function (e) {
    const text = e.currentTarget.dataset.copy;
    if (!text) return;
    // 预览环境没有剪贴板 API，降级为弹窗展示，避免抛异常中断页面
    if (typeof wx.setClipboardData === 'function') {
      wx.setClipboardData({
        data: text,
        success: function () {
          wx.showToast({ title: '已复制', icon: 'none' });
        },
        fail: function () {
          wx.showModal({ title: '复制失败，请手动复制', content: text, showCancel: false });
        }
      });
      return;
    }
    wx.showModal({
      title: '手动复制这条',
      content: text,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onReset: function () {
    const self = this;
    wx.showModal({
      title: '清空我的投票',
      content: '会删掉你在这台设备上的全部评级。',
      confirmText: '清空',
      success: function (res) {
        if (!res.confirm) return;
        repo.clearVotes();
        self.refresh();
        wx.showToast({ title: '已清空', icon: 'none' });
      }
    });
  },

  onShowRule: function () {
    wx.showModal({
      title: '怎么定档',
      content: labels.RULE_FULL,
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
