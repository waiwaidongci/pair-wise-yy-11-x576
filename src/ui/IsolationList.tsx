import { useState } from "react";
import { MIN_RECOVERY_PRESSURE } from "../domain/constants";
import type { RecheckInput } from "../domain/rules";
import type { RecoveryRecord, SealResult } from "../domain/types";
import { fmtTime } from "./format";
import { Modal } from "./Modal";

/** 隔离清单:密封异常或余压低于下限的气瓶只进清单,不占充填位 */
export function IsolationList(props: {
  recoveries: RecoveryRecord[];
  onRelease: (recoveryId: string, recheck: RecheckInput) => boolean;
}) {
  const isolated = props.recoveries.filter((r) => r.status === "isolated");
  const [target, setTarget] = useState<RecoveryRecord | null>(null);
  const [inspector, setInspector] = useState("");
  const [pressure, setPressure] = useState("");
  const [seal, setSeal] = useState<SealResult>("合格");

  const openRecheck = (record: RecoveryRecord) => {
    setTarget(record);
    setInspector("");
    setPressure(String(record.pressure));
    setSeal("合格");
  };

  const submit = () => {
    if (!target) return;
    const succeeded = props.onRelease(target.id, {
      inspector,
      pressure: pressure === "" ? NaN : Number(pressure),
      seal,
    });
    if (succeeded) setTarget(null);
  };

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>隔离清单 {isolated.length} 瓶</p>
          <h2>隔离中 · 不占充填位</h2>
        </div>
      </div>
      {isolated.length === 0 && <p className="empty">隔离清单为空</p>}
      <div className="rows">
        {isolated.map((record) => (
          <article key={record.id} className="row">
            <div className="row-main">
              <div className="row-head">
                <h3>{record.tankId}</h3>
                <span className="badge isolated">隔离中</span>
              </div>
              <p className="meta">
                {record.medium} · 余压 {record.pressure}bar · 登记人 {record.operator} ·{" "}
                {fmtTime(record.createdAt)}
              </p>
              <p className="meta warn-text">原因:{record.isolationReasons.join("、")}</p>
            </div>
            <div className="row-actions">
              <button type="button" onClick={() => openRecheck(record)}>
                复检解除
              </button>
            </div>
          </article>
        ))}
      </div>

      {target && (
        <Modal title={`复检解除 · ${target.tankId}`} onClose={() => setTarget(null)}>
          <p className="hint">
            隔离解除须换人复检且复测合格:复检人不能是登记人({target.operator}),密封复测合格,
            且余压不低于充填下限 {MIN_RECOVERY_PRESSURE}bar。
          </p>
          <div className="field-grid">
            <label>
              <span>复检人(须换人)</span>
              <input
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                placeholder={`不能是 ${target.operator}`}
              />
            </label>
            <label>
              <span>复测余压(bar)</span>
              <input
                type="number"
                min={0}
                value={pressure}
                onChange={(e) => setPressure(e.target.value)}
              />
            </label>
            <label>
              <span>密封复测</span>
              <select value={seal} onChange={(e) => setSeal(e.target.value as SealResult)}>
                <option value="合格">合格</option>
                <option value="异常">异常</option>
              </select>
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="primary" onClick={submit}>
              复检合格 · 解除隔离
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
