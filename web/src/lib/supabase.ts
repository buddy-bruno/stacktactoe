import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ihhxipwzazrcwqynhlmq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaHhpcHd6YXpyY3dxeW5obG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDU3MDksImV4cCI6MjA4ODgyMTcwOX0.yJvjIzBMogmwYV8YmPBgUjZYkJj-GIYUQX6qd0fC0xo';

/** Fängt Netzwerkfehler ab. Auth: 200 + null Session (kein AuthApiError), Rest: 503. */
const safeFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    const isAuth = url.includes('/auth/v1/');
    if (isAuth) {
      return new Response(
        JSON.stringify({ user: null, session: null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(
      JSON.stringify({ error: 'Service Unavailable', message: 'Netzwerk nicht erreichbar' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: safeFetch },
});
