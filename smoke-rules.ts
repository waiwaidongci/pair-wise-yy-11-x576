import {
  computeStats,
  correctRecovery,
  registerRecovery,
  releaseIsolation,
  signFill,
  slotUsage,
  unfreezeFill,
} from "./src/domain/rules";
import { seedState } from "./src/domain/seed";

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  PASS ${name}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${name}`);
  }
}

// 1. 合格登记 → 入队占充填位
let s = seedState();
const before = slotUsage(s).used;
let r = registerRecovery(s, { tankId: "TANK-301", pressure: 80, medium: "空气", seal: "合格", operator: "测试员甲" });
check("合格登记成功", r.ok);
if (r.ok) {
  s = r.state;
  check("入队后充填位 +1", slotUsage(s).used === before + 1);
  check("队列新增待充填", s.fills.some((f) => f.tankId === "TANK-301" && f.status === "pending"));
}

// 2. 密封异常 → 只进隔离清单,不占充填位
r = registerRecovery(s, { tankId: "TANK-302", pressure: 80, medium: "空气", seal: "异常", operator: "测试员甲" });
check("密封异常登记成功", r.ok);
if (r.ok) {
  s = r.state;
  const rec = s.recoveries.find((x) => x.tankId === "TANK-302");
  check("进入隔离清单", rec?.status === "isolated");
  check("不占充填位", slotUsage(s).used === before + 1);
  check("不生成充填任务", !s.fills.some((f) => f.tankId === "TANK-302"));
}

// 3. 余压低于下限 → 只进隔离清单
r = registerRecovery(s, { tankId: "TANK-303", pressure: 10, medium: "空气", seal: "合格", operator: "测试员甲" });
if (r.ok) s = r.state;
check("低余压进入隔离", s.recoveries.find((x) => x.tankId === "TANK-303")?.status === "isolated");

// 4. 更正 → 未完成充填冻结,已签收标记受影响
const seedSigned = s.fills.find((f) => f.id === "fill-seed-1");
const seedPending = s.fills.find((f) => f.id === "fill-seed-2");
r = correctRecovery(s, "rec-seed-2", { pressure: 60, medium: "空气", seal: "合格", by: "测试员乙", reason: "压力表复测" });
check("更正成功", r.ok);
if (r.ok) {
  s = r.state;
  check("依赖充填被冻结", s.fills.find((f) => f.id === "fill-seed-2")?.status === "frozen");
}
r = correctRecovery(s, "rec-seed-1", { pressure: 110, medium: "空气", seal: "合格", by: "测试员乙", reason: "介质复测" });
if (r.ok) {
  s = r.state;
  const signed = s.fills.find((f) => f.id === "fill-seed-1");
  check("已签收记录保留", signed?.status === "signed");
  check("已签收记录标记受影响", signed?.affected === true);
}

// 5. 冻结的充填不能签收;确认更正后可解冻
r = signFill(s, "fill-seed-2", "测试员甲");
check("冻结充填签收被拒", !r.ok);
r = unfreezeFill(s, "fill-seed-2", "测试员甲");
check("确认更正后解冻", r.ok && r.state.fills.find((f) => f.id === "fill-seed-2")?.status === "pending");
if (r.ok) s = r.state;

// 6. 更正使余压低于下限 → 转入隔离清单,充填位释放
const usedBeforeIsolate = slotUsage(s).used;
r = correctRecovery(s, "rec-seed-5", { pressure: 5, medium: "高氧EAN36", seal: "合格", by: "测试员乙", reason: "读数更正" });
if (r.ok) {
  s = r.state;
  check("更正后转入隔离", s.recoveries.find((x) => x.id === "rec-seed-5")?.status === "isolated");
  check("其充填被冻结", s.fills.find((f) => f.recoveryId === "rec-seed-5")?.status === "frozen");
  check("隔离后充填位释放", slotUsage(s).used === usedBeforeIsolate - 1);
}

// 7. 隔离解除:同人被拒 → 复测不合格被拒 → 换人+合格放行,冻结恢复
r = releaseIsolation(s, "rec-seed-5", { inspector: "李岚", pressure: 50, seal: "合格" });
check("复检人与登记人相同被拒", !r.ok);
r = releaseIsolation(s, "rec-seed-5", { inspector: "王潜", pressure: 10, seal: "合格" });
check("复测余压低于下限被拒", !r.ok);
r = releaseIsolation(s, "rec-seed-5", { inspector: "王潜", pressure: 50, seal: "异常" });
check("复测密封异常被拒", !r.ok);
r = releaseIsolation(s, "rec-seed-5", { inspector: "王潜", pressure: 50, seal: "合格" });
check("换人复检合格解除隔离", r.ok);
if (r.ok) {
  s = r.state;
  check("解除后记录恢复 active", s.recoveries.find((x) => x.id === "rec-seed-5")?.status === "active");
  check("冻结充填恢复排队", s.fills.find((f) => f.recoveryId === "rec-seed-5")?.status === "pending");
}

// 8. 登记时就在隔离的瓶,解除后进入队列
r = releaseIsolation(s, "rec-seed-3", { inspector: "赵澄", pressure: 45, seal: "合格" });
check("登记即隔离的瓶解除成功", r.ok);
if (r.ok) {
  s = r.state;
  check("解除后新建充填入队", s.fills.some((f) => f.recoveryId === "rec-seed-3" && f.status === "pending"));
}

// 9. 签收释放充填位,统计与状态一致
r = signFill(s, "fill-seed-2", "陈汐");
check("解冻后签收成功", r.ok);
if (r.ok) s = r.state;
const stats = computeStats(s);
check("统计:待充填数一致", stats.pending === s.fills.filter((f) => f.status === "pending").length);
check("统计:隔离数一致", stats.isolated === s.recoveries.filter((x) => x.status === "isolated").length);
check("统计:充填位一致", stats.slots.used === slotUsage(s).used);

console.log(failures === 0 ? "\n全部通过" : `\n${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
