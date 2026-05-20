export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import type { NavCredentials } from '@/lib/nav/types';
import { tokenExchange } from '@/lib/nav/client';
import { passwordHash } from '@/lib/nav/crypto';

interface TestConnectionBody {
  username: string;
  password: string;
  signatureKey: string;
  exchangeKey: string;
  environment: 'test' | 'prod';
  taxNumber: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: TestConnectionBody;

  try {
    body = (await req.json()) as TestConnectionBody;
  } catch {
    return NextResponse.json(
      { success: false, message: 'Érvénytelen kérés.' },
      { status: 400 },
    );
  }

  const { username, password, signatureKey, exchangeKey, environment, taxNumber } = body;

  if (!username || !password || !signatureKey || !exchangeKey) {
    return NextResponse.json(
      { success: false, message: 'Minden mező kitöltése kötelező.' },
      { status: 400 },
    );
  }

  const creds: NavCredentials = {
    username,
    passwordHash: passwordHash(password),
    signatureKey,
    exchangeKey,
    environment: environment ?? 'test',
    taxNumber: taxNumber ?? '',
  };

  try {
    await tokenExchange(creds);
    return NextResponse.json({ success: true, message: 'Kapcsolat OK' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ismeretlen hiba';
    return NextResponse.json({ success: false, message }, { status: 200 });
  }
}
