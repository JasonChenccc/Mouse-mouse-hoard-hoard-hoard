const repo = require('../../utils/repo.js');

Page({
  data: {
    fontClass: '',
    myId: '',
    historyCount: 0,
    online: false,
    logging: false,
    fetchedAt: repo.fetchedAt(),
    sources: repo.sources(),
    totalOffers: repo.offers().length
  },

  onShow: function () {
    this.setData({
      fontClass: repo.getFont(),
      myId: repo.getMyId(),
      historyCount: repo.getHistory().length,
      online: repo.isOnline(),
      fetchedAt: repo.fetchedAt(),
      totalOffers: repo.offers().length
    });
  },

  onLogin: function () {
    const self = this;
    if (this.data.logging) return;
    this.setData({ logging: true });
    repo.login().then(function (r) {
      self.setData({
        logging: false,
        online: repo.isOnline(),
        historyCount: repo.getHistory().length
      });
      if (r.ok) {
        wx.showToast({ title: '已登录，开始同步', icon: 'none' });
        return;
      }
      // 失败原因用弹窗展示：toast 只有 1.5 秒，来不及看清，
      // 而这条信息决定了下一步该去改什么配置
      wx.showModal({
        title: '登录失败',
        content: r.message || '未知原因，稍后再试一次',
        showCancel: false,
        confirmText: '知道了'
      });
    }).catch(function (e) {
      self.setData({ logging: false });
      wx.showModal({
        title: '登录失败',
        content: (e && e.message) || '网络异常，稍后再试',
        showCancel: false,
        confirmText: '知道了'
      });
    });
  },

  onEditId: function () {
    const self = this;
    wx.showModal({
      title: '我的 ID',
      content: this.data.myId,
      editable: true,
      placeholderText: '给自己起个名字，最多 24 字',
      confirmText: '保存',
      success: function (res) {
        if (!res.confirm) return;
        if (typeof res.content !== 'string') {
          wx.showToast({ title: '当前环境不支持输入', icon: 'none' });
          return;
        }
        let v = res.content.trim().slice(0, 24);
        repo.setMyId(v);
        self.setData({ myId: v });
        wx.showToast({ title: v ? '已保存' : '已清空', icon: 'none' });
      }
    });
  },

  onFont: function (e) {
    const v = e.currentTarget.dataset.v || '';
    repo.setFont(v);
    this.setData({ fontClass: v });
  },

  onImpact: function () {
    wx.navigateTo({ url: '/pages/impact/impact' });
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
    wx.showModal({ title: '请手动复制', content: text, showCancel: false });
  }
});
