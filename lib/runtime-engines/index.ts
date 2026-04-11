import "server-only";

import { mistralV1RuntimeEngine } from "@/lib/runtime-engines/mistral-v1";
import { mistralV2RuntimeEngine } from "@/lib/runtime-engines/mistral-v2";
import { openaiV1RuntimeEngine } from "@/lib/runtime-engines/openai-v1";
import { RuntimeEngine } from "@/lib/runtime-engines/types";

const runtimeEngineRegistry = {
  openai_v1: openaiV1RuntimeEngine,
  mistral_v1: mistralV1RuntimeEngine,
  mistral_v2: mistralV2RuntimeEngine,
} satisfies Record<string, RuntimeEngine>;

export const DEFAULT_RUNTIME_ENGINE_ID = "openai_v1";

export function getRuntimeEngine(engineId = process.env.RUNTIME_ENGINE) {
  if (engineId && engineId in runtimeEngineRegistry) {
    return runtimeEngineRegistry[engineId as keyof typeof runtimeEngineRegistry];
  }

  return runtimeEngineRegistry[DEFAULT_RUNTIME_ENGINE_ID];
}
