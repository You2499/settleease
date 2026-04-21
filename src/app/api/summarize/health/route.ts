import { fetchQuery } from 'convex/nextjs';
import { api } from '@convex/_generated/api';
import {
  DEFAULT_PRODUCTION_SUMMARY_PROMPT,
  SETTLEMENT_SUMMARY_PROMPT_NAME,
  SUMMARY_PROMPT_PLACEHOLDER,
} from '@/lib/settleease/aiSummarization';
import {
  DEFAULT_HEALTH_LEDGER_PROMPT,
  HEALTH_LEDGER_PROMPT_NAME,
  HEALTH_PROMPT_PLACEHOLDER,
} from '@/lib/settleease/aiHealth';
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
    healthPromptFetch: false,
    healthPromptHasPlaceholder: false,
    healthPromptVersion: null as number | null,
    activeModel: null as string | null,
    activeModelName: null as string | null,
  };

  try {
    const [prompt, healthPrompt] = await Promise.all([
      fetchQuery(api.app.getActiveAiPrompt, {
        name: SETTLEMENT_SUMMARY_PROMPT_NAME,
      }, { url: convexUrl }),
      fetchQuery(api.app.getActiveAiPrompt, {
        name: HEALTH_LEDGER_PROMPT_NAME,
      }, { url: convexUrl }),
    ]);
    const promptText = prompt?.prompt_text || DEFAULT_PRODUCTION_SUMMARY_PROMPT;
    const healthPromptText = healthPrompt?.prompt_text || DEFAULT_HEALTH_LEDGER_PROMPT;
    const aiConfig = await fetchActiveAiModelConfig();
    const model = getAiModelOption(aiConfig.modelCode);

    checks.promptFetch = true;
    checks.promptVersion = prompt?.version || 0;
    checks.promptHasPlaceholder = promptText.includes(SUMMARY_PROMPT_PLACEHOLDER);
    checks.healthPromptFetch = true;
    checks.healthPromptVersion = healthPrompt?.version || 0;
    checks.healthPromptHasPlaceholder = healthPromptText.includes(HEALTH_PROMPT_PLACEHOLDER);
    checks.activeModel = model.code;
    checks.activeModelName = model.displayName;
  } catch (error) {
    checks.promptFetch = false;
    checks.healthPromptFetch = false;
  }

  const allHealthy = checks.geminiApiKey &&
    checks.convexUrl &&
    checks.promptFetch &&
    checks.promptHasPlaceholder &&
    checks.healthPromptFetch &&
    checks.healthPromptHasPlaceholder &&
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
