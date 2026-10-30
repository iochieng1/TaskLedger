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
    const state = stateWith([original]);
    Core.updateTask(state, "a", { title: "Renamed", category: "finance", priority: 1, date: "2026-11-02", minutes: 15, cost: 200, energy: "low", note: "why" });
    const [saved] = refresh(state).tasks;
    assert.deepEqual(saved, { ...original, title: "Renamed", category: "finance", priority: 1, date: "2026-11-02", minutes: 15, cost: 200, energy: "low", note: "why" });
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
