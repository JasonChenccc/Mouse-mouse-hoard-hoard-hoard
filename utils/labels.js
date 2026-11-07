// 展示层文案与标签的唯一出处。
// 以前同一组文案在天梯页、详情页、规则弹窗各写一份，改一处就会说两套话。
// 档位名字和 key 从 repo 取，这里只管「怎么描述」，不重复定义名字。
const repo = require('./repo.js');

// 门槛等级：索引 = gateLevel
const GATE = ['打开就用', '要注册', '要实名', '要申请', '要付费'];

// 可信度对应的样式类，页面不要再各写一份映射
const CONF_CLS = { '官方': 'ok', '转述': 'mid', '未核验': 'bad' };

// 接入形态的显示名
const DELIV_TEXT = { api: 'API', client: '客户端', web: '网页' };

// 每个档位一句话。顺序必须与 repo.TIER_KEYS 一致
const DESC = [
  '信息有疑问，先核对再领',
  '顺手领一下，不专门跑一趟',
  '值得花五分钟，能省一笔',
  '今天就得去，错过很亏'
];

// 天梯顶部的规则速览，直接用它渲染
const RULES = repo.TIER_KEYS.map(function (k, i) {
  return { k: k, name: repo.TIER_NAMES[i], desc: DESC[i] };
});

// 投票按钮用的档位表（带权重与样式类）
const TIERS = repo.TIER_KEYS.map(function (k, i) {
  return { k: k, n: repo.TIER_NAMES[i], w: i + 1, cls: k };
});

// 完整规则原文。档位名从 repo 插值，改名后这里自动跟着变
const RULE_FULL =
  '一档票数超过总票数的一半，才算定档（例如 3 人里 2 人都投超大杯）。' +
  '没过半就标「分歧」，不硬塞进任何一档。\n\n' +
  '「' + repo.TIER_NAMES[0] + '」不是评价档位，是纠错标记：' +
  '表示这条的额度、期限或门槛与官方对不上，提醒别人先核对再领。\n\n' +
  '幻神由「超大杯」里占比最高的一条独占，并列则空置；' +
  '标为伪免费的不参选；已结束的退出排名。';

module.exports = {
  GATE: GATE,
  CONF_CLS: CONF_CLS,
  DELIV_TEXT: DELIV_TEXT,
  RULES: RULES,
  TIERS: TIERS,
  RULE_FULL: RULE_FULL
};
