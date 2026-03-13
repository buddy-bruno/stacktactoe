import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ihhxipwzazrcwqynhlmq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaHhpcHd6YXpyY3dxeW5obG1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNDU3MDksImV4cCI6MjA4ODgyMTcwOX0.yJvjIzBMogmwYV8YmPBgUjZYkJj-GIYUQX6qd0fC0xo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
