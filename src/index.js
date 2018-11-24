const Hook = require("./Hook");

const hook = new Hook();
const calls = [];
hook.tap("A", () => calls.push("A"));
hook._call();
console.log(calls);

calls.length = 0;
hook.tap("B", () => calls.push("B"));
hook._call();
console.log(calls);

calls.length = 0;
hook.tap({ name: "C", before: ["A", "B"] }, () => calls.push("C"));
hook._call();
console.log(calls);

calls.length = 0;
hook.tap({ name: "D", stage: -5 }, () => calls.push("D"));
hook._call();
console.log(calls);

calls.length = 0;
hook.tap({ name: "E", stage: 3 }, () => calls.push("E"));
hook._call();
console.log(calls);