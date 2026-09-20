import type {
  FillTask,
  IsolationEntry,
  IsolationReason,
  Medium,
  RecoveryRecord,
  StationState,
} from "./types";

/** 充填下限：回收余压低于该值的气瓶不得直接充填 */
export const MIN_FILL_PRESSURE = 30;
/** 默认充填目标压力 */
export const TARGET_PRESSURE = 200;

export const MEDIUMS: Medium[] = ["空气", "高氧", "Trimix"];

export const REASON_TEXT: Record<IsolationReason, string> = {
  seal: "阀门密封异常",
  pressure: `余压低于充填下限 ${MIN_FILL_PRESSURE}bar`,
};

let seq = 0;
function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

/** 隔离判定：密封异常或余压低于充填下限 → 只进隔离清单 */
export function isolationReasons(input: {
  residualPressure: number;
  sealOk: boolean;
}): IsolationReason[] {
  const reasons: IsolationReason[] = [];
  if (!input.sealOk) reasons.push("seal");
  if (input.residualPressure < MIN_FILL_PRESSURE) reasons.push("pressure");
  return reasons;
}

function makeFill(recovery: RecoveryRecord, now: number): FillTask {
  return {
    id: nextId("FILL"),
    recoveryId: recovery.id,
    tankNo: recovery.tankNo,
    medium: recovery.medium,
    targetPressure: TARGET_PRESSURE,
    status: "queued",
    affected: false,
    createdAt: now,
  };
}

export interface RecoveryInput {
  tankNo: string;
  medium: Medium;
  residualPressure: number;
  sealOk: boolean;
  operator: string;
}

/** 回收登记：合格 → 占充填位；不合格 → 只进隔离清单，不占充填位 */
export function registerRecovery(
  state: StationState,
  input: RecoveryInput,
  now: number = Date.now()
): StationState {
  const recovery: RecoveryRecord = {
    id: nextId("REC"),
    tankNo: input.tankNo.trim(),
    medium: input.medium,
    residualPressure: input.residualPressure,
    sealOk: input.sealOk,
    operator: input.operator.trim(),
    corrections: 0,
    createdAt: now,
    updatedAt: now,
  };
  const reasons = isolationReasons(recovery);
  if (reasons.length > 0) {
    const entry: IsolationEntry = {
      id: nextId("ISO"),
      recoveryId: recovery.id,
      tankNo: recovery.tankNo,
      medium: recovery.medium,
      reasons,
      status: "isolated",
      createdAt: now,
    };
    return {
      ...state,
      recoveries: [recovery, ...state.recoveries],
      isolations: [entry, ...state.isolations],
    };
  }
  return {
    ...state,
    recoveries: [recovery, ...state.recoveries],
    fills: [makeFill(recovery, now), ...state.fills],
  };
}

export interface CorrectionPatch {
  medium?: Medium;
  residualPressure?: number;
  sealOk?: boolean;
}

/**
 * 回收记录更正级联：
 * 1. 依赖它的未完成充填立即冻结；
 * 2. 已签收记录保留但标记受影响；
 * 3. 更正后复评仍不合格 → 转入隔离清单，释放充填位。
 */
export function correctRecovery(
  state: StationState,
  recoveryId: string,
  patch: CorrectionPatch,
  now: number = Date.now()
): StationState {
  const target = state.recoveries.find((r) => r.id === recoveryId);
  if (!target) return state;

  const corrected: RecoveryRecord = {
    ...target,
    medium: patch.medium ?? target.medium,
    residualPressure: patch.residualPressure ?? target.residualPressure,
    sealOk: patch.sealOk ?? target.sealOk,
    corrections: target.corrections + 1,
    updatedAt: now,
  };

  const cascadedFills = state.fills.map((f) => {
    if (f.recoveryId !== recoveryId) return f;
    if (f.status === "signed") return { ...f, affected: true };
    return { ...f, status: "frozen" as const };
  });

  const reasons = isolationReasons(corrected);
  let isolations = state.isolations;
  let fills = cascadedFills;
  if (reasons.length > 0) {
    const hasOpen = isolations.some(
      (i) => i.recoveryId === recoveryId && i.status === "isolated"
    );
    isolations = hasOpen
      ? isolations.map((i) =>
          i.recoveryId === recoveryId && i.status === "isolated"
            ? { ...i, reasons }
            : i
        )
      : [
          {
            id: nextId("ISO"),
            recoveryId,
            tankNo: corrected.tankNo,
            medium: corrected.medium,
            reasons,
            status: "isolated" as const,
            createdAt: now,
          },
          ...isolations,
        ];
    // 释放充填位：未完成充填移出队列（已签收的保留并带受影响标记）
    fills = cascadedFills.filter(
      (f) => !(f.recoveryId === recoveryId && f.status !== "signed")
    );
  }

  return {
    recoveries: state.recoveries.map((r) => (r.id === recoveryId ? corrected : r)),
    fills,
    isolations,
  };
}

