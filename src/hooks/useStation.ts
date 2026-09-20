import { useEffect, useState } from "react";
import type { StationState } from "../domain/types";
import {
  correctRecovery,
  registerRecovery,
  releaseIsolation,
  resumeFill,
  signFill,
  summarize,
  type CorrectionPatch,
  type RecheckInput,
  type RecoveryInput,
} from "../domain/rules";
import { loadState, resetState, saveState } from "../data/store";

/** 界面与规则/存储之间的桥：所有变更经规则层计算后写入存储 */
export function useStation() {
  const [state, setState] = useState<StationState>(loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  return {
    state,
    stats: summarize(state),
    actions: {
      registerRecovery: (input: RecoveryInput) =>
        setState((s) => registerRecovery(s, input)),
      correctRecovery: (recoveryId: string, patch: CorrectionPatch) =>
        setState((s) => correctRecovery(s, recoveryId, patch)),
      signFill: (fillId: string) => setState((s) => signFill(s, fillId)),
      resumeFill: (fillId: string) => setState((s) => resumeFill(s, fillId)),
      releaseIsolation: (entryId: string, recheck: RecheckInput) => {
        const result = releaseIsolation(state, entryId, recheck);
        if (!result.error) setState(result.state);
        return result.error;
      },
      resetAll: () => setState(resetState()),
    },
  };
}
