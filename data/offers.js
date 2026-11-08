// 数据源与抓取时间如实记录，未核实的一律标「未核验」。
// gateLevel: 0 打开就用 / 1 要注册 / 2 要实名 / 3 要申请或限身份 / 4 要付费
const OFFERS = [
  {
    id: 'xfyun',
    name: '讯飞星辰 MaaS · 10 亿 Tokens',
    provider: '科大讯飞',
    kind: 'deal',
    state: 'live',
    quota: '10 亿 Tokens，用于调 Spark-X2.6（293B-A30B，1M 上下文）；用完转按量付费',
    gate: '注册登录 + 实名',
    gateLevel: 2,
    term: '领取截止与有效期，官方均未标注',
    conf: '转述',
    paid: false,
    copy: 'https://maas.xfyun.cn/modelSquare/base/2628905721051136',
    copyLabel: '复制官方链接'
  },
  {
    id: 'coze',
    name: '扣子 · 每日 1,500 积分',
    provider: '扣子 Coze',
    kind: 'deal',
    state: 'live',
    quota: '每日登录领 1,500 积分，当日有效，抵视频生成 / 云设备等高价资源',
    gate: '注册登录即可，不用绑卡',
    gateLevel: 1,
    term: '长期有效，每日发放',
    conf: '官方',
    paid: false,
    copy: 'https://docs.coze.cn/guides_20260119_coze_premium_upgraded',
    copyLabel: '复制官方链接'
  },
  {
    id: 'videogen',
    name: 'VideoGen · 100 万美元 credits 池',
    provider: 'VideoGen',
    kind: 'deal',
    state: 'live',
    quota: '$1M 免费 credits 池，按项目规模分配，并非申请即得',
    gate: '登录后 Request access，需说明创作内容',
    gateLevel: 3,
    term: '2026-12-31 前发完',
    conf: '官方',
    paid: false,
    copy: 'https://videogen.io/model-1',
    copyLabel: '复制官方链接'
  },
  {
    id: 'modian',
    name: '墨点计划 · 每月 10,000 墨点',
    provider: '书生 / SAGE',
    kind: 'deal',
    state: 'live',
    quota: '每月免费 10,000 墨点；Agents-A1、Atria-Dawn、Sage-A1.5、书生-S2 四模型标免费',
    gate: '注册 + 实名手机号',
    gateLevel: 2,
    term: '公测期免费，付费档即将上线',
    conf: '官方',
    paid: false,
    copy: 'https://discovery.sage-ai.org.cn/token-plan/home?tabIndex=0',
    copyLabel: '复制官方链接'
  },
  {
    id: 'base44',
    name: 'Base44 for Startups · 年度许可',
    provider: 'Base44',
    kind: 'deal',
    state: 'live',
    quota: 'Pro 价值 $960/年，或 Builder 价值 $480/年',
    gate: '仅限早期创业公司创始人，基金须在合作名单内',
    gateLevel: 3,
    term: '官方未给截止日',
    conf: '官方',
    paid: false,
    copy: 'https://base44.com/solutions/startups',
    copyLabel: '复制官方链接'
  },
  {
    id: 'libtv',
    name: 'LibTV 双十一 · 5 款视频模型 0 积分',
    provider: 'LibTV',
    kind: 'deal',
    state: 'live',
    quota: 'Wan 3.0 / Kling 4.0 / Minimax H3 / SD 2.0 Fast / SD 2.0 Mini 零积分畅用',
    gate: '年包会员专属，需先买年会员',
    gateLevel: 4,
    term: '首页倒计时 05:15:42:02（抓于 08:20）',
    conf: '官方',
    paid: true,
    copy: 'https://libtv.cgref.cn/aibot',
    copyLabel: '复制官方链接'
  },
  {
    id: 'kuku',
    name: '库库 AI · 第 3 期领积分',
    provider: '库库 AI',
    kind: 'deal',
    state: 'ended',
    quota: '登录 +50、对话 +50，邀请另送',
    gate: '百度账号登录',
    gateLevel: 1,
    term: '2026-09-25 已截止',
    conf: '官方',
    paid: false,
    copy: 'https://kuku.baidu.com/',
    copyLabel: '复制官方链接'
  },
  {
    id: 'zcode-comp',
    name: 'ZCode 风波补偿 · 重置卡与额度',
    provider: '智谱',
    kind: 'deal',
    state: 'ended',
    quota: '未核验',
    gate: '官方公告未取得',
    gateLevel: 1,
    term: '未核验',
    conf: '未核验',
    paid: false,
    copy: '',
    copyLabel: ''
  },
  {
    id: 'zcode-weekend',
    name: 'ZCode Weekend Plan · 3 亿 Tokens',
    provider: '智谱',
    kind: 'deal',
    state: 'ended',
    quota: '机制官方存在，3 亿这个数字无官方出处',
    gate: '领取页需登录',
    gateLevel: 1,
    term: '未核验',
    conf: '未核验',
    paid: false,
    copy: 'https://chat.z.ai/glm-coding-plan',
    copyLabel: '复制官方链接'
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'Nemotron 3 Ultra 550B',
    provider: 'NVIDIA · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费调用，1M 上下文，550B MoE',
    gate: '无需注册，OpenAI 兼容',
    gateLevel: 0,
    term: '限时免费，官方未标注截止',
    conf: '官方',
    paid: false,
    copy: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'nvidia/nemotron-3.5-super-vl:free',
    name: 'Nemotron 3.5 Super VL',
    provider: 'NVIDIA · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，1M 上下文，文 / 图 / 视频输入',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'nvidia/nemotron-3.5-super-vl:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron 3.5 Lightning',
    provider: 'NVIDIA · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，1M 上下文，纯文本',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'nvidia/nemotron-3.5-lightning:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'stealth/crouton-alpha',
    name: 'Crouton Alpha',
    provider: 'stealth · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，1M 上下文，文 / 图 / 视频 / 音频',
    gate: '无需注册',
    gateLevel: 0,
    term: '随时下架',
    conf: '官方',
    paid: false,
    copy: 'stealth/crouton-alpha',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Gemma 4 31B',
    provider: 'Google · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，262K 上下文，文 / 图 / 视频',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'google/gemma-4-31b-it:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'google/gemma-4-26b-a4b-it:free',
    name: 'Gemma 4 26B A4B',
    provider: 'Google · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，262K 上下文，文 / 图 / 视频',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'google/gemma-4-26b-a4b-it:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'dots-studio/dots-3-note-preview:free',
    name: 'Dots3-Note Preview',
    provider: 'Dots Studio · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，512K 上下文，文 / 图',
    gate: '无需注册',
    gateLevel: 0,
    term: '预览版，随时变',
    conf: '官方',
    paid: false,
    copy: 'dots-studio/dots-3-note-preview:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'recursive/flint-v1.0:free',
    name: 'Flint v1.0',
    provider: 'Recursive · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，262K 上下文，纯文本',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'recursive/flint-v1.0:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'xingchen-agi/xing4.0-29b-a4b:free',
    name: 'Xing4.0 29B A4B',
    provider: '星辰 · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，262K 上下文，纯文本',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'xingchen-agi/xing4.0-29b-a4b:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'cohere/north-mini-code:free',
    name: 'North Mini Code',
    provider: 'Cohere · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，256K 上下文，代码向',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'cohere/north-mini-code:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    name: 'Nemotron 3 Nano Omni',
    provider: 'NVIDIA · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，256K 上下文，全模态',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'liquid/lfm-2.5-2.6b:free',
    name: 'LFM2.5-2.6B',
    provider: 'Liquid AI · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，65K 上下文，小模型',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'liquid/lfm-2.5-2.6b:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'nvidia/nemotron-3.5-content-safety:free',
    name: 'Nemotron 3.5 Content Safety',
    provider: 'NVIDIA · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，128K，审核专用模型',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'nvidia/nemotron-3.5-content-safety:free',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'google/lyria-3-pro-preview',
    name: 'Lyria 3 Pro Preview',
    provider: 'Google · OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '免费，1M 上下文，文 / 图 → 音频',
    gate: '无需注册',
    gateLevel: 0,
    term: '限时免费',
    conf: '官方',
    paid: false,
    copy: 'google/lyria-3-pro-preview',
    copyLabel: '复制模型 ID'
  },
  {
    id: 'openrouter/free',
    name: 'Free Models Router',
    provider: 'OpenRouter',
    kind: 'model',
    state: 'live',
    quota: '自动路由到免费模型，200K 上下文',
    gate: '无需注册',
    gateLevel: 0,
    term: '长期',
    conf: '官方',
    paid: false,
    copy: 'openrouter/free',
    copyLabel: '复制模型 ID'
  }
];

