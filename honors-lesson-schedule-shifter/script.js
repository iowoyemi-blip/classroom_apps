/* Lesson Schedule Shifter: an intentionally dependency-free, local-first planning tool. */

const STORAGE_KEY = "honors-lesson-schedule-shifter-2026-27-v1";
const DEFAULT_NO_CLASS_DATES = [
  "2026-09-07", "2026-10-12", "2026-10-13", "2026-10-14",
  "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27",
  "2027-01-18", "2027-02-15", "2027-03-08", "2027-03-09", "2027-03-10", "2027-03-11", "2027-03-12",
  "2027-03-26", "2027-03-29", "2027-04-30"
];
const COLOR_CYCLE = ["#d9f1d0", "#c2e3f3", "#f8dccd", "#e9d8f2", "#fff0b5", "#c4efdf", "#d6e0ff"];
const SAMPLE_BLOCKS = HONORS_BLOCKS;

let state = normalizePlan(loadState());

const elements = {
  springStart: document.querySelector("#springStart"), termStart: document.querySelector("#termStart"), termEnd: document.querySelector("#termEnd"), noClassDates: document.querySelector("#noClassDates"),
  blocksTable: document.querySelector("#blocksTable"), rowTemplate: document.querySelector("#blockRowTemplate"), statusBanner: document.querySelector("#statusBanner"),
  plannedDays: document.querySelector("#plannedDays"), lastPlannedDay: document.querySelector("#lastPlannedDay"), daysRemaining: document.querySelector("#daysRemaining"),
  storageNotice: document.querySelector("#storageNotice"), calendarMonths: document.querySelector("#calendarMonths")
};

function defaultState() {
  return { termStart: "2026-08-19", termEnd: "2027-05-07", springStart: "2027-01-19", noClassDates: [...DEFAULT_NO_CLASS_DATES], blocks: structuredClone(SAMPLE_BLOCKS) };
}

function isHexColor(value) { return /^#[0-9a-f]{6}$/i.test(value); }
function isIsoDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value); }
function isFixedBlock(block) { return isIsoDate(block.fixedStart) && isIsoDate(block.fixedEnd) && block.fixedStart <= block.fixedEnd; }

/* Supply defaults for saved plans without replacing the teacher's edits. */
function normalizePlan(plan) {
  return {
    ...plan,
    springStart: plan.springStart || "2027-01-19",
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

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); elements.storageNotice.hidden = true; }
  catch (_) { elements.storageNotice.hidden = false; }
}

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

function isCalendarGap(date) {
  const iso = toIsoDate(date);
  return iso > "2026-12-11" && iso < state.springStart;
}

