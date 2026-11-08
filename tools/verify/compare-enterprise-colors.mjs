import fs from 'node:fs';

const before = JSON.parse(fs.readFileSync('F:/Project/Job_Application_Tracker/output/enterprise-before.json', 'utf8'));
const after = JSON.parse(fs.readFileSync('F:/Project/Job_Application_Tracker/output/enterprise-after.json', 'utf8'));

let elements = 0;
let properties = 0;
const diffs = [];
const missing = [];

for (const feature of Object.keys(before)) {
  const a = before[feature];
  const b = after[feature];
  if (!b) { diffs.push({ feature, kind: 'module missing' }); continue; }
  if (!a.elements) continue;
  if (!b.elements) { diffs.push({ feature, kind: 'no elements after' }); continue; }

  const keysA = Object.keys(a.elements);
  const keysB = Object.keys(b.elements);
  if (keysA.length !== keysB.length) diffs.push({ feature, kind: 'count', before: keysA.length, after: keysB.length });

  for (const key of keysA) {
    if (!b.elements[key]) { missing.push({ feature, key }); continue; }
    elements += 1;
    for (const prop of Object.keys(a.elements[key])) {
      properties += 1;
      const v1 = a.elements[key][prop];
      const v2 = b.elements[key][prop];
      if (v1 !== v2) diffs.push({ feature, key, prop, before: v1, after: v2 });
    }
  }
}

console.log('modules compared:', Object.keys(before).length);
console.log('elements compared:', elements);
console.log('properties compared:', properties);
console.log('elements missing after:', missing.length);
console.log('DIFFERENCES:', diffs.length);
console.log('');

const byFeature = {};
for (const d of diffs) byFeature[d.feature] = (byFeature[d.feature] || 0) + 1;
console.log('diffs by module:', byFeature);

const byTransition = {};
for (const d of diffs) {
  if (!d.prop) continue;
  const key = d.before + ' -> ' + d.after;
  byTransition[key] = (byTransition[key] || 0) + 1;
}
console.log('');
console.log('top transitions:');
for (const [k, v] of Object.entries(byTransition).sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  console.log('  ' + String(v).padStart(4) + 'x  ' + k);
}

const ok = diffs.length === 0 && missing.length === 0;
console.log('');
console.log(ok ? 'PASS: all 28 modules render identical colours' : 'FAIL');
