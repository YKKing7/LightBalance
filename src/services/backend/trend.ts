import type { TrendSummary } from "../types";
import { getBridge } from "./shared/bridge";
import { readSessionUserId, requestJson } from "./shared/http";

export function getTrendSummary(): Promise<TrendSummary> {
  const userId = readSessionUserId();
  const bridge = getBridge();

  if (bridge?.getTrendSummary && userId !== null) {
    return bridge.getTrendSummary({ userId });
  }

  return requestJson("/tracking/overview");
}
