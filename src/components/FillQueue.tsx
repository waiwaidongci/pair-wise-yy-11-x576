import type { FillTask } from "../domain/types";

interface Props {
  fills: FillTask[];
  canResume: (fill: FillTask) => boolean;
  onSign: (fillId: string) => void;
  onResume: (fillId: string) => void;
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 充填队列：待充填 + 被更正级联冻结的任务 */
export function FillQueue({ fills, canResume, onSign, onResume }: Props) {
  const active = fills.filter((f) => f.status !== "signed");

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>充填位</p>
          <h2>充填队列（{active.length}）</h2>
        </div>
      </div>
      {active.length === 0 && <p className="empty">暂无占用充填位的气瓶</p>}
      <div className="records">
        {active.map((f) => (
          <article key={f.id} className={f.status === "frozen" ? "row-frozen" : ""}>
            <b>{f.tankNo}</b>
            <div>
              <h3>
                {f.medium} → 目标 {f.targetPressure}bar
                {f.status === "frozen" ? (
                  <span className="chip chip-frozen">已冻结</span>
                ) : (
                  <span className="chip chip-queued">待充填</span>
                )}
              </h3>
              <p>
                来源回收单 {f.recoveryId} · 登记于 {fmtTime(f.createdAt)}
                {f.status === "frozen" &&
                  " · 回收记录被更正，充填已冻结，复核合格后可恢复"}
              </p>
            </div>
            <div className="row-actions">
              {f.status === "queued" && (
                <button className="primary" onClick={() => onSign(f.id)}>
                  充填完成签收
                </button>
              )}
              {f.status === "frozen" && (
                <button
                  disabled={!canResume(f)}
                  title={canResume(f) ? "回收记录复评合格，可恢复占位" : "回收记录仍不合格，无法恢复"}
                  onClick={() => onResume(f.id)}
                >
                  复核恢复
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
