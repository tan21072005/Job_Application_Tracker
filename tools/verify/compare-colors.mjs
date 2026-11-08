import fs from 'node:fs';

const before = JSON.parse(fs.readFileSync('F:/Project/Job_Application_Tracker/output/color-before.json', 'utf8'));
const after = JSON.parse(fs.readFileSync('F:/Project/Job_Application_Tracker/output/color-after.json', 'utf8'));

const routes = Object.keys(before);
console.log('routes:', routes.length);

let elementsCompared = 0;
let propertyCompared = 0;
const diffs = [];
const missingRoutes = [];
const missingElements = [];

for (const route of routes) {
  if (!after[route]) { missingRoutes.push(route); continue; }
  const a = before[route];
  const b = after[route];
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) {
    diffs.push({ route, kind: 'element-count', before: keysA.length, after: keysB.length });
  }

  for (const key of keysA) {
    if (!b[key]) { missingElements.push({ route, key }); continue; }
    elementsCompared += 1;
    for (const prop of Object.keys(a[key])) {
      propertyCompared += 1;
      const v1 = a[key][prop];
      const v2 = b[key][prop];
      if (v1 !== v2) diffs.push({ route, key, prop, before: v1, after: v2 });
    }
  }
}

console.log('elements compared:', elementsCompared);
console.log('properties compared:', propertyCompared);
console.log('routes missing:', missingRoutes.length);
console.log('elements missing:', missingElements.length);
console.log('DIFFERENCES:', diffs.length);

for (const d of diffs.slice(0, 20)) console.log('  ' + JSON.stringify(d));
for (const m of missingElements.slice(0, 5)) console.log('  missing: ' + JSON.stringify(m));

const ok = diffs.length === 0 && missingElements.length === 0 && missingRoutes.length === 0;
console.log('');
console.log(ok ? 'PASS: every computed colour is identical' : 'FAIL: colour values changed');
process.exitCode = ok ? 0 : 1;
