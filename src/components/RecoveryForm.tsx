import { useState } from "react";
import type { Medium } from "../domain/types";
import {
  isolationReasons,
  MEDIUMS,
  REASON_TEXT,
  type RecoveryInput,
} from "../domain/rules";

interface Props {
  onSubmit: (input: RecoveryInput) => void;
}

/** 回收登记：每瓶回收前登记余压、介质、阀门密封结果 */
export function RecoveryForm({ onSubmit }: Props) {
  const [tankNo, setTankNo] = useState("");
  const [medium, setMedium] = useState<Medium>("空气");
  const [pressure, setPressure] = useState("");
  const [sealOk, setSealOk] = useState(true);
  const [operator, setOperator] = useState("");

  const pressureNum = Number(pressure);
  const pressureValid = pressure !== "" && Number.isFinite(pressureNum) && pressureNum >= 0;
  const canSubmit = tankNo.trim() !== "" && operator.trim() !== "" && pressureValid;

  // 实时预判去向：合格占充填位，不合格只进隔离清单
  const previewReasons = pressureValid
    ? isolationReasons({ residualPressure: pressureNum, sealOk })
    : [];

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      tankNo,
      medium,
      residualPressure: pressureNum,
      sealOk,
      operator,
    });
    setTankNo("");
    setPressure("");
    setSealOk(true);
  }

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>回收登记</p>
          <h2>气瓶回收前检查</h2>
        </div>
      </div>
      <div className="field-grid">
        <label>
          <span>气瓶编号</span>
          <input
            placeholder="如 TANK-240"
            value={tankNo}
            onChange={(e) => setTankNo(e.target.value)}
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
          <span>余压（bar）</span>
          <input
            type="number"
            min={0}
            placeholder="回收前实测余压"
            value={pressure}
            onChange={(e) => setPressure(e.target.value)}
          />
        </label>
        <label>
          <span>阀门密封结果</span>
          <select
            value={sealOk ? "ok" : "bad"}
            onChange={(e) => setSealOk(e.target.value === "ok")}
          >
            <option value="ok">密封合格</option>
            <option value="bad">密封异常</option>
          </select>
        </label>
        <label>
          <span>登记人</span>
          <input
            placeholder="操作人员姓名"
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
          />
        </label>
      </div>

      {pressureValid && (
        <p className={previewReasons.length > 0 ? "route route-isolate" : "route route-fill"}>
          {previewReasons.length > 0
            ? `→ 只进隔离清单，不占充填位：${previewReasons
                .map((r) => REASON_TEXT[r])
                .join("；")}`
            : "→ 检查合格，登记后进入充填队列"}
        </p>
      )}

      <div className="form-actions">
        <button className="primary" disabled={!canSubmit} onClick={handleSubmit}>
          登记回收
        </button>
      </div>
    </section>
  );
}
