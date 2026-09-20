import type { computeStats } from "../domain/rules";

export function StatsBar({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const items = [
    { label: "待充填", value: stats.pending },
    { label: "已冻结", value: stats.frozen },
    { label: "隔离中", value: stats.isolated },
    {
      label: "已签收",
      value: stats.signed,
      hint: stats.affected > 0 ? `含 ${stats.affected} 笔受影响` : undefined,
    },
    { label: "充填位", value: `${stats.slots.used}/${stats.slots.total}` },
  ];
  return (
    <section className="metrics">
      {items.map((item) => (
        <article key={item.label}>
          <small>{item.label}</small>
          <strong>{item.value}</strong>
          {item.hint && <em>{item.hint}</em>}
        </article>
      ))}
    </section>
  );
}
