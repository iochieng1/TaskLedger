# TaskLedger

> **A personal execution system for people building their career on a real-world budget.**

TaskLedger is a productivity web application that combines **tasks, time, money, study and fitness** into one execution-focused dashboard.

Most to-do apps answer:

> "What do I need to do?"

TaskLedger is designed to answer:

> **"What should I do next, how long will it take, what will it cost, and does it fit my actual day?"**

The full product spec — personas, functional requirements, user stories, data model, roadmap phases and success metrics — lives in [`PRD.md`](./PRD.md). This README covers what the project is and how to run it; treat PRD.md as the source of truth for scope decisions.

---

## Why TaskLedger?

A normal task list treats every task as if it exists in isolation. Real life does not.

A student or early-career professional may need to finish an assignment, study JavaScript, work, exercise, save money, buy lunch, and complete a side project — all in the same day. Those actions consume different amounts of **time, money and energy**. TaskLedger makes those constraints visible instead of hiding them in separate apps.

Every task can carry five dimensions:

| Dimension | Example |
|---|---|
| Task | Finish JavaScript exercise |
| Time | 60 minutes |
| Energy | High |
| Money | KES 0 |
| Goal | Improve programming skills |

---

## Features

- **Today dashboard** — daily execution capacity, planned minutes, savings progress, completed tasks, focus minutes, planned spending, current streak, smart task queue
- **Next up** — the top 3 open tasks for right now, with the reasons for each, based on a quick check-in (energy today and time available)
- **Smart task queue** — sorted by completion state, due date, priority, then estimated duration
- **Task editing** — every task card has an edit action; changes keep the task's id and completion state
- **Goals** — name the outcomes you're working toward, link tasks to them from the task form, and track open/done work per goal in Insights; archiving a goal keeps its history
- **Money dashboard** — monthly income, savings target, current savings, planned task spending, estimated available money
- **Study mode** — dedicated queue, workload, completion percentage, 25-minute focus timer, focus-minute tracking
- **Fitness mode** — planned sessions, completed workouts, workout minutes, average task energy
- **Insights** — a lightweight execution score (completion rate, priority completion, streak consistency) and a plain-language reality check when the plan is overloaded
- **Personalization** — light/dark mode, responsive layout, local persistence, JSON export, opt-in demo data

See `PRD.md` §6–§7 for the full functional requirements and acceptance criteria behind each of these.

---

## Tech stack

**Current MVP:** HTML5, CSS3, vanilla JavaScript, `localStorage`. No framework, backend, or build process — that keeps it fast to run, easy to understand, and easy to deploy.

**Planned production stack** (see `PRD.md` §19 and §16 for the phased path there): React/Next.js only once complexity justifies it, Supabase for auth and backend, PostgreSQL, deployed on Vercel or Netlify.

---

## Project structure

```text
taskledger/
├── index.html   # structure, views, dialogs, task template
├── styles.css   # layout, dashboard/task cards, dark mode, breakpoints
├── core.js      # pure logic: state parsing/migration, CRUD, sorting, capacity, finance, streaks, focus minutes
├── app.js       # DOM rendering, persistence, dialogs, timer, export, recovery
├── tests/       # Node test suite for core.js
├── package.json # `npm test` script (no dependencies)
├── .github/workflows/ci.yml
├── README.md    # this file
├── PRD.md       # full product specification
└── .gitignore
```

---

## Getting started

```bash
git clone https://github.com/iochieng1/taskledger.git
cd taskledger
```

No build command is required — open `index.html` directly in a browser. For a better dev experience, use VS Code Live Server or:

```bash
python3 -m http.server 5500
```

Then open `http://localhost:5500`.

A new install starts empty. Use **Load demo data** in the sidebar to explore with sample tasks.

---

## Running the checks

The tests use Node's built-in test runner, so there is nothing to install (Node 18+):

```bash
npm test
```

Streaks depend on the local calendar day, so it's worth running them in another timezone too:

```bash
TZ=America/Los_Angeles npm test
```

