import type { AppSettings, SessionData } from '@/lib/storage/schema';

export function buildContextMessages(
  settings: AppSettings,
  session: SessionData,
  loreHits: Array<{ title: string; content: string }>,
) {
  const systemBlocks: string[] = [];

  if (settings.prompt.systemPrompt.trim()) {
    systemBlocks.push(`[System Prompt]\n${settings.prompt.systemPrompt.trim()}`);
  }

  if (settings.prompt.persona.trim()) {
    systemBlocks.push(`[Persona]\n${settings.prompt.persona.trim()}`);
  }

  if (settings.memory.coreMemory.trim()) {
    systemBlocks.push(`[Core Memory]\n${settings.memory.coreMemory.trim()}`);
  }

  if (settings.memory.longTermEnabled && settings.memory.longTermSummary.trim()) {
    systemBlocks.push(`[Long Term Summary]\n${settings.memory.longTermSummary.trim()}`);
  }

  if (loreHits.length > 0) {
    const lore = loreHits.map((item) => `- ${item.title}: ${item.content}`).join('\n');
    systemBlocks.push(`[Lorebook Hits]\n${lore}`);
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

  if (systemBlocks.length > 0) {
    messages.push({ role: 'system', content: systemBlocks.join('\n\n') });
  }

  for (const item of session.messages) {
    messages.push({ role: item.role, content: item.content });
  }

  return messages;
}
