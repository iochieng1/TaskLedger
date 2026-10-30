# TaskLedger — Product Requirements Document (PRD)

**Product:** TaskLedger  
**Version:** 1.0 MVP  
**Status:** Product specification  
**Document owner:** Ian Ochieng  
**Platform:** Responsive web application  
**Primary market:** Students, apprentices, junior professionals, freelancers and early-career builders  
**Primary currency:** Kenyan Shilling (KES)

---

## 1. Product Summary

TaskLedger is a personal execution dashboard that combines **tasks, time, money, study, fitness and personal goals** in one workflow.

Traditional to-do applications answer:

> What do I need to do?

TaskLedger aims to answer:

> What should I do next, how much time will it take, what will it cost, and how does it move me toward my goals?

The product is designed for users whose productivity is constrained by real-world factors such as limited time, limited income, changing energy levels and competing priorities.

### Product positioning

**TaskLedger — a personal execution system for people building their career on a real-world budget.**

---

## 2. Problem Statement

Most productivity tools separate important parts of everyday life:

- Tasks live in a to-do app.
- Calendar commitments live in a calendar.
- Savings live in a finance app or spreadsheet.
- Study plans live in notes or learning platforms.
- Workout plans live in fitness apps.

This creates fragmentation.

A user may have enough tasks to fill an entire day without realizing that the plan requires more time than they have. They may also plan activities without seeing the financial cost attached to them.

TaskLedger addresses this by putting **execution constraints and goals next to the task list**.

---

## 3. Target Users

### Primary persona: The Early-Career Builder

A student, apprentice, junior developer, freelancer or young professional who:

- Has multiple goals at once.
- Has a limited monthly income or budget.
- Needs to study continuously.
- Wants to exercise consistently.
- Struggles with prioritization and task overload.
- Uses a phone and laptop interchangeably.
- Wants something more practical than a basic checklist.

### Secondary personas

#### Student

Needs to balance:

- assignments
- revision
- exams
- personal commitments
- transport/food spending

#### Junior professional

Needs to balance:

- work
- learning
- side projects
- health
- personal finances

#### Freelancer

Needs to balance:

- client work
- prospecting
- learning
- project deadlines
- irregular income and expenses

---

## 4. Product Goals

### Primary goals

1. Help users identify their highest-value next actions.
2. Prevent unrealistic daily planning by making task effort visible.
3. Make financial impact visible when tasks have associated costs.
4. Combine study and fitness planning with normal task management.
5. Give users simple progress feedback without overwhelming analytics.
6. Provide a useful MVP that can be deployed as a static website.

### Secondary goals

1. Create a strong portfolio project demonstrating frontend engineering.
2. Establish a foundation for a future cloud-backed SaaS product.
3. Build a product architecture that can later support AI-assisted planning.

### Non-goals for MVP

The first release will not attempt to be:

- a full accounting application
- a medical or professional fitness application
- a replacement for Google Calendar
- a complete project-management suite
- an AI assistant with autonomous actions
- a banking application

---

## 5. Core Product Principle

TaskLedger is built around five dimensions:

| Dimension | Question |
|---|---|
| Task | What needs to happen? |
| Time | How long will it take? |
| Energy | How demanding is it? |
| Money | What will it cost or save? |
| Goal | Why does it matter? |

A task should become an **actionable unit**, not just a line of text.

---

## 6. MVP Scope

### 6.1 Task management

Users can:

- Create tasks.
- Edit task information.
- Delete tasks.
- Mark tasks complete/incomplete.
- Assign a category.
- Assign priority.
- Set a due date.
- Estimate duration.
- Set an energy requirement.
- Attach an optional monetary cost.
- Add context/notes.

### 6.2 Smart task queue

The system sorts tasks using:

1. Completion status.
2. Due date.
3. Priority.
4. Estimated duration.

This creates a simple "next best actions" queue without requiring artificial intelligence.

### 6.3 Daily capacity

TaskLedger uses a default daily execution capacity of **360 minutes**.

The system calculates:

`planned minutes / daily capacity`

The UI displays:

- planned minutes
- remaining capacity
- percentage of capacity used
- overload warning when capacity exceeds the threshold

Purpose:

> Stop users from building impossible schedules.

### 6.4 Finance layer

Users can store:

- monthly income
- savings target
- current savings

