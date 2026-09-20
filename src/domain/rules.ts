import { FILL_SLOT_COUNT, MIN_RECOVERY_PRESSURE, TARGET_PRESSURE } from "./constants";
import type {
  FillRecord,
  LogEntry,
  Medium,
  RecoveryRecord,
  SealResult,
  StationState,
} from "./types";

/** 规则执行结果:成功返回新状态,失败返回错误信息(状态不变) */
export type Outcome =
  | { ok: true; state: StationState; message: string }
  | { ok: false; message: string };

const ok = (state: StationState, message: string): Outcome => ({ ok: true, state, message });
const err = (message: string): Outcome => ({ ok: false, message });

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function pushLog(state: StationState, text: string): StationState {
  const entry: LogEntry = { id: newId("log"), at: nowIso(), text };
  return { ...state, log: [entry, ...state.log].slice(0, 60) };
}

/**
 * 隔离判定:阀门密封异常,或回收余压低于充填下限。
 * 命中任一条即只进隔离清单,不占充填位。
 */
export function isolationReasons(input: { pressure: number; seal: SealResult }): string[] {
  const reasons: string[] = [];
  if (input.seal === "异常") reasons.push("阀门密封异常");
  if (input.pressure < MIN_RECOVERY_PRESSURE) {
    reasons.push(`余压低于充填下限 ${MIN_RECOVERY_PRESSURE}bar`);
  }
  return reasons;
}

/** 充填位占用:未签收且气瓶不在隔离中的充填任务才占充填位 */
export function slotUsage(state: StationState): { used: number; total: number } {
  const isolatedIds = new Set(
    state.recoveries.filter((r) => r.status === "isolated").map((r) => r.id)
  );
  const used = state.fills.filter(
    (f) => f.status !== "signed" && !isolatedIds.has(f.recoveryId)
  ).length;
  return { used, total: FILL_SLOT_COUNT };
}

export interface RecoveryInput {
  tankId: string;
  pressure: number;
  medium: Medium;
  seal: SealResult;
  operator: string;
}

/** 登记回收:按隔离判定决定进待充填队列(占充填位)还是隔离清单(不占位) */
export function registerRecovery(state: StationState, input: RecoveryInput): Outcome {
  const tankId = input.tankId.trim();
  const operator = input.operator.trim();
  if (!tankId) return err("请填写气瓶编号");
  if (!operator) return err("请填写登记人");
  if (!Number.isFinite(input.pressure) || input.pressure < 0) {
    return err("余压必须是不小于 0 的数字");
  }

  const hasOpenFill = state.recoveries.some(
    (r) =>
      r.tankId === tankId &&
      r.status === "active" &&
      state.fills.some((f) => f.recoveryId === r.id && f.status !== "signed")
  );
  if (hasOpenFill) return err(`${tankId} 已有未完成的充填,不能重复登记`);
  if (state.recoveries.some((r) => r.tankId === tankId && r.status === "isolated")) {
    return err(`${tankId} 仍在隔离清单中,须先复检解除`);
  }

  const record: RecoveryRecord = {
    id: newId("rec"),
    tankId,
    pressure: input.pressure,
    medium: input.medium,
    seal: input.seal,
    operator,
    createdAt: nowIso(),
    status: "active",
    isolationReasons: [],
    revisions: [],
  };

  const reasons = isolationReasons(input);
  if (reasons.length > 0) {
    const isolated: RecoveryRecord = { ...record, status: "isolated", isolationReasons: reasons };
    const next = pushLog(
      { ...state, recoveries: [isolated, ...state.recoveries] },
      `${tankId} 登记回收:${reasons.join("、")},进入隔离清单(不占充填位)`
    );
    return ok(next, `${tankId} 已登记:${reasons.join("、")},只进隔离清单,不占充填位`);
  }

  const slots = slotUsage(state);
  if (slots.used >= slots.total) {
    return err(`充填位已满(${slots.used}/${slots.total}),无法入队`);
  }

  const fill: FillRecord = {
    id: newId("fill"),
    recoveryId: record.id,
    tankId,
    medium: input.medium,
    targetPressure: TARGET_PRESSURE,
    status: "pending",
    affected: false,
    createdAt: nowIso(),
  };
  const next = pushLog(
    { ...state, recoveries: [record, ...state.recoveries], fills: [fill, ...state.fills] },
    `${tankId} 登记回收:余压 ${input.pressure}bar · ${input.medium} · 密封合格,进入待充填队列`
  );
  return ok(next, `${tankId} 已登记并进入待充填队列(占用充填位 ${slots.used + 1}/${slots.total})`);
}

