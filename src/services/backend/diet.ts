import type {
  AddWaterIntakeInput,
  AddWaterIntakeRequest,
  CreateDietEntryInput,
  CreateDietEntryRequest,
  DeleteDietEntryInput,
  DietSummary,
  UpdateDietEntryInput,
  UpdateDietEntryRequest
} from "../types";
import { getBridge, requireBridgeMethod } from "./shared/bridge";
import { readSessionUserId, requestJson } from "./shared/http";

export function getDietSummary(): Promise<DietSummary> {
  const userId = readSessionUserId();
  const bridge = getBridge();

  if (bridge?.getDietSummary && userId !== null) {
    return bridge.getDietSummary({ userId });
  }

  return requestJson("/diet/today");
}

export async function addDietEntry(input: CreateDietEntryInput): Promise<DietSummary> {
  const userId = readSessionUserId();

  if (userId === null) {
    throw new Error("请先登录后再记录饮食");
  }

  const bridge = getBridge();
  const saveEntry = requireBridgeMethod(bridge?.addDietEntry, "桌面桥接未连接，无法记录饮食");

  const payload: CreateDietEntryRequest = {
    userId,
    ...input
  };

  return saveEntry(payload);
}

export async function updateDietEntry(input: UpdateDietEntryInput): Promise<DietSummary> {
  const userId = readSessionUserId();

  if (userId === null) {
    throw new Error("璇峰厛鐧诲綍鍚庡啀缂栬緫楗");
  }

  const bridge = getBridge();
  const saveEntry = requireBridgeMethod(bridge?.updateDietEntry, "妗岄潰妗ユ帴鏈繛鎺ワ紝鏃犳硶缂栬緫楗");

  const payload: UpdateDietEntryRequest = {
    userId,
    ...input
  };

  return saveEntry(payload);
}

export async function deleteDietEntry(id: number): Promise<DietSummary> {
  const userId = readSessionUserId();

  if (userId === null) {
    throw new Error("璇峰厛鐧诲綍鍚庡啀鍒犻櫎楗");
  }

  const bridge = getBridge();
  const removeEntry = requireBridgeMethod(bridge?.deleteDietEntry, "妗岄潰妗ユ帴鏈繛鎺ワ紝鏃犳硶鍒犻櫎楗");

  const payload: DeleteDietEntryInput = {
    userId,
    id
  };

  return removeEntry(payload);
}

export async function addWaterIntake(input: AddWaterIntakeInput): Promise<DietSummary> {
  const userId = readSessionUserId();

  if (userId === null) {
    throw new Error("请先登录后再记录饮水");
  }

  const bridge = getBridge();
  const saveWater = requireBridgeMethod(bridge?.addWaterIntake, "桌面桥接未连接，无法记录饮水");

  const payload: AddWaterIntakeRequest = {
    userId,
    ...input
  };

  return saveWater(payload);
}