CI runs the same suite on every push and pull request, across UTC, Africa/Nairobi, America/Los_Angeles and Pacific/Kiritimati.

---

## How data works

All state lives in `localStorage["taskledger-v1"]`:

```javascript
{
  tasks: [],
  goals: [],
  money: { income: 0, target: 0, current: 0 },
  theme: "light",
  timerFocusMinutes: 0
}
```

- **Check-in** is `{ date, energy, minutes }`. It only applies on the day it was set; on a new day it falls back to medium energy and 360 minutes. The minutes value is also the daily capacity on the dashboard.
- **Goals** are `{ id, title, archived }`. A task's optional `goalId` points at one goal. Archived goals disappear from the picker for new tasks but stay linked to existing ones. Saves from before goals existed load with an empty goal list.
- **Focus minutes** shown on the dashboard are `timerFocusMinutes` (completed focus-timer sessions) plus the minutes of completed study tasks. The study share is calculated, not stored, so completing, undoing, editing or deleting a study task always keeps the total consistent. Older saves with a single `focusMinutes` total are migrated automatically.
- **Streaks** count consecutive local calendar days with at least one completion, including today.
- **Unreadable data:** if the saved value can't be parsed or validated, TaskLedger leaves it untouched, stops saving, and shows a banner. **Download saved data** saves the raw value; **Start fresh** keeps a backup copy under `taskledger-v1-unreadable-<timestamp>` before starting empty.
- **Clear all data** and **Load demo data** in the sidebar both ask for confirmation first.

That makes the MVP backend-free, private by default, and easy to reset — but data does not sync between devices. Cloud sync is Phase 3 in `PRD.md`.

---

## How Next up ranks tasks

Each open task gets a score from simple, visible rules, no AI. Every rule that applies shows up as a chip on the card:

| Rule | Effect | Chip |
|---|---|---|
| Overdue / due today / due tomorrow | +40 / +30 / +15 | "Overdue", "Due today", "Due tomorrow" |
| High / medium priority | +20 / +10 | "High priority" |
| Linked to an active goal | +15 | "Moves *goal*" |
| Task energy at or below yours | +10 | "Fits your energy" |
| Task energy above yours | −15 per level | "Needs high energy" |
| Longer than the minutes left today | −25 | "Takes 90 min, 45 min left" |
| Costs money while the monthly plan is over budget | −20 | "Plan is KES 1,000 over budget" |

"Minutes left" is your available time minus the minutes of tasks completed today. "Over budget" means open task costs plus your savings target exceed your monthly income; it only applies once an income is set. Ties fall back to the smart queue order. The logic lives in `recommend()` in `core.js` and is covered by scenario tests.

---

## Deployment

This project is a static frontend and is ready to deploy without a build step.

**Render (recommended for a simple static deployment):**
1. Push the repo to GitHub.
2. In Render, click New → Static Site.
3. Connect your GitHub repository.
4. Use the default settings or set:
   - Name: `taskledger`
   - Root Directory: `.`
   - Build Command: leave blank
   - Publish Directory: `.`
5. Click Create Static Site.
6. Render will publish the site from the repo root and give you a live URL.

**GitHub Pages:** push to GitHub, then enable Settings → Pages and select the branch containing `index.html`.

**Netlify:** import the repo. Build command: none. Publish directory: `/`.

---

## Accessibility & privacy

TaskLedger follows semantic HTML, labelled form controls, visible keyboard focus, and non-color-only status cues (see `PRD.md` §12 for the full list). All data stays in the browser — nothing is sent to a server in the current version. See `PRD.md` §13 for the security bar a future cloud version must clear.

---

## Contributing

A useful contribution should solve a clear user problem, fit the product model in `PRD.md`, avoid unnecessary complexity, work on desktop and mobile, and include sensible empty/error states. For larger changes, open an issue first to discuss product impact.

---

## License

This project is currently intended as a portfolio and learning project. Add a license before accepting external contributions or using it commercially.

---

## Author

**Ian Ochieng** — Software Developer / Apprentice — GitHub: `@iochieng1`
