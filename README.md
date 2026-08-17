# TaskLedger

**TaskLedger** is a niche-first productivity dashboard for students and young professionals who need to manage **time + money + study + fitness** without switching between multiple apps.

## Why this niche?

Traditional to-do apps mainly answer: **"What do I need to do?"**

TaskLedger tries to answer four questions:

1. **What should I do next?**
2. **How much time will it take?**
3. **What will it cost me?**
4. **How does it affect my bigger goals?**

The first version is intentionally backend-free so it can be deployed as a static site.

## MVP features

- Task creation with category, priority, deadline, effort, energy and KES cost
- Smart queue sorting
- Daily execution capacity (six-hour default)
- Monthly income / savings target / current savings
- Money-aware task planning
- Study dashboard + Pomodoro focus timer
- Fitness task tracking
- Execution score and lightweight recommendations
- Dark mode
- Local browser persistence with `localStorage`
- JSON data export
- Responsive layout

## Run locally

Open `index.html` in your browser, or use VS Code Live Server.

No build step is required.

## Deploy

### GitHub Pages

Push the project to GitHub, then enable **Settings → Pages** and select the branch/folder containing `index.html`.

GitHub Pages can publish static HTML/CSS/JavaScript directly from a repository.

### Netlify

Import the repository into Netlify and deploy it. Because this project is static, no build command is needed.

## Suggested next version

The next production version should add:

- Authentication
- Cloud sync with Supabase
- PostgreSQL data model
- Recurring tasks
- Calendar view
- Weekly review
- Savings goals with deadlines
- Kenyan budgeting presets
- Mobile PWA/offline support
- Optional AI "plan my day" feature
- Notifications
- Analytics by category, cost, time and energy

## Product positioning

> **TaskLedger — a personal execution system for people building their career on a real-world budget.**

This is intentionally narrower than "another to-do list".
