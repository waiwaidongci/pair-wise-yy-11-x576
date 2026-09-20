import type { Medium } from "./types";

/** 充填下限:回收余压低于该值的气瓶只能进隔离清单 */
export const MIN_RECOVERY_PRESSURE = 30;

/** 复充台充填位数量 */
export const FILL_SLOT_COUNT = 6;

/** 默认目标充填压力 */
export const TARGET_PRESSURE = 200;

export const MEDIUMS: Medium[] = ["空气", "高氧EAN32", "高氧EAN36", "Trimix"];
