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
const FIXED_WINDOWS = {
  "sample-19": { fixedStart: "2026-12-09", fixedEnd: "2026-12-11" },
  "sample-20": { fixedStart: "2026-12-14", fixedEnd: "2026-12-18", semesterEnd: true },
  "sample-42": { fixedStart: "2027-05-12", fixedEnd: "2027-05-14" },
  "sample-43": { fixedStart: "2027-05-17", fixedEnd: "2027-05-21", semesterEnd: true }
};

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
].map(([title, type, days], index) => ({ id: `sample-${index}`, title, type, days, color: SAMPLE_COLORS[index], ...FIXED_WINDOWS[`sample-${index}`] }));

let state = normalizePlan(loadState());
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
function isIsoDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value); }
function isFixedBlock(block) { return isIsoDate(block.fixedStart) && isIsoDate(block.fixedEnd) && block.fixedStart <= block.fixedEnd; }

/* Existing browser-saved plans are upgraded automatically so the four school-wide windows are protected too. */
function normalizePlan(plan) {
  return {
    ...plan,
    blocks: plan.blocks.map((block, index) => {
      const matchingSample = SAMPLE_BLOCKS.find(sample => sample.id === block.id);
      return {
        ...block,
        color: isHexColor(block.color) ? block.color : matchingSample?.color ?? COLOR_CYCLE[index % COLOR_CYCLE.length],
        fixedStart: isIsoDate(block.fixedStart) ? block.fixedStart : matchingSample?.fixedStart,
        fixedEnd: isIsoDate(block.fixedEnd) ? block.fixedEnd : matchingSample?.fixedEnd,
        semesterEnd: block.semesterEnd || matchingSample?.semesterEnd || false
      };
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

function isSchedulableDay(date, noClassSet, reservedFixedDates) {
  return isInstructionalDay(date, noClassSet) && !reservedFixedDates.has(toIsoDate(date));
}

function nextInstructionalDay(date, noClassSet, reservedFixedDates = new Set()) {
  let cursor = new Date(date);
  while (!isSchedulableDay(cursor, noClassSet, reservedFixedDates)) cursor = addDays(cursor, 1);
  return cursor;
}

function getFixedDateAssignments(noClassSet) {
  const assignments = new Map();
  const reservedFixedDates = new Set();
  const fixedBlocks = state.blocks.filter(isFixedBlock);

  fixedBlocks.forEach(block => {
    for (let date = parseIsoDate(block.fixedStart); date <= parseIsoDate(block.fixedEnd); date = addDays(date, 1)) {
      if (isInstructionalDay(date, noClassSet)) {
        const iso = toIsoDate(date);
        reservedFixedDates.add(iso);
        assignments.set(iso, block);
      }
    }
  });

  return { assignments, reservedFixedDates, fixedBlocks };
}

function getNextSemesterEnd(cursor, fixedBlocks) {
  return fixedBlocks
    .filter(block => block.semesterEnd && parseIsoDate(block.fixedStart) >= cursor)
    .sort((a, b) => a.fixedStart.localeCompare(b.fixedStart))[0];
}

/* Fixed blocks are reserved first. Semester-ending exam windows also stop a lesson from carrying into the next semester. */
function calculateSchedule() {
  const noClassSet = getNoClassSet();
  const fixedSchedule = getFixedDateAssignments(noClassSet);
  let cursor = nextInstructionalDay(parseIsoDate(state.termStart), noClassSet, fixedSchedule.reservedFixedDates);
  const scheduledBlocks = [];
  const dayAssignments = new Map(fixedSchedule.assignments);
  const shiftedAroundFixed = new Set();
  const semesterConflicts = [];

  state.blocks.forEach(block => {
    if (isFixedBlock(block)) {
      const start = parseIsoDate(block.fixedStart);
      const end = parseIsoDate(block.fixedEnd);
      scheduledBlocks.push({ ...block, start, end });
      if (cursor <= end) cursor = nextInstructionalDay(addDays(end, 1), noClassSet, fixedSchedule.reservedFixedDates);
      return;
    }

    const start = new Date(cursor);
    let nextDate = new Date(cursor);
    let end = null;
    let scheduledDays = 0;
    const semesterEnd = getNextSemesterEnd(cursor, fixedSchedule.fixedBlocks);
    for (let day = 0; day < block.days; day += 1) {
      if (semesterEnd && nextDate >= parseIsoDate(semesterEnd.fixedStart)) break;
      end = new Date(nextDate);
      dayAssignments.set(toIsoDate(end), block);
      scheduledDays += 1;
      nextDate = nextInstructionalDay(addDays(nextDate, 1), noClassSet, fixedSchedule.reservedFixedDates);
    }
    const unscheduledDays = block.days - scheduledDays;
    if (end) fixedSchedule.fixedBlocks.filter(fixedBlock => start <= parseIsoDate(fixedBlock.fixedStart) && end >= parseIsoDate(fixedBlock.fixedStart)).forEach(fixedBlock => shiftedAroundFixed.add(fixedBlock.title));
    scheduledBlocks.push({ ...block, start, end, unscheduledDays, blockedBy: unscheduledDays ? semesterEnd?.title : undefined });
    if (unscheduledDays && semesterEnd) {
      semesterConflicts.push({ title: block.title, unscheduledDays, blockedBy: semesterEnd.title });
      cursor = nextInstructionalDay(addDays(parseIsoDate(semesterEnd.fixedEnd), 1), noClassSet, fixedSchedule.reservedFixedDates);
    } else {
      cursor = nextDate;
    }
  });

  return { scheduledBlocks, dayAssignments, nextOpenDay: cursor, noClassSet, fixedBlocks: fixedSchedule.fixedBlocks, shiftedAroundFixed: [...shiftedAroundFixed], semesterConflicts };
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
  } else if (schedule.semesterConflicts.length) {
    const conflict = schedule.semesterConflicts[0];
    elements.statusBanner.textContent = `${conflict.title} has ${conflict.unscheduledDays} instructional day(s) that cannot fit before ${conflict.blockedBy}, the end of the semester. Shorten or resequence the lesson.`;
    elements.statusBanner.className = "status-banner error";
  } else if (lastDate > termEnd) {
    elements.statusBanner.textContent = `This plan runs past the last instructional day by ${countInstructionalDays(addDays(termEnd, 1), lastDate, schedule.noClassSet)} instructional day(s). Shorten blocks or extend the term.`;
    elements.statusBanner.className = "status-banner error";
  } else if (schedule.shiftedAroundFixed.length) {
    elements.statusBanner.textContent = `The plan now moves around the fixed ${schedule.shiftedAroundFixed.join(", ")} window. Review the lesson immediately before it to make sure the pacing still makes sense.`;
    elements.statusBanner.className = "status-banner warning";
  } else {
    elements.statusBanner.textContent = `Your plan fits in the term. The four school-wide review and exam windows are fixed; all other blocks shift around them automatically.`;
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
    days.disabled = isFixedBlock(block);
    if (isFixedBlock(block)) days.title = "This school-wide window is fixed.";
    const dateRange = row.querySelector(".date-range");
    if (!block.end) {
      dateRange.textContent = `No days available before ${block.blockedBy}.`;
    } else {
      dateRange.textContent = block.days === 1 ? dateLabel(block.start) : `${shortDateLabel(block.start)} – ${dateLabel(block.end)}`;
    }
    if (isFixedBlock(block)) {
      const chip = document.createElement("span");
      chip.className = "fixed-chip";
      chip.textContent = "Fixed";
      dateRange.append(chip);
    }
    if (block.unscheduledDays) {
      const chip = document.createElement("span");
      chip.className = "overflow-chip";
      chip.textContent = `${block.unscheduledDays} day${block.unscheduledDays === 1 ? "" : "s"} cannot fit`;
      dateRange.append(chip);
    }

    // Re-rendering after each keystroke would steal focus, so text changes apply when the teacher finishes the field.
    title.addEventListener("change", event => updateBlock(index, { title: event.target.value }));
    color.addEventListener("change", event => updateBlock(index, { color: event.target.value }));
    type.addEventListener("change", event => updateBlock(index, { type: event.target.value }));
    days.addEventListener("change", event => updateBlock(index, { days: Math.max(1, Math.min(30, Number(event.target.value) || 1)) }));
    row.querySelector(".duplicate").addEventListener("click", () => { state.blocks.splice(index + 1, 0, { ...state.blocks[index], id: crypto.randomUUID(), fixedStart: undefined, fixedEnd: undefined }); render(); });
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
  const rows = [["Block", "Type", "Instructional Days", "Start Date", "End Date", "Fixed Window", "Unscheduled Days"], ...scheduledBlocks.map(block => [block.title, block.type, block.days, toIsoDate(block.start), block.end ? toIsoDate(block.end) : "", isFixedBlock(block) ? "Yes" : "No", block.unscheduledDays || 0])];
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
