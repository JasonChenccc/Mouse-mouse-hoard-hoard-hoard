// 纯前端新手引导 · 零云消耗。
//
// 硬要求：全程不调用任何云 API、不写任何表、不新增云端资源。
// 本模块只 require 自身，唯一用到的是 wx.setStorageSync / getStorageSync（本地）
// 与 wx.createSelectorQuery / getWindowInfo（纯客户端布局），绝不碰 cloud/repo。
// 100 万人走引导，云消耗必须为 0。
//
// 定位策略：
//   - 步骤 1~3：目标是页面内节点，用 createSelectorQuery.boundingClientRect 取
//     实际位置（跟随节点、适配不同屏幕），不写死坐标。
//   - 步骤 4：目标是微信【原生 tabBar】，它不在页面节点树里，SelectorQuery 取不到。
//     改用 getWindowInfo 的窗口尺寸动态算出底部 tab 区域（按屏幕算，非写死）。
//     这是平台限制下的替代方案，已在归档文档如实说明。

const MARK_KEY = 'egg_guide_v1'; // 带版本号的本地完成标记
const VERSION = '1';

const STEPS = [
  { text: '每天打开先看这儿，哪些 AI 还在免费送额度。', sel: '#gd-list', capTop: true },
  { text: '点一条进去看看，额度、门槛、什么时候截止，都写在里面。', sel: '#gd-card' },
  { text: '觉得哪个实在，点这里投一票，大家的票会排成天梯。', sel: '#gd-vote' },
  { text: '想留个记号？去最爱榜也投一票，下周回来看还在不在。', tab: true }
];

// 是否已完成（版本匹配才算完成；版本不匹配 → 再引导一次）
function isDone() {
  try {
    return wx.getStorageSync(MARK_KEY) === VERSION;
  } catch (e) {
    return false;
  }
}

// 标记完成 / 跳过。写本地存储，零云。
function markDone() {
  try {
    wx.setStorageSync(MARK_KEY, VERSION);
  } catch (e) {
    // 写失败不阻断：最多下次再引导一次
  }
}

function windowSize() {
  try {
    if (typeof wx.getWindowInfo === 'function') {
      const w = wx.getWindowInfo();
      return { w: w.windowWidth, h: w.windowHeight };
    }
    const s = wx.getSystemInfoSync();
    return { w: s.windowWidth, h: s.windowHeight };
  } catch (e) {
    return { w: 375, h: 667 };
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// 求第 idx 步的高亮框 + 提示气泡位置，回调 cb(box)；定位失败 cb(null)。
// page 为页面实例（用它的 createSelectorQuery 查页面内节点）。
function locate(page, idx, cb) {
  const st = STEPS[idx];
  const win = windowSize();
  const pad = 6;

  function finish(x, y, w, h) {
    x = clamp(x, pad, win.w - pad);
    y = clamp(y, pad, win.h - pad);
    w = clamp(w, 24, win.w - x - pad);
    h = clamp(h, 24, win.h - y - pad);
    // 高亮框在下半屏就把提示放上面，否则放下面，避免遮住目标
    let tipY;
    if (y > win.h * 0.45) tipY = clamp(y - 136, 12, win.h - 156);
    else tipY = clamp(y + h + 14, 12, win.h - 156);
    cb({ x: x, y: y, w: w, h: h, tipY: tipY });
  }

  if (st.tab) {
    // 原生 tabBar 无法 SelectorQuery：按窗口高度动态算底部条带
    const barH = 64;
    finish(8, win.h - barH - 4, win.w - 16, barH);
    return;
  }

  try {
    page.createSelectorQuery().select(st.sel).boundingClientRect(function (rect) {
      if (!rect || !rect.width || !rect.height) {
        cb(null); // 节点还没渲染 / 取不到 → 交给页面跳过引导，不卡住用户
        return;
      }
      let h = rect.height;
      if (st.capTop && h > 150) h = 150; // 列表太长只高亮顶部一段
      finish(rect.left - pad, rect.top - pad, rect.width + pad * 2, h + pad * 2);
    }).exec();
  } catch (e) {
    cb(null);
  }
}

module.exports = {
  VERSION: VERSION,
  STEPS: STEPS,
  MARK_KEY: MARK_KEY,
  isDone: isDone,
  markDone: markDone,
  locate: locate
};
