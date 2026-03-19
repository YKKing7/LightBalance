import type { LightBalanceBridge as BridgeContract } from "../../types";

export type LightBalanceBridge = BridgeContract;

export function getBridge(): LightBalanceBridge | undefined {
  return window.lightBalanceBridge;
}

export function hasBridge(): boolean {
  return Boolean(getBridge());
}

export function requireBridgeMethod<T>(method: T | null | undefined, message: string): NonNullable<T> {
  if (method == null) {
    throw new Error(message);
  }

  return method as NonNullable<T>;
}
