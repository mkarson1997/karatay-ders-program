# Karatay Course Schedule Builder

A browser-based course scheduling tool that helps Computer Programming students build a valid timetable, detect collisions, switch groups when possible, and export the final schedule as PDF.

**Live demo:** https://mkarson1997.github.io/karatay-ders-program/

## Why this project exists

Building a weekly schedule manually becomes error-prone when courses have multiple groups and overlapping time slots. This project turns that process into a small constraint-solving workflow in the browser.

Instead of acting as a static timetable page, the application lets a user choose courses and then evaluates whether the selected combination can coexist.

## Core features

- First-year, second-year and mixed-course modes
- Interactive course selection
- Time-slot collision detection
- Automatic group adjustment when an alternative group can resolve a conflict
- Generated weekly timetable view
- PDF export
- Runs entirely in the browser
- Static deployment with GitHub Pages

## Engineering focus

This repository demonstrates front-end business logic rather than only visual styling.

The important part of the application is the scheduling flow:

```text
Course selection
      │
      ▼
Read candidate sessions
      │
      ▼
Check time-slot conflicts
      │
      ├── no conflict ──► add to schedule
      │
      └── conflict
              │
              ▼
      try alternative group
              │
              ├── valid ──► add alternative
              └── invalid ─► report collision
```

## Tech stack

- HTML5
- CSS3
- JavaScript
- Client-side PDF generation/export workflow
- GitHub Pages

## Usage

1. Open the [live application](https://mkarson1997.github.io/karatay-ders-program/).
2. Choose first-year, second-year or mixed mode.
3. Select the courses you want.
4. Generate the timetable.
5. Review any collision warnings or automatic group adjustments.
6. Export the result as PDF.

## Portfolio value

The project is intentionally small but useful. It demonstrates:

- translating a real scheduling problem into browser logic,
- conflict detection and conditional decision-making,
- state-driven UI updates,
- exporting user-generated results,
- shipping a zero-backend application to a public URL.

## Roadmap

- Add a reusable test suite for collision and group-selection rules
- Move course data into a structured external data file
- Add semester/version selection
- Add shareable schedule URLs
- Improve accessibility and keyboard navigation
- Add import/export of user selections

## Scope

The current dataset and rules target KTO Karatay University Computer Programming schedules. The scheduling logic can be generalized later for additional departments or institutions.

---

Built by [Mahmoud Karzoun](https://github.com/mkarson1997).