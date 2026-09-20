import type { StationState } from "../domain/types";

const STORAGE_KEY = "hxyfront-62010-station-v1";

const HOUR = 3600_000;

/** 首次打开的演示数据 */
export function seedState(now: number = Date.now()): StationState {
  return {
    recoveries: [
      {
        id: "REC-seed-5",
        tankNo: "TANK-197",
        medium: "高氧",
        residualPressure: 60,
        sealOk: true,
        operator: "阿豪",
        corrections: 0,
        createdAt: now - 2 * HOUR,
        updatedAt: now - 2 * HOUR,
      },
      {
        id: "REC-seed-4",
        tankNo: "TANK-186",
        medium: "空气",
        residualPressure: 80,
        sealOk: true,
        operator: "小林",
        corrections: 0,
        createdAt: now - 8 * HOUR,
        updatedAt: now - 8 * HOUR,
      },
      {
        id: "REC-seed-3",
        tankNo: "TANK-231",
        medium: "Trimix",
        residualPressure: 40,
        sealOk: false,
        operator: "阿豪",
        corrections: 0,
        createdAt: now - 5 * HOUR,
        updatedAt: now - 5 * HOUR,
      },
      {
        id: "REC-seed-2",
        tankNo: "TANK-219",
        medium: "高氧",
        residualPressure: 12,
        sealOk: true,
        operator: "小林",
        corrections: 0,
        createdAt: now - 6 * HOUR,
        updatedAt: now - 6 * HOUR,
      },
      {
        id: "REC-seed-1",
        tankNo: "TANK-204",
        medium: "空气",
        residualPressure: 55,
        sealOk: true,
        operator: "阿豪",
        corrections: 0,
        createdAt: now - 26 * HOUR,
        updatedAt: now - 26 * HOUR,
      },
    ],
    fills: [
      {
        id: "FILL-seed-3",
        recoveryId: "REC-seed-5",
        tankNo: "TANK-197",
        medium: "高氧",
        targetPressure: 200,
        status: "queued",
        affected: false,
        createdAt: now - 2 * HOUR,
      },
      {
        id: "FILL-seed-2",
        recoveryId: "REC-seed-4",
        tankNo: "TANK-186",
        medium: "空气",
        targetPressure: 200,
        status: "signed",
        affected: false,
        createdAt: now - 8 * HOUR,
        signedAt: now - 7 * HOUR,
      },
      {
        id: "FILL-seed-1",
        recoveryId: "REC-seed-1",
        tankNo: "TANK-204",
        medium: "空气",
        targetPressure: 200,
        status: "queued",
        affected: false,
        createdAt: now - 26 * HOUR,
      },
    ],
    isolations: [
      {
        id: "ISO-seed-2",
        recoveryId: "REC-seed-3",
        tankNo: "TANK-231",
        medium: "Trimix",
        reasons: ["seal"],
        status: "isolated",
        createdAt: now - 5 * HOUR,
      },
      {
        id: "ISO-seed-1",
        recoveryId: "REC-seed-2",
        tankNo: "TANK-219",
        medium: "高氧",
        reasons: ["pressure"],
        status: "isolated",
        createdAt: now - 6 * HOUR,
      },
    ],
  };
}

function isStationState(value: unknown): value is StationState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.recoveries) &&
    Array.isArray(v.fills) &&
    Array.isArray(v.isolations)
  );
}

export function loadState(): StationState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed: unknown = JSON.parse(raw);
    return isStationState(parsed) ? parsed : seedState();
  } catch {
    return seedState();
  }
}

export function saveState(state: StationState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 存储不可用时静默降级为内存态
  }
}

export function resetState(): StationState {
  const fresh = seedState();
  saveState(fresh);
  return fresh;
}
