(function (root, factory) {
  const core = factory();
  if (typeof module === "object" && module.exports) module.exports = core;
  else root.TaskLedgerCore = core;
})(typeof self !== "undefined" ? self : this, function () {
  const DAILY_CAPACITY_MINUTES = 360;
  const CATEGORIES = ["study", "finance", "fitness", "work", "personal"];
  const ENERGY_LEVELS = ["low", "medium", "high"];
  const THEMES = ["light", "dark"];

  const pad = (n) => String(n).padStart(2, "0");

  function localDayISO(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function addDays(dayISO, days) {
    const [y, m, d] = dayISO.split("-").map(Number);
    return localDayISO(new Date(y, m - 1, d + days));
  }

  function uid() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function emptyState() {
    return {
      tasks: [],
      goals: [],
      money: { income: 0, target: 0, current: 0 },
      theme: "light",
      timerFocusMinutes: 0
    };
  }

  function demoState(today = localDayISO()) {
    const tomorrow = addDays(today, 1);
    const job = { id: uid(), title: "Land a junior developer role", archived: false };
    const fund = { id: uid(), title: "Build a KES 5,000 emergency fund", archived: false };
    const fit = { id: uid(), title: "Stay active every week", archived: false };
    return {
      ...emptyState(),
      goals: [job, fund, fit],
      tasks: [
        { id: uid(), title: "Finish JavaScript array exercises", category: "study", priority: 3, date: today, minutes: 60, cost: 0, energy: "high", note: "Complete the tests, then push to GitHub.", goalId: job.id, completed: false, completedAt: null },
        { id: uid(), title: "Save KES 500 toward monthly target", category: "finance", priority: 3, date: today, minutes: 10, cost: 0, energy: "low", note: "Transfer the planned amount before spending.", goalId: fund.id, completed: false, completedAt: null },
        { id: uid(), title: "30-minute home workout", category: "fitness", priority: 2, date: today, minutes: 30, cost: 0, energy: "medium", note: "Push-ups, squats, lunges and core.", goalId: fit.id, completed: false, completedAt: null },
        { id: uid(), title: "Buy lunch", category: "personal", priority: 1, date: tomorrow, minutes: 10, cost: 150, energy: "low", note: "Keep it within the daily food budget.", goalId: null, completed: false, completedAt: null }
      ],
      money: { income: 30000, target: 5000, current: 1200 }
    };
  }

  const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
  const isDay = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
  const toNumber = (v, fallback) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Number(v) : fallback);

  function normalizeTask(raw) {
    if (!isObject(raw) || typeof raw.title !== "string" || !raw.title.trim()) return null;
    const completed = Boolean(raw.completed);
    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
      title: raw.title.trim(),
      category: CATEGORIES.includes(raw.category) ? raw.category : "personal",
      priority: [1, 2, 3].includes(Number(raw.priority)) ? Number(raw.priority) : 2,
      date: isDay(raw.date) ? raw.date : localDayISO(),
      minutes: Math.max(0, toNumber(raw.minutes, 30)),
      cost: Math.max(0, toNumber(raw.cost, 0)),
      energy: ENERGY_LEVELS.includes(raw.energy) ? raw.energy : "medium",
      note: typeof raw.note === "string" ? raw.note : "",
      goalId: typeof raw.goalId === "string" && raw.goalId ? raw.goalId : null,
      completed,
      completedAt: completed && typeof raw.completedAt === "string" && !Number.isNaN(Date.parse(raw.completedAt))
        ? raw.completedAt
        : completed ? new Date().toISOString() : null
    };
  }

  function parseState(raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, reason: "The saved data is not valid JSON." };
    }
    if (!isObject(parsed)) return { ok: false, reason: "The saved data is not a TaskLedger object." };
    if (parsed.tasks !== undefined && !Array.isArray(parsed.tasks)) {
      return { ok: false, reason: "The saved task list is not a list." };
    }
    if (parsed.goals !== undefined && !Array.isArray(parsed.goals)) {
      return { ok: false, reason: "The saved goal list is not a list." };
    }

    const goals = [];
    for (const [i, rawGoal] of (parsed.goals || []).entries()) {
      if (!isObject(rawGoal) || typeof rawGoal.title !== "string" || !rawGoal.title.trim()) {
        return { ok: false, reason: `Saved goal #${i + 1} is missing a title or is malformed.` };
      }
      goals.push({
        id: typeof rawGoal.id === "string" && rawGoal.id ? rawGoal.id : uid(),
        title: rawGoal.title.trim(),
        archived: Boolean(rawGoal.archived)
      });
    }

    const tasks = [];
    for (const [i, rawTask] of (parsed.tasks || []).entries()) {
      const task = normalizeTask(rawTask);
      if (!task) return { ok: false, reason: `Saved task #${i + 1} is missing a title or is malformed.` };
      tasks.push(task);
    }

    const money = isObject(parsed.money) ? parsed.money : {};
    const state = {
      tasks,
      goals,
      money: {
        income: Math.max(0, toNumber(money.income, 0)),
        target: Math.max(0, toNumber(money.target, 0)),
        current: Math.max(0, toNumber(money.current, 0))
      },
      theme: THEMES.includes(parsed.theme) ? parsed.theme : "light",
      timerFocusMinutes: 0
    };

    if (parsed.timerFocusMinutes !== undefined) {
      state.timerFocusMinutes = Math.max(0, toNumber(parsed.timerFocusMinutes, 0));
    } else if (parsed.focusMinutes !== undefined) {
      state.timerFocusMinutes = Math.max(0, toNumber(parsed.focusMinutes, 0) - completedStudyMinutes(tasks));
    }

    return { ok: true, state };
  }

  function completedStudyMinutes(tasks) {
    return tasks
      .filter((t) => t.category === "study" && t.completed)
      .reduce((sum, t) => sum + Number(t.minutes || 0), 0);
  }

  function totalFocusMinutes(state) {
    return Number(state.timerFocusMinutes || 0) + completedStudyMinutes(state.tasks);
  }

  function taskFields(state, input) {
    return {
      title: String(input.title || "").trim(),
      category: CATEGORIES.includes(input.category) ? input.category : "personal",
      priority: [1, 2, 3].includes(Number(input.priority)) ? Number(input.priority) : 2,
      date: isDay(input.date) ? input.date : localDayISO(),
      minutes: Math.max(0, toNumber(input.minutes, 30)),
      cost: Math.max(0, toNumber(input.cost, 0)),
      energy: ENERGY_LEVELS.includes(input.energy) ? input.energy : "medium",
      note: String(input.note || "").trim(),
      goalId: state.goals.some((g) => g.id === input.goalId) ? input.goalId : null
    };
  }

  function addTask(state, input) {
    const task = { id: uid(), ...taskFields(state, input), completed: false, completedAt: null };
    state.tasks.push(task);
    return task;
  }

  function updateTask(state, id, input) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return null;
    Object.assign(task, taskFields(state, input));
    return task;
  }

  function toggleTask(state, id, now = new Date()) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return null;
    task.completed = !task.completed;
    task.completedAt = task.completed ? now.toISOString() : null;
    return task;
  }

  function deleteTask(state, id) {
    const before = state.tasks.length;
    state.tasks = state.tasks.filter((t) => t.id !== id);
    return state.tasks.length < before;
  }

  function addGoal(state, title) {
    const clean = String(title || "").trim();
    if (!clean) return null;
    const existing = state.goals.find((g) => !g.archived && g.title.toLowerCase() === clean.toLowerCase());
    if (existing) return existing;
    const goal = { id: uid(), title: clean, archived: false };
    state.goals.push(goal);
    return goal;
  }

  function renameGoal(state, id, title) {
    const goal = state.goals.find((g) => g.id === id);
    const clean = String(title || "").trim();
    if (!goal || !clean) return null;
    goal.title = clean;
    return goal;
  }

  function setGoalArchived(state, id, archived) {
    const goal = state.goals.find((g) => g.id === id);
    if (!goal) return null;
    goal.archived = Boolean(archived);
    return goal;
  }

  function activeGoals(state) {
    return state.goals.filter((g) => !g.archived);
  }

  function goalTitle(state, goalId) {
    const goal = state.goals.find((g) => g.id === goalId);
    return goal ? goal.title : null;
  }

  function goalSummaries(state) {
    return state.goals.map((goal) => {
      const linked = state.tasks.filter((t) => t.goalId === goal.id);
      const done = linked.filter((t) => t.completed);
      return {
        goal,
        open: linked.length - done.length,
        done: done.length,
        doneMinutes: done.reduce((sum, t) => sum + Number(t.minutes || 0), 0)
      };
    });
  }

  function smartSort(a, b) {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (Number(a.priority) !== Number(b.priority)) return Number(b.priority) - Number(a.priority);
    return Number(a.minutes) - Number(b.minutes);
  }

  function daySummary(tasks, today, capacity = DAILY_CAPACITY_MINUTES) {
    const todayTasks = tasks.filter((t) => t.date === today);
    const open = todayTasks.filter((t) => !t.completed);
    const plannedMinutes = open.reduce((sum, t) => sum + Number(t.minutes || 0), 0);
    return {
      completedCount: todayTasks.length - open.length,
      plannedMinutes,
      plannedSpend: open.reduce((sum, t) => sum + Number(t.cost || 0), 0),
      capacityPercent: Math.min(100, Math.round((plannedMinutes / capacity) * 100)),
      overCapacity: plannedMinutes > capacity,
      heavy: plannedMinutes > capacity - 60
    };
  }

  function financeSummary(money, tasks) {
    const income = Number(money.income || 0);
    const target = Number(money.target || 0);
    const current = Number(money.current || 0);
    const planned = tasks.filter((t) => !t.completed).reduce((sum, t) => sum + Number(t.cost || 0), 0);
    return {
      income,
      target,
      planned,
      available: income - planned - target,
      savingPercent: target ? Math.min(100, Math.round((current / target) * 100)) : 0,
      leftToTarget: Math.max(0, target - current)
    };
  }

  function calculateStreak(tasks, today = localDayISO()) {
    const days = new Set(
      tasks.filter((t) => t.completedAt).map((t) => localDayISO(new Date(t.completedAt)))
    );
    let cursor = days.has(today) ? today : addDays(today, -1);
    let streak = 0;
    while (days.has(cursor)) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  return {
    DAILY_CAPACITY_MINUTES,
    CATEGORIES,
    localDayISO,
    addDays,
    uid,
    emptyState,
    demoState,
    parseState,
    completedStudyMinutes,
    totalFocusMinutes,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    addGoal,
    renameGoal,
    setGoalArchived,
    activeGoals,
    goalTitle,
    goalSummaries,
    smartSort,
    daySummary,
    financeSummary,
    calculateStreak
  };
});
