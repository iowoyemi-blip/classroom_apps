/* Lesson Schedule Shifter: an intentionally dependency-free, local-first planning tool. */

const STORAGE_KEY = "lesson-schedule-shifter-v1";
const DEFAULT_NO_CLASS_DATES = [
  "2026-09-07", "2026-10-12", "2026-10-13", "2026-10-14",
  "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27",
  "2026-12-21", "2026-12-22", "2026-12-23", "2026-12-24", "2026-12-25",
  "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01",
  "2027-01-04", "2027-01-05", "2027-01-06", "2027-01-07", "2027-01-08",
  "2027-01-11", "2027-01-12", "2027-01-13", "2027-01-14", "2027-01-15", "2027-01-18",
  "2027-02-12", "2027-02-15", "2027-03-08", "2027-03-09", "2027-03-10", "2027-03-11", "2027-03-12",
  "2027-03-26", "2027-03-29", "2027-04-02", "2027-04-05"
];

// These fills match the visual language of the supplied 2026-27 instructional calendar.
const SAMPLE_COLORS = [
  "#ffffff", "#d9f1d0", "#f8dccd", "#c2e3f3", "#ffffff", "#ffffff", "#f6c9b4", "#fff500", "#1c9cd0", "#bdebc9", "#f8dfd2", "#d3e0f0", "#ffffff", "#ffffff", "#f7b465", "#fee69f", "#8bd1ec", "#ffffff", "#f7c7af", "#d7f0d0", "#c4e2f0", "#f9ddd0", "#c4f0c9", "#c3e8f6", "#e9c6e9", "#00f500", "#d8f0d1", "#d7e4f2", "#ffffff", "#ffffff", "#f8c4a9", "#c2efcc", "#edc8ec", "#ffffff", "#ffffff", "#16a9de", "#fedc69", "#ffffff", "#ffffff", "#4bd254", "#63bce0", "#12e3e1", "#c8efc9", "#c5e5f4"
];
const COLOR_CYCLE = ["#d9f1d0", "#f8dccd", "#c2e3f3", "#fff500", "#1c9cd0", "#e9c6e9", "#f7b465", "#c4f0c9"];

const SAMPLE_BLOCKS = [
  ["First Day of Class Activities", "Activity", 1], ["1.1 Rules of Exponents", "Lesson", 6],
  ["1.2 Simplifying Radicals", "Lesson", 5], ["1.3 Operations with Square Roots", "Lesson", 5],
  ["Unit 1 Review", "Review", 1], ["Unit 1 Test", "Test", 2],
  ["2.1 Order of Operations", "Lesson", 2], ["2.2 Variables and Expressions", "Lesson", 4],
  ["2.3 Solving Multi-Step One-Variable Equations", "Lesson", 6], ["2.4 Formulating and Solving Equations from Contexts", "Lesson", 5],
  ["2.5 Literal Equations", "Lesson", 3], ["2.6 Solving Inequalities", "Lesson", 5],
  ["Unit 2 Review", "Review", 1], ["Unit 2 Test", "Test", 2],
  ["3.1 Function Concepts", "Lesson", 5], ["3.2 Function Inputs and Outputs", "Lesson", 5],
  ["3.3 Rate of Change", "Lesson", 5], ["Unit 3 Test", "Test", 1],
  ["4.1-4.2 Graphing and Writing Linear Equations", "Lesson", 7], ["Midterm Review", "Review", 3],
  ["Midterm Exam", "Test", 5], ["4.3 Parallel and Perpendicular Lines", "Lesson", 4],
  ["4.4 Linear Inequalities", "Lesson", 4], ["4.5 Linear Modeling", "Lesson", 5],
  ["5.1 Solving Systems by Graphing", "Lesson", 4], ["5.2 Solving Systems by Algebra", "Lesson", 4],
  ["5.3 Systems of Equations in Contexts", "Lesson", 3], ["5.4 Systems of Linear Inequalities", "Lesson", 3],
  ["Unit 5 Review", "Review", 1], ["Unit 5 Test", "Test", 2],
  ["6.1 Polynomial Vocabulary", "Lesson", 2], ["6.2 Polynomial Operations", "Lesson", 5],
  ["6.3 Factoring", "Lesson", 4], ["Unit 6 Review", "Review", 2], ["Unit 6 Test", "Test", 1],
  ["7.1 Solving Quadratic Equations", "Lesson", 7], ["7.2 Graphing Quadratic Functions", "Lesson", 6],
  ["Unit 7 Review", "Review", 1], ["Unit 7 Test", "Test", 1],
  ["8.1 Linear, Quadratic, and Exponential Patterns", "Lesson", 4], ["8.2 Exponential Growth and Decay", "Lesson", 5],
  ["Multi-layer Problem Solving", "Activity", 2], ["Finals Review", "Review", 3], ["Final Exams", "Test", 5]
].map(([title, type, days], index) => ({ id: `sample-${index}`, title, type, days, color: SAMPLE_COLORS[index] }));

let state = normalizeBlockColors(loadState());
let currentMonth = startOfMonth(parseIsoDate(state.termStart));

