import { useState } from "react";
import type { IsolationEntry, RecoveryRecord } from "../domain/types";
import { MIN_FILL_PRESSURE, REASON_TEXT, type RecheckInput } from "../domain/rules";

interface Props {
  entries: IsolationEntry[];
  recoveries: RecoveryRecord[];
  onRelease: (entryId: string, recheck: RecheckInput) => string | null;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RecheckForm({
  entry,
  operator,
  onRelease,
}: {
  entry: IsolationEntry;
  operator: string;
  onRelease: Props["onRelease"];
}) {
  const [by, setBy] = useState("");
  const [pressure, setPressure] = useState("");
  const [sealOk, setSealOk] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function handleRelease() {
    const err = onRelease(entry.id, {
      by,
      pressure: Number(pressure),
      sealOk,
    });
    setError(err);
  }

  return (
    <div className="recheck">
      <div className="recheck-grid">
        <label>
          <span>复检人（须≠原登记人 {operator}）</span>
          <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="换人复检" />
        </label>
        <label>
          <span>复测余压（bar，≥{MIN_FILL_PRESSURE}）</span>
          <input
            type="number"
            min={0}
            value={pressure}
            onChange={(e) => setPressure(e.target.value)}
          />
        </label>
        <label>
          <span>复测密封</span>
          <select value={sealOk ? "ok" : "bad"} onChange={(e) => setSealOk(e.target.value === "ok")}>
            <option value="ok">密封合格</option>
            <option value="bad">密封异常</option>
          </select>
        </label>
        <button className="primary" onClick={handleRelease}>
          复检合格 · 解除隔离
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/** 隔离清单：密封异常 / 余压不足的瓶只进这里，解除须换人复检且复测合格 */
export function IsolationList({ entries, recoveries, onRelease }: Props) {
  const open = entries.filter((e) => e.status === "isolated");
  const released = entries.filter((e) => e.status === "released");

  const operatorOf = (recoveryId: string) =>
    recoveries.find((r) => r.id === recoveryId)?.operator ?? "未知";

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>阀件隔离</p>
          <h2>隔离清单（{open.length}）</h2>
        </div>
      </div>
      {open.length === 0 && <p className="empty">当前没有隔离中的气瓶</p>}
      <div className="records">
        {open.map((e) => (
          <article key={e.id} className="row-isolated">
            <b>{e.tankNo}</b>
            <div>
              <h3>
                {e.medium}
                {e.reasons.map((r) => (
                  <span key={r} className="chip chip-isolated">
                    {REASON_TEXT[r]}
                  </span>
                ))}
              </h3>
              <p>
                回收单 {e.recoveryId} · 登记人 {operatorOf(e.recoveryId)} · 隔离于{" "}
                {fmtTime(e.createdAt)} · 隔离期间不占充填位
              </p>
              <RecheckForm entry={e} operator={operatorOf(e.recoveryId)} onRelease={onRelease} />
            </div>
          </article>
        ))}
      </div>

      {released.length > 0 && (
        <>
          <h3 className="subheading">已解除（{released.length}）</h3>
          <div className="records">
            {released.map((e) => (
              <article key={e.id} className="row-released">
                <b>{e.tankNo}</b>
                <div>
                  <h3>
                    {e.medium}
                    <span className="chip chip-released">已解除</span>
                  </h3>
                  <p>
                    复检人 {e.recheckBy} · 复测 {e.recheckPressure}bar · 密封
                    {e.recheckSealOk ? "合格" : "异常"} · 解除于{" "}
                    {e.releasedAt ? fmtTime(e.releasedAt) : "-"} · 已重新占充填位
                  </p>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