Tasks can also contain a cost in KES.

The system calculates planned task spending and estimated money available after planned spending and savings allocation.

### 6.5 Study mode

Study tasks are grouped separately.

MVP provides:

- study task queue
- study minutes remaining
- completion percentage
- 25-minute focus timer
- focus-minute tracking

### 6.6 Fitness mode

Fitness tasks are grouped separately.

MVP provides:

- planned workout sessions
- completed sessions
- workout minutes
- average task energy level

### 6.7 Insights

The system provides a lightweight execution score derived from:

- completion rate
- priority completion
- streak consistency

The user also receives a simple "reality check" recommendation based on workload, spending and completion behaviour.

### 6.8 Personalization

MVP includes:

- responsive layout
- light/dark mode
- persistent local data
- JSON export

---

## 7. Functional Requirements

### FR-01: Create task

**Description:** Users can create a task with required title and date.

**Required fields:**

- title
- category
- priority
- due date
- estimated minutes
- cost
- energy

**Optional:**

- note/context

**Acceptance criteria:**

- User cannot submit an empty task title.
- New task appears in the relevant task list.
- New task persists after page refresh.
- Task cost is stored as a number.
- Estimated duration is stored as minutes.

---

### FR-02: Complete task

**Description:** Users can toggle task completion.

**Acceptance criteria:**

- Completed tasks are visually distinct.
- Completion state persists after refresh.
- Completed task contributes to completion statistics.
- Study task completion contributes to focus-minute tracking where applicable.

---

### FR-03: Delete task

**Description:** Users can remove a task.

**Acceptance criteria:**

- Task disappears from all views.
- Related aggregates are updated.
- Deleted task is removed from local storage.

---

### FR-04: Smart queue

**Description:** The product prioritizes actionable tasks.

**Acceptance criteria:**

- Incomplete tasks appear before completed tasks.
- Earlier due dates appear before later due dates.
- Higher priority appears before lower priority when dates are equal.
- Shorter tasks are preferred when priority and date are equal.

---

### FR-04b: Next up

**Description:** The product recommends what to do now, using the user's real constraints, and explains why.

**Acceptance criteria:**

- The user can set today's energy (low, medium, high) and available minutes; both reset to defaults on a new day.
- Up to three open tasks are recommended, ranked by deadline, priority, goal contribution, energy fit, time left today and budget.
- Each recommendation lists the reasons that affected its rank, including negative ones.
- The smart queue (FR-04) keeps its own order; Next up is a separate view of the same tasks.
- When open work due today or overdue exceeds the time left, the product says by how much and offers to move the lowest-ranked tasks to tomorrow or reschedule them.
- After the user checks in, work that needs more energy than they have is flagged, with an option to show only tasks that fit.
- When planned costs and the savings target exceed income, costed tasks are listed for review.
- Alert wording stays neutral ("over capacity", "over budget"), never failure-oriented.

---

### FR-05: Daily capacity

**Description:** The product communicates whether a planned day is realistic.

**Acceptance criteria:**

- Task minutes are summed.
- Percentage of the 360-minute capacity is displayed.
- An overload state is shown when planned time exceeds capacity.

---

### FR-06: Savings target

**Description:** User can define a monthly savings objective.

**Acceptance criteria:**

- User can enter monthly income.
- User can enter target savings.
- User can enter current savings.
- System calculates progress toward the savings target.
- Dashboard reflects savings progress.

---

### FR-07: Money-aware tasks

**Description:** Users can associate costs with tasks.

**Acceptance criteria:**

- Cost is displayed on the task card.
- Planned incomplete task costs are summed.
- Finance dashboard displays planned task spending.

---

### FR-08: Study focus timer

**Description:** User can start a 25-minute focus session.

**Acceptance criteria:**

- Timer counts down in real time.
- User can reset the timer.
- Completion of a session records focus minutes.
- Timer can operate without a backend.

---

### FR-09: Fitness tracking

**Description:** Fitness is managed as an execution category.

**Acceptance criteria:**

- Fitness tasks are visible in a dedicated view.
- Total fitness minutes are calculated.
- Planned and completed sessions are displayed.

---

### FR-10: Data persistence

**Description:** MVP data survives page refresh.

**Acceptance criteria:**

- Tasks persist using browser storage.
- Money plan persists.
- Theme preference persists.
- Export produces a valid JSON file.

