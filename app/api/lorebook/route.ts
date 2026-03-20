import { NextResponse } from 'next/server';
import { getLorebook, saveLorebook } from '@/lib/storage/fs-store';
import { lorebookSchema } from '@/lib/storage/schema';

export async function GET() {
  const data = await getLorebook();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = lorebookSchema.parse(payload);
  const saved = await saveLorebook(parsed);
  return NextResponse.json(saved);
}
