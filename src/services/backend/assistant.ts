import type { AskAssistantInput, AskAssistantRequest, AssistantPlan, GeminiProbeResult } from "../types";
import { getBridge, requireBridgeMethod } from "./shared/bridge";
import { readSessionUserId, requestJson } from "./shared/http";

export function getAssistantPlan(): Promise<AssistantPlan> {
  const userId = readSessionUserId();
  const bridge = getBridge();

  if (bridge?.getAssistantPlan && userId !== null) {
    return bridge.getAssistantPlan({ userId });
  }

  return requestJson("/assistant/plan");
}

export async function askAssistant(input: AskAssistantInput): Promise<AssistantPlan> {
  const userId = readSessionUserId();

  if (userId === null) {
    throw new Error("请先登录后再使用智能问答");
  }

  const bridge = getBridge();
  const ask = requireBridgeMethod(bridge?.askAssistant, "桌面桥接未连接，暂时无法生成智能建议");

  const payload: AskAssistantRequest = {
    userId,
    question: input.question,
    focus: input.focus
  };

  return ask(payload);
}

export async function probeGeminiConnection(): Promise<GeminiProbeResult> {
  const bridge = getBridge();
  const probe = requireBridgeMethod(bridge?.probeGeminiConnection, "桌面桥接未连接，暂时无法测试 Gemini 连通性");
  return probe();
}
