const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const dir = path.join(__dirname, '..');
function app() {
  const context = vm.createContext({structuredClone, Intl, Date, Set, Map, localStorage:{getItem:()=>null}, document:{querySelector:()=>({})}});
  let script = fs.readFileSync(path.join(dir,'script.js'),'utf8');
  script = script.slice(0, script.indexOf('elements.springStart.addEventListener'));
  vm.runInContext(fs.readFileSync(path.join(dir,'honors-data.js'),'utf8')+'\n'+script, context);
  return expression => vm.runInContext(expression, context);
}
test('baseline preserves fall dates and all seven Honors units',()=>{
 const run=app();
 const dates=JSON.parse(run('JSON.stringify(calculateSchedule().scheduledBlocks.map(b=>({title:b.title,start:toIsoDate(b.start),end:b.end&&toIsoDate(b.end)})))'));
 for(const [name,start,end] of [
 ['Non-Curricular Tasks','2026-08-19','2026-08-19'],
 ['Unit 1 Test','2026-09-16','2026-09-17'],
 ['Unit 2 Test','2026-10-27','2026-10-27'],
 ['Unit 3 Test','2026-11-18','2026-11-19'],
 ['Midterm Exam Review Week','2026-12-07','2026-12-11'],
 ['Midterm Reflection','2027-01-19','2027-01-19']]){
 const actual=dates.find(b=>b.title===name);assert.equal(actual.start,start,name);assert.equal(actual.end,end,name);
 }
 assert.equal(dates.length,79);
 for(let unit=1;unit<=7;unit++) assert.ok(dates.some(b=>b.title.startsWith(unit+'.')));
 assert.equal(run('calculateSchedule().semesterConflicts.length'),0);
 console.log('Last block:',dates.at(-1));
});
test('extra day shifts later lessons; anchors stay fixed; no lessons on closures, weekends or missing calendar',()=>{
 const run=app();
 run('state.blocks[1].days += 1');
 assert.equal(run('toIsoDate(calculateSchedule().scheduledBlocks[2].start)'),'2026-08-25');
 assert.equal(run('toIsoDate(calculateSchedule().scheduledBlocks.find(b=>b.title==="Midterm Reflection").start)'),'2027-01-19');
 assert.equal(run('calculateSchedule().semesterConflicts.length'),1);
 assert.equal(run('[...calculateSchedule().dayAssignments.keys()].every(d=>isInstructionalDay(parseIsoDate(d)))'),true);
 assert.equal(run('calculateSchedule().dayAssignments.has("2026-12-15")'),false);
});
test('spring changes shift later spring lessons without moving fall or fixed review',()=>{
 const run=app();
 const before=run('toIsoDate(calculateSchedule().scheduledBlocks.at(-1).end)');
 run('state.blocks.find(b=>b.title==="4.3 - Solving Systems by Substitution").days += 2');
 assert.notEqual(run('toIsoDate(calculateSchedule().scheduledBlocks.at(-1).end)'),before);
 assert.equal(run('toIsoDate(calculateSchedule().scheduledBlocks.find(b=>b.title==="Unit 1 Test").start)'),'2026-09-16');
 assert.equal(run('state.blocks.find(b=>b.id==="honors-39").title'),'Midterm Reflection');
});
test('Honors storage and exports are isolated from original',()=>{
 const run=app();assert.equal(run('STORAGE_KEY'),'honors-lesson-schedule-shifter-2026-27-v1');
 assert.equal(run('defaultState().springStart'),'2027-01-19');
 assert.equal(run('state.blocks.some(b=>b.title==="Unassigned - source calendar blank" && b.days===5)'),true);
});
