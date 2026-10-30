const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../core.js");

const TODAY = "2026-10-30";

function stateWith(tasks = []) {
  const state = Core.emptyState();
  state.tasks = tasks;
  return state;
}

function task(overrides = {}) {
  return {
    id: overrides.id || Core.uid(),
    title: "Task",
    category: "work",
    priority: 2,
    date: TODAY,
    minutes: 30,
    cost: 0,
    energy: "medium",
    note: "",
    completed: false,
    completedAt: null,
    ...overrides
  };
}

function refresh(state) {
  const result = Core.parseState(JSON.stringify(state));
  assert.equal(result.ok, true, result.reason);
  return result.state;
}

function completedAtLocal(y, m, d, h = 12, min = 0) {
  return new Date(y, m - 1, d, h, min).toISOString();
}

describe("fresh installs", () => {
  test("start with no tasks and zeroed money", () => {
    const state = Core.emptyState();
    assert.deepEqual(state.tasks, []);
    assert.deepEqual(state.money, { income: 0, target: 0, current: 0 });
    assert.equal(Core.totalFocusMinutes(state), 0);
  });

  test("demo data is only produced on request", () => {
    const demo = Core.demoState(TODAY);
    assert.ok(demo.tasks.length > 0);
    assert.ok(demo.money.income > 0);
    assert.deepEqual(Core.emptyState().tasks, []);
  });

  test("demo tomorrow is the next local day", () => {
    const demo = Core.demoState("2026-12-31");
    assert.ok(demo.tasks.some((t) => t.date === "2027-01-01"));
  });
});

describe("task CRUD and persistence", () => {
  test("add creates an incomplete task that survives a refresh", () => {
    const state = Core.emptyState();
    const added = Core.addTask(state, { title: "  Revise arrays ", category: "study", priority: "3", date: TODAY, minutes: "45", cost: "0", energy: "high", note: "" });
    assert.equal(added.title, "Revise arrays");
    assert.equal(added.priority, 3);
    assert.equal(added.minutes, 45);
    assert.equal(added.completed, false);
    assert.deepEqual(refresh(state).tasks, [added]);
  });

  test("update keeps the id and completion state and changes every editable field", () => {
    const original = task({ id: "a", completed: true, completedAt: completedAtLocal(2026, 10, 30) });
    const before = { ...original };
    const state = stateWith([original]);
    const goal = Core.addGoal(state, "Ship it");
    Core.updateTask(state, "a", { title: "Renamed", category: "finance", priority: 1, date: "2026-11-02", minutes: 15, cost: 200, energy: "low", note: "why", goalId: goal.id });
    const [saved] = refresh(state).tasks;
    assert.deepEqual(saved, { ...before, title: "Renamed", category: "finance", priority: 1, date: "2026-11-02", minutes: 15, cost: 200, energy: "low", note: "why", goalId: goal.id });
  });

  test("update of an unknown id changes nothing", () => {
    const state = stateWith([task({ id: "a" })]);
    const before = JSON.stringify(state);
    assert.equal(Core.updateTask(state, "missing", { title: "x" }), null);
    assert.equal(JSON.stringify(state), before);
  });

  test("delete removes only the matching task", () => {
    const state = stateWith([task({ id: "a" }), task({ id: "b" })]);
    assert.equal(Core.deleteTask(state, "a"), true);
    assert.deepEqual(refresh(state).tasks.map((t) => t.id), ["b"]);
    assert.equal(Core.deleteTask(state, "a"), false);
  });

  test("toggle sets and clears completedAt", () => {
    const state = stateWith([task({ id: "a" })]);
    const now = new Date(2026, 9, 30, 9);
    Core.toggleTask(state, "a", now);
    assert.equal(state.tasks[0].completedAt, now.toISOString());
    Core.toggleTask(state, "a", now);
    assert.equal(state.tasks[0].completed, false);
    assert.equal(state.tasks[0].completedAt, null);
  });
});

