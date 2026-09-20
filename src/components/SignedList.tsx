import type { FillTask } from "../domain/types";

interface Props {
  fills: FillTask[];
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 签收记录：已签收的充填单；被回收更正波及的保留但标记受影响 */
export function SignedList({ fills }: Props) {
  const signed = fills.filter((f) => f.status === "signed");

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>签收单</p>
          <h2>签收记录（{signed.length}）</h2>
        </div>
      </div>
      {signed.length === 0 && <p className="empty">暂无签收记录</p>}
      <div className="records">
        {signed.map((f) => (
          <article key={f.id} className={f.affected ? "row-affected" : ""}>
            <b>{f.tankNo}</b>
            <div>
              <h3>
                {f.medium} → {f.targetPressure}bar
                {f.affected ? (
                  <span className="chip chip-affected">受影响</span>
                ) : (
                  <span className="chip chip-ok">已签收</span>
                )}
              </h3>
              <p>
                来源回收单 {f.recoveryId} · 签收于 {f.signedAt ? fmtTime(f.signedAt) : "-"}
                {f.affected && " · 其回收记录已被更正，请复核该瓶充填结果"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
