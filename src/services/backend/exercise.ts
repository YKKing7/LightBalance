import type {
  CreateExerciseEntryRequest,
  DeleteExerciseEntryInput,
  ExerciseEntryInput,
  ExerciseSummary,
  UpdateExerciseEntryInput,
  UpdateExerciseEntryRequest
} from "../types";
import { getBridge, requireBridgeMethod } from "./shared/bridge";
import { readSessionUserId, requestJson } from "./shared/http";

export function getExerciseSummary(): Promise<ExerciseSummary> {
  const userId = readSessionUserId();
  const bridge = getBridge();

  if (bridge?.getExerciseSummary && userId !== null) {
    return bridge.getExerciseSummary({ userId });
  }

  return requestJson("/exercise/overview");
}

export async function addExerciseEntry(input: ExerciseEntryInput): Promise<ExerciseSummary> {
  const userId = readSessionUserId();

  if (userId === null) {
    throw new Error("请先登录后再记录训练");
  }

  const bridge = getBridge();
  const saveEntry = requireBridgeMethod(bridge?.addExerciseEntry, "桌面桥接未连接，无法记录训练");

  const payload: CreateExerciseEntryRequest = {
    userId,
    ...input
  };

  return saveEntry(payload);
}

export async function updateExerciseEntry(input: UpdateExerciseEntryInput): Promise<ExerciseSummary> {
  const userId = readSessionUserId();

  if (userId === null) {
    throw new Error("请先登录后再编辑训练");
  }

  const bridge = getBridge();
  const saveEntry = requireBridgeMethod(bridge?.updateExerciseEntry, "桌面桥接未连接，无法编辑训练");

  const payload: UpdateExerciseEntryRequest = {
    userId,
    ...input
  };

  return saveEntry(payload);
}

export async function deleteExerciseEntry(id: number): Promise<ExerciseSummary> {
  const userId = readSessionUserId();

  if (userId === null) {
    throw new Error("请先登录后再删除训练");
  }

  const bridge = getBridge();
  const removeEntry = requireBridgeMethod(bridge?.deleteExerciseEntry, "桌面桥接未连接，无法删除训练");

  const payload: DeleteExerciseEntryInput = {
    userId,
    id
  };

  return removeEntry(payload);
}