const elements = {
  termStart: document.querySelector("#termStart"), termEnd: document.querySelector("#termEnd"), noClassDates: document.querySelector("#noClassDates"),
  blocksTable: document.querySelector("#blocksTable"), rowTemplate: document.querySelector("#blockRowTemplate"), statusBanner: document.querySelector("#statusBanner"),
  plannedDays: document.querySelector("#plannedDays"), lastPlannedDay: document.querySelector("#lastPlannedDay"), daysRemaining: document.querySelector("#daysRemaining"),
  monthTitle: document.querySelector("#monthTitle"), calendarGrid: document.querySelector("#calendarGrid")
};

function defaultState() {
  return { termStart: "2026-08-19", termEnd: "2027-05-21", noClassDates: [...DEFAULT_NO_CLASS_DATES], blocks: structuredClone(SAMPLE_BLOCKS) };
}

function isHexColor(value) { return /^#[0-9a-f]{6}$/i.test(value); }

function normalizeBlockColors(plan) {
  return {
    ...plan,
    blocks: plan.blocks.map((block, index) => {
      const matchingSample = SAMPLE_BLOCKS.find(sample => sample.id === block.id);
      return { ...block, color: isHexColor(block.color) ? block.color : matchingSample?.color ?? COLOR_CYCLE[index % COLOR_CYCLE.length] };
    })
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.blocks) && saved.termStart && saved.termEnd) return saved;
  } catch (_) { /* A malformed saved plan should never prevent the tool from opening. */ }
  return defaultState();
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

/* Dates use local noon so a browser timezone never turns an ISO date into the day before. */
function parseIsoDate(value) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day, 12); }
function toIsoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function addDays(date, amount) { const copy = new Date(date); copy.setDate(copy.getDate() + amount); return copy; }
function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
function dateLabel(date) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date); }
function shortDateLabel(date) { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date); }

function getNoClassSet() {
  return new Set(state.noClassDates.filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)));
}

function isInstructionalDay(date, noClassSet = getNoClassSet()) {
  return date.getDay() !== 0 && date.getDay() !== 6 && !noClassSet.has(toIsoDate(date));
}

function nextInstructionalDay(date, noClassSet) {
  let cursor = new Date(date);
  while (!isInstructionalDay(cursor, noClassSet)) cursor = addDays(cursor, 1);
  return cursor;
}

/* This is the scheduling engine: each duration consumes instructional days, then passes its next open date forward. */
function calculateSchedule() {
  const noClassSet = getNoClassSet();
  let cursor = nextInstructionalDay(parseIsoDate(state.termStart), noClassSet);
  const scheduledBlocks = [];
  const dayAssignments = new Map();

  state.blocks.forEach(block => {
    const start = new Date(cursor);
    let end = new Date(cursor);
    for (let day = 0; day < block.days; day += 1) {
      if (day > 0) end = nextInstructionalDay(addDays(end, 1), noClassSet);
      dayAssignments.set(toIsoDate(end), block);
    }
    scheduledBlocks.push({ ...block, start, end });
    cursor = nextInstructionalDay(addDays(end, 1), noClassSet);
  });

  return { scheduledBlocks, dayAssignments, nextOpenDay: cursor, noClassSet };
}

function countInstructionalDays(start, end, noClassSet) {
  let count = 0;
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) if (isInstructionalDay(cursor, noClassSet)) count += 1;
  return count;
}

function render() {
  const schedule = calculateSchedule();
  saveState();
  renderSettings();
  renderSummary(schedule);
  renderBlocks(schedule);
  renderCalendar(schedule);
}

function renderSettings() {
  elements.termStart.value = state.termStart;
  elements.termEnd.value = state.termEnd;
  elements.noClassDates.value = state.noClassDates.join("\n");
}

function renderSummary(schedule) {
  const totalDays = state.blocks.reduce((sum, block) => sum + block.days, 0);
  const lastBlock = schedule.scheduledBlocks.at(-1);
  const termEnd = parseIsoDate(state.termEnd);
  const lastDate = lastBlock?.end;
  const daysAvailable = countInstructionalDays(parseIsoDate(state.termStart), termEnd, schedule.noClassSet);
  const plannedUntil = lastDate && lastDate <= termEnd ? countInstructionalDays(parseIsoDate(state.termStart), lastDate, schedule.noClassSet) : totalDays;

  elements.plannedDays.textContent = totalDays;
  elements.lastPlannedDay.textContent = lastDate ? dateLabel(lastDate) : "—";
  elements.daysRemaining.textContent = lastDate && lastDate > termEnd ? "Over term" : `${Math.max(0, daysAvailable - plannedUntil)} days`;

  if (!lastDate) {
    elements.statusBanner.textContent = "Add a lesson block to start building the schedule.";
    elements.statusBanner.className = "status-banner";
  } else if (lastDate > termEnd) {
    elements.statusBanner.textContent = `This plan runs past the last instructional day by ${countInstructionalDays(addDays(termEnd, 1), lastDate, schedule.noClassSet)} instructional day(s). Shorten blocks or extend the term.`;
    elements.statusBanner.className = "status-banner error";
  } else {
    elements.statusBanner.textContent = `Your plan fits in the term. Change any duration below and all later dates will update automatically.`;
    elements.statusBanner.className = "status-banner";
  }
}