// 接入形态：api 直接调接口 / client 客户端或 IDE 内使用 / web 网页里用
const DELIVERY = {
  xfyun: 'api',
  coze: 'client',
  videogen: 'web',
  modian: 'api',
  base44: 'web',
  libtv: 'web',
  kuku: 'web',
  'zcode-comp': 'client',
  'zcode-weekend': 'client'
};

// 国内可用性：按厂商与站点归属判断，未逐个实测。
// direct 国内可直连 / proxy 需代理 / unknown 未确认
const DOMESTIC = {
  xfyun: 'direct',
  coze: 'direct',
  videogen: 'proxy',
  modian: 'direct',
  base44: 'proxy',
  libtv: 'unknown',
  kuku: 'direct',
  'zcode-comp': 'direct',
  'zcode-weekend': 'direct'
};

// 免费范围：这条额度到底覆盖哪些模型 / 资源
const SCOPE = {
  xfyun: 'Spark-X2.6（293B-A30B，1M 上下文）',
  coze: '不适用。积分抵扣视频生成、云设备等资源',
  videogen: '不适用。给的是视频生成的 credits',
  modian: 'Agents-A1、Atria-Dawn、Sage-A1.5、书生-S2 四款标免费',
  base44: '不适用。给的是应用构建额度',
  libtv: 'Wan 3.0、Kling 4.0、Minimax H3、SD 2.0 Fast、SD 2.0 Mini',
  kuku: 'DeepSeek、智谱系列（用积分调用）',
  'zcode-comp': '未核验',
  'zcode-weekend': 'GLM 系列（额度未核验）'
};

// 确切的截止日期，只填官方写明或页面公告里能读到的；读不到就留 null，不猜。
const END_DATE = {
  libtv: '2026-11-11',
  videogen: '2026-12-31',
  kuku: '2026-09-25',
  'zcode-comp': '2026-10-07'
};

// 外部来源（cyber-egg 公开清单）转换而来的条目，见 data/offers-extra.js
const EXTRA = require('./offers-extra.js');
const ALL = OFFERS.concat(EXTRA);

ALL.forEach(function (o) {
  if (!o.deliv) o.deliv = DELIVERY[o.id] || 'api';
  if (!o.domestic) o.domestic = DOMESTIC[o.id] || (o.kind === 'model' ? 'proxy' : 'unknown');
  if (!o.scope) o.scope = SCOPE[o.id] || '该模型本身，OpenRouter 免费通道';
  if (o.endDate === undefined) o.endDate = END_DATE[o.id] || null;
});

module.exports = {
  fetchedAt: '2026-11-08 11:03',
  sources: 'saibodan.com · OpenRouter · cyber-egg',
  offers: ALL
};
