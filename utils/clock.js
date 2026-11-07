// 数据刷新时间的统一读取口。
// 时间从数据层拿（repo.fetchedAt()），不直接读 data/*.js。
// 接上云服务后，只要把真实同步时间写进 getApp().globalData.lastSyncAt，
// 首页和「我的」页都会自动跟着变，不用再改页面代码。
const repo = require('./repo.js');

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function nowStamp() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
    ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

function markSync(s) {
  try {
    getApp().globalData.lastSyncAt = s || nowStamp();
  } catch (e) {
    // ignore
  }
}

function stamp() {
  try {
    const g = getApp().globalData;
    if (g && g.lastSyncAt) return g.lastSyncAt;
  } catch (e) {
    // ignore
  }
  return repo.fetchedAt();
}

function parse(s) {
  return new Date(String(s).replace(/-/g, '/')).getTime();
}

// 具体时刻：今天只显示 HH:mm，跨天显示 MM-DD HH:mm
function clockOf(s) {
  const t = parse(s);
  if (!t) return String(s);
  const d = new Date(t);
  const hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
  const today = new Date(Date.now() + 8 * 3600 * 1000);
  const day = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const todayStr = today.getUTCFullYear() + '-' + pad(today.getUTCMonth() + 1) + '-' + pad(today.getUTCDate());
  if (day === todayStr) return hm;
  return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + hm;
}

// 动态部分：每隔几十秒重算一次，数字会自己往前走
function freshOf(s) {
  const t = parse(s);
  if (!t) return '时间未知';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return mins + ' 分钟前';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + ' 小时前';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + ' 天前';
  return '较久之前';
}

module.exports = { stamp, clockOf, freshOf, markSync, nowStamp };
