// 把 data/offers.js 里的条目导出成一条 UPSERT SQL，供定时任务写入云端。
// 用法：node scripts/emit-upsert.js
// 产出：_cache/offers-upsert.sql（工程外，不会被打进小程序包）
//
// 采用「增量 upsert」而不是「清空重写」：
// 已有条目原地更新，新条目插入，云端有而本地没有的只标记为已结束，绝不删行。
const fs = require('fs');
const path = require('path');

const DATA = require('../data/offers.js');

const OUT_DIR = path.join(__dirname, '..', '..', '_cache');
const OUT_SQL = path.join(OUT_DIR, 'offers-upsert.sql');
const OUT_IDS = path.join(OUT_DIR, 'offers-ids.json');

const COLS = [
  'id', 'name', 'provider', 'kind', 'state', 'quota', 'gate', 'gate_level',
  'term', 'conf', 'paid', 'copy_url', 'deliv', 'domestic', 'scope', 'end_date'
];

const rows = DATA.offers.map(function (o) {
  const r = { id: o.id, name: o.name, paid: !!o.paid };
  if (o.provider) r.provider = o.provider;
  if (o.kind) r.kind = o.kind;
  if (o.state) r.state = o.state;
  if (o.quota) r.quota = o.quota;
  if (o.gate) r.gate = o.gate;
  if (typeof o.gateLevel === 'number') r.gate_level = o.gateLevel;
  if (o.term) r.term = o.term;
  if (o.conf) r.conf = o.conf;
  if (o.copy) r.copy_url = o.copy;
  if (o.deliv) r.deliv = o.deliv;
  if (o.domestic) r.domestic = o.domestic;
  if (o.scope) r.scope = o.scope;
  if (o.endDate) r.end_date = o.endDate;
  return r;
});

// SQL 里用单引号包裹，字符串内的单引号必须双写
const json = JSON.stringify(rows).replace(/'/g, "''");

const setList = COLS.filter(function (c) { return c !== 'id'; })
  .map(function (c) { return c + ' = EXCLUDED.' + c; })
  .join(', ');

const sql =
  'INSERT INTO offers (' + COLS.join(',') + ') ' +
  'SELECT ' + COLS.join(',') + ' FROM jsonb_populate_recordset(NULL::offers, \'' + json + '\'::jsonb) ' +
  'ON CONFLICT (id) DO UPDATE SET ' + setList + ', updated_at = now()';

const idList = rows.map(function (r) { return "'" + r.id.replace(/'/g, "''") + "'"; }).join(',');

// 第二条语句：本轮没出现、但云端还标着在架的，降级为已结束（不删）
const staleSql =
  "UPDATE offers SET state = 'ended', updated_at = now() " +
  "WHERE state = 'live' AND id NOT IN (" + idList + ')';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_SQL, sql, 'utf8');
fs.writeFileSync(OUT_IDS, JSON.stringify({ staleSql: staleSql, count: rows.length }, null, 2), 'utf8');

console.log('条目 ' + rows.length + ' 条');
console.log('upsert SQL -> ' + OUT_SQL + ' (' + sql.length + ' 字符)');
console.log('过期标记 SQL -> ' + OUT_IDS);
