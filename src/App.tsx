import { useState } from "react";
import { useStation } from "./data/useStation";
import { FILL_SLOT_COUNT, MIN_RECOVERY_PRESSURE } from "./domain/constants";
import { computeStats } from "./domain/rules";
import { ActivityLog } from "./ui/ActivityLog";
import { FillQueue } from "./ui/FillQueue";
import { IsolationList } from "./ui/IsolationList";
import { RecoveryForm } from "./ui/RecoveryForm";
import { RecoveryLedger } from "./ui/RecoveryLedger";
import { SignedList } from "./ui/SignedList";
import { StatsBar } from "./ui/StatsBar";
import "./styles.css";

function App() {
  const station = useStation();
  const [dutyOperator, setDutyOperator] = useState("");
  const stats = computeStats(station.state);

  return (
    <main className="app">
      <section className="hero">
        <p>hxyfront-62010 · 余压回收与阀件隔离复充台</p>
        <h1>余压回收与阀件隔离复充台</h1>
        <span>
          每瓶回收先登记余压、介质与阀门密封结果;密封异常或余压低于充填下限{" "}
          {MIN_RECOVERY_PRESSURE}bar 只进隔离清单、不占充填位(共 {FILL_SLOT_COUNT}
          个);回收记录更正后,依赖它的未完成充填立即冻结,已签收记录保留但标记受影响;
          隔离解除须换人复检且复测合格才能恢复。
        </span>
        <div className="duty-bar">
          <label className="duty">
            <span>当班操作员</span>
            <input
              value={dutyOperator}
              onChange={(e) => setDutyOperator(e.target.value)}
              placeholder="解冻充填时作为操作人"
            />
          </label>
          <button type="button" onClick={station.reset}>
            重置演示数据
          </button>
        </div>
      </section>

      {station.flash && (
        <div className={`flash ${station.flash.kind}`} role="status">
          {station.flash.text}
        </div>
      )}

      <StatsBar stats={stats} />

      <section className="workspace">
        <RecoveryForm defaultOperator={dutyOperator} onSubmit={station.register} />
        <FillQueue
          state={station.state}
          slots={stats.slots}
          onSign={station.sign}
          onUnfreeze={(fillId) => station.unfreeze(fillId, dutyOperator)}
        />
      </section>

      <section className="duo">
        <IsolationList recoveries={station.state.recoveries} onRelease={station.release} />
        <RecoveryLedger state={station.state} onCorrect={station.correct} />
      </section>

      <section className="duo">
        <SignedList fills={station.state.fills} />
        <ActivityLog log={station.state.log} />
      </section>
    </main>
  );
}

export default App;
