const total = db.customers.countDocuments();
print("=== 客户总数: " + total + " ===\n");

const fields = [
  ["needOrderType",       "serviceCategory"],
  ["needSalary",          "salaryBudget"],
  ["needRestTime",        "restSchedule"],
  ["needOnboardingTime",  "expectedStartDate"],
  ["needHouseArea",       "homeArea"],
  ["needFamilyMembers",   "familySize"],
  ["needServiceAddress",  "address"],
];

print("【7 对重复字段的填写情况】");
print("=".repeat(115));
print("need字段              非空数  占比    | 结构化字段           非空数  占比    | 仅need有值  仅结构化有值  两者都有  两者都空");
print("-".repeat(115));

fields.forEach(function(pair) {
  const n = pair[0], s = pair[1];
  const needNotEmpty = { [n]: { $exists: true, $nin: [null, ""] } };
  const structNotEmpty = { [s]: { $exists: true, $nin: [null, ""] } };
  const cn = db.customers.countDocuments(needNotEmpty);
  const cs = db.customers.countDocuments(structNotEmpty);
  const onlyN = db.customers.countDocuments({ $and: [needNotEmpty, { $or: [{ [s]: null }, { [s]: "" }, { [s]: { $exists: false } }] }] });
  const onlyS = db.customers.countDocuments({ $and: [structNotEmpty, { $or: [{ [n]: null }, { [n]: "" }, { [n]: { $exists: false } }] }] });
  const both = db.customers.countDocuments({ $and: [needNotEmpty, structNotEmpty] });
  const neither = total - onlyN - onlyS - both;
  const pad = function(x, w) { return x.toString().padEnd(w); };
  print(pad(n, 22) + pad(cn, 7) + pad(((cn/total)*100).toFixed(1)+"%", 9) + "| " +
        pad(s, 20) + pad(cs, 7) + pad(((cs/total)*100).toFixed(1)+"%", 9) + "| " +
        pad(onlyN, 11) + pad(onlyS, 13) + pad(both, 10) + neither);
});
