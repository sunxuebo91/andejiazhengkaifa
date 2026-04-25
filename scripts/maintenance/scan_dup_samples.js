// 查看 need* 字段的实际值形态，方便制定迁移规则
const fields = [
  "needOrderType", "needSalary", "needRestTime", "needOnboardingTime",
  "needHouseArea", "needFamilyMembers", "needServiceAddress",
  "needWorkingHours", "needWorkContent", "needRemarks", "needServicePeriod"
];

fields.forEach(function(f) {
  print("\n========== " + f + " ==========");
  const samples = db.customers.find(
    { [f]: { $exists: true, $nin: [null, ""] } },
    { [f]: 1, _id: 0 }
  ).limit(20).toArray();
  samples.forEach(function(s, i) {
    let v = s[f];
    if (typeof v === "string" && v.length > 80) v = v.substring(0, 80) + "...";
    print("  [" + (i+1) + "] " + JSON.stringify(v));
  });
  const total = db.customers.countDocuments({ [f]: { $exists: true, $nin: [null, ""] } });
  print("  (总非空: " + total + ")");
});

// 看冲突场景：两边都有值，值是否一致
print("\n\n========== 冲突分析（两边都有值时是否一致）==========");
const pairs = [
  ["needOrderType", "serviceCategory"],
  ["needSalary", "salaryBudget"],
  ["needRestTime", "restSchedule"],
  ["needOnboardingTime", "expectedStartDate"],
  ["needHouseArea", "homeArea"],
  ["needFamilyMembers", "familySize"],
  ["needServiceAddress", "address"],
];
pairs.forEach(function(p) {
  const n = p[0], s = p[1];
  const docs = db.customers.find({
    $and: [
      { [n]: { $exists: true, $nin: [null, ""] } },
      { [s]: { $exists: true, $nin: [null, ""] } }
    ]
  }, { [n]: 1, [s]: 1, _id: 0, name: 1 }).limit(15).toArray();
  if (docs.length > 0) {
    print("\n--- " + n + " vs " + s + " ---");
    docs.forEach(function(d) {
      print("  need=" + JSON.stringify(d[n]) + "  | struct=" + JSON.stringify(d[s]) + "  (" + d.name + ")");
    });
  }
});
