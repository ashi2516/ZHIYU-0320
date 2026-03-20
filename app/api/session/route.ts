import { NextResponse } from 'next/server';
import { getSession, saveSession } from '@/lib/storage/fs-store';
import { sessionSchema } from '@/lib/storage/schema';

export async function GET() {
  const data = await getSession();
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = sessionSchema.parse(payload);
  const saved = await saveSession(parsed);
  return NextResponse.json(saved);
}
