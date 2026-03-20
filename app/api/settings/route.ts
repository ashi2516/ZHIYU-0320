import { NextResponse } from 'next/server';
import {
  ensureRoleProfilesFile,
  getSettingsWithMask,
  updateProviderSecrets,
  updateSettings,
} from '@/lib/storage/fs-store';
import type { AppSettings, ProviderType } from '@/lib/storage/schema';

export async function GET() {
  await ensureRoleProfilesFile();
  const settings = await getSettingsWithMask();
  return NextResponse.json(settings);
}

type SettingsUpdatePayload = {
  settings: AppSettings;
  providerSecrets?: Partial<Record<ProviderType, { apiKey?: string }>>;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as SettingsUpdatePayload;

  if (payload.providerSecrets) {
    await updateProviderSecrets(payload.providerSecrets);
  }

  const saved = await updateSettings(payload.settings);
  const masked = await getSettingsWithMask();

  return NextResponse.json({ saved, masked });
}
