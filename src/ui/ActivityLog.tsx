import type { LogEntry } from "../domain/types";
import { fmtTime } from "./format";

/** 操作日志:登记、更正、冻结、复检、解除、签收全留痕 */
export function ActivityLog({ log }: { log: LogEntry[] }) {
  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>留痕</p>
          <h2>操作日志</h2>
        </div>
      </div>
      {log.length === 0 && <p className="empty">暂无操作</p>}
      <ul className="log">
        {log.slice(0, 10).map((entry) => (
          <li key={entry.id}>
            <time>{fmtTime(entry.at)}</time>
            <span>{entry.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