---

## 8. User Stories

### Core task stories

**US-01**

> As a user, I want to create a task with a duration so I know how much of my day it consumes.

**US-02**

> As a user, I want to set a priority so I know what deserves attention first.

**US-03**

> As a user, I want to mark a task complete so I can see progress.

### Time stories

**US-04**

> As a busy user, I want to see my planned minutes so I know whether my day is overloaded.

### Finance stories

**US-05**

> As a user on a limited budget, I want to attach costs to tasks so I can see the financial impact of my plan.

**US-06**

> As a saver, I want a savings target so I can track progress toward a monthly goal.

### Study stories

**US-07**

> As a student, I want study tasks grouped separately so I can focus on academic work.

**US-08**

> As a learner, I want a focus timer so I can execute study sessions immediately.

### Fitness stories

**US-09**

> As a user, I want workouts treated as tasks so exercise becomes part of my daily execution plan.

### Reflection stories

**US-10**

> As a user, I want simple insights so I can understand whether I am actually executing my plans.

---

## 9. Key User Flows

### Flow A — Add a normal task

1. User opens TaskLedger.
2. User clicks **Add task**.
3. User enters title.
4. User selects category.
5. User enters due date and duration.
6. User optionally adds cost, energy and context.
7. User submits.
8. Task appears in the smart queue.
9. Dashboard recalculates capacity and spending.

### Flow B — Create a study session

1. User opens Study.
2. User creates study task.
3. User assigns estimated duration.
4. User starts focus timer.
5. User completes work.
6. User marks task complete.
7. Focus and study metrics update.

### Flow C — Plan around money

1. User opens Money.
2. User enters monthly income.
3. User enters savings target.
4. User adds cost-bearing tasks.
5. TaskLedger totals planned spending.
6. User sees estimated available amount.
7. User can adjust tasks or spending before execution.

### Flow D — Review the day

1. User opens Today.
2. User sees planned capacity.
3. User completes important tasks.
4. Dashboard updates execution metrics.
5. User opens Insights.
6. User reads the reality check and adjusts tomorrow's workload.

---

## 10. Information Architecture

```text
TaskLedger
│
├── Today
│   ├── Daily capacity
│   ├── Savings snapshot
│   ├── Daily stats
│   └── Smart queue
│
├── Money
│   ├── Monthly plan
│   ├── Savings target
│   ├── Available money
│   └── Money-aware tasks
│
├── Study
│   ├── Focus timer
│   ├── Study workload
│   └── Study queue
│
├── Fitness
│   ├── Workout stats
│   └── Workout queue
│
└── Insights
    ├── Execution score
    ├── Best category
    ├── Reality check
    └── Product principles
```

---

## 11. Data Model — MVP

### Task

```text
Task
- id
- title
- category
- priority
- date
- minutes
- cost
- energy
- note
- completed
- completedAt
```

### Money Plan

```text
MoneyPlan
- income
- target
- current
```

### Application State

```text
AppState
- tasks[]
- money
- theme
- focusMinutes
```

MVP storage:

`localStorage["taskledger-v1"]`

---

## 12. UX Requirements

### Principles

1. **Fast capture:** adding a task should take seconds.
2. **Low cognitive load:** show only information useful for execution.
3. **Action before analytics:** tasks should remain the main object.
4. **Visible constraints:** time and money should be obvious.
5. **Mobile-first behaviour:** core actions must work comfortably on small screens.
6. **Progress without guilt:** insights should be useful, not punitive.

### Accessibility

The application should:

- use semantic HTML
- provide keyboard-focus states
- maintain readable contrast
- avoid color as the only state indicator
- provide labels for inputs
- provide accessible button titles
- remain usable without a mouse

---

## 13. Non-Functional Requirements

### Performance

- Initial page should load quickly on a typical mobile connection.
- No framework or large runtime dependency is required for MVP.
- Interactions should feel immediate.

### Reliability

- Local data should survive refresh.
- Invalid input should not corrupt stored state.
- Export must generate valid JSON.

### Security

MVP stores data locally and does not transmit user financial information to a server.

For future cloud versions:

- authenticated access must be required
- financial data must be protected by database policies
- no financial credentials should be stored
- sensitive data should not be logged

---

## 14. Success Metrics

