import { useState } from "react";
import { MEDIUMS, MIN_RECOVERY_PRESSURE } from "../domain/constants";
import type { RecoveryInput } from "../domain/rules";
import type { Medium, SealResult } from "../domain/types";

/** 回收登记:每瓶回收前登记余压、介质与阀门密封结果 */
export function RecoveryForm(props: {
  defaultOperator: string;
  onSubmit: (input: RecoveryInput) => boolean;
}) {
  const [tankId, setTankId] = useState("");
  const [pressure, setPressure] = useState("");
  const [medium, setMedium] = useState<Medium>("空气");
  const [seal, setSeal] = useState<SealResult>("合格");
  const [operator, setOperator] = useState("");

  const willIsolate =
    seal === "异常" || (pressure !== "" && Number(pressure) < MIN_RECOVERY_PRESSURE);

  const submit = () => {
    const succeeded = props.onSubmit({
      tankId,
      pressure: pressure === "" ? NaN : Number(pressure),
      medium,
      seal,
      operator: operator.trim() || props.defaultOperator,
    });
    if (succeeded) {
      setTankId("");
      setPressure("");
      setSeal("合格");
    }
  };

  return (
    <section className="panel form-panel">
      <div className="heading">
        <div>
          <p>回收登记</p>
          <h2>余压 / 介质 / 阀门密封</h2>
        </div>
        <button type="button" className="primary" onClick={submit}>
          登记回收
        </button>
      </div>
      <div className="field-grid">
        <label>
          <span>气瓶编号</span>
          <input
            value={tankId}
            onChange={(e) => setTankId(e.target.value)}
            placeholder="如 TANK-301"
          />
        </label>
        <label>
          <span>余压(bar)</span>
          <input
            type="number"
            min={0}
            value={pressure}
            onChange={(e) => setPressure(e.target.value)}
            placeholder={`充填下限 ${MIN_RECOVERY_PRESSURE}bar`}
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
          <span>登记人</span>
          <input
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            placeholder={props.defaultOperator || "填写登记人"}
          />
        </label>
      </div>
      <p className={`hint ${willIsolate ? "warn" : ""}`}>
        {willIsolate
          ? "按规则:密封异常或余压低于下限,只进隔离清单,不占充填位"
          : "按规则:进入待充填队列,占用 1 个充填位"}
      </p>
    </section>
  );
}
