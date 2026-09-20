import { seedState } from "../domain/seed";
import type { StationState } from "../domain/types";

const STORAGE_KEY = "hxyfront-62010:station:v1";

/** 读取持久化状态;缺失或结构损坏时回退到演示数据 */
export function loadState(): StationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as StationState;
    if (
      !Array.isArray(parsed.recoveries) ||
      !Array.isArray(parsed.fills) ||
      !Array.isArray(parsed.log)
    ) {
      return seedState();
    }
    return parsed;
  } catch {
    return seedState();
  }
}

export function saveState(state: StationState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时仅丢失持久化,界面状态不受影响
  }
}

export function resetState(): StationState {
  const state = seedState();
  saveState(state);
  return state;
}
