import { z } from 'zod';

export const providerTypeSchema = z.enum(['openai', 'deepseek']);

export const providerConfigSchema = z.object({
  providerType: providerTypeSchema,
  baseUrl: z.string().url(),
  model: z.string().min(1),
  enabled: z.boolean().default(true),
});

export const appSettingsSchema = z.object({
  provider: z.object({
    activeProvider: providerTypeSchema,
    providers: z.array(providerConfigSchema).min(2),
  }),
  modelTuning: z.object({
    temperature: z.number().min(0).max(2).default(0.8),
    maxTokens: z.number().int().min(1).max(8192).default(1024),
  }),
  prompt: z.object({
    systemPrompt: z.string().default(''),
    persona: z.string().default(''),
  }),
  memory: z.object({
    coreMemory: z.string().default(''),
    longTermSummary: z.string().default(''),
    longTermEnabled: z.boolean().default(false),
  }),
  theme: z.object({
    mode: z.enum(['dark', 'light']).default('dark'),
  }),
  ui: z.object({
    mobileSettingsOpen: z.boolean().default(false),
  }),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.string(),
});

export const sessionSchema = z.object({
  id: z.literal('default'),
  title: z.string().default('默认会话'),
  messages: z.array(chatMessageSchema).default([]),
  lastHitLorebookEntryIds: z.array(z.string()).default([]),
  updatedAt: z.string(),
});

export const lorebookEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  keywords: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  updatedAt: z.string(),
});

export const lorebookSchema = z.object({
  entries: z.array(lorebookEntrySchema).default([]),
});

export type ProviderType = z.infer<typeof providerTypeSchema>;
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type SessionData = z.infer<typeof sessionSchema>;
export type LorebookData = z.infer<typeof lorebookSchema>;
