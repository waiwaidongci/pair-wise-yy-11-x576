import { useState } from "react";
import { MEDIUMS } from "../domain/constants";
import type { CorrectionInput } from "../domain/rules";
import type { Medium, RecoveryRecord, SealResult, StationState } from "../domain/types";
import { fmtTime } from "./format";
import { Modal } from "./Modal";

function statusOf(record: RecoveryRecord, state: StationState): { label: string; cls: string } {
  if (record.status === "isolated") return { label: "隔离中", cls: "isolated" };
  const fill = state.fills.find((f) => f.recoveryId === record.id);
  if (!fill) return { label: "已登记", cls: "pending" };
  if (fill.status === "signed") return { label: "已签收", cls: "signed" };
  if (fill.status === "frozen") return { label: "已冻结", cls: "frozen" };
  return { label: "队列中", cls: "pending" };
}

/** 回收记录台账:登记留痕、更正入口;更正会冻结依赖充填并标记已签收记录 */
export function RecoveryLedger(props: {
  state: StationState;
  onCorrect: (recoveryId: string, patch: CorrectionInput) => boolean;
}) {
  const [target, setTarget] = useState<RecoveryRecord | null>(null);
  const [pressure, setPressure] = useState("");
  const [medium, setMedium] = useState<Medium>("空气");
  const [seal, setSeal] = useState<SealResult>("合格");
  const [by, setBy] = useState("");
  const [reason, setReason] = useState("");

  const openCorrect = (record: RecoveryRecord) => {
    setTarget(record);
    setPressure(String(record.pressure));
    setMedium(record.medium);
    setSeal(record.seal);
    setBy("");
    setReason("");
  };

  const submit = () => {
    if (!target) return;
    const succeeded = props.onCorrect(target.id, {
      pressure: pressure === "" ? NaN : Number(pressure),
      medium,
      seal,
      by,
      reason,
    });
    if (succeeded) setTarget(null);
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>回收记录 {props.state.recoveries.length} 条</p>
          <h2>登记台账 · 可更正</h2>
        </div>
      </div>
      <div className="rows">
        {props.state.recoveries.map((record) => {
          const status = statusOf(record, props.state);
          return (
            <article key={record.id} className="row">
              <div className="row-main">
                <div className="row-head">
                  <h3>{record.tankId}</h3>
                  <span className={`badge ${status.cls}`}>{status.label}</span>
                  {record.revisions.length > 0 && (
                    <span className="badge revised">更正 {record.revisions.length} 次</span>
                  )}
                </div>
                <p className="meta">
                  余压 {record.pressure}bar · {record.medium} · 密封{record.seal} · 登记人{" "}
                  {record.operator} · {fmtTime(record.createdAt)}
                </p>
                {record.recheck && (
                  <p className="meta ok-text">
                    复检:{record.recheck.inspector} · 余压 {record.recheck.pressure}bar · 密封
                    {record.recheck.seal} · {fmtTime(record.recheck.at)}
                  </p>
                )}
              </div>
              <div className="row-actions">
                <button type="button" onClick={() => openCorrect(record)}>
                  更正
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {target && (
        <Modal title={`更正回收记录 · ${target.tankId}`} onClose={() => setTarget(null)}>
          <p className="hint warn">
            更正后:依赖该记录的未完成充填立即冻结;已签收记录保留但标记受影响;
            若更正后密封异常或余压低于下限,记录转入隔离清单。
          </p>
          <div className="field-grid">
            <label>
              <span>余压(bar)</span>
              <input
                type="number"
                min={0}
                value={pressure}
                onChange={(e) => setPressure(e.target.value)}
              />
            </label>
            <label>
              <span>介质</span>
              <select value={medium} onChange={(e) => setMedium(e.target.value as Medium)}>
                {MEDIUMS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>阀门密封</span>
              <select value={seal} onChange={(e) => setSeal(e.target.value as SealResult)}>
                <option value="合格">合格</option>
                <option value="异常">异常</option>
              </select>
            </label>
            <label>
              <span>更正人</span>
              <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="填写更正人" />
            </label>
            <label className="wide">
              <span>更正原因</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="如:压力表复测读数更正"
              />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="primary" onClick={submit}>
              提交更正
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