function isInstructionalDay(date, noClassSet = getNoClassSet()) {
  return !isCalendarGap(date) && date.getDay() !== 0 && date.getDay() !== 6 && !noClassSet.has(toIsoDate(date));
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

/* Fixed blocks are reserved first. Semester-ending exam windows also stop a lesson from carrying into the next semester. */
function calculateSchedule() {
  const noClassSet = getNoClassSet();
  const fixedSchedule = getFixedDateAssignments(noClassSet);
  let cursor = nextInstructionalDay(parseIsoDate(state.termStart), noClassSet, fixedSchedule.reservedFixedDates);
  const scheduledBlocks = [];
  const dayAssignments = new Map(fixedSchedule.assignments);
  const shiftedAroundFixed = new Set();
  const semesterConflicts = [];

  state.blocks.forEach((block, blockIndex) => {
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
    const semesterEnd = state.blocks.slice(blockIndex + 1).find(nextBlock => isFixedBlock(nextBlock) && nextBlock.semesterEnd);
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
  elements.springStart.value = state.springStart;
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
    elements.statusBanner.textContent = `Your plan fits in the term. The midterm review week and spring starting date are protected. Other blocks shift automatically. Review the calendar notes for spring assumptions.`;
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
    const notes = row.querySelector(".block-notes");
    notes.value = block.notes || "";
    notes.addEventListener("change", event => updateBlock(index, { notes: event.target.value }));
    const source = row.querySelector(".source-dates");
    source.textContent = block.sourceDates ? `PDF: ${block.sourceDates}` : "Added lesson block";
    title.value = block.title; color.value = block.color; type.value = block.type; days.value = block.days;
    days.disabled = isFixedBlock(block);
    if (isFixedBlock(block)) days.title = "This calendar anchor is fixed; spring start is adjustable in settings.";
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
    row.querySelector(".duplicate").disabled = isFixedBlock(block);
    row.querySelector(".delete").disabled = isFixedBlock(block);
    row.querySelector(".duplicate").addEventListener("click", () => { state.blocks.splice(index + 1, 0, { ...state.blocks[index], id: crypto.randomUUID(), fixedStart: undefined, fixedEnd: undefined }); render(); });
    row.querySelector(".delete").addEventListener("click", () => { state.blocks.splice(index, 1); render(); });
    elements.blocksTable.append(row);
  });
}

function updateBlock(index, changes) { state.blocks[index] = { ...state.blocks[index], ...changes }; render(); }

function renderCalendar(schedule) {
  elements.calendarMonths.replaceChildren();
  const firstMonth = startOfMonth(parseIsoDate(state.termStart));
  const lastMonth = startOfMonth(parseIsoDate(state.termEnd));
  const today = toIsoDate(new Date());

  for (let month = firstMonth; month <= lastMonth; month = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12)) {
    const monthSection = document.createElement("section");
    monthSection.className = "month-section";
    const heading = document.createElement("h3");
    heading.className = "calendar-month-title";
    heading.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(month);
    monthSection.append(heading);

    const weekdays = document.createElement("div");
    weekdays.className = "calendar-weekdays";
    ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach(day => {
      const label = document.createElement("span");
      label.textContent = day;
      weekdays.append(label);
    });
    monthSection.append(weekdays);

    const grid = document.createElement("div");
    grid.className = "calendar-grid";
    const firstCell = addDays(month, -month.getDay());
    for (let offset = 0; offset < 42; offset += 1) {
      const date = addDays(firstCell, offset);
      const iso = toIsoDate(date);
      const assignedBlock = schedule.dayAssignments.get(iso);
      const isNoClass = schedule.noClassSet.has(iso);
      const isGap = isCalendarGap(date);
      const cell = document.createElement("div");
      cell.className = `day-cell${date.getMonth() !== month.getMonth() ? " outside" : ""}${date.getDay() === 0 || date.getDay() === 6 ? " weekend" : ""}${isNoClass || isGap ? " no-class" : ""}${assignedBlock ? " has-block" : ""}${iso === today ? " today" : ""}`;
      if (assignedBlock) cell.style.setProperty("--block-color", assignedBlock.color);
      const number = document.createElement("span"); number.className = "day-number"; number.textContent = date.getDate(); cell.append(number);
      if (isGap && !isNoClass) { const label = document.createElement("span"); label.className = "no-class-label"; label.textContent = "Calendar not supplied"; cell.append(label); }
      if (isNoClass) { const label = document.createElement("span"); label.className = "no-class-label"; label.textContent = "No classes"; cell.append(label); }
      if (assignedBlock) {
        const label = document.createElement("span");
        label.className = `day-label ${assignedBlock.type.toLowerCase()}`;
        label.textContent = assignedBlock.title;
        cell.append(label);
      }
      grid.append(cell);
    }
    monthSection.append(grid);
    elements.calendarMonths.append(monthSection);
  }
}

function updateNoClassDates(text) {
  state.noClassDates = [...new Set(text.split(/[\s,]+/).map(value => value.trim()).filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)))].sort();
  render();
}

function exportCsv() {
  const { scheduledBlocks } = calculateSchedule();
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  const rows = [["Block", "Type", "Instructional Days", "Start Date", "End Date", "Fixed Window", "Unscheduled Days", "Notes", "Original PDF Dates"], ...scheduledBlocks.map(block => [block.title, block.type, block.days, toIsoDate(block.start), block.end ? toIsoDate(block.end) : "", isFixedBlock(block) ? "Yes" : "No", block.unscheduledDays || 0, block.notes || "", block.sourceDates || ""])];
  const blob = new Blob([rows.map(row => row.map(quote).join(",")).join("\n")], { type: "text/csv" });
  const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "honors-lesson-schedule-2026-2027.csv"; link.click(); URL.revokeObjectURL(link.href);
}

elements.springStart.addEventListener("change", event => {
  const value = event.target.value;
  if (!value || value <= "2026-12-11" || value > state.termEnd || [0, 6].includes(parseIsoDate(value).getDay()) || state.noClassDates.includes(value)) {
    window.alert("Choose an instructional weekday after December 11 and on or before the last instructional day.");
    renderSettings(); return;
  }
  state.springStart = value;
  const reflection = state.blocks.find(block => block.id === "honors-39");
  if (reflection) { reflection.fixedStart = value; reflection.fixedEnd = value; }
  render();
});
elements.termStart.addEventListener("change", event => { if (event.target.value) { if (event.target.value > state.termEnd) { renderSettings(); return; } state.termStart = event.target.value; render(); } });
elements.termEnd.addEventListener("change", event => { if (event.target.value) { if (event.target.value < state.springStart || event.target.value < state.termStart) { renderSettings(); return; } state.termEnd = event.target.value; render(); } });
elements.noClassDates.addEventListener("change", event => updateNoClassDates(event.target.value));
document.querySelector("#addBlock").addEventListener("click", () => { state.blocks.push({ id: crypto.randomUUID(), title: "New lesson block", type: "Lesson", days: 1, color: COLOR_CYCLE[state.blocks.length % COLOR_CYCLE.length] }); render(); });
document.querySelector("#exportCsv").addEventListener("click", exportCsv);
document.querySelector("#resetPlan").addEventListener("click", () => { if (window.confirm("Replace the current plan with the 2026-27 Honors plan from the supplied calendar?")) { state = defaultState(); render(); } });

render();
