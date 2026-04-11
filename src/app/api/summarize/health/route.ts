import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/_generated/api';
import {
  DEFAULT_PRODUCTION_SUMMARY_PROMPT,
  SETTLEMENT_SUMMARY_PROMPT_NAME,
  SUMMARY_PROMPT_PLACEHOLDER,
} from '@/lib/settleease/aiSummarization';
import { getConvexUrl } from '@/lib/settleease/convexUrl';
import { fetchActiveAiModelConfig } from '@/lib/settleease/aiModelConfigServer';
import { getAiModelOption } from '@/lib/settleease/aiModels';

const convexUrl = getConvexUrl();

export async function GET() {
  const checks = {
    geminiApiKey: !!process.env.GEMINI_API_KEY,
    convexUrl: !!convexUrl,
    promptFetch: false,
    promptHasPlaceholder: false,
    promptVersion: null as number | null,
    activeModel: null as string | null,
    activeModelName: null as string | null,
  };

  try {
    const prompt = await fetchQuery(api.app.getActiveAiPrompt, {
      name: SETTLEMENT_SUMMARY_PROMPT_NAME,
    }, { url: convexUrl });
    const promptText = prompt?.prompt_text || DEFAULT_PRODUCTION_SUMMARY_PROMPT;
    const aiConfig = await fetchActiveAiModelConfig();
    const model = getAiModelOption(aiConfig.modelCode);

    checks.promptFetch = true;
    checks.promptVersion = prompt?.version || 0;
    checks.promptHasPlaceholder = promptText.includes(SUMMARY_PROMPT_PLACEHOLDER);
    checks.activeModel = model.code;
    checks.activeModelName = model.displayName;
  } catch (error) {
    checks.promptFetch = false;
  }

  const allHealthy = checks.geminiApiKey &&
    checks.convexUrl &&
    checks.promptFetch &&
    checks.promptHasPlaceholder &&
    !!checks.activeModel;

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
