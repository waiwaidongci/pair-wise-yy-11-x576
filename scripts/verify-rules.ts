import {
  registerRecovery,
  correctRecovery,
  releaseIsolation,
  resumeFill,
  signFill,
  canResume,
  summarize,
  MIN_FILL_PRESSURE,
} from "../src/domain/rules";
import { seedState } from "../src/data/store";
import type { StationState } from "../src/domain/types";

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ok  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}`);
  }
}

const empty: StationState = { recoveries: [], fills: [], isolations: [] };

// 1. 合格回收 → 占充填位
let s = registerRecovery(empty, {
  tankNo: "T-1",
  medium: "空气",
  residualPressure: 80,
  sealOk: true,
  operator: "甲",
});
check("合格回收进入充填队列", s.fills.length === 1 && s.fills[0].status === "queued");
check("合格回收不进隔离清单", s.isolations.length === 0);

// 2. 密封异常 → 只进隔离清单
s = registerRecovery(s, {
  tankNo: "T-2",
  medium: "高氧",
  residualPressure: 80,
  sealOk: false,
  operator: "甲",
});
check("密封异常只进隔离清单", s.isolations.length === 1 && s.isolations[0].reasons.includes("seal"));
check("密封异常不占充填位", s.fills.length === 1);

// 3. 余压低于下限 → 只进隔离清单
s = registerRecovery(s, {
  tankNo: "T-3",
  medium: "Trimix",
  residualPressure: MIN_FILL_PRESSURE - 1,
  sealOk: true,
  operator: "乙",
});
check("余压不足只进隔离清单", s.isolations.length === 2 && s.isolations[0].reasons.includes("pressure"));
check("余压不足不占充填位", s.fills.length === 1);

// 4. 签收后更正 → 签收保留但标记受影响
const fillId = s.fills[0].id;
const recId = s.fills[0].recoveryId;
s = signFill(s, fillId);
check("签收成功", s.fills[0].status === "signed");
s = correctRecovery(s, recId, { residualPressure: 90 });
check("更正后签收记录保留", s.fills.length === 1 && s.fills[0].status === "signed");
check("更正后签收记录标记受影响", s.fills[0].affected === true);

// 5. 未完成充填被更正 → 立即冻结
let s2 = registerRecovery(empty, {
  tankNo: "T-4",
  medium: "空气",
  residualPressure: 60,
  sealOk: true,
  operator: "甲",
});
const r2 = s2.recoveries[0].id;
s2 = correctRecovery(s2, r2, { residualPressure: 70 });
check("更正后未完成充填立即冻结", s2.fills[0].status === "frozen");
check("复评合格可恢复", canResume(s2, s2.fills[0]));
s2 = resumeFill(s2, s2.fills[0].id);
check("复核恢复后回到队列", s2.fills[0].status === "queued");

// 6. 更正为不合格 → 转隔离并释放充填位
s2 = correctRecovery(s2, r2, { residualPressure: 10 });
check("更正为不合格后充填位移出队列", s2.fills.length === 0);
check("更正为不合格后进入隔离清单", s2.isolations.length === 1 && s2.isolations[0].status === "isolated");

// 7. 隔离解除：同人复检被拒
let res = releaseIsolation(s2, s2.isolations[0].id, { by: "甲", pressure: 100, sealOk: true });
check("复检人=原登记人被拒", res.error !== null && res.state.isolations[0].status === "isolated");

// 8. 复测不合格被拒
res = releaseIsolation(s2, s2.isolations[0].id, { by: "乙", pressure: 5, sealOk: true });
check("复测余压不足被拒", res.error !== null);
res = releaseIsolation(s2, s2.isolations[0].id, { by: "乙", pressure: 100, sealOk: false });
check("复测密封异常被拒", res.error !== null);

// 9. 换人复检 + 复测合格 → 解除并重新占位
res = releaseIsolation(s2, s2.isolations[0].id, { by: "乙", pressure: 100, sealOk: true });
check("换人复检合格解除成功", res.error === null);
check("解除后状态为 released", res.state.isolations[0].status === "released");
check("解除后重新占充填位", res.state.fills.length === 1 && res.state.fills[0].status === "queued");
check("复测值回写回收记录", res.state.recoveries[0].residualPressure === 100);

// 10. 统计与状态同源
const stats = summarize(res.state);
check("统计：待充填=1", stats.queued === 1);
check("统计：隔离中=0", stats.isolated === 0);

// 11. 种子数据自检
const seed = seedState();
const seedStats = summarize(seed);
check("种子：待充填=2", seedStats.queued === 2);
check("种子：隔离中=2", seedStats.isolated === 2);
check("种子：已签收=1", seedStats.signed === 1);
check(
  "种子：隔离条目的回收单均不合格",
  seed.isolations.every((i) => {
    const r = seed.recoveries.find((x) => x.id === i.recoveryId)!;
    return !r.sealOk || r.residualPressure < MIN_FILL_PRESSURE;
  })
);

console.log(failures === 0 ? "\n全部通过" : `\n${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