/** 冻结充填能否恢复：回收记录当前合格且不在隔离中 */
export function canResume(state: StationState, fill: FillTask): boolean {
  if (fill.status !== "frozen") return false;
  const rec = state.recoveries.find((r) => r.id === fill.recoveryId);
  if (!rec) return false;
  const isolated = state.isolations.some(
    (i) => i.recoveryId === rec.id && i.status === "isolated"
  );
  return !isolated && isolationReasons(rec).length === 0;
}

export function resumeFill(state: StationState, fillId: string): StationState {
  const fill = state.fills.find((f) => f.id === fillId);
  if (!fill || !canResume(state, fill)) return state;
  return {
    ...state,
    fills: state.fills.map((f) =>
      f.id === fillId ? { ...f, status: "queued" as const } : f
    ),
  };
}

/** 充填完成签收：仅待充填状态可签收 */
export function signFill(
  state: StationState,
  fillId: string,
  now: number = Date.now()
): StationState {
  return {
    ...state,
    fills: state.fills.map((f) =>
      f.id === fillId && f.status === "queued"
        ? { ...f, status: "signed" as const, signedAt: now }
        : f
    ),
  };
}

export interface RecheckInput {
  by: string;
  pressure: number;
  sealOk: boolean;
}

/** 复检校验：须换人复检且复测合格 */
export function recheckProblem(
  state: StationState,
  entry: IsolationEntry,
  recheck: RecheckInput
): string | null {
  const rec = state.recoveries.find((r) => r.id === entry.recoveryId);
  const by = recheck.by.trim();
  if (!by) return "请填写复检人";
  if (rec && by === rec.operator)
    return `隔离解除须换人复检：复检人不能与原登记人（${rec.operator}）相同`;
  if (!recheck.sealOk) return "复测密封仍未合格，不能解除隔离";
  if (recheck.pressure < MIN_FILL_PRESSURE)
    return `复测余压低于充填下限 ${MIN_FILL_PRESSURE}bar，不能解除隔离`;
  return null;
}

/**
 * 解除隔离：换人复检 + 复测合格 → 复测值回写回收记录，气瓶重新占充填位。
 */
export function releaseIsolation(
  state: StationState,
  entryId: string,
  recheck: RecheckInput,
  now: number = Date.now()
): { state: StationState; error: string | null } {
  const entry = state.isolations.find((i) => i.id === entryId);
  if (!entry || entry.status !== "isolated")
    return { state, error: "隔离记录不存在或已解除" };
  const error = recheckProblem(state, entry, recheck);
  if (error) return { state, error };

  const isolations = state.isolations.map((i) =>
    i.id === entryId
      ? {
          ...i,
          status: "released" as const,
          releasedAt: now,
          recheckBy: recheck.by.trim(),
          recheckPressure: recheck.pressure,
          recheckSealOk: recheck.sealOk,
        }
      : i
  );
  const recoveries = state.recoveries.map((r) =>
    r.id === entry.recoveryId
      ? {
          ...r,
          residualPressure: recheck.pressure,
          sealOk: recheck.sealOk,
          updatedAt: now,
        }
      : r
  );
  const rec = recoveries.find((r) => r.id === entry.recoveryId)!;
  return {
    state: {
      recoveries,
      fills: [makeFill(rec, now), ...state.fills],
      isolations,
    },
    error: null,
  };
}

export interface Stats {
  queued: number;
  frozen: number;
  isolated: number;
  signed: number;
  affectedSigned: number;
}

/** 统计汇总：与队列同源，刷新后一致 */
export function summarize(state: StationState): Stats {
  return {
    queued: state.fills.filter((f) => f.status === "queued").length,
    frozen: state.fills.filter((f) => f.status === "frozen").length,
    isolated: state.isolations.filter((i) => i.status === "isolated").length,
    signed: state.fills.filter((f) => f.status === "signed").length,
    affectedSigned: state.fills.filter((f) => f.status === "signed" && f.affected)
      .length,
  };
}
