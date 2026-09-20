import { useState } from "react";
import type { StationState } from "../domain/types";
import { fmtTime } from "./format";
import { Modal } from "./Modal";

/** 待充填队列:签收、冻结与解冻都在这里发生 */
export function FillQueue(props: {
  state: StationState;
  slots: { used: number; total: number };
  onSign: (fillId: string, by: string) => boolean;
  onUnfreeze: (fillId: string) => boolean;
}) {
  const [signTarget, setSignTarget] = useState<string | null>(null);
  const [signer, setSigner] = useState("");

  const open = props.state.fills.filter((f) => f.status !== "signed");
  const recoveryOf = (recoveryId: string) =>
    props.state.recoveries.find((r) => r.id === recoveryId);
  const signFill = open.find((f) => f.id === signTarget);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>充填位占用 {props.slots.used}/{props.slots.total}</p>
          <h2>待充填队列</h2>
        </div>
      </div>
      {open.length === 0 && <p className="empty">队列为空,登记回收后自动入队</p>}
      <div className="rows">
        {open.map((fill) => {
          const recovery = recoveryOf(fill.recoveryId);
          const isolated = recovery?.status === "isolated";
          const frozen = fill.status === "frozen";
          return (
            <article key={fill.id} className="row">
              <div className="row-main">
                <div className="row-head">
                  <h3>{fill.tankId}</h3>
                  {frozen ? (
                    <span className="badge frozen">已冻结</span>
                  ) : (
                    <span className="badge pending">待充填</span>
                  )}
                  {isolated && <span className="badge isolated">隔离中</span>}
                </div>
                <p className="meta">
                  {fill.medium} → 目标 {fill.targetPressure}bar · 回收余压{" "}
                  {recovery?.pressure ?? "-"}bar · 登记人 {recovery?.operator ?? "-"} ·{" "}
                  {fmtTime(fill.createdAt)}
                </p>
                {frozen && fill.freezeReason && (
                  <p className="meta warn-text">冻结原因:{fill.freezeReason}</p>
                )}
              </div>
              <div className="row-actions">
                {frozen ? (
                  <button
                    type="button"
                    disabled={isolated}
                    title={isolated ? "气瓶仍在隔离中,须换人复检合格后才能恢复" : "确认更正内容后解冻"}
                    onClick={() => props.onUnfreeze(fill.id)}
                  >
                    确认更正·解冻
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary"
                    disabled={isolated}
                    title={isolated ? "气瓶在隔离清单中,不能签收" : "充填完成并签收"}
                    onClick={() => {
                      setSignTarget(fill.id);
                      setSigner("");
                    }}
                  >
                    签收
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {signFill && (
        <Modal title={`签收 ${signFill.tankId}`} onClose={() => setSignTarget(null)}>
          <div className="field-grid single">
            <label>
              <span>签收人</span>
              <input
                value={signer}
                onChange={(e) => setSigner(e.target.value)}
                placeholder="充填完成后的签收人"
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                if (props.onSign(signFill.id, signer)) setSignTarget(null);
              }}
            >
              确认签收
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
