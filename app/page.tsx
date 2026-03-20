'use client';

import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ProviderType = 'openai' | 'deepseek';
type SettingsTab = 'provider' | 'prompt' | 'memory' | 'lorebook' | 'appearance';

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
  const [activeTab, setActiveTab] = useState<SettingsTab>('provider');
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
    return <div className="app"><div className="loading-shell">正在进入聊天空间…</div></div>;
  }

  return (
    <main className="app">
      <section className="chat-column">
        <header className="chat-header card-soft">
          <div>
            <h1>My Chat Room</h1>
            <p>安静地聊一会儿。当前模型来源：{activeProviderConfig?.providerType}</p>
          </div>
          <button className="mobile-toggle ghost-btn" onClick={() => setMobileSettingsOpen((v) => !v)}>
            {mobileSettingsOpen ? '收起设置' : '打开设置'}
          </button>
        </header>

        <div className="chat-shell card-glow">
          <div className="messages">
            {hits.length > 0 && <div className="hit-chip">本轮命中世界书：{hits.map((h) => h.title).join('、')}</div>}

            {session.messages.length === 0 && (
              <div className="empty-state">
                <h2>欢迎来到你的私人聊天空间</h2>
                <p>可以从今天的心情、一个想法，或者一句问候开始。</p>
              </div>
            )}

            {session.messages.map((message) => (
              <div key={message.id} className={`bubble ${message.role}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            ))}
          </div>

          <footer className="composer">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="写点什么吧…"
              rows={3}
            />
            <button className="primary-btn" disabled={loading} onClick={sendMessage}>
              {loading ? '发送中…' : '发送'}
            </button>
          </footer>
        </div>
      </section>

      <aside className={`settings-column card-soft ${mobileSettingsOpen ? 'open' : ''}`}>
        <div className="settings-header">
          <h2>空间设置</h2>
          <p>分组管理，减少压迫感</p>
        </div>

        <div className="tab-row">
          {([
            ['provider', 'Provider'],
            ['prompt', 'Prompt'],
            ['memory', '记忆'],
            ['lorebook', '世界书'],
            ['appearance', '外观'],
          ] as Array<[SettingsTab, string]>).map(([key, label]) => (
            <button
              key={key}
              className={`tab-btn ${activeTab === key ? 'active' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="settings-body">
          {activeTab === 'provider' && (
            <section className="panel-card">
              <h3>Provider 切换</h3>
              <label>当前聊天 Provider</label>
              <select
                value={settings.provider.activeProvider}
                onChange={(e) => {
                  const selected = e.target.value as ProviderType;
                  const next = { ...settings, provider: { ...settings.provider, activeProvider: selected } };
                  setSettings(next);
                  saveSettings(next).catch((err) => setError(err.message));
                }}
              >
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
              </select>

              {settings.provider.providers.map((provider) => (
                <details key={provider.providerType} className="sub-card" open={provider.providerType === settings.provider.activeProvider}>
                  <summary>{provider.providerType.toUpperCase()} 配置</summary>
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
                </details>
              ))}
            </section>
          )}

          {activeTab === 'prompt' && (
            <section className="panel-card">
              <h3>Prompt</h3>
              <label>System Prompt（仅参与上下文）</label>
              <textarea
                rows={4}
                value={settings.prompt.systemPrompt}
                onChange={(e) => setSettings({ ...settings, prompt: { ...settings.prompt, systemPrompt: e.target.value } })}
              />

              <label>Persona</label>
              <textarea
                rows={4}
                value={settings.prompt.persona}
                onChange={(e) => setSettings({ ...settings, prompt: { ...settings.prompt, persona: e.target.value } })}
              />
            </section>
          )}

          {activeTab === 'memory' && (
            <section className="panel-card">
              <h3>记忆</h3>
              <label>核心记忆</label>
              <textarea
                rows={4}
                value={settings.memory.coreMemory}
                onChange={(e) => setSettings({ ...settings, memory: { ...settings.memory, coreMemory: e.target.value } })}
              />

              <label>长期记忆摘要（手动）</label>
              <textarea
                rows={4}
                value={settings.memory.longTermSummary}
                onChange={(e) => setSettings({ ...settings, memory: { ...settings.memory, longTermSummary: e.target.value } })}
              />

              <label className="switch-line">
                <input
                  type="checkbox"
                  checked={settings.memory.longTermEnabled}
                  onChange={(e) => setSettings({ ...settings, memory: { ...settings.memory, longTermEnabled: e.target.checked } })}
                />
                启用长期记忆摘要
              </label>

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
            </section>
          )}

          {activeTab === 'lorebook' && (
            <section className="panel-card">
              <h3>世界书</h3>
              <p className="muted">当前版本为关键词命中注入。你可以先通过 API 编辑 `lorebook` 数据。</p>
            </section>
          )}

          {activeTab === 'appearance' && (
            <section className="panel-card">
              <h3>外观</h3>
              <p className="muted">当前已采用柔和深色主题、卡片层次与移动端抽屉设置布局。</p>
            </section>
          )}
        </div>

        <button className="primary-btn save-btn" onClick={() => saveSettings(settings, true).catch((e) => setError(e.message))}>
          保存设置
        </button>

        {error && <p className="error-text">{error}</p>}
      </aside>
    </main>
  );
}
