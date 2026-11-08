// base64 → UTF-8 字符串。
// 小程序没有 TextDecoder，wx.base64ToArrayBuffer 只到 ArrayBuffer，
// 多字节的中文必须自己按 UTF-8 规则拼回来，否则全是乱码。
function b64ToUtf8(b64) {
  if (typeof wx === 'undefined' || typeof wx.base64ToArrayBuffer !== 'function') {
    return '';
  }
  const buf = wx.base64ToArrayBuffer(b64);
  const bytes = new Uint8Array(buf);
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) {
      out.push(String.fromCharCode(b));
    } else if (b >= 0xc0 && b < 0xe0) {
      out.push(String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f)));
    } else if (b >= 0xe0 && b < 0xf0) {
      out.push(String.fromCharCode(
        ((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f)
      ));
    } else {
      // 四字节：拆成代理对
      const cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) |
                 ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
      const v = cp - 0x10000;
      out.push(String.fromCharCode(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff)));
    }
  }
  return out.join('');
}

module.exports = { b64ToUtf8: b64ToUtf8 };
