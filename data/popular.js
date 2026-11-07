// 主流付费模型：只影响「最爱榜」，不进免费天梯。
// 价格单位为美元 / 百万 tokens，取自 OpenRouter /api/v1/models（2026-11-06）。
module.exports = [
  { id: 'anthropic/claude-opus-5.5', name: 'Claude Opus 5.5', provider: 'Anthropic', ctx: 1000000, pin: 4.0, pout: 20.0 },
  { id: 'openai/gpt-5.6-luna-pro', name: 'GPT-5.6 Luna Pro', provider: 'OpenAI', ctx: 1050000, pin: 0.2, pout: 1.2 },
  { id: 'google/gemini-4-argon', name: 'Gemini 4 Argon', provider: 'Google', ctx: 1048576, pin: 2.0, pout: 10.0 },
  { id: 'deepseek/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', provider: 'DeepSeek', ctx: 1048576, pin: 0.045, pout: 0.5 },
  { id: 'qwen/qwen3.8-max-prime', name: 'Qwen3.8 Max Prime', provider: '阿里', ctx: 1000000, pin: 4.0, pout: 12.0 },
  { id: 'moonshotai/kimi-k3.1-pro', name: 'Kimi K3.1 Pro', provider: '月之暗面', ctx: 1048576, pin: 2.0, pout: 10.0 },
  { id: 'z-ai/glm-5.3-prime', name: 'GLM-5.3 Prime', provider: '智谱', ctx: 1000000, pin: 2.8, pout: 8.8 },
  { id: 'x-ai/grok-4.7', name: 'Grok 4.7', provider: 'xAI', ctx: 500000, pin: 2.0, pout: 6.0 },
  { id: 'xiaomi/mimo-v2.6-pro', name: 'MiMo V2.6 Pro', provider: '小米', ctx: 1050000, pin: 0.435, pout: 0.87 },
  { id: 'mistralai/mistral-large-4-0', name: 'Mistral Large 4.0', provider: 'Mistral', ctx: 1048576, pin: 0.7, pout: 2.1 },
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', ctx: 524288, pin: 0.35, pout: 1.0 },
  { id: 'anthropic/claude-sonnet-5.5', name: 'Claude Sonnet 5.5', provider: 'Anthropic', ctx: 1000000, pin: 2.0, pout: 10.0 }
];
