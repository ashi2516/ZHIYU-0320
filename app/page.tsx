'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ProviderType = 'openai' | 'deepseek';

type SettingsResponse = {
  provider: {
    activeProvider: ProviderType;
    providers: Array<{
      providerType: ProviderType;
      baseUrl: string;
      model: string;
      enabled: boolean;
      apiKeyMasked?: string;
      apiKeyStored?: boolean;
    }>;
  };
  modelTuning: { temperature: number; maxTokens: number };
  prompt: { systemPrompt: string; persona: string };
  memory: { coreMemory: string; longTermSummary: string; longTermEnabled: boolean };
};

type Message = { id: string; role: 'user' | 'assistant'; content: string; createdAt: string };

type SessionResponse = {
  id: 'default';
  title: string;
  messages: Message[];
  lastHitLorebookEntryIds: string[];
};

export default function Page() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hits, setHits] = useState<Array<{ id: string; title: string }>>([]);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [providerKeys, setProviderKeys] = useState<Record<ProviderType, string>>({ openai: '', deepseek: '' });

  const activeProvider = settings?.provider.activeProvider;

  const activeProviderConfig = useMemo(
    () => settings?.provider.providers.find((item) => item.providerType === activeProvider),
    [settings, activeProvider],
  );

  async function loadInitial() {
    const [settingsRes, sessionRes] = await Promise.all([
      fetch('/api/settings').then((r) => r.json()),
      fetch('/api/session').then((r) => r.json()),
    ]);
    setSettings(settingsRes);
    setSession(sessionRes);
  }

  useEffect(() => {
    loadInitial().catch((e) => setError(e.message));
  }, []);

  async function saveSettings(next: SettingsResponse, saveKeys = false) {
    const providerSecrets = saveKeys
      ? {
          openai: { apiKey: providerKeys.openai },
          deepseek: { apiKey: providerKeys.deepseek },
        }
      : undefined;

    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: next, providerSecrets }),
    });
    const json = await res.json();
    setSettings(json.masked);
    if (saveKeys) {
      setProviderKeys({ openai: '', deepseek: '' });
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? '发送失败');
      setSession(json.session);
      setHits(json.hits ?? []);
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }

  if (!settings || !session) {
    return <div className="app"><div className="chat-area"><div className="header">Loading...</div></div></div>;
  }

  return (
    <main className="app">
      <section className="chat-area">
        <header className="header">
          <div>
            <strong>Chat Space MVP</strong>
            <div className="meta">当前 Provider：{activeProviderConfig?.providerType}</div>
          </div>
          <button className="mobile-toggle" onClick={() => setMobileSettingsOpen((v) => !v)}>设置</button>
        </header>

        <div className="messages">
          {hits.length > 0 && (
            <div className="meta">命中世界书：{hits.map((h) => h.title).join('、')}</div>
          )}
          {session.messages.map((message) => (
            <div key={message.id} className={`bubble ${message.role}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ))}
        </div>

        <footer className="composer">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入消息..." rows={3} />
          <button disabled={loading} onClick={sendMessage}>{loading ? '发送中...' : '发送'}</button>
        </footer>
      </section>

      <aside className={`settings ${mobileSettingsOpen ? 'open' : ''}`}>
        <div className="panel">
          <h3>Provider 切换</h3>
          <select
            value={settings.provider.activeProvider}
            onChange={(e) => {
              const activeProvider = e.target.value as ProviderType;
              const next = { ...settings, provider: { ...settings.provider, activeProvider } };
              setSettings(next);
              saveSettings(next).catch((err) => setError(err.message));
            }}
          >
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </div>

        {settings.provider.providers.map((provider) => (
          <div key={provider.providerType} className="panel">
            <h3>{provider.providerType.toUpperCase()}</h3>
            <label>Base URL</label>
            <input
              value={provider.baseUrl}
              onChange={(e) => {
                const providers = settings.provider.providers.map((item) =>
                  item.providerType === provider.providerType ? { ...item, baseUrl: e.target.value } : item,
                );
                setSettings({ ...settings, provider: { ...settings.provider, providers } });
              }}
            />
            <label>Model</label>
            <input
              value={provider.model}
              onChange={(e) => {
                const providers = settings.provider.providers.map((item) =>
                  item.providerType === provider.providerType ? { ...item, model: e.target.value } : item,
                );
                setSettings({ ...settings, provider: { ...settings.provider, providers } });
              }}
            />
            <label>API Key（已保存：{provider.apiKeyStored ? provider.apiKeyMasked : '无'}）</label>
            <input
              type="password"
              placeholder="输入新 key 后点击保存设置"
              value={providerKeys[provider.providerType]}
              onChange={(e) => setProviderKeys((prev) => ({ ...prev, [provider.providerType]: e.target.value }))}
            />
          </div>
        ))}

        <div className="panel">
          <h3>System Prompt（仅参与上下文）</h3>
          <textarea
            rows={3}
            value={settings.prompt.systemPrompt}
            onChange={(e) => setSettings({ ...settings, prompt: { ...settings.prompt, systemPrompt: e.target.value } })}
          />
          <h3>Persona</h3>
          <textarea
            rows={3}
            value={settings.prompt.persona}
            onChange={(e) => setSettings({ ...settings, prompt: { ...settings.prompt, persona: e.target.value } })}
          />
          <h3>核心记忆</h3>
          <textarea
            rows={3}
            value={settings.memory.coreMemory}
            onChange={(e) => setSettings({ ...settings, memory: { ...settings.memory, coreMemory: e.target.value } })}
          />
          <h3>长期记忆摘要（手动）</h3>
          <textarea
            rows={3}
            value={settings.memory.longTermSummary}
            onChange={(e) => setSettings({ ...settings, memory: { ...settings.memory, longTermSummary: e.target.value } })}
          />
          <label>
            <input
              type="checkbox"
              checked={settings.memory.longTermEnabled}
              onChange={(e) => setSettings({ ...settings, memory: { ...settings.memory, longTermEnabled: e.target.checked } })}
            />
            启用长期记忆摘要
          </label>
        </div>

        <div className="panel">
          <h3>模型参数</h3>
          <label>temperature</label>
          <input
            type="number"
            step="0.1"
            min={0}
            max={2}
            value={settings.modelTuning.temperature}
            onChange={(e) => setSettings({ ...settings, modelTuning: { ...settings.modelTuning, temperature: Number(e.target.value) } })}
          />
          <label>maxTokens</label>
          <input
            type="number"
            min={1}
            max={8192}
            value={settings.modelTuning.maxTokens}
            onChange={(e) => setSettings({ ...settings, modelTuning: { ...settings.modelTuning, maxTokens: Number(e.target.value) } })}
          />
        </div>

        <button onClick={() => saveSettings(settings, true).catch((e) => setError(e.message))}>保存设置</button>
        {error && <p className="meta" style={{ color: '#fca5a5' }}>{error}</p>}
      </aside>
    </main>
  );
}
