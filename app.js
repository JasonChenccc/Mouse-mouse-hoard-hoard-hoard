const repo = require('./utils/repo.js');

App({
  globalData: {
    appName: '每日token大赛',
    // 接上云服务后把真实同步时间写进这里，首页右上角会自动跟着更新
    lastSyncAt: '',
    // 云端条目拉取完成时间，页面据此决定是否要重新渲染
    cloudReadyAt: 0
  },

  onLaunch: function () {
    // 恢复登录态（不弹框），再拉云端条目。
    // 两者失败都不影响使用：页面继续用主包里那 54 条 + 本机投票。
    const g = this.globalData;
    repo.restoreSession()
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
          const pages = getCurrentPages();
          const cur = pages.length ? pages[pages.length - 1] : null;
          if (cur && typeof cur.refresh === 'function') cur.refresh();
        }
      })
      .catch(function () {});
  }
});
