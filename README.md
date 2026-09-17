# Karatay Course Schedule Builder

[![Tests](https://github.com/mkarson1997/karatay-ders-program/actions/workflows/tests.yml/badge.svg)](https://github.com/mkarson1997/karatay-ders-program/actions/workflows/tests.yml)

A browser-based course scheduling tool for KTO Karatay University Computer Programming students. It lets users select courses, switch available groups, detect timetable collisions, preview the final weekly plan, and export it as a PDF.

**Live demo:** https://mkarson1997.github.io/karatay-ders-program/

## Current dataset

The repository is updated for **2026-2027 Güz Dönemi** using the official weekly schedule for **Bilgisayar Programcılığı-1** and **Bilgisayar Programcılığı-2** from pages **1-2** of the supplied aSc timetable PDF. The official timetable itself states that it was generated on **04.09.2026**.

A later department announcement is also applied to the current dataset for the Wednesday second-year schedule:

- **Bilişim Hukuku:** Çarşamba **08:30-10:55**, **CZ-19**
- **Python Programlama:** Çarşamba **11:00-13:25**, **M-301**

Both courses remain on Wednesday; only their lesson times/classrooms were updated by the later announcement. The later announcement also uses the spelling `Python Programlama`, which is now reflected in the dataset.

The dataset includes:

- official course codes and names,
- HDS values,
- weekdays and exact lesson times,
- classrooms,
- instructor names,
- first-year group 1/group 2 alternatives,
- the official timetable totals: 28 HDS for Bilgisayar Programcılığı-1 and 34 HDS for Bilgisayar Programcılığı-2.

## Core features

- First-year, second-year and mixed-course modes
- Interactive course selection
- Structured and source-traceable course data in `data/courses.json`
- Course code metadata
- Time-slot collision detection
- Automatic group adjustment when an alternative group can resolve a conflict
- Weekly timetable preview with room and instructor details
- Landscape PDF export with full schedule details
- Runs entirely in the browser
- Static deployment with GitHub Pages
- Anonymous planner-mode usage counting through the project's Google Form/Sheets flow
- Dependency-free automated tests for scheduling rules and current dataset integrity

## Engineering focus

The scheduling code is split between pure rules and browser/UI concerns.

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

`scheduler-core.js` is shared by the browser application and Node tests, so tests exercise the same time/conflict implementation used by the deployed page.

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

The suite covers:

- `HH:MM` to minute conversion,
- actual overlapping sessions,
- touching boundaries as non-conflicting,
- online sessions as non-time conflicts,
- sessions on different days,
- conflict-pair/day output,
- current semester metadata,
- expected program totals,
- valid official time-slot boundaries,
- required course code/HDS/session metadata,
- the later Bilişim Hukuku / Python Programlama Wednesday adjustment.

The same command runs in `.github/workflows/tests.yml` on pushes and pull requests to `main`.

## Usage

1. Open the [live application](https://mkarson1997.github.io/karatay-ders-program/).
2. Choose first-year, second-year or mixed mode.
3. Select the courses you want.
4. Choose a group where the official timetable provides alternatives.
5. Generate the timetable.
6. Review collision warnings or automatic group adjustments.
7. Export the result as PDF.

## Privacy

The schedule builder does not need a backend account or user database. Course selections, conflict detection and PDF generation are handled in the browser.

The optional student-name field is used only to label the locally generated PDF and is not submitted to the usage statistics flow. After a successful PDF generation, the application records only an anonymous marker and the selected planner mode through the project's Google Form/Sheets flow. Selected courses, rooms, teachers, timetable contents and the generated PDF are not submitted.

See [PRIVACY.md](PRIVACY.md) for the data-handling policy and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Open source

Project-authored source is licensed under the [MIT License](LICENSE). Third-party font/library licensing boundaries are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Scope

The current dataset targets KTO Karatay University Computer Programming schedules for the 2026-2027 fall semester. The scheduling logic can be generalized later for additional semesters, departments or institutions.

---

Built by [Mahmoud Karzoun](https://github.com/mkarson1997).
