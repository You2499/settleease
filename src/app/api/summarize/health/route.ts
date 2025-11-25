import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  const checks = {
    geminiApiKey: !!process.env.GEMINI_API_KEY,
    supabaseUrl: !!SUPABASE_URL,
    supabaseServiceKey: !!SUPABASE_SERVICE_KEY,
    promptFetch: false,
    promptVersion: null as number | null,
  };

  try {
    // Try to fetch the active prompt
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('version')
      .eq('name', 'trump-summarizer')
      .eq('is_active', true)
      .single();

    if (!error && data) {
      checks.promptFetch = true;
      checks.promptVersion = data.version;
    }
  } catch (error) {
    // Prompt fetch failed
  }

  const allHealthy = Object.values(checks).every(v => v === true || typeof v === 'number');

  return new Response(
    JSON.stringify({
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    }),
    {
      status: allHealthy ? 200 : 503,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
