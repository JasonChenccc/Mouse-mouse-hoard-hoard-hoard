const { PERSONA } = require('../../data/persona.js');
const CREATED = require('../../data/created.js');
const repo = require('../../utils/repo.js');

const FALLBACK = {
  tag: '新来的',
  hair: '#8a8a84', eye: '#b4b2a9', bg: '#f2f1ec', accent: '#a8a49a'
};

const NEW_DAYS = 30;

function startOfWeek(d) {
  const x = new Date(d.getTime());
  const wd = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - wd);
  return x;
}

function startOfMonth(d) {
  const x = new Date(d.getTime());
  x.setHours(0, 0, 0, 0);
  x.setDate(1);
  return x;
}

function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s.getTime());
  e.setDate(e.getDate() + 6);
  return e;
}

function fmtMD(d) {
  return (d.getMonth() + 1) + '.' + d.getDate();
}

function daysSince(dateStr) {
  if (!dateStr) return 9999;
  const t = new Date(dateStr + 'T00:00:00').getTime();
  return Math.floor((Date.now() - t) / 86400000);
}

Page({
  data: {
    fontClass: '',
    board: 'week',
    period: '',
    list: [],
    top: null,
    votedCount: 0,
    newCount: 0,
    totalModels: 0
  },

  onLoad: function () {
    this.refresh();
  },

  onShow: function () {
    this.setData({ fontClass: repo.getFont() });
    this.refresh();
  },

  refresh: function () {
    const log = repo.getFavLog();
    const now = new Date();
    const since = this.data.board === 'week' ? startOfWeek(now) : startOfMonth(now);
    const sinceTs = since.getTime();

    const period = this.data.board === 'week'
      ? '本周 ' + fmtMD(since) + ' – ' + fmtMD(endOfWeek(now))
      : now.getFullYear() + ' 年 ' + (now.getMonth() + 1) + ' 月';

    // 窗口内每个模型拿到几票
    const tally = {};
    log.forEach(function (r) {
      if (r.ts >= sinceTs) tally[r.id] = (tally[r.id] || 0) + 1;
    });

    const votedIds = {};
    log.forEach(function (r) { votedIds[r.id] = true; });

    const rows = [];

    repo.offers().filter(function (o) {
      return o.kind === 'model' && o.state === 'live';
    }).forEach(function (o) {
      rows.push({
        id: o.id,
        name: o.name,
        meta: o.provider,
        free: true,
        votes: tally[o.id] || 0,
        voted: !!votedIds[o.id],
        isNew: daysSince(CREATED[o.id]) <= NEW_DAYS
      });
    });

    repo.popular().forEach(function (m) {
      rows.push({
        id: m.id,
        name: m.name,
        meta: m.provider + '　$' + m.pin + ' / $' + m.pout + ' 每百万',
        free: false,
        votes: tally[m.id] || 0,
        voted: !!votedIds[m.id],
        isNew: daysSince(CREATED[m.id]) <= NEW_DAYS
      });
    });

    rows.forEach(function (r) {
      r.persona = PERSONA[r.id] || FALLBACK;
    });

    rows.sort(function (a, b) {
      if (b.votes !== a.votes) return b.votes - a.votes;
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      if (a.free !== b.free) return a.free ? -1 : 1;
      return a.name < b.name ? -1 : 1;
    });

    const totalVotes = rows.reduce(function (s, r) { return s + r.votes; }, 0);

    this.setData({
      list: rows,
      top: totalVotes > 0 ? rows[0] : null,
      period: period,
      votedCount: Object.keys(votedIds).length,
      newCount: rows.filter(function (r) { return r.isNew; }).length,
      totalModels: rows.length
    });
  },

  onBoard: function (e) {
    const k = e.currentTarget.dataset.k;
    if (k === this.data.board) return;
    this.setData({ board: k }, this.refresh);
  },

  onPick: function (e) {
    const ds = e.currentTarget.dataset;
    const id = String(ds.id);
    const name = ds.name || id;
    const self = this;
    // 投票 / 撤回的判定和记录都在 repo 里，页面只管反馈
    repo.toggleFav(id, name).then(function (r) {
      if (r.voted && typeof wx.vibrateShort === 'function') {
        wx.vibrateShort({ type: 'light', fail: function () {} });
      }
      self.refresh();
      wx.showToast({ title: r.voted ? '已投一票' : '已撤回', icon: 'none' });
    });
  },

  onReset: function () {
    const self = this;
    wx.showModal({
      title: '清空我的票',
      content: '会撤销你在这台设备上投出的全部票。',
      confirmText: '清空',
      success: function (res) {
        if (!res.confirm) return;
        repo.clearFav();
        self.refresh();
      }
    });
  }
});
