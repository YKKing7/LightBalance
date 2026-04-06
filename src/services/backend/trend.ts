import type { TrendSummary } from "../types";
import { getBridge } from "./shared/bridge";
import { readSessionUserId, requestJson } from "./shared/http";

export async function updateTrendSleep(payload: { recordDate: string, sleepHours: number }): Promise<TrendSummary> {
  const bridge = getBridge();
  const userId = readSessionUserId();
  if (bridge?.updateTrendSleep && userId) {
    return bridge.updateTrendSleep({ ...payload, userId });
  }
  throw new Error("Not implemented");
}

export function getTrendSummary(): Promise<TrendSummary> {
  const userId = readSessionUserId();
  const bridge = getBridge();

  if (bridge?.getTrendSummary && userId !== null) {
    return bridge.getTrendSummary({ userId });
  }

  return requestJson("/tracking/overview");
}
