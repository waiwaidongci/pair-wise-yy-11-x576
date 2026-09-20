import type { FillRecord } from "../domain/types";
import { fmtTime } from "./format";

/** 签收记录:已签收记录永久保留;回收记录被更正后,受影响的签收单会标记出来 */
export function SignedList({ fills }: { fills: FillRecord[] }) {
  const signed = fills.filter((f) => f.status === "signed");
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>签收单 {signed.length} 笔</p>
          <h2>已签收记录</h2>
        </div>
      </div>
      {signed.length === 0 && <p className="empty">暂无签收记录</p>}
      <div className="rows">
        {signed.map((fill) => (
          <article key={fill.id} className="row">
            <div className="row-main">
              <div className="row-head">
                <h3>{fill.tankId}</h3>
                <span className="badge signed">已签收</span>
                {fill.affected && <span className="badge affected">受更正影响</span>}
              </div>
              <p className="meta">
                {fill.medium} → {fill.targetPressure}bar · 签收人 {fill.signedBy ?? "-"} ·{" "}
                {fill.signedAt ? fmtTime(fill.signedAt) : "-"}
              </p>
              {fill.affected && (
                <p className="meta warn-text">该签收单依赖的回收记录已被更正,请复核</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
