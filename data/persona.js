// 每个免费模型对应一个二次元形象。
// 形象由配色 + 发色 + 瞳色参数化生成，不依赖图片资源：
// 一是主包体积，二是新模型进来不用再画一张图。
const PERSONA = {
  'nvidia/nemotron-3-ultra-550b-a55b:free': {
    n: '诺拉', tag: '重装大姐姐', quote: '力气活交给我',
    hair: '#3f4b3a', eye: '#8fbf6a', bg: '#eef2e6', accent: '#6b7d5a'
  },
  'nvidia/nemotron-3.5-super-vl:free': {
    n: '薇尔', tag: '全能观察者', quote: '图、视频、字，我都看得懂',
    hair: '#4a3f6b', eye: '#9d8fd0', bg: '#efecf7', accent: '#6d5fa0'
  },
  'nvidia/nemotron-3.5-lightning:free': {
    n: '莱特', tag: '闪电小妹', quote: '慢一秒都算输',
    hair: '#8a6a12', eye: '#e0b53c', bg: '#fbf4e0', accent: '#c99a3f'
  },
  'stealth/crouton-alpha': {
    n: '克洛', tag: '神秘转学生', quote: '别问我是谁',
    hair: '#8d8d8d', eye: '#b8b8b8', bg: '#f2f1ee', accent: '#9a9a9a'
  },
  'google/gemma-4-31b-it:free': {
    n: '杰玛', tag: '正统优等生', quote: '按部就班，也不会出错',
    hair: '#1f4f8a', eye: '#5b9bd5', bg: '#e9f1fb', accent: '#2f6fb0'
  },
  'google/gemma-4-26b-a4b-it:free': {
    n: '米娅', tag: '双子的妹妹', quote: '我比姐姐轻一点',
    hair: '#2f7fa8', eye: '#79bcd8', bg: '#e8f4f9', accent: '#4a97b8'
  },
  'dots-studio/dots-3-note-preview:free': {
    n: '多特', tag: '笔记宅女', quote: '先记下来再说',
    hair: '#8a4a7a', eye: '#d07ab8', bg: '#f9edf5', accent: '#b05f97'
  },
  'recursive/flint-v1.0:free': {
    n: '弗林', tag: '打火机少女', quote: '一点就着',
    hair: '#a8442a', eye: '#e0764e', bg: '#fbeee9', accent: '#c05a38'
  },
  'xingchen-agi/xing4.0-29b-a4b:free': {
    n: '星禾', tag: '国风少女', quote: '慢慢来，比较快',
    hair: '#1f6b5e', eye: '#4fb39c', bg: '#e8f4f1', accent: '#2f8a78'
  },
  'cohere/north-mini-code:free': {
    n: '诺丝', tag: '代码宅', quote: '这段我帮你改',
    hair: '#1d3557', eye: '#5a7fa8', bg: '#eaf0f6', accent: '#35597d'
  },
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free': {
    n: '娜诺', tag: '万能小不点', quote: '我小，但我什么都会一点',
    hair: '#5b3f8a', eye: '#a98fd0', bg: '#f1ecf8', accent: '#7a5fa8'
  },
  'liquid/lfm-2.5-2.6b:free': {
    n: '莉可', tag: '小透明', quote: '存在感低，但很省',
    hair: '#3f8a7a', eye: '#7fc4b4', bg: '#e9f5f2', accent: '#57a894'
  },
  'nvidia/nemotron-3.5-content-safety:free': {
    n: '瑟芙', tag: '风纪委员', quote: '这条不能过',
    hair: '#3a4a5e', eye: '#7f93a8', bg: '#eef1f4', accent: '#5a6d82'
  },
  'google/lyria-3-pro-preview': {
    n: '莉瑞', tag: '音乐精灵', quote: '给我一句话，还你一段旋律',
    hair: '#8a6a1f', eye: '#e0b53c', bg: '#fbf3e2', accent: '#c9a03f'
  },
  'openrouter/free': {
    n: '罗特', tag: '万事屋老板', quote: '你要哪个，我给你转',
    hair: '#4a4a4a', eye: '#8f8f8f', bg: '#f1f0ec', accent: '#6d6a62'
  },

  // 主流付费模型（只在最爱榜出现）
  'anthropic/claude-opus-5.5': {
    n: '奥菲', tag: '老牌名门', quote: '贵，有贵的道理',
    hair: '#3b3a63', eye: '#8f8fd8', bg: '#eeedf7', accent: '#5b5aa0'
  },
  'openai/gpt-5.6-luna-pro': {
    n: '露娜', tag: '月光诗人', quote: '先想清楚，再动手',
    hair: '#6f7480', eye: '#b8c2d0', bg: '#f1f3f5', accent: '#8a93a0'
  },
  'google/gemini-4-argon': {
    n: '阿尔', tag: '氩气少女', quote: '一秒看完整本书',
    hair: '#2a6f8f', eye: '#5fb3d0', bg: '#e8f4f9', accent: '#3f8fb0'
  },
  'deepseek/deepseek-v4.1-flash': {
    n: '深闪', tag: '性价比之王', quote: '便宜，但我不将就',
    hair: '#1f4f6b', eye: '#4f9bc4', bg: '#e9f2f7', accent: '#2f7aa0'
  },
  'qwen/qwen3.8-max-prime': {
    n: '千问', tag: '大胃王', quote: '一次能吃一百万字',
    hair: '#a85a2a', eye: '#e08a4e', bg: '#fbeee6', accent: '#c0703a'
  },
  'moonshotai/kimi-k3.1-pro': {
    n: '奇米', tag: '长文专家', quote: '你写多少，我看多少',
    hair: '#2f5a4a', eye: '#6fae94', bg: '#e9f3ef', accent: '#457a66'
  },
  'z-ai/glm-5.3-prime': {
    n: '智谱', tag: '国产老将', quote: '稳，是我的风格',
    hair: '#5a3f8a', eye: '#a08fd0', bg: '#f1ecf8', accent: '#7a5fa8'
  },
  'x-ai/grok-4.7': {
    n: '格罗', tag: '嘴毒担当', quote: '你确定要问这个？',
    hair: '#3a2a2a', eye: '#c46a5a', bg: '#f5ecea', accent: '#8a4a3a'
  },
  'xiaomi/mimo-v2.6-pro': {
    n: '米莫', tag: '极速小妹', quote: '快，还要更快',
    hair: '#a84a72', eye: '#e07aa0', bg: '#fbeaf1', accent: '#c05f88'
  },
  'mistralai/mistral-large-4-0': {
    n: '米斯特', tag: '欧陆风', quote: '简约，但不简单',
    hair: '#b07a1a', eye: '#e0b04a', bg: '#fbf3e0', accent: '#c9902a'
  },
  'meta-llama/llama-4-maverick': {
    n: '马弗', tag: '开源大姐', quote: '谁都能带我回家',
    hair: '#4a5a6a', eye: '#8fa8c0', bg: '#eef1f4', accent: '#6a8098'
  },
  'anthropic/claude-sonnet-5.5': {
    n: '索妮', tag: '全能姐姐', quote: '什么都能聊两句',
    hair: '#2f5f8a', eye: '#6fa0cf', bg: '#eaf2f9', accent: '#4a80b0'
  }
};

module.exports = { PERSONA };
