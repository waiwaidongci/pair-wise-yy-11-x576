/** 介质类型 */
export type Medium = "空气" | "高氧EAN32" | "高氧EAN36" | "Trimix";

/** 阀门密封检查结果 */
export type SealResult = "合格" | "异常";

/** 回收记录状态:active=正常(可排队充填),isolated=隔离清单中 */
export type RecoveryStatus = "active" | "isolated";

/** 充填状态:pending=待充填,frozen=已冻结,signed=已签收 */
export type FillStatus = "pending" | "frozen" | "signed";

/** 回收记录的一次更正留痕 */
export interface RecoveryRevision {
  at: string;
  by: string;
  reason: string;
  prevPressure: number;
  prevMedium: Medium;
  prevSeal: SealResult;
}

/** 解除隔离时的复检记录 */
export interface RecheckRecord {
  inspector: string;
  pressure: number;
  seal: SealResult;
  at: string;
}

/** 余压回收登记记录 */
export interface RecoveryRecord {
  id: string;
  tankId: string;
  pressure: number;
  medium: Medium;
  seal: SealResult;
  operator: string;
  createdAt: string;
  status: RecoveryStatus;
  /** 进入隔离清单的原因(登记或更正时判定) */
  isolationReasons: string[];
  revisions: RecoveryRevision[];
  recheck?: RecheckRecord;
}

/** 充填任务,依赖某一条回收记录 */
export interface FillRecord {
  id: string;
  recoveryId: string;
  tankId: string;
  medium: Medium;
  targetPressure: number;
  status: FillStatus;
  /** 已签收但所依赖的回收记录后被更正 */
  affected: boolean;
  createdAt: string;
  signedAt?: string;
  signedBy?: string;
  freezeReason?: string;
}

export interface LogEntry {
  id: string;
  at: string;
  text: string;
}

export interface StationState {
  recoveries: RecoveryRecord[];
  fills: FillRecord[];
  log: LogEntry[];
}
