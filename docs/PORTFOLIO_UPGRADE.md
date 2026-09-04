# Course Schedule Builder Portfolio Upgrade Plan

The strongest part of this project is the scheduling logic. The next upgrades should make that logic testable and reusable.

## Priority 1

- Move course/session data into structured JSON.
- Extract collision and alternative-group logic into testable pure functions.
- Add automated tests for overlap, no-overlap and alternative-group cases.
- Add keyboard and accessibility checks.

## Priority 2

- Add shareable schedule URLs.
- Add import/export of user selections.
- Add semester/version selection.
- Add deterministic PDF export tests where practical.

## Portfolio proof

A reviewer should be able to see that this repository is not only a static timetable UI. The important evidence is constraint handling, state transitions, conflict resolution, structured data and testable decision logic.