import { fetchActiveAiModelConfig } from "@/lib/settleease/aiModelConfigServer";

export async function GET() {
  const config = await fetchActiveAiModelConfig();

  return Response.json(config, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
