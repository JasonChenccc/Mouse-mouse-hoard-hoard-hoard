const repo = require('../../utils/repo.js');

const TIER_NAMES = repo.TIER_NAMES;
// 名字查找统一走 repo.nameOf，页面不再各写一份兜底逻辑
const nameOf = repo.nameOf;

function fmt(ts) {
  if (!ts) return '早期记录 · 无时间';
  const d = new Date(ts);
  const p = function (n) { return n < 10 ? '0' + n : '' + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) +
    ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

// 升级前的老投票没有留时间，首次打开时补成一条「早期记录」，不凭空编造时间
function seedIfEmpty() {
  let h = repo.getHistory();
  if (h.length) return h;
  const seed = [];
  const votes = repo.getVotes();
  Object.keys(votes).forEach(function (id) {
    const rec = votes[id];
    if (rec && rec.mine >= 0) {
      seed.push({
        type: 'tier', id: id, name: nameOf(id),
        value: TIER_NAMES[rec.mine] || '', ts: 0
      });
    }
  });
  repo.getFavLog().forEach(function (r) {
    seed.push({ type: 'fav', id: r.id, name: nameOf(r.id), value: '投一票', ts: r.ts || 0 });
  });
  if (seed.length) {
    repo.setHistory(seed);
    h = seed;
  }
  return h;
}

Page({
  data: {
    fontClass: '',
    list: [],
    total: 0,
    tierCount: 0,
    favCount: 0,
    itemCount: 0
  },

  onShow: function () {
    this.setData({ fontClass: repo.getFont() });
    this.refresh();
  },

  refresh: function () {
    const raw = seedIfEmpty();
    const ids = {};
    let tierCount = 0;
    let favCount = 0;
    const list = raw.map(function (r, i) {
      ids[r.id] = true;
      if (r.type === 'fav') favCount += 1;
      else tierCount += 1;
      return {
        key: r.ts + '_' + i,
        name: r.name,
        time: fmt(r.ts),
        typeText: r.type === 'fav' ? '最爱榜' : '天梯评级',
        value: r.value,
        tone: r.type === 'fav' ? 'fav' : (r.value === '超大杯' ? 'xl' : '')
      };
    });
    this.setData({
      list: list,
      total: list.length,
      tierCount: tierCount,
      favCount: favCount,
      itemCount: Object.keys(ids).length
    });
  },

  onClear: function () {
    const self = this;
    wx.showModal({
      title: '清空影响记录',
      content: '只删这个记录列表，不会撤销你已经投出的票。',
      confirmText: '清空',
      success: function (res) {
        if (!res.confirm) return;
        repo.clearHistory();
        self.refresh();
        wx.showToast({ title: '已清空', icon: 'none' });
      }
    });
  }
});
