import { NextResponse } from 'next/server';
import { buildContextMessages } from '@/lib/core/context-builder';
import { matchLorebookEntries } from '@/lib/core/lorebook-matcher';
import { requestChatCompletion } from '@/lib/llm/provider';
import {
  getLorebook,
  getProviderSecret,
  getSettingsWithMask,
  getSession,
  saveSession,
} from '@/lib/storage/fs-store';

function createId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message: string };
    const userInput = body.message?.trim();

    if (!userInput) {
      return NextResponse.json({ error: '消息不能为空。' }, { status: 400 });
    }

    const [settings, session, lorebook] = await Promise.all([
      getSettingsWithMask(),
      getSession(),
      getLorebook(),
    ]);

    const activeProvider = settings.provider.activeProvider;
    const providerConfig = settings.provider.providers.find(
      (item) => item.providerType === activeProvider,
    );

    if (!providerConfig) {
      return NextResponse.json({ error: `未找到 provider: ${activeProvider}` }, { status: 400 });
    }

    const apiKey = await getProviderSecret(activeProvider);
    if (!apiKey) {
      return NextResponse.json({ error: `Provider(${activeProvider}) 未配置 API key。` }, { status: 400 });
    }

    const nextSession = {
      ...session,
      messages: [
        ...session.messages,
        {
          id: createId(),
          role: 'user' as const,
          content: userInput,
          createdAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    const hits = matchLorebookEntries(userInput, lorebook);
    const contextMessages = buildContextMessages(settings, nextSession, hits);

    const assistantReply = await requestChatCompletion({
      apiKey,
      baseUrl: providerConfig.baseUrl,
      model: providerConfig.model,
      providerType: providerConfig.providerType,
      messages: contextMessages,
      temperature: settings.modelTuning.temperature,
      maxTokens: settings.modelTuning.maxTokens,
    });

    const saved = await saveSession({
      ...nextSession,
      lastHitLorebookEntryIds: hits.map((item) => item.id),
      messages: [
        ...nextSession.messages,
        {
          id: createId(),
          role: 'assistant',
          content: assistantReply,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    return NextResponse.json({
      session: saved,
      hits: hits.map((item) => ({ id: item.id, title: item.title })),
      provider: activeProvider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
