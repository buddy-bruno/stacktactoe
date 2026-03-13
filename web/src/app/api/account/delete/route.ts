import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Server-Konfiguration fehlt.' },
      { status: 500 }
    );
  }
  if (!supabaseServiceRoleKey) {
    return NextResponse.json(
      { error: 'Kontolöschung ist nicht konfiguriert (SUPABASE_SERVICE_ROLE_KEY fehlt).' },
      { status: 503 }
    );
  }

  let body: { access_token?: string; refresh_token?: string };
  try {
    body = (await request.json()) as { access_token?: string; refresh_token?: string };
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  const { access_token, refresh_token } = body;
  if (!access_token || !refresh_token) {
    return NextResponse.json(
      { error: 'Session fehlt. Bitte erneut anmelden.' },
      { status: 401 }
    );
  }

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { session }, error: sessionError } = await anonClient.auth.setSession({
    access_token,
    refresh_token,
  });

  if (sessionError || !session?.user?.id) {
    return NextResponse.json(
      { error: 'Session ungültig oder abgelaufen.' },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message ?? 'Löschung fehlgeschlagen.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