After deployment, monitor:

### Activation

- percentage of visitors who create their first task

### Engagement

- tasks created per active user
- tasks completed per active user
- weekly active users

### Value

- percentage of users who set a savings goal
- percentage who use study mode
- percentage who use fitness mode
- average number of completed tasks per session

### Retention

- 7-day returning users
- 30-day returning users
- recurring weekly usage

### Quality

- task completion rate
- average planned daily minutes
- percentage of users exceeding daily capacity
- average task duration estimate

---

## 15. MVP Acceptance Criteria

The MVP is considered complete when:

- A user can create, complete and delete tasks.
- Tasks persist after browser refresh.
- Tasks can be categorized into Study, Money, Fitness, Work and Personal.
- Task duration affects daily capacity.
- Task costs affect money planning.
- Savings progress is visible.
- Study tasks appear in Study mode.
- A focus timer works.
- Fitness tasks appear in Fitness mode.
- Insights display useful calculated values.
- The application works on desktop and mobile widths.
- Dark mode works.
- Data can be exported as JSON.
- The application can be deployed as a static website.

---

## 16. Product Roadmap

### Phase 1 — MVP

- LocalStorage
- Task management
- Daily capacity
- Finance layer
- Study mode
- Fitness mode
- Insights
- Responsive UI

### Phase 2 — Personal productivity system

- Recurring tasks
- Calendar integration
- Weekly planning
- Weekly review
- Better task scoring
- Notifications
- Goal hierarchy
- Habit tracking

### Phase 3 — Cloud product

- Supabase authentication
- Cloud database
- Multi-device sync
- User profiles
- Row-level security
- Backup and restore

### Phase 4 — Intelligence

- AI-generated daily plans
- Deadline-aware scheduling
- Budget-aware suggestions
- Energy-aware task recommendations
- Automatic weekly review
- Natural-language task capture

### Phase 5 — PWA / mobile

- Installable PWA
- Offline support
- Push notifications
- Mobile-optimized interactions

---

## 17. Future Differentiator: Plan My Day

This is the feature with the strongest long-term product potential.

The user supplies:

- available time
- energy level
- important deadlines
- savings target
- required commitments
- top goals

TaskLedger generates a realistic plan.

Example:

```text
09:00–10:00  Finish JavaScript exercise
10:00–10:15  Break
10:15–10:45  Workout
10:45–11:00  Money check
11:00–12:00  Side project
```

The system should not simply maximize the number of tasks. It should optimize for:

**priority + deadline + available time + energy + financial constraints**

---

## 18. Risks

### Risk: Too many features

**Mitigation:** Keep the task object central. Every new feature must improve execution.

### Risk: Users perceive it as "another Todo app"

**Mitigation:** Emphasize the core differentiator: time + money + execution.

### Risk: Financial features become too complex

**Mitigation:** Keep MVP finance lightweight. It is a planning layer, not accounting software.

### Risk: Users stop after initial setup

**Mitigation:** Reduce capture friction and create useful daily recommendations.

### Risk: Overloaded users feel judged

**Mitigation:** Use neutral language such as "over capacity" rather than failure-oriented messaging.

---

## 19. Technical Direction

### MVP stack

- HTML5
- CSS3
- Vanilla JavaScript
- LocalStorage

### Future stack

```text
Frontend
  └── HTML/CSS/JS → React/Next.js only when product complexity justifies it

Backend
  └── Supabase

Database
  └── PostgreSQL

Authentication
  └── Supabase Auth

Deployment
  ├── GitHub Pages / Netlify for static MVP
  └── Vercel/Netlify + Supabase for cloud version
```

Do not introduce a framework merely to make the project appear more advanced. The MVP should demonstrate product thinking and clean engineering first.

---

## 20. Definition of Done

A feature is done when:

- It works on desktop and mobile.
- Its data model is clear.
- Its primary user flow is tested manually.
- Its empty and error states are considered.
- It does not break existing task workflows.
- It has clear acceptance criteria.
- It is documented.
- The code is readable and maintainable.

---

## 21. Product North Star

**North Star Metric:**

> Completed high-value actions per active user per week.

The product should optimize for **meaningful execution**, not the number of tasks created.

A successful TaskLedger user should not have the longest checklist.

They should have a clearer day, better follow-through and stronger progress toward their goals.
