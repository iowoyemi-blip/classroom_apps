# Honors Lesson Schedule Shifter

A separate, dependency-free copy of the Algebra I Lesson Schedule Shifter, using the supplied seven-page **2026-2027 Unit Calendars.docx.pdf**. Open `index.html` directly or visit [the Honors app](https://iowoyemi-blip.github.io/classroom_apps/honors-lesson-schedule-shifter/).

The original `/lesson-schedule-shifter/` app is unchanged. Honors uses its own browser storage key, `honors-lesson-schedule-shifter-2026-27-v1`, and CSV filename. All seven units are transcribed in `honors-data.js`; the 79 editable blocks retain lesson titles, Quick Checks, activities, and original PDF date references. New colors identify units; the PDF itself has no unit lesson colors.

## Calendar interpretation

- The owner corrected the source's spring year from 2026 to **2027**. Fall dates remain August-December 2026.
- This preserves the original app's whole-weekday scheduling model, rather than modeling the bell schedule or attendance for individual periods. The fall baseline matches all printed lesson and assessment dates. Spring's overlapping paired dates require interpretation: the source's Monday / Block 1 / Block 2 / Friday rhythm becomes Monday / Tuesday / Wednesday-Thursday / Friday. Source labels remain visible for comparison; computed dates are the editable pacing plan, not a claim that the old spring dates were authoritative for 2027.
- Spring starts Tuesday, January 19, 2027. Its editable anchor follows the source's Tuesday reflection. The five-day blank January week is explicitly an **Unassigned - source calendar blank** block, not an invented lesson.
- December 12 through the day before spring start is **Calendar not supplied**, excluded from pacing and capacity. No midterm exam dates, final exams, or school dates beyond the final source week are invented. The term ends May 7, 2027, the Friday in the final source week translated to 2027 weekdays.
- Midterm review is protected December 7-11, 2026. Added fall days that do not fit before that window are flagged; they cannot silently spill into spring. Spring start is a separate editable anchor. Other tests and quizzes shift with the lessons.
- Spring no-class dates are editable planning assumptions: January 18, February 15, March 8-12, March 26 and 29, and April 30. Easter-related dates follow [the 2027 USCCB calendar](https://www.usccb.org/resources/2027cal.pdf); April 30 preserves the Friday position of the source's SPC closure. **The owner should verify school closures and block meeting days before relying on the spring schedule.**

## Use and verification

Change a lesson's days, color, title, type, or notes; changes save in this browser. Add, duplicate, or remove ordinary blocks. Fixed anchors cannot be duplicated or removed. **Export CSV** includes computed dates, notes, original PDF dates, and any unscheduled days. **Reset Honors plan** restores the imported baseline after confirmation.

Run the focused scheduling checks with:

```sh
node --test honors-lesson-schedule-shifter/tests/schedule.test.cjs
```

Browser QA covered automatic shifting, semester-boundary warnings, persistence after reload, add/delete, CSV download, and the responsive layout. CSV content was verified at 79 blocks and nine columns.
