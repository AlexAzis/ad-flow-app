# Argus — Project Conventions

Next.js + Supabase ad-production scheduling app. Deploys via Vercel from `main`.

## Shared vocabulary (use these terms consistently)

- **Master schedule** — the whole board/document (e.g. "TV Products"); contains
  many campaign schedules. UI label is "master schedule(s)"; code keeps `schedule`.
- **Campaign schedule** — the set of blocks belonging to one campaign within a
  master schedule.
- **Campaign** — a coloured project with client, logo and people.
- **Block** — the coloured event bars on the calendar.
- **Pill** — the small grey misc lozenges (leave, notes).
- **View** — one of the five schedule layouts (below).
- **Filters** — the sidebar toggles (Misc, Event notes, People, Hide weekends, campaign chips).

## View names (UI label = internal value = component)

| Label | Value | Component |
|---|---|---|
| Grid | `grid` | `GridView.tsx` (was CalendarGrid) |
| Gantt | `gantt` | `GanttView.tsx` |
| Vertical | `vertical` | `VerticalView.tsx` |
| Summary | `summary` | `SummaryView.tsx` (was ToplineView) |
| Team | `team` | `TeamView.tsx` (was PeopleView) |

Domain terms: `Event` rows store `isMisc` for pills; `stage` maps to custom event
types; `people` is the filter/field name (not the view — that's "Team").

## Export naming

Files are `Names_Schedule_YYMMDD`: all visible campaign names joined, spaces →
underscores, punctuation stripped, literal "Schedule", date `yyMMdd`.
Helper: `exportFileName()` in `src/lib/exportUtils.ts`. Exports are JPEG/PDF
capped at 10 MB, captured from a detached DOM clone at up to 3x.

## Deferred ideas (back burner — revisit if asked)

- Bulk block actions: selection action bar with move-to-date, reassign, and
  bulk delete. Multi-select, multi-drag, copy/paste and undo already work;
  the gaps are bulk delete/edit and a visible affordance.
- Activity log ("who changed what, when") — needs a small `activity` table.
- Remote-change toasts/highlights — user wasn't sure teammates would use it.
- PDF pagination for tall exports; cross-schedule copy/paste; recurring blocks;
  schedule-wide block search.
