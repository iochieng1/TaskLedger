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
- **Smart task queue** — sorted by completion state, due date, priority, then estimated duration
- **Money dashboard** — monthly income, savings target, current savings, planned task spending, estimated available money
- **Study mode** — dedicated queue, workload, completion percentage, 25-minute focus timer, focus-minute tracking
- **Fitness mode** — planned sessions, completed workouts, workout minutes, average task energy
- **Insights** — a lightweight execution score (completion rate, priority completion, streak consistency) and a plain-language reality check when the plan is overloaded
- **Personalization** — light/dark mode, responsive layout, local persistence, JSON export

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
├── app.js       # state, persistence, CRUD, sorting, dashboard/finance/study/fitness calculations, timer, export
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

---

## How data works

All state lives in `localStorage["taskledger-v1"]`:

```javascript
{
  tasks: [],
  money: { income: 0, target: 0, current: 0 },
  theme: "light",
  focusMinutes: 0
}
```

That makes the MVP backend-free, private by default, and easy to reset — but data does not sync between devices. Cloud sync is Phase 3 in `PRD.md`.

---

## Deployment

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
