import type { OverviewSummary } from "../types";
import { getBridge, requireBridgeMethod } from "./shared/bridge";
import { readSessionUserId } from "./shared/http";

export function getOverviewSummary(): Promise<OverviewSummary> {
  const userId = readSessionUserId();

  if (userId === null) {
    throw new Error("请先登录后再读取概览数据");
  }

  const bridge = getBridge();
  const getOverview = requireBridgeMethod(bridge?.getOverviewSummary, "桌面桥接未连接，无法读取概览数据");

  return getOverview({ userId });
}
