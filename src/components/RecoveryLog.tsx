import { useState } from "react";
import type { Medium, RecoveryRecord } from "../domain/types";
import { MEDIUMS, type CorrectionPatch } from "../domain/rules";

interface Props {
  recoveries: RecoveryRecord[];
  onCorrect: (recoveryId: string, patch: CorrectionPatch) => void;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CorrectionForm({
  record,
  onCorrect,
  onDone,
}: {
  record: RecoveryRecord;
  onCorrect: Props["onCorrect"];
  onDone: () => void;
}) {
  const [medium, setMedium] = useState<Medium>(record.medium);
  const [pressure, setPressure] = useState(String(record.residualPressure));
  const [sealOk, setSealOk] = useState(record.sealOk);

  const pressureNum = Number(pressure);
  const valid = pressure !== "" && Number.isFinite(pressureNum) && pressureNum >= 0;

  function handleSubmit() {
    if (!valid) return;
    onCorrect(record.id, {
      medium,
      residualPressure: pressureNum,
      sealOk,
    });
    onDone();
  }

  return (
    <div className="recheck">
      <p className="warn">
        提交更正后：依赖该记录的未完成充填立即冻结；已签收记录保留但标记受影响；复评不合格将转入隔离。
      </p>
      <div className="recheck-grid">
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
          <span>余压（bar）</span>
          <input
            type="number"
            min={0}
            value={pressure}
            onChange={(e) => setPressure(e.target.value)}
          />
        </label>
        <label>
          <span>阀门密封结果</span>
          <select value={sealOk ? "ok" : "bad"} onChange={(e) => setSealOk(e.target.value === "ok")}>
            <option value="ok">密封合格</option>
            <option value="bad">密封异常</option>
          </select>
        </label>
        <button className="primary" disabled={!valid} onClick={handleSubmit}>
          提交更正
        </button>
      </div>
    </div>
  );
}

/** 回收记录台账：支持更正，更正触发规则层级联 */
export function RecoveryLog({ recoveries, onCorrect }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>台账</p>
          <h2>回收登记记录（{recoveries.length}）</h2>
        </div>
      </div>
      {recoveries.length === 0 && <p className="empty">暂无回收记录</p>}
      <div className="records">
        {recoveries.map((r) => (
          <article key={r.id}>
            <b>{r.tankNo}</b>
            <div>
              <h3>
                {r.medium} · 余压 {r.residualPressure}bar
                <span className={r.sealOk ? "chip chip-ok" : "chip chip-isolated"}>
                  {r.sealOk ? "密封合格" : "密封异常"}
                </span>
                {r.corrections > 0 && (
                  <span className="chip chip-corrected">已更正×{r.corrections}</span>
                )}
              </h3>
              <p>
                回收单 {r.id} · 登记人 {r.operator} · 更新于 {fmtTime(r.updatedAt)}
              </p>
              {editingId === r.id && (
                <CorrectionForm
                  record={r}
                  onCorrect={onCorrect}
                  onDone={() => setEditingId(null)}
                />
              )}
            </div>
            <div className="row-actions">
              <button onClick={() => setEditingId(editingId === r.id ? null : r.id)}>
                {editingId === r.id ? "收起" : "更正"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
