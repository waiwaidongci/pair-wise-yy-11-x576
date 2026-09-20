export type Medium = "空气" | "高氧" | "Trimix";

/** 回收登记：每瓶回收前登记余压、介质、阀门密封结果 */
export interface RecoveryRecord {
  id: string;
  tankNo: string;
  medium: Medium;
  residualPressure: number; // bar
  sealOk: boolean;
  operator: string; // 登记人
  corrections: number; // 被更正次数
  createdAt: number;
  updatedAt: number;
}

export type FillStatus = "queued" | "frozen" | "signed";

/** 充填任务：只有回收合格的气瓶才占充填位 */
export interface FillTask {
  id: string;
  recoveryId: string; // 依赖的回收记录
  tankNo: string;
  medium: Medium;
  targetPressure: number; // bar
  status: FillStatus;
  affected: boolean; // 已签收但被回收记录更正波及
  createdAt: number;
  signedAt?: number;
}

export type IsolationReason = "seal" | "pressure";

/** 隔离清单条目：密封异常或余压低于充填下限的气瓶 */
export interface IsolationEntry {
  id: string;
  recoveryId: string;
  tankNo: string;
  medium: Medium;
  reasons: IsolationReason[];
  status: "isolated" | "released";
  createdAt: number;
  // 解除隔离时的复检留痕（须换人复检且复测合格）
  releasedAt?: number;
  recheckBy?: string;
  recheckPressure?: number;
  recheckSealOk?: boolean;
}

export interface StationState {
  recoveries: RecoveryRecord[];
  fills: FillTask[];
  isolations: IsolationEntry[];
}
