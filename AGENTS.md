# Argus — Project Conventions

Next.js + Supabase ad-production scheduling app. Deploys via Vercel from `main`.

## Shared vocabulary (use these terms consistently)

- **Schedule** — the whole board/document (e.g. "TV Products"), not a single project.
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
