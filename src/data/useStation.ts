import { useEffect, useState } from "react";
import type {
  CorrectionInput,
  Outcome,
  RecheckInput,
  RecoveryInput,
} from "../domain/rules";
import {
  correctRecovery,
  registerRecovery,
  releaseIsolation,
  signFill,
  unfreezeFill,
} from "../domain/rules";
import type { StationState } from "../domain/types";
import { loadState, resetState, saveState } from "./store";

export interface Flash {
  kind: "ok" | "err";
  text: string;
}

/** 界面 ↔ 规则 ↔ 存储 的唯一入口:每次状态变化即持久化,刷新后队列与统计保持一致 */
export function useStation() {
  const [state, setState] = useState<StationState>(loadState);
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const apply = (outcome: Outcome): boolean => {
    if (outcome.ok) {
      setState(outcome.state);
      setFlash({ kind: "ok", text: outcome.message });
    } else {
      setFlash({ kind: "err", text: outcome.message });
    }
    return outcome.ok;
  };

  return {
    state,
    flash,
    register: (input: RecoveryInput) => apply(registerRecovery(state, input)),
    correct: (recoveryId: string, patch: CorrectionInput) =>
      apply(correctRecovery(state, recoveryId, patch)),
    sign: (fillId: string, by: string) => apply(signFill(state, fillId, by)),
    unfreeze: (fillId: string, by: string) => apply(unfreezeFill(state, fillId, by)),
    release: (recoveryId: string, recheck: RecheckInput) =>
      apply(releaseIsolation(state, recoveryId, recheck)),
    reset: () => {
      setState(resetState());
      setFlash({ kind: "ok", text: "已重置为演示数据" });
    },
  };
}