export interface CorrectionInput {
  pressure: number;
  medium: Medium;
  seal: SealResult;
  by: string;
  reason: string;
}

/**
 * 更正回收记录:
 * - 依赖它的未完成充填立即冻结;
 * - 已签收记录保留,但标记为受影响;
 * - 更正后若命中隔离条件,记录转入隔离清单(解除仍须换人复检)。
 */
export function correctRecovery(
  state: StationState,
  recoveryId: string,
  patch: CorrectionInput
): Outcome {
  const record = state.recoveries.find((r) => r.id === recoveryId);
  if (!record) return err("未找到回收记录");
  const by = patch.by.trim();
  if (!by) return err("请填写更正人");
  if (!patch.reason.trim()) return err("请填写更正原因");
  if (!Number.isFinite(patch.pressure) || patch.pressure < 0) {
    return err("余压必须是不小于 0 的数字");
  }

  const revision = {
    at: nowIso(),
    by,
    reason: patch.reason.trim(),
    prevPressure: record.pressure,
    prevMedium: record.medium,
    prevSeal: record.seal,
  };

  const reasons = isolationReasons({ pressure: patch.pressure, seal: patch.seal });
  const becomesIsolated = record.status === "active" && reasons.length > 0;

  const updated: RecoveryRecord = {
    ...record,
    pressure: patch.pressure,
    medium: patch.medium,
    seal: patch.seal,
    status: becomesIsolated ? "isolated" : record.status,
    isolationReasons: becomesIsolated ? reasons : record.isolationReasons,
    revisions: [...record.revisions, revision],
  };

  let frozenCount = 0;
  let affectedCount = 0;
  const fills = state.fills.map((f) => {
    if (f.recoveryId !== recoveryId) return f;
    if (f.status === "signed") {
      affectedCount += 1;
      return { ...f, affected: true };
    }
    frozenCount += 1;
    return { ...f, status: "frozen" as const, freezeReason: `回收记录被 ${by} 更正` };
  });

  const parts = [`${record.tankId} 回收记录已更正(${by})`];
  if (frozenCount > 0) parts.push(`${frozenCount} 笔未完成充填已冻结`);
  if (affectedCount > 0) parts.push(`${affectedCount} 笔已签收记录标记受影响`);
  if (becomesIsolated) parts.push(`更正后${reasons.join("、")},转入隔离清单`);
  if (record.status === "isolated") parts.push("记录仍在隔离中,须换人复检合格后才能解除");

  const next = pushLog(
    {
      ...state,
      recoveries: state.recoveries.map((r) => (r.id === recoveryId ? updated : r)),
      fills,
    },
    parts.join(";")
  );
  return ok(next, parts.join(";"));
}

/** 充填完成签收:冻结或隔离中的气瓶不能签收,签收后释放充填位 */
export function signFill(state: StationState, fillId: string, by: string): Outcome {
  const fill = state.fills.find((f) => f.id === fillId);
  if (!fill) return err("未找到充填记录");
  const operator = by.trim();
  if (!operator) return err("请先在页首填写当班操作员");
  if (fill.status === "signed") return err("该充填已签收");
  if (fill.status === "frozen") return err("该充填已冻结,须先确认更正并解冻");
  const recovery = state.recoveries.find((r) => r.id === fill.recoveryId);
  if (recovery?.status === "isolated") return err("气瓶在隔离清单中,不能签收");

  const fills = state.fills.map((f) =>
    f.id === fillId
      ? { ...f, status: "signed" as const, signedAt: nowIso(), signedBy: operator }
      : f
  );
  const next = pushLog({ ...state, fills }, `${fill.tankId} 充填完成,${operator} 签收`);
  return ok(next, `${fill.tankId} 已签收,充填位释放`);
}

