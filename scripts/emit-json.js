// 把 data/offers.js 导出成小程序可直接拉取的 data/offers.json。
// 用法：node scripts/emit-json.js
//
// 为什么要有这一步：小程序的内容源走 CDN 静态 JSON 之后，
// 每天更新只需要改这个文件，不必动主包、不必发版。
// 主包里的 data/offers.js 仍保留，作为拉不到时的最后兜底。
const fs = require('fs');
const path = require('path');

const DATA = require('../data/offers.js');
const OUT = path.join(__dirname, '..', 'data', 'offers.json');

const offers = DATA.offers || [];

// ---- 校验闸门：任何一条不达标就整体失败，不产出文件 ----
const problems = [];

if (!Array.isArray(offers) || offers.length < 30) {
  problems.push('条数异常：' + offers.length + '（应 ≥ 30）');
}
if (offers.length > 400) {
  problems.push('条数异常偏多：' + offers.length);
}

const seen = new Set();
offers.forEach(function (o, i) {
  const tag = '第 ' + (i + 1) + ' 条' + (o && o.id ? '（' + o.id + '）' : '');
  if (!o || typeof o !== 'object') { problems.push(tag + '不是对象'); return; }
  ['id', 'name', 'kind', 'state'].forEach(function (k) {
    if (!o[k]) problems.push(tag + ' 缺少 ' + k);
  });
  if (o.id) {
    if (seen.has(o.id)) problems.push(tag + ' id 重复');
    seen.add(o.id);
  }
  if (o.state && ['live', 'ended'].indexOf(o.state) < 0) {
    problems.push(tag + ' state 非法：' + o.state);
  }
  if (o.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(o.endDate)) {
    problems.push(tag + ' endDate 格式错：' + o.endDate);
  }
});

if (problems.length) {
  console.error('校验失败，未写入文件：');
  problems.slice(0, 12).forEach(function (p) { console.error('  - ' + p); });
  if (problems.length > 12) console.error('  …还有 ' + (problems.length - 12) + ' 条');
  process.exit(1);
}

const payload = {
  schemaVersion: 1,
  fetchedAt: DATA.fetchedAt || '',
  sources: DATA.sources || '',
  count: offers.length,
  offers: offers
};

fs.writeFileSync(OUT, JSON.stringify(payload), 'utf8');

const live = offers.filter(function (o) { return o.state === 'live'; }).length;
const size = Math.round(fs.statSync(OUT).size / 1024);
console.log('已写入 ' + path.relative(process.cwd(), OUT));
console.log('条目 ' + offers.length + '（在架 ' + live + '，已结束 ' + (offers.length - live) + '）· ' + size + ' KB');
console.log('时间戳 ' + payload.fetchedAt);
