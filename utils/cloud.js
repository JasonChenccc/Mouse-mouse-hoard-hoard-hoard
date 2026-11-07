// 云服务客户端：只在这里初始化一次，其它模块都从这里拿。
// 初始化失败不抛异常，返回 null，调用方自动退回本地存储，页面不会白屏。
const config = require('./cloud-config.js');

let client = null;
let failed = false;

function get() {
  if (client) return client;
  if (failed) return null;
  try {
    const sdk = require('@tencent-ai/workbuddy-cloud-sdk/miniprogram');
    const diag = require('./workbuddy-cloud-diagnostics.js');
    client = sdk.createMiniProgramWorkBuddyCloud({
      endpoint: config.endpoint,
      publishableKey: config.publishableKey,
      workBuddyOAuthClientId: config.workBuddyOAuthClientId,
      wx: diag.createDiagnosticWx(wx)
    });
    return client;
  } catch (e) {
    failed = true;
    // 只记阶段和消息，不打印错误对象（可能带请求信息）
    console.error('[cloud] init failed', JSON.stringify({
      stage: 'init',
      message: e && e.message ? e.message : 'unknown'
    }));
    return null;
  }
}

function available() {
  return !!get();
}

// 当前会话。未登录时返回 null，不抛异常。
async function session() {
  const c = get();
  if (!c) return null;
  try {
    const { data, error } = await c.auth.getSession();
    if (error) return null;
    return data && data.session ? data.session : (data || null);
  } catch (e) {
    return null;
  }
}

// 微信登录：wx.login 拿 code，交给 SDK 换会话。
// 预览环境拿不到真实 code，这里返回 { ok:false }，调用方保持本地模式即可。
function signIn() {
  return new Promise(function (resolve) {
    const c = get();
    if (!c) {
      resolve({ ok: false, message: '云服务未就绪' });
      return;
    }
    wx.login({
      success: async function (res) {
        if (!res.code) {
          resolve({ ok: false, message: '没拿到登录凭证' });
          return;
        }
        try {
          const appid = wx.getAccountInfoSync().miniProgram.appId;
          const out = await c.auth.signInWithWechat(res.code, appid);
          if (out && out.error) {
            resolve({ ok: false, message: out.error.message || '登录失败' });
            return;
          }
          resolve({ ok: true, session: out && out.data });
        } catch (e) {
          console.error('[cloud] login failed', JSON.stringify({
            stage: 'wechat-login-handler',
            message: e && e.message ? e.message : '微信登录失败'
          }));
          resolve({ ok: false, message: '微信登录失败，请重试' });
        }
      },
      fail: function (err) {
        console.error('[cloud] wx.login failed', JSON.stringify({
          stage: 'wx.login',
          message: err && err.errMsg ? err.errMsg : 'unknown'
        }));
        resolve({ ok: false, message: '微信登录未完成' });
      }
    });
  });
}

module.exports = { get: get, available: available, session: session, signIn: signIn };
