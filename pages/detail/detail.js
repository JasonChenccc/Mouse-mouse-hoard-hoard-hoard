const repo = require('../../utils/repo.js');
const labels = require('../../utils/labels.js');

const TIERS = repo.TIER_NAMES;
const TIER_KEY = repo.TIER_KEYS;
const TIER_N = repo.TIER_KEYS.length;
const DELIV = labels.DELIV_TEXT;
const DOM = { direct: '国内可直连', proxy: '需要代理', unknown: '未确认' };
const DOM_CLS = { direct: 'ok', proxy: 'bad', unknown: 'mid' };
const GATE = labels.GATE;
const CONF_CLS = labels.CONF_CLS;

Page({
  data: {
    fontClass: '',
    o: null,
    notFound: false
  },

  onShow: function () {
    this.setData({ fontClass: repo.getFont() });
  },

  onLoad: function (options) {
    const id = options && options.id ? decodeURIComponent(options.id) : '';
    const offer = repo.offers().filter(function (x) { return x.id === id; })[0];
    if (!offer) {
      this.setData({ notFound: true });
      return;
    }
    const votes = repo.getVotes();
    const rec = votes[offer.id];
    const v = rec && rec.c ? repo.normalizeCounts(rec.c) : repo.emptyCounts();
    let n = 0;
    for (let i = 0; i < TIER_N; i++) n += v[i];

    let tierText = '未评级';
    let tierKey = 'none';
    if (offer.state === 'ended') {
      tierText = '已结束';
      tierKey = 'ended';
    } else if (n > 0) {
      let best = 0;
      for (let i = 1; i < TIER_N; i++) if (v[i] > v[best]) best = i;
      if (v[best] / n > 0.5) {
        tierText = TIERS[best];
        tierKey = TIER_KEY[best];
      } else {
        tierText = '分歧';
        tierKey = 'contested';
      }
    }

    this.setData({
      o: {
        name: offer.name,
        provider: offer.provider,
        quota: offer.quota,
        scope: offer.scope,
        gate: offer.gate,
        gateTag: GATE[offer.gateLevel] || '',
        term: offer.term,
        conf: offer.conf,
        confCls: CONF_CLS[offer.conf] || 'mid',
        deliv: DELIV[offer.deliv] || 'API',
        delivKey: offer.deliv || 'api',
        dom: DOM[offer.domestic] || '未确认',
        domCls: DOM_CLS[offer.domestic] || 'mid',
        copy: offer.copy,
        paid: !!offer.paid,
        dead: offer.state === 'ended',
        tierText: tierText,
        tierKey: tierKey,
        people: n
      }
    });
  },

  onCopy: function () {
    const text = this.data.o && this.data.o.copy;
    if (!text) return;
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
    wx.showModal({ title: '手动复制这条', content: text, showCancel: false, confirmText: '知道了' });
  }
});
