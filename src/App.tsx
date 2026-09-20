import "./styles.css";
import { useStation } from "./hooks/useStation";
import { canResume, MIN_FILL_PRESSURE } from "./domain/rules";
import { RecoveryForm } from "./components/RecoveryForm";
import { FillQueue } from "./components/FillQueue";
import { IsolationList } from "./components/IsolationList";
import { RecoveryLog } from "./components/RecoveryLog";
import { SignedList } from "./components/SignedList";

function App() {
  const { state, stats, actions } = useStation();

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62010 · 余压回收与阀件隔离复充台</p>
        <h1>余压回收与阀件隔离复充台</h1>
        <span>
          每瓶回收前登记余压、介质与阀门密封结果；密封异常或余压低于充填下限{" "}
          {MIN_FILL_PRESSURE}bar 的气瓶只进隔离清单、不占充填位。回收记录更正后，
          依赖它的未完成充填立即冻结，已签收记录保留但标记受影响；隔离解除须换人复检且复测合格才能恢复。
        </span>
      </section>

      <section className="metrics">
        <article>
          <small>待充填</small>
          <strong>{stats.queued}</strong>
        </article>
        <article>
          <small>冻结中</small>
          <strong>{stats.frozen}</strong>
        </article>
        <article>
          <small>隔离中</small>
          <strong>{stats.isolated}</strong>
        </article>
        <article>
          <small>已签收（受影响 {stats.affectedSigned}）</small>
          <strong>{stats.signed}</strong>
        </article>
      </section>

      <section className="workspace">
        <aside className="panel rules-panel">
          <h2>作业规则</h2>
          <ol className="rules">
            <li>回收前逐瓶登记余压、介质、阀门密封结果。</li>
            <li>
              密封异常或余压低于 {MIN_FILL_PRESSURE}bar：只进隔离清单，不占充填位。
            </li>
            <li>回收记录更正：未完成充填立即冻结，已签收保留但标记受影响。</li>
            <li>隔离解除：须换人复检且复测合格，方可重新占充填位。</li>
          </ol>
          <button onClick={actions.resetAll}>重置演示数据</button>
        </aside>

        <RecoveryForm onSubmit={actions.registerRecovery} />
      </section>

      <FillQueue
        fills={state.fills}
        canResume={(fill) => canResume(state, fill)}
        onSign={actions.signFill}
        onResume={actions.resumeFill}
      />

      <section className="two-col">
        <IsolationList
          entries={state.isolations}
          recoveries={state.recoveries}
          onRelease={actions.releaseIsolation}
        />
        <RecoveryLog recoveries={state.recoveries} onCorrect={actions.correctRecovery} />
      </section>

      <SignedList fills={state.fills} />
    </main>
  );
}

export default App;
