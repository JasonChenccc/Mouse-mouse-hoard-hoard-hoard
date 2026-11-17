const repo = require('./utils/repo.js');

App({
  globalData: {
    appName: '鼠鼠的AI笔记',
    // 接上云服务后把真实同步时间写进这里，首页右上角会自动跟着更新
    lastSyncAt: '',
    // 云端条目拉取完成时间，页面据此决定是否要重新渲染
    cloudReadyAt: 0,
    // 启动阶段攒下的登录/同步失败原因，等页面就绪后再提示
    loginError: ''
  },

  // 由页面 onShow 调用：把启动阶段攒下的失败提示一次性弹出来，弹完即清，
  // 避免不提示、也避免每个页面都弹一遍。onShow 时页面一定已就绪，看得到。
  flushLoginError: function () {
    const g = this.globalData;
    if (!g.loginError) return;
    const content = g.loginError;
    g.loginError = '';
    if (typeof wx.showModal !== 'function') return;
    wx.showModal({
      title: '云同步没连上',
      content: content + '\n\n不影响使用：清单和这台设备上的投票照常可用。想跨设备同步，去「我的」里点一次微信登录。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  onLaunch: function () {
    const self = this;
    const g = this.globalData;
    g.loginError = '';

    // 转发/朋友圈入口默认隐藏，必须显式打开；各页面再各自实现钩子提供内容。
    if (typeof wx.showShareMenu === 'function') {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      });
    }

    // 恢复登录态（不弹框）；没有会话时静默换一次 —— wx.login 只取 code，
    // 不出授权框，用户无感。有了 auth.uid() 才能把投票写进云端。
    // 全部失败也不影响使用：页面继续用主包里那 54 条 + 本机投票。
    repo.restoreSession()
      .then(function (online) {
        if (online) return true;
        return repo.login().then(function (r) {
          if (r && r.ok) return true;
          // 不再静默吞：记下原因，交给页面 onShow 呈现
          g.loginError = (r && r.message) || '自动登录没完成';
          return false;
        }).catch(function (e) {
          g.loginError = (e && e.message) || '登录请求失败';
          return false;
        });
      })
      .then(function () {
        return repo.bootstrap();
      })
      .then(function (r) {
        if (r && r.ok) g.cloudReadyAt = Date.now();
        // 条目到位后拉全站票数，天梯才能按多人统计算档位
        return repo.refreshAggregates();
      })
      .then(function (ok) {
        if (ok) {
          g.lastSyncAt = repo.fetchedAt();
          // 注意：这里不能清 loginError —— refreshAggregates 未登录时也可能成功
          // （本机票数兜底），清了就把登录失败又吞回去了。提示只由 flushLoginError 清。
          const pages = getCurrentPages();
          const cur = pages.length ? pages[pages.length - 1] : null;
          if (cur && typeof cur.refresh === 'function') cur.refresh();
        }
      })
      .catch(function (e) {
        // 兜底：任何一环失败都只记录 + 提示，绝不阻断主包数据和本机投票
        if (!g.loginError) g.loginError = (e && e.message) || '云同步初始化失败';
        // 页面已就绪就直接弹；还没就绪就留给页面 onShow 弹
        if (getCurrentPages().length) self.flushLoginError();
      });
  }
});
