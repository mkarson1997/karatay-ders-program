# Karatay Course Schedule Builder

[![Tests](https://github.com/mkarson1997/karatay-ders-program/actions/workflows/tests.yml/badge.svg)](https://github.com/mkarson1997/karatay-ders-program/actions/workflows/tests.yml)

A browser-based course scheduling tool that helps Computer Programming students build a valid timetable, detect collisions, switch groups when possible, and export the final schedule as PDF.

**Live demo:** https://mkarson1997.github.io/karatay-ders-program/

## Why this project exists

Building a weekly schedule manually becomes error-prone when courses have multiple groups and overlapping time slots. This project turns that process into a small constraint-solving workflow in the browser.

Instead of acting as a static timetable page, the application lets a user choose courses and then evaluates whether the selected combination can coexist.

## Core features

- First-year, second-year and mixed-course modes
- Interactive course selection
- Structured course data in `data/courses.json`
- Time-slot collision detection
- Automatic group adjustment when an alternative group can resolve a conflict
- Generated weekly timetable view
- PDF export
- Runs entirely in the browser
- Static deployment with GitHub Pages
- No student-name or schedule telemetry in the portfolio version
- Dependency-free automated tests for the pure conflict core

## Engineering focus

The scheduling code is intentionally split between pure rules and browser/UI concerns.

```text
Course selection / DOM
      │
      ▼
selectedSessions()
      │
      ▼
scheduler-core.js
      │
      ├── time parsing
      ├── overlap rule
      └── conflict detection
      │
      ▼
tryAutoResolve()
      │
      ├── no conflict ──► render / PDF
      └── conflict
              │
              ▼
      try alternative group
```

`scheduler-core.js` is shared by the browser application and Node tests, so the tests exercise the same time/conflict implementation used by the deployed page rather than a duplicated test-only copy.

## Tech stack

- HTML5
- CSS3
- JavaScript
- JSON course data
- Node.js built-in test runner
- GitHub Actions
- Client-side PDF generation/export workflow
- GitHub Pages

## Automated tests

Run locally:

```bash
npm test
```

The current dependency-free suite covers:

- `HH:MM` → minute conversion,
- actual overlapping sessions,
- touching boundaries as non-conflicting,
- online sessions as non-time conflicts,
- sessions on different days,
- conflict-pair/day output.

The same command runs in `.github/workflows/tests.yml` on pushes and pull requests to `main`.

## Usage

1. Open the [live application](https://mkarson1997.github.io/karatay-ders-program/).
2. Choose first-year, second-year or mixed mode.
3. Select the courses you want.
4. Generate the timetable.
5. Review any collision warnings or automatic group adjustments.
6. Export the result as PDF.

## Privacy

The schedule builder does not need a backend account or user database. Course selections, conflict detection and PDF generation are handled in the browser.

The optional student-name field is used only to label the locally generated PDF. A previous third-party usage beacon was removed during the portfolio privacy review so the application no longer sends the student's name or selected schedule to a form/analytics endpoint.

See [PRIVACY.md](PRIVACY.md) for the data-handling policy and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Open source

Project-authored source is licensed under the [MIT License](LICENSE). Third-party font/library licensing boundaries are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Portfolio value

The project is intentionally small but useful. It demonstrates:

- translating a real scheduling problem into browser logic,
- extracting pure logic from DOM concerns,
- automated testing and CI,
- conflict detection and conditional decision-making,
- state-driven UI updates,
- privacy review and removal of unnecessary telemetry,
- exporting user-generated results,
- shipping a zero-backend application to a public URL.

## Roadmap

- Add tests for automatic group-resolution behavior
- Add semester/version selection
- Add shareable schedule URLs without leaking personal data
- Improve accessibility and keyboard navigation
- Add import/export of user selections
- Add schema validation for `data/courses.json`

## Scope

The current dataset and rules target KTO Karatay University Computer Programming schedules. The scheduling logic can be generalized later for additional departments or institutions.

---

Built by [Mahmoud Karzoun](https://github.com/mkarson1997).