function renderBlocks(schedule) {
  elements.blocksTable.replaceChildren();
  schedule.scheduledBlocks.forEach((block, index) => {
    const row = elements.rowTemplate.content.firstElementChild.cloneNode(true);
    const title = row.querySelector(".block-title");
    const color = row.querySelector(".block-color");
    const type = row.querySelector(".block-type");
    const days = row.querySelector(".block-days");
    title.value = block.title; color.value = block.color; type.value = block.type; days.value = block.days;
    row.querySelector(".date-range").textContent = block.days === 1 ? dateLabel(block.start) : `${shortDateLabel(block.start)} – ${dateLabel(block.end)}`;

    // Re-rendering after each keystroke would steal focus, so text changes apply when the teacher finishes the field.
    title.addEventListener("change", event => updateBlock(index, { title: event.target.value }));
    color.addEventListener("change", event => updateBlock(index, { color: event.target.value }));
    type.addEventListener("change", event => updateBlock(index, { type: event.target.value }));
    days.addEventListener("change", event => updateBlock(index, { days: Math.max(1, Math.min(30, Number(event.target.value) || 1)) }));
    row.querySelector(".duplicate").addEventListener("click", () => { state.blocks.splice(index + 1, 0, { ...state.blocks[index], id: crypto.randomUUID() }); render(); });
    row.querySelector(".delete").addEventListener("click", () => { state.blocks.splice(index, 1); render(); });
    elements.blocksTable.append(row);
  });
}

function updateBlock(index, changes) { state.blocks[index] = { ...state.blocks[index], ...changes }; render(); }

function renderCalendar(schedule) {
  elements.monthTitle.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(currentMonth);
  elements.calendarGrid.replaceChildren();
  const firstCell = addDays(currentMonth, -currentMonth.getDay());
  const today = toIsoDate(new Date());
  for (let offset = 0; offset < 42; offset += 1) {
    const date = addDays(firstCell, offset);
    const iso = toIsoDate(date);
    const assignedBlock = schedule.dayAssignments.get(iso);
    const isNoClass = schedule.noClassSet.has(iso);
    const cell = document.createElement("div");
    cell.className = `day-cell${date.getMonth() !== currentMonth.getMonth() ? " outside" : ""}${date.getDay() === 0 || date.getDay() === 6 ? " weekend" : ""}${isNoClass ? " no-class" : ""}${assignedBlock ? " has-block" : ""}${iso === today ? " today" : ""}`;
    if (assignedBlock) cell.style.setProperty("--block-color", assignedBlock.color);
    const number = document.createElement("span"); number.className = "day-number"; number.textContent = date.getDate(); cell.append(number);
    if (isNoClass) { const label = document.createElement("span"); label.className = "no-class-label"; label.textContent = "No classes"; cell.append(label); }
    if (assignedBlock) {
      const label = document.createElement("span");
      label.className = `day-label ${assignedBlock.type.toLowerCase()}`;
      label.textContent = assignedBlock.title;
      cell.append(label);
    }
    elements.calendarGrid.append(cell);
  }
}

function updateNoClassDates(text) {
  state.noClassDates = [...new Set(text.split(/[\s,]+/).map(value => value.trim()).filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)))].sort();
  render();
}

function exportCsv() {
  const { scheduledBlocks } = calculateSchedule();
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  const rows = [["Block", "Type", "Instructional Days", "Start Date", "End Date"], ...scheduledBlocks.map(block => [block.title, block.type, block.days, toIsoDate(block.start), toIsoDate(block.end)])];
  const blob = new Blob([rows.map(row => row.map(quote).join(",")).join("\n")], { type: "text/csv" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "lesson-schedule.csv"; link.click(); URL.revokeObjectURL(link.href);
}

elements.termStart.addEventListener("change", event => { if (event.target.value) { state.termStart = event.target.value; currentMonth = startOfMonth(parseIsoDate(event.target.value)); render(); } });
elements.termEnd.addEventListener("change", event => { if (event.target.value) { state.termEnd = event.target.value; render(); } });
elements.noClassDates.addEventListener("change", event => updateNoClassDates(event.target.value));
document.querySelector("#addBlock").addEventListener("click", () => { state.blocks.push({ id: crypto.randomUUID(), title: "New lesson block", type: "Lesson", days: 1, color: COLOR_CYCLE[state.blocks.length % COLOR_CYCLE.length] }); render(); });
document.querySelector("#previousMonth").addEventListener("click", () => { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1, 12); renderCalendar(calculateSchedule()); });
document.querySelector("#nextMonth").addEventListener("click", () => { currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1, 12); renderCalendar(calculateSchedule()); });
document.querySelector("#exportCsv").addEventListener("click", exportCsv);
document.querySelector("#resetPlan").addEventListener("click", () => { if (window.confirm("Replace the current plan with the 2026-27 sample plan?")) { state = defaultState(); currentMonth = startOfMonth(parseIsoDate(state.termStart)); render(); } });

render();
