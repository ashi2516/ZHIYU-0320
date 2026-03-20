import type { ProviderType } from '@/lib/storage/schema';

export type ChatPayload = {
  apiKey: string;
  baseUrl: string;
  model: string;
  providerType: ProviderType;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
};

function filterParams(payload: ChatPayload) {
  const params: Record<string, unknown> = {
    model: payload.model,
    messages: payload.messages,
  };

  if (typeof payload.temperature === 'number') params.temperature = payload.temperature;

  // 第一版只处理当前实际用到的 maxTokens 映射
  if (typeof payload.maxTokens === 'number') {
    params.max_tokens = payload.maxTokens;
  }

  return params;
}

export async function requestChatCompletion(payload: ChatPayload): Promise<string> {
  const body = filterParams(payload);
  const endpoint = `${payload.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${payload.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Provider(${payload.providerType}) request failed: ${response.status} ${text}`);
  }

  const json = await response.json();
  return json?.choices?.[0]?.message?.content ?? '';
}