describe("loading saved data", () => {
  test("malformed JSON is rejected, not replaced", () => {
    const result = Core.parseState("{not json");
    assert.equal(result.ok, false);
    assert.match(result.reason, /JSON/);
  });

  test("non-object and wrong-shaped data is rejected", () => {
    assert.equal(Core.parseState("[]").ok, false);
    assert.equal(Core.parseState("null").ok, false);
    assert.equal(Core.parseState('{"tasks": "nope"}').ok, false);
  });

  test("a task without a title rejects the whole state instead of dropping it", () => {
    const result = Core.parseState(JSON.stringify({ tasks: [task(), { id: "x" }] }));
    assert.equal(result.ok, false);
    assert.match(result.reason, /#2/);
  });

  test("missing or invalid fields are migrated to safe defaults", () => {
    const result = Core.parseState(JSON.stringify({
      tasks: [{ title: "Old", priority: "9", minutes: "abc", energy: "extreme", category: "hobby", completed: true }],
      money: { income: "1000" },
      theme: "neon"
    }));
    assert.equal(result.ok, true);
    const [t] = result.state.tasks;
    assert.ok(t.id);
    assert.equal(t.priority, 2);
    assert.equal(t.minutes, 30);
    assert.equal(t.energy, "medium");
    assert.equal(t.category, "personal");
    assert.ok(t.completedAt);
    assert.deepEqual(result.state.money, { income: 1000, target: 0, current: 0 });
    assert.equal(result.state.theme, "light");
  });
});

describe("smart queue", () => {
  test("orders by completion, due date, priority, then shorter tasks", () => {
    const tasks = [
      task({ id: "done", completed: true, date: "2026-10-01" }),
      task({ id: "later", date: "2026-11-01", priority: 3 }),
      task({ id: "low", priority: 1 }),
      task({ id: "high-long", priority: 3, minutes: 90 }),
      task({ id: "high-short", priority: 3, minutes: 10 }),
      task({ id: "overdue", date: "2026-10-29", priority: 1 })
    ];
    assert.deepEqual(tasks.sort(Core.smartSort).map((t) => t.id), ["overdue", "high-short", "high-long", "low", "later", "done"]);
  });
});

describe("capacity and finance", () => {
  test("day summary counts only open work due today", () => {
    const day = Core.daySummary([
      task({ minutes: 200, cost: 100 }),
      task({ minutes: 200, cost: 50 }),
      task({ minutes: 60, completed: true }),
      task({ minutes: 500, date: "2026-10-31" })
    ], TODAY);
    assert.equal(day.plannedMinutes, 400);
    assert.equal(day.plannedSpend, 150);
    assert.equal(day.completedCount, 1);
    assert.equal(day.capacityPercent, 100);
    assert.equal(day.overCapacity, true);
  });

  test("heavy day is flagged within an hour of capacity", () => {
    const day = Core.daySummary([task({ minutes: 310 })], TODAY);
    assert.equal(day.overCapacity, false);
    assert.equal(day.heavy, true);
  });

  test("available money subtracts open task costs and the savings target", () => {
    const money = Core.financeSummary({ income: 30000, target: 5000, current: 1200 }, [
      task({ cost: 150 }),
      task({ cost: 1000, completed: true })
    ]);
    assert.equal(money.planned, 150);
    assert.equal(money.available, 24850);
    assert.equal(money.savingPercent, 24);
    assert.equal(money.leftToTarget, 3800);
  });

  test("no savings target means zero progress, not division by zero", () => {
    assert.equal(Core.financeSummary({ income: 0, target: 0, current: 500 }, []).savingPercent, 0);
  });
});

describe("execution streak", () => {
  const done = (y, m, d, h, min) => task({ completed: true, completedAt: completedAtLocal(y, m, d, h, min) });

  test("a completion today counts toward the current streak", () => {
    assert.equal(Core.calculateStreak([done(2026, 10, 30)], TODAY), 1);
  });

  test("streak ending yesterday is still alive", () => {
    assert.equal(Core.calculateStreak([done(2026, 10, 29), done(2026, 10, 28)], TODAY), 2);
  });

  test("today plus previous consecutive days all count", () => {
    assert.equal(Core.calculateStreak([done(2026, 10, 30), done(2026, 10, 29), done(2026, 10, 28)], TODAY), 3);
  });

  test("a missed day resets the streak to zero", () => {
    assert.equal(Core.calculateStreak([done(2026, 10, 28)], TODAY), 0);
  });

  test("no completions means no streak", () => {
    assert.equal(Core.calculateStreak([], TODAY), 0);
  });

  test("uses the local day for completions just after midnight", () => {
    assert.equal(Core.calculateStreak([done(2026, 10, 30, 0, 5)], TODAY), 1);
  });

  test("uses the local day for completions just before midnight", () => {
    assert.equal(Core.calculateStreak([done(2026, 10, 29, 23, 55)], TODAY), 1);
    assert.equal(Core.calculateStreak([done(2026, 10, 29, 23, 55)], "2026-10-31"), 0);
  });

  test("streaks cross month boundaries", () => {
    assert.equal(Core.calculateStreak([done(2026, 11, 1), done(2026, 10, 31)], "2026-11-01"), 2);
  });
});

describe("study focus minutes", () => {
  test("complete adds, undo removes", () => {
    const state = stateWith([task({ id: "s", category: "study", minutes: 40 })]);
    Core.toggleTask(state, "s");
    assert.equal(Core.totalFocusMinutes(state), 40);
    Core.toggleTask(state, "s");
    assert.equal(Core.totalFocusMinutes(state), 0);
  });

  test("deleting a completed study task removes its minutes", () => {
    const state = stateWith([task({ id: "s", category: "study", minutes: 40 })]);
    state.timerFocusMinutes = 25;
    Core.toggleTask(state, "s");
    Core.deleteTask(state, "s");
    assert.equal(Core.totalFocusMinutes(state), 25);
  });

  test("editing a completed study task's minutes updates the total", () => {
    const state = stateWith([task({ id: "s", category: "study", minutes: 40 })]);
    Core.toggleTask(state, "s");
    Core.updateTask(state, "s", { ...state.tasks[0], minutes: 60 });
    assert.equal(Core.totalFocusMinutes(state), 60);
  });

  test("non-study tasks never count", () => {
    const state = stateWith([task({ id: "w", category: "work", minutes: 40 })]);
    Core.toggleTask(state, "w");
    assert.equal(Core.totalFocusMinutes(state), 0);
  });

  test("totals survive a refresh", () => {
    const state = stateWith([task({ id: "s", category: "study", minutes: 40 })]);
    state.timerFocusMinutes = 25;
    Core.toggleTask(state, "s");
    assert.equal(Core.totalFocusMinutes(refresh(state)), 65);
  });

  test("old focusMinutes totals migrate without double counting", () => {
    const result = Core.parseState(JSON.stringify({
      tasks: [task({ category: "study", minutes: 40, completed: true, completedAt: completedAtLocal(2026, 10, 30) })],
      focusMinutes: 65
    }));
    assert.equal(result.state.timerFocusMinutes, 25);
    assert.equal(Core.totalFocusMinutes(result.state), 65);
  });

  test("migration never goes negative when old data was already inflated by deletes", () => {
    const result = Core.parseState(JSON.stringify({
      tasks: [task({ category: "study", minutes: 40, completed: true, completedAt: completedAtLocal(2026, 10, 30) })],
      focusMinutes: 10
    }));
    assert.equal(result.state.timerFocusMinutes, 0);
  });
});

describe("goals", () => {
  test("fresh state has no goals", () => {
    assert.deepEqual(Core.emptyState().goals, []);
  });

  test("adding trims the title and reuses an active goal with the same name", () => {
    const state = Core.emptyState();
    const goal = Core.addGoal(state, "  Get a dev job ");
    assert.equal(goal.title, "Get a dev job");
    assert.equal(Core.addGoal(state, "get a DEV job"), goal);
    assert.equal(state.goals.length, 1);
    assert.equal(Core.addGoal(state, "   "), null);
  });

  test("an archived goal's name can be reused for a new goal", () => {
    const state = Core.emptyState();
    const old = Core.addGoal(state, "Run 5k");
    Core.setGoalArchived(state, old.id, true);
    const again = Core.addGoal(state, "Run 5k");
    assert.notEqual(again.id, old.id);
    assert.deepEqual(Core.activeGoals(state), [again]);
  });

  test("rename keeps the id and rejects empty titles", () => {
    const state = Core.emptyState();
    const goal = Core.addGoal(state, "Save");
    Core.renameGoal(state, goal.id, "Save KES 5,000");
    assert.equal(Core.goalTitle(state, goal.id), "Save KES 5,000");
    assert.equal(Core.renameGoal(state, goal.id, " "), null);
    assert.equal(goal.title, "Save KES 5,000");
  });

  test("tasks link to existing goals only", () => {
    const state = Core.emptyState();
    const goal = Core.addGoal(state, "Learn Go");
    assert.equal(Core.addTask(state, { title: "Tour of Go", goalId: goal.id }).goalId, goal.id);
    assert.equal(Core.addTask(state, { title: "Typo", goalId: "nope" }).goalId, null);
    assert.equal(Core.addTask(state, { title: "None" }).goalId, null);
  });

  test("archiving a goal keeps its tasks linked", () => {
    const state = Core.emptyState();
    const goal = Core.addGoal(state, "Learn Go");
    const t = Core.addTask(state, { title: "Tour of Go", goalId: goal.id });
    Core.setGoalArchived(state, goal.id, true);
    assert.equal(t.goalId, goal.id);
    assert.equal(Core.goalTitle(state, goal.id), "Learn Go");
  });

  test("editing a task can unlink it from its goal", () => {
    const state = Core.emptyState();
    const goal = Core.addGoal(state, "Learn Go");
    const t = Core.addTask(state, { title: "Tour of Go", goalId: goal.id });
    Core.updateTask(state, t.id, { ...t, goalId: "" });
    assert.equal(t.goalId, null);
  });

  test("summaries count open and done work per goal", () => {
    const state = Core.emptyState();
    const goal = Core.addGoal(state, "Learn Go");
    const a = Core.addTask(state, { title: "A", minutes: 30, goalId: goal.id });
    Core.addTask(state, { title: "B", minutes: 45, goalId: goal.id });
    Core.addTask(state, { title: "Unlinked" });
    Core.toggleTask(state, a.id);
    const [summary] = Core.goalSummaries(state);
    assert.equal(summary.goal, goal);
    assert.equal(summary.open, 1);
    assert.equal(summary.done, 1);
    assert.equal(summary.doneMinutes, 30);
  });

  test("goals and links survive a refresh", () => {
    const state = Core.emptyState();
    const goal = Core.addGoal(state, "Learn Go");
    Core.setGoalArchived(state, Core.addGoal(state, "Old").id, true);
    Core.addTask(state, { title: "Tour of Go", goalId: goal.id });
    const loaded = refresh(state);
    assert.deepEqual(loaded.goals, state.goals);
    assert.equal(loaded.tasks[0].goalId, goal.id);
  });

  test("saves from before goals existed load with no goals and unlinked tasks", () => {
    const result = Core.parseState(JSON.stringify({ tasks: [{ title: "Old task" }] }));
    assert.equal(result.ok, true);
    assert.deepEqual(result.state.goals, []);
    assert.equal(result.state.tasks[0].goalId, null);
  });

  test("a goal without a title rejects the whole state", () => {
    assert.equal(Core.parseState(JSON.stringify({ goals: [{ id: "g" }] })).ok, false);
    assert.equal(Core.parseState(JSON.stringify({ goals: "nope" })).ok, false);
  });

  test("demo data links tasks to demo goals", () => {
    const demo = Core.demoState(TODAY);
    const ids = new Set(demo.goals.map((g) => g.id));
    assert.ok(demo.goals.length > 0);
    assert.ok(demo.tasks.some((t) => ids.has(t.goalId)));
    assert.ok(demo.tasks.every((t) => t.goalId === null || ids.has(t.goalId)));
  });
});

describe("daily check-in", () => {
  test("defaults to medium energy and the standard capacity", () => {
    assert.deepEqual(Core.checkinFor(Core.emptyState(), TODAY), { energy: "medium", minutes: Core.DAILY_CAPACITY_MINUTES });
  });

  test("applies only to the day it was set", () => {
    const state = Core.emptyState();
    Core.setCheckin(state, TODAY, { energy: "low", minutes: 120 });
    assert.deepEqual(Core.checkinFor(state, TODAY), { energy: "low", minutes: 120 });
    assert.deepEqual(Core.checkinFor(state, "2026-10-31"), { energy: "medium", minutes: Core.DAILY_CAPACITY_MINUTES });
  });

  test("partial updates keep the other value and clamp minutes", () => {
    const state = Core.emptyState();
    Core.setCheckin(state, TODAY, { energy: "high" });
    Core.setCheckin(state, TODAY, { minutes: 5000 });
    assert.deepEqual(Core.checkinFor(state, TODAY), { energy: "high", minutes: 1440 });
    Core.setCheckin(state, TODAY, { minutes: -30, energy: "sleepy" });
    assert.deepEqual(Core.checkinFor(state, TODAY), { energy: "high", minutes: 0 });
  });

  test("survives a refresh, and bad saved check-ins are ignored", () => {
    const state = Core.emptyState();
    Core.setCheckin(state, TODAY, { energy: "low", minutes: 90 });
    assert.deepEqual(Core.checkinFor(refresh(state), TODAY), { energy: "low", minutes: 90 });
    const bad = Core.parseState(JSON.stringify({ checkin: { date: "yesterday", energy: "low" } }));
    assert.equal(bad.state.checkin, null);
  });

  test("zero capacity does not divide by zero", () => {
    assert.equal(Core.daySummary([], TODAY, 0).capacityPercent, 0);
    assert.equal(Core.daySummary([task({ minutes: 10 })], TODAY, 0).capacityPercent, 100);
  });
});

describe("next up recommendations", () => {
  const ids = (recs) => recs.map((r) => r.task.id);
  const reasonsOf = (recs, id) => recs.find((r) => r.task.id === id).reasons.map((r) => r.text);

  test("completed tasks are never recommended and the list is capped", () => {
    const state = stateWith([task({ id: "done", completed: true, completedAt: completedAtLocal(2026, 10, 30) }), task({ id: "a" }), task({ id: "b" }), task({ id: "c" }), task({ id: "d" })]);
    const recs = Core.recommend(state, TODAY);
    assert.equal(recs.length, 3);
    assert.ok(!ids(recs).includes("done"));
  });

  test("overdue beats due today beats due tomorrow beats later", () => {
    const state = stateWith([
      task({ id: "later", date: "2026-11-20" }),
      task({ id: "tomorrow", date: "2026-10-31" }),
      task({ id: "today" }),
      task({ id: "overdue", date: "2026-10-28" })
    ]);
    assert.deepEqual(ids(Core.recommend(state, TODAY, 4)), ["overdue", "today", "tomorrow", "later"]);
  });

  test("a goal-linked task beats an unlinked one at equal priority and date", () => {
    const state = Core.emptyState();
    const goal = Core.addGoal(state, "Get a dev job");
    state.tasks = [task({ id: "plain" }), task({ id: "linked", goalId: goal.id })];
    const recs = Core.recommend(state, TODAY);
    assert.deepEqual(ids(recs), ["linked", "plain"]);
    assert.ok(reasonsOf(recs, "linked").includes('Moves "Get a dev job"'));
  });

  test("archived goals give no boost", () => {
    const state = Core.emptyState();
    const goal = Core.addGoal(state, "Old");
    Core.setGoalArchived(state, goal.id, true);
    state.tasks = [task({ id: "linked", goalId: goal.id, minutes: 40 }), task({ id: "plain", minutes: 30 })];
    assert.deepEqual(ids(Core.recommend(state, TODAY)), ["plain", "linked"]);
  });

  test("on a low-energy day, low-energy tasks rise above high-energy ones", () => {
    const state = stateWith([
      task({ id: "hard1", energy: "high", priority: 3 }),
      task({ id: "hard2", energy: "high", priority: 3 }),
      task({ id: "hard3", energy: "high", priority: 3 }),
      task({ id: "easy", energy: "low", priority: 2 })
    ]);
    Core.setCheckin(state, TODAY, { energy: "low" });
    const recs = Core.recommend(state, TODAY);
    assert.equal(recs[0].task.id, "easy");
    assert.ok(reasonsOf(recs, "easy").includes("Fits your energy"));
    assert.ok(reasonsOf(recs, "hard1").includes("Needs high energy"));
  });

  test("on a high-energy day, priority wins over energy", () => {
    const state = stateWith([task({ id: "easy", energy: "low", priority: 2 }), task({ id: "hard", energy: "high", priority: 3 })]);
    Core.setCheckin(state, TODAY, { energy: "high" });
    assert.equal(Core.recommend(state, TODAY)[0].task.id, "hard");
  });

  test("tasks longer than the time left are flagged and pushed down", () => {
    const state = stateWith([
      task({ id: "done", minutes: 60, completed: true, completedAt: completedAtLocal(2026, 10, 30, 9) }),
      task({ id: "long", minutes: 90, priority: 3 }),
      task({ id: "short", minutes: 30, priority: 2 })
    ]);
    Core.setCheckin(state, TODAY, { minutes: 120 });
    const recs = Core.recommend(state, TODAY);
    assert.deepEqual(ids(recs), ["short", "long"]);
    assert.ok(reasonsOf(recs, "long").includes("Takes 90 min, 60 min left"));
  });

  test("completions from earlier days do not use up today's time", () => {
    const state = stateWith([
      task({ id: "old", minutes: 300, completed: true, completedAt: completedAtLocal(2026, 10, 29, 9) }),
      task({ id: "next", minutes: 90 })
    ]);
    Core.setCheckin(state, TODAY, { minutes: 120 });
    assert.ok(!reasonsOf(Core.recommend(state, TODAY), "next").some((r) => r.includes("min left")));
  });

  test("when the money plan is over budget, costed tasks are flagged", () => {
    const state = stateWith([task({ id: "spend", cost: 2000, priority: 3 }), task({ id: "free", cost: 0, priority: 2 })]);
    state.money = { income: 10000, target: 9000, current: 0 };
    const recs = Core.recommend(state, TODAY);
    assert.deepEqual(ids(recs), ["free", "spend"]);
    assert.ok(reasonsOf(recs, "spend").includes(`Plan is KES ${(1000).toLocaleString("en-KE")} over budget`));
  });

  test("costs are not flagged when no income is set", () => {
    const state = stateWith([task({ id: "spend", cost: 2000 })]);
    assert.ok(Core.recommend(state, TODAY)[0].reasons.every((r) => !r.text.includes("budget")));
  });

  test("equal scores fall back to the smart queue order", () => {
    const state = stateWith([task({ id: "long", minutes: 60 }), task({ id: "short", minutes: 20 })]);
    assert.deepEqual(ids(Core.recommend(state, TODAY)), ["short", "long"]);
  });
});

describe("plan conflicts", () => {
  test("a plan that fits has no conflicts", () => {
    const state = stateWith([task({ minutes: 60, energy: "low" })]);
    assert.deepEqual(Core.planConflicts(state, TODAY), { capacity: null, energy: null, budget: null });
  });

  test("over capacity suggests deferring the lowest-ranked tasks until the day fits", () => {
    const state = stateWith([
      task({ id: "key", minutes: 60, priority: 3 }),
      task({ id: "mid", minutes: 60, priority: 2 }),
      task({ id: "low1", minutes: 30, priority: 1 }),
      task({ id: "low2", minutes: 45, priority: 1 })
    ]);
    Core.setCheckin(state, TODAY, { minutes: 120 });
    const { capacity } = Core.planConflicts(state, TODAY);
    assert.equal(capacity.plannedMinutes, 195);
    assert.equal(capacity.overBy, 75);
    assert.deepEqual(capacity.deferIds, ["low2", "low1"]);
    assert.equal(capacity.freedMinutes, 75);
  });

  test("overdue work counts toward today's load", () => {
    const state = stateWith([task({ date: "2026-10-28", minutes: 100 }), task({ minutes: 30 })]);
    Core.setCheckin(state, TODAY, { minutes: 90 });
    assert.equal(Core.planConflicts(state, TODAY).capacity.plannedMinutes, 130);
  });

  test("time already spent today shrinks what fits", () => {
    const state = stateWith([
      task({ minutes: 100, completed: true, completedAt: completedAtLocal(2026, 10, 30, 9) }),
      task({ id: "open", minutes: 60 })
    ]);
    Core.setCheckin(state, TODAY, { minutes: 120 });
    const { capacity } = Core.planConflicts(state, TODAY);
    assert.equal(capacity.minutesLeft, 20);
    assert.deepEqual(capacity.deferIds, ["open"]);
  });

  test("future tasks do not create a capacity conflict", () => {
    const state = stateWith([task({ date: "2026-10-31", minutes: 600 })]);
    assert.equal(Core.planConflicts(state, TODAY).capacity, null);
  });

  test("a low-energy day with demanding tasks counts lower-energy alternatives", () => {
    const state = stateWith([
      task({ id: "hard", energy: "high" }),
      task({ id: "mid", energy: "medium" }),
      task({ id: "easy", energy: "low" }),
      task({ id: "easy-tomorrow", energy: "low", date: "2026-10-31" }),
      task({ id: "easy-later", energy: "low", date: "2026-11-15" })
    ]);
    Core.setCheckin(state, TODAY, { energy: "low" });
    const { energy } = Core.planConflicts(state, TODAY);
    assert.deepEqual(energy.demandingIds.sort(), ["hard", "mid"]);
    assert.equal(energy.alternativeCount, 2);
  });

  test("no energy conflict until the user checks in for today", () => {
    const state = stateWith([task({ energy: "high" })]);
    assert.equal(Core.planConflicts(state, TODAY).energy, null);
    Core.setCheckin(state, "2026-10-29", { energy: "low" });
    assert.equal(Core.planConflicts(state, TODAY).energy, null);
    Core.setCheckin(state, TODAY, { energy: "medium" });
    assert.deepEqual(Core.planConflicts(state, TODAY).energy.demandingIds, [state.tasks[0].id]);
  });

  test("a high-energy day never has an energy conflict", () => {
    const state = stateWith([task({ energy: "high" })]);
    Core.setCheckin(state, TODAY, { energy: "high" });
    assert.equal(Core.planConflicts(state, TODAY).energy, null);
  });

  test("over budget lists costed tasks, lowest-ranked first", () => {
    const state = stateWith([
      task({ id: "important", cost: 1500, priority: 3 }),
      task({ id: "optional", cost: 800, priority: 1 }),
      task({ id: "free", cost: 0 })
    ]);
    state.money = { income: 5000, target: 4000, current: 0 };
    const { budget } = Core.planConflicts(state, TODAY);
    assert.equal(budget.overBy, 1300);
    assert.deepEqual(budget.costedIds, ["optional", "important"]);
  });

  test("the energy filter keeps only tasks that fit", () => {
    const state = stateWith([task({ id: "hard", energy: "high", priority: 3 }), task({ id: "easy", energy: "low" })]);
    Core.setCheckin(state, TODAY, { energy: "low" });
    assert.deepEqual(Core.recommend(state, TODAY, 3, { fitsEnergyOnly: true }).map((r) => r.task.id), ["easy"]);
  });
});

describe("deferring", () => {
  test("moves an open task to tomorrow, including overdue ones", () => {
    const state = stateWith([task({ id: "a" }), task({ id: "late", date: "2026-10-20" })]);
    Core.deferTask(state, "a", TODAY);
    Core.deferTask(state, "late", TODAY);
    assert.deepEqual(refresh(state).tasks.map((t) => t.date), ["2026-10-31", "2026-10-31"]);
  });

  test("ignores completed and unknown tasks", () => {
    const state = stateWith([task({ id: "done", completed: true, completedAt: completedAtLocal(2026, 10, 30) })]);
    assert.equal(Core.deferTask(state, "done", TODAY), null);
    assert.equal(Core.deferTask(state, "missing", TODAY), null);
    assert.equal(state.tasks[0].date, TODAY);
  });

  test("deferring the suggested tasks resolves the capacity conflict", () => {
    const state = stateWith([
      task({ id: "key", minutes: 90, priority: 3 }),
      task({ id: "a", minutes: 60, priority: 1 }),
      task({ id: "b", minutes: 60, priority: 1 })
    ]);
    Core.setCheckin(state, TODAY, { minutes: 120 });
    for (const id of Core.planConflicts(state, TODAY).capacity.deferIds) Core.deferTask(state, id, TODAY);
    assert.equal(Core.planConflicts(state, TODAY).capacity, null);
    assert.equal(state.tasks.find((t) => t.id === "key").date, TODAY);
  });
});
