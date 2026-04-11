import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/_generated/api';
import {
  DEFAULT_PRODUCTION_SUMMARY_PROMPT,
  SUMMARY_PROMPT_PLACEHOLDER,
} from '@/lib/settleease/aiSummarization';
import { getConvexUrl } from '@/lib/settleease/convexUrl';

const convexUrl = getConvexUrl();

export async function GET() {
  const checks = {
    geminiApiKey: !!process.env.GEMINI_API_KEY,
    convexUrl: !!convexUrl,
    promptFetch: false,
    promptHasPlaceholder: false,
    promptVersion: null as number | null,
  };

  try {
    const prompt = await fetchQuery(api.app.getActiveAiPrompt, {
      name: 'trump-summarizer',
    }, { url: convexUrl });
    const promptText = prompt?.prompt_text || DEFAULT_PRODUCTION_SUMMARY_PROMPT;

    checks.promptFetch = true;
    checks.promptVersion = prompt?.version || 2;
    checks.promptHasPlaceholder = promptText.includes(SUMMARY_PROMPT_PLACEHOLDER);
  } catch (error) {
    checks.promptFetch = false;
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
