import type { LorebookData } from '@/lib/storage/schema';

export function matchLorebookEntries(input: string, lorebook: LorebookData) {
  const text = input.toLowerCase();
  return lorebook.entries.filter((entry) => {
    if (!entry.enabled) return false;
    return entry.keywords.some((keyword) => keyword && text.includes(keyword.toLowerCase()));
  });
}
