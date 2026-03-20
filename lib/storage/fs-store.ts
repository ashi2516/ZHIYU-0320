import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  appSettingsSchema,
  lorebookSchema,
  sessionSchema,
  type AppSettings,
  type LorebookData,
  type ProviderType,
  type SessionData,
} from './schema';

const dataDir = path.join(process.cwd(), 'data');
const settingsPath = path.join(dataDir, 'settings.json');
const secretsPath = path.join(dataDir, 'providers.secrets.json');
const sessionPath = path.join(dataDir, 'sessions', 'default.json');
const lorebookPath = path.join(dataDir, 'lorebook.json');
const roleProfilesPath = path.join(dataDir, 'role-profiles.json');

type ProviderSecrets = Record<ProviderType, { apiKey?: string }>;

const defaultSettings: AppSettings = {
  provider: {
    activeProvider: 'openai',
    providers: [
      {
        providerType: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        enabled: true,
      },
      {
        providerType: 'deepseek',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        enabled: true,
      },
    ],
  },
  modelTuning: { temperature: 0.8, maxTokens: 1024 },
  prompt: { systemPrompt: '', persona: '' },
  memory: { coreMemory: '', longTermSummary: '', longTermEnabled: false },
  theme: { mode: 'dark' },
  ui: { mobileSettingsOpen: false },
};

const defaultSession: SessionData = {
  id: 'default',
  title: '默认会话',
  messages: [],
  lastHitLorebookEntryIds: [],
  updatedAt: new Date().toISOString(),
};

const defaultLorebook: LorebookData = { entries: [] };

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    await ensureDir(filePath);
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

async function writeJson<T>(filePath: string, value: T) {
  await ensureDir(filePath);
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

function maskApiKey(value?: string) {
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export async function getSettingsWithMask() {
  const parsed = appSettingsSchema.parse(await readJson(settingsPath, defaultSettings));
  const secrets = await readJson<ProviderSecrets>(secretsPath, { openai: {}, deepseek: {} });

  const providers = parsed.provider.providers.map((item) => {
    const secret = secrets[item.providerType];
    return {
      ...item,
      apiKeyMasked: maskApiKey(secret?.apiKey),
      apiKeyStored: Boolean(secret?.apiKey),
    };
  });

  return { ...parsed, provider: { ...parsed.provider, providers } };
}

export async function updateSettings(payload: AppSettings) {
  const parsed = appSettingsSchema.parse(payload);
  await writeJson(settingsPath, parsed);
  return parsed;
}

export async function updateProviderSecrets(
  updates: Partial<Record<ProviderType, { apiKey?: string }>>,
) {
  const secrets = await readJson<ProviderSecrets>(secretsPath, { openai: {}, deepseek: {} });
  for (const key of Object.keys(updates) as ProviderType[]) {
    const nextValue = updates[key]?.apiKey;
    if (typeof nextValue === 'string' && nextValue.trim()) {
      secrets[key] = { apiKey: nextValue.trim() };
    }
  }
  await writeJson(secretsPath, secrets);
}

export async function getProviderSecret(providerType: ProviderType) {
  const secrets = await readJson<ProviderSecrets>(secretsPath, { openai: {}, deepseek: {} });
  return secrets[providerType]?.apiKey;
}

export async function getSession() {
  return sessionSchema.parse(await readJson(sessionPath, defaultSession));
}

export async function saveSession(payload: SessionData) {
  const parsed = sessionSchema.parse(payload);
  await writeJson(sessionPath, parsed);
  return parsed;
}

export async function getLorebook() {
  return lorebookSchema.parse(await readJson(lorebookPath, defaultLorebook));
}

export async function saveLorebook(payload: LorebookData) {
  const parsed = lorebookSchema.parse(payload);
  await writeJson(lorebookPath, parsed);
  return parsed;
}

export async function ensureRoleProfilesFile() {
  await readJson(roleProfilesPath, { activeRoleId: '', roles: [] });
}
