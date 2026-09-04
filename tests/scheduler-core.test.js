const test = require("node:test");
const assert = require("node:assert/strict");
const { timeToMin, overlap, detectConflicts } = require("../scheduler-core.js");

test("timeToMin converts HH:MM and ignores Online", () => {
  assert.equal(timeToMin("09:30"), 570);
  assert.equal(timeToMin("00:00"), 0);
  assert.equal(timeToMin("Online"), null);
  assert.equal(timeToMin(""), null);
});

test("overlap detects real overlap", () => {
  assert.equal(
    overlap(
      { start: "09:00", end: "10:30" },
      { start: "10:00", end: "11:00" },
    ),
    true,
  );
});

test("overlap treats touching boundaries as non-conflicting", () => {
  assert.equal(
    overlap(
      { start: "09:00", end: "10:00" },
      { start: "10:00", end: "11:00" },
    ),
    false,
  );
});

test("online sessions never create a time conflict", () => {
  assert.equal(
    overlap(
      { start: "Online", end: "Online" },
      { start: "09:00", end: "11:00" },
    ),
    false,
  );
});

test("detectConflicts only compares sessions on the same day", () => {
  const conflicts = detectConflicts([
    { day: "Pazartesi", course: "A", start: "09:00", end: "11:00" },
    { day: "Salı", course: "B", start: "09:30", end: "10:30" },
  ]);

  assert.deepEqual(conflicts, []);
});

test("detectConflicts returns the conflicting pair and day", () => {
  const a = { day: "Pazartesi", course: "A", start: "09:00", end: "11:00" };
  const b = { day: "Pazartesi", course: "B", start: "10:30", end: "12:00" };
  const c = { day: "Pazartesi", course: "C", start: "12:00", end: "13:00" };

  const conflicts = detectConflicts([a, b, c]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].day, "Pazartesi");
  assert.equal(conflicts[0].a, a);
  assert.equal(conflicts[0].b, b);
});