/** 解冻:确认更正内容后恢复排队;气瓶仍在隔离中时不能解冻 */
export function unfreezeFill(state: StationState, fillId: string, by: string): Outcome {
  const fill = state.fills.find((f) => f.id === fillId);
  if (!fill) return err("未找到充填记录");
  if (fill.status !== "frozen") return err("该充填未处于冻结状态");
  const operator = by.trim();
  if (!operator) return err("请先在页首填写当班操作员");
  const recovery = state.recoveries.find((r) => r.id === fill.recoveryId);
  if (recovery?.status === "isolated") {
    return err("气瓶仍在隔离中,须换人复检合格后才能恢复");
  }

  const fills = state.fills.map((f) =>
    f.id === fillId ? { ...f, status: "pending" as const, freezeReason: undefined } : f
  );
  const next = pushLog(
    { ...state, fills },
    `${fill.tankId} 冻结充填由 ${operator} 确认更正后恢复排队`
  );
  return ok(next, `${fill.tankId} 已解冻,恢复待充填`);
}

export interface RecheckInput {
  inspector: string;
  pressure: number;
  seal: SealResult;
}

/**
 * 解除隔离:必须换人复检(复检人 ≠ 原登记人),且复测合格
 * (密封合格且余压不低于充填下限)。解除后气瓶恢复排队、占用充填位,
 * 因更正被冻结的充填一并恢复。
 */
export function releaseIsolation(
  state: StationState,
  recoveryId: string,
  recheck: RecheckInput
): Outcome {
  const record = state.recoveries.find((r) => r.id === recoveryId);
  if (!record) return err("未找到回收记录");
  if (record.status !== "isolated") return err("该记录不在隔离清单中");
  const inspector = recheck.inspector.trim();
  if (!inspector) return err("请填写复检人");
  if (inspector === record.operator.trim()) {
    return err(`隔离解除须换人复检:复检人不能与登记人(${record.operator})相同`);
  }
  if (!Number.isFinite(recheck.pressure) || recheck.pressure < 0) {
    return err("复测余压必须是不小于 0 的数字");
  }
  if (recheck.seal !== "合格") return err("复测密封仍为异常,不能解除隔离");
  if (recheck.pressure < MIN_RECOVERY_PRESSURE) {
    return err(`复测余压 ${recheck.pressure}bar 低于充填下限 ${MIN_RECOVERY_PRESSURE}bar,不能解除隔离`);
  }

  const updated: RecoveryRecord = {
    ...record,
    status: "active",
    isolationReasons: [],
    recheck: { inspector, pressure: recheck.pressure, seal: recheck.seal, at: nowIso() },
  };
  const recoveries = state.recoveries.map((r) => (r.id === recoveryId ? updated : r));

  const related = state.fills.filter((f) => f.recoveryId === recoveryId);
  let fills: FillRecord[];
  let extra = "";
  if (related.some((f) => f.status === "frozen")) {
    const count = related.filter((f) => f.status === "frozen").length;
    fills = state.fills.map((f) =>
      f.recoveryId === recoveryId && f.status === "frozen"
        ? { ...f, status: "pending" as const, freezeReason: undefined }
        : f
    );
    extra = `,${count} 笔冻结充填恢复排队`;
  } else if (related.length === 0) {
    const slots = slotUsage(state);
    if (slots.used >= slots.total) {
      return err(`充填位已满(${slots.used}/${slots.total}),暂不能解除隔离入队`);
    }
    const fill: FillRecord = {
      id: newId("fill"),
      recoveryId,
      tankId: record.tankId,
      medium: record.medium,
      targetPressure: TARGET_PRESSURE,
      status: "pending",
      affected: false,
      createdAt: nowIso(),
    };
    fills = [fill, ...state.fills];
    extra = ",已进入待充填队列";
  } else {
    fills = state.fills;
  }

  const next = pushLog(
    { ...state, recoveries, fills },
    `${record.tankId} 隔离解除:${inspector} 复检合格(余压 ${recheck.pressure}bar · 密封合格)${extra}`
  );
  return ok(next, `${record.tankId} 复检合格,隔离解除${extra}`);
}

/** 统计:全部由状态推导,保证与队列、清单一致 */
export function computeStats(state: StationState) {
  const pending = state.fills.filter((f) => f.status === "pending").length;
  const frozen = state.fills.filter((f) => f.status === "frozen").length;
  const isolated = state.recoveries.filter((r) => r.status === "isolated").length;
  const signedFills = state.fills.filter((f) => f.status === "signed");
  return {
    pending,
    frozen,
    isolated,
    signed: signedFills.length,
    affected: signedFills.filter((f) => f.affected).length,
    slots: slotUsage(state),
  };
}
