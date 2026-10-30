const Core = window.TaskLedgerCore;

const STORAGE_KEY = "taskledger-v1";
const FOCUS_SESSION_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const state = Core.emptyState();

let storageLocked = false;
let unreadableRaw = null;

let editingId = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const categoryNames = {
  study: "Study", finance: "Money", fitness: "Fitness", work: "Work", personal: "Personal"
};

const todayISO = () => Core.localDayISO();

const formatKES = (value) => `KES ${Number(value || 0).toLocaleString("en-KE")}`;

const NEW_GOAL = "__new";

let nextUpFitsEnergyOnly = false;

function save() {
  if (storageLocked) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return;
  const result = Core.parseState(raw);
  if (result.ok) {
    Object.assign(state, result.state);
    return;
  }
  storageLocked = true;
  unreadableRaw = raw;
  $("#recoveryReason").textContent = result.reason;
  $("#recoveryBanner").classList.remove("hidden");
}

function replaceState(next) {
  if (storageLocked) {
    try {
      localStorage.setItem(`${STORAGE_KEY}-unreadable-${Date.now()}`, unreadableRaw);
    } catch {
    }
    storageLocked = false;
    unreadableRaw = null;
    $("#recoveryBanner").classList.add("hidden");
  }
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, next);
  save();
  renderAll();
}

function applyTheme() {
  document.body.classList.toggle("dark", state.theme === "dark");
  const themeBtn = $("#themeBtn");
  themeBtn.textContent = state.theme === "dark" ? "☀" : "◐";
  themeBtn.setAttribute("aria-label", state.theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
}

function formatDate(dateISO) {
  return new Date(`${dateISO}T00:00:00`).toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" });
}

function setGreeting() {
  const hour = new Date().getHours();
  $("#greeting").textContent = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  $("#dateText").textContent = new Date().toLocaleDateString("en-KE", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function priorityLabel(p) {
  return Number(p) === 3 ? "High" : Number(p) === 2 ? "Medium" : "Low";
}

function renderTaskCard(task, container) {
  const template = $("#taskTemplate");
  const card = template.content.cloneNode(true);
  const root = card.querySelector(".task-card");

  root.dataset.id = task.id;
  if (task.completed) root.classList.add("completed");

  const checkBtn = card.querySelector(".check-btn");
  checkBtn.textContent = task.completed ? "✓" : "○";
  checkBtn.setAttribute("aria-label", task.completed ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`);
  checkBtn.addEventListener("click", () => toggleTask(task.id));

  card.querySelector(".task-title").textContent = task.title;
  const tag = card.querySelector(".task-tag");
  tag.textContent = categoryNames[task.category];
  tag.classList.add(task.category);

  const dot = card.querySelector(".priority-dot");
  dot.classList.add(priorityLabel(task.priority).toLowerCase());

  const note = card.querySelector(".task-note");
  note.textContent = task.note || "";
  if (!task.note) note.remove();

  card.querySelector(".meta-time").textContent = `⏱ ${task.minutes}m`;
  card.querySelector(".meta-energy").textContent = `⚡ ${task.energy}`;
  card.querySelector(".meta-cost").textContent = task.cost ? formatKES(task.cost) : "No cost";
  const due = card.querySelector(".meta-due");
  const today = todayISO();
  due.textContent = task.date === today ? "Today" : task.date < today ? "Overdue" : formatDate(task.date);
  if (task.date < today && !task.completed) due.classList.add("overdue");

  const goal = card.querySelector(".meta-goal");
  const goalName = Core.goalTitle(state, task.goalId);
  if (goalName) goal.textContent = `🎯 ${goalName}`;
  else goal.remove();

  const editBtn = card.querySelector(".edit-task");
  editBtn.setAttribute("aria-label", `Edit "${task.title}"`);
  editBtn.addEventListener("click", () => openDialog({ task }));

  const deleteBtn = card.querySelector(".delete-task");
  deleteBtn.setAttribute("aria-label", `Delete "${task.title}"`);
  deleteBtn.addEventListener("click", () => deleteTask(task.id));
  container.appendChild(card);
  return root;
}

function renderTasks() {
  const filter = $("#taskFilter").value;
  const today = todayISO();
  let tasks = state.tasks.filter(t => t.date <= today);
  if (filter !== "all") tasks = tasks.filter(t => t.category === filter);
  tasks.sort(Core.smartSort);

  $("#taskList").innerHTML = "";
  tasks.forEach(t => renderTaskCard(t, $("#taskList")));
  $("#emptyState").classList.toggle("hidden", tasks.length > 0);

  const lists = [
    ["#moneyTaskList", "finance"],
    ["#studyTaskList", "study"],
    ["#fitnessTaskList", "fitness"]
  ];
  for (const [sel, cat] of lists) {
    const box = $(sel);
    box.innerHTML = "";
    state.tasks.filter(t => t.category === cat).sort(Core.smartSort).forEach(t => renderTaskCard(t, box));
  }
}

function renderNextUp() {
  const today = todayISO();
  const checkin = Core.checkinFor(state, today);
  $("#checkinEnergy").value = checkin.energy;
  if (document.activeElement !== $("#checkinMinutes")) $("#checkinMinutes").value = checkin.minutes;

  const minutesLeft = Math.max(0, checkin.minutes - Core.minutesDoneToday(state.tasks, today));
  $("#nextUpSummary").textContent = nextUpFitsEnergyOnly
    ? `${minutesLeft} min left today · showing only tasks that fit ${checkin.energy} energy.`
    : `${minutesLeft} min left today · ${checkin.energy} energy. Ranked by deadline, priority, goals, energy, time and budget.`;

  renderPlanAlerts(today);

  const list = $("#nextUpList");
  list.innerHTML = "";
  const recs = Core.recommend(state, today, 3, { fitsEnergyOnly: nextUpFitsEnergyOnly });
  $("#nextUpEmpty").classList.toggle("hidden", recs.length > 0);
  for (const { task, reasons } of recs) {
    const root = renderTaskCard(task, list);
    const chips = root.querySelector(".reason-chips");
    for (const reason of reasons) {
      const chip = document.createElement("span");
      chip.className = `reason-chip ${reason.tone}`;
      chip.textContent = reason.text;
      chips.appendChild(chip);
    }
  }
}

function makeButton(label, className, onClick, ariaLabel) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  if (ariaLabel) button.setAttribute("aria-label", ariaLabel);
  button.addEventListener("click", onClick);
  return button;
}

function planAlert(title, text) {
  const box = document.createElement("div");
  box.className = "plan-alert";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const body = document.createElement("p");
  body.textContent = text;
  box.append(heading, body);
  return box;
}

function alertTaskList(ids, describe, actionsFor) {
  const items = document.createElement("div");
  items.className = "plan-alert-items";
  for (const id of ids) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) continue;
    const row = document.createElement("div");
    row.className = "plan-alert-item";
    const label = document.createElement("span");
    label.textContent = describe(task);
    const actions = document.createElement("div");
    actions.className = "plan-alert-actions";
    actions.append(...actionsFor(task));
    row.append(label, actions);
    items.appendChild(row);
  }
  return items;
}

function renderPlanAlerts(today) {
  const box = $("#planAlerts");
  box.innerHTML = "";
  const conflicts = Core.planConflicts(state, today);
  const moveButton = (task) => makeButton("Move to tomorrow", "secondary-btn", () => deferTasks([task.id]), `Move "${task.title}" to tomorrow`);
  const rescheduleButton = (task) => makeButton("Reschedule", "secondary-btn", () => openDialog({ task, focus: "#taskDate" }), `Reschedule "${task.title}"`);

  if (conflicts.capacity) {
    const c = conflicts.capacity;
    const alert = planAlert(
      `Over capacity by ${c.overBy} min`,
      `Open work due today or overdue adds up to ${c.plannedMinutes} min, and you have ${c.minutesLeft} min left. Moving these lower-ranked tasks frees ${c.freedMinutes} min:`
    );
    alert.appendChild(alertTaskList(c.deferIds, (t) => `${t.title} · ${t.minutes} min`, (t) => [moveButton(t), rescheduleButton(t)]));
    if (c.deferIds.length > 1) {
      alert.appendChild(makeButton(`Move all ${c.deferIds.length} to tomorrow`, "primary-btn", () => deferTasks(c.deferIds)));
    }
    box.appendChild(alert);
  }

  if (conflicts.energy || nextUpFitsEnergyOnly) {
    const e = conflicts.energy;
    const alert = planAlert(
      e ? `${e.demandingIds.length === 1 ? "1 task needs" : `${e.demandingIds.length} tasks need`} more than ${e.energy} energy` : "Showing lower-energy tasks",
      e ? `${e.alternativeCount} task${e.alternativeCount === 1 ? " fits" : "s fit"} your energy and ${e.alternativeCount === 1 ? "is" : "are"} due by tomorrow.` : "Next up only shows tasks that fit your energy right now."
    );
    alert.appendChild(makeButton(
      nextUpFitsEnergyOnly ? "Show all tasks" : "Show lower-energy tasks",
      "secondary-btn",
      () => { nextUpFitsEnergyOnly = !nextUpFitsEnergyOnly; renderNextUp(); }
    ));
    box.appendChild(alert);
  }

  if (conflicts.budget) {
    const b = conflicts.budget;
    const alert = planAlert(
      `Plan is ${formatKES(b.overBy)} over budget`,
      "Open task costs plus your savings target are more than this month's income. Review these, starting with the lowest-ranked:"
    );
    alert.appendChild(alertTaskList(b.costedIds, (t) => `${t.title} · ${formatKES(t.cost)}`, (t) => [
      makeButton("Edit", "secondary-btn", () => openDialog({ task: t, focus: "#taskCost" }), `Edit cost of "${t.title}"`)
    ]));
    box.appendChild(alert);
  }
}

function deferTasks(ids) {
  const today = todayISO();
  ids.forEach((id) => Core.deferTask(state, id, today));
  save();
  renderAll();
}

function updateCheckin() {
  Core.setCheckin(state, todayISO(), {
    energy: $("#checkinEnergy").value,
    minutes: $("#checkinMinutes").value
  });
  save();
  renderAll();
}

function toggleTask(id) {
  if (!Core.toggleTask(state, id)) return;
  save();
  renderAll();
}

function deleteTask(id) {
  if (!Core.deleteTask(state, id)) return;
  save();
  renderAll();
}

function openDialog({ task = null, category = null, focus = "#taskTitle" } = {}) {
  editingId = task ? task.id : null;
  $("#taskForm").reset();
  $("#dialogEyebrow").textContent = task ? "Edit action" : "New action";
  $("#dialogTitle").textContent = task ? "Update this task" : "What needs to happen?";
  $("#dialogSubmit").textContent = task ? "Save changes" : "Add task";

  $("#taskTitle").value = task ? task.title : "";
  $("#taskCategory").value = task ? task.category : category || "study";
  $("#taskPriority").value = String(task ? task.priority : 2);
  $("#taskDate").value = task ? task.date : todayISO();
  $("#taskMinutes").value = task ? task.minutes : 30;
  $("#taskCost").value = task ? task.cost : 0;
  $("#taskEnergy").value = task ? task.energy : "medium";
  $("#taskNote").value = task ? task.note : "";
  renderGoalOptions(task ? task.goalId : null);

  $("#taskDialog").showModal();
  setTimeout(() => $(focus).focus(), 0);
}

function submitTask(event) {
  event.preventDefault();
  const input = {
    title: $("#taskTitle").value,
    category: $("#taskCategory").value,
    priority: $("#taskPriority").value,
    date: $("#taskDate").value,
    minutes: $("#taskMinutes").value,
    cost: $("#taskCost").value,
    energy: $("#taskEnergy").value,
    note: $("#taskNote").value,
    goalId: $("#taskGoal").value
  };
  if (editingId) Core.updateTask(state, editingId, input);
  else Core.addTask(state, input);
  save();
  $("#taskDialog").close();
  renderAll();
}

function renderGoalOptions(selectedId) {
  const select = $("#taskGoal");
  select.innerHTML = "";
  const add = (value, label) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  };
  add("", "No goal");
  for (const goal of state.goals) {
    if (!goal.archived || goal.id === selectedId) add(goal.id, goal.archived ? `${goal.title} (archived)` : goal.title);
  }
  add(NEW_GOAL, "+ New goal…");
  select.value = selectedId || "";
  select.dataset.previous = select.value;
}

function onGoalSelect() {
  const select = $("#taskGoal");
  if (select.value !== NEW_GOAL) {
    select.dataset.previous = select.value;
    return;
  }
  const goal = Core.addGoal(state, prompt("Name the goal this task moves forward:") || "");
  if (!goal) {
    select.value = select.dataset.previous || "";
    return;
  }
  save();
  renderGoals();
  renderGoalOptions(goal.id);
}

function renderGoals() {
  const list = $("#goalList");
  list.innerHTML = "";
  const summaries = Core.goalSummaries(state).sort((a, b) => Number(a.goal.archived) - Number(b.goal.archived));
  $("#goalEmpty").classList.toggle("hidden", summaries.length > 0);

  for (const { goal, open, done, doneMinutes } of summaries) {
    const row = document.createElement("div");
    row.className = "goal-row";
    if (goal.archived) row.classList.add("archived");

    const text = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = goal.archived ? `${goal.title} (archived)` : goal.title;
    const meta = document.createElement("small");
    meta.textContent = `${open} open · ${done} done · ${doneMinutes} min invested`;
    text.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "goal-row-actions";
    const rename = document.createElement("button");
    rename.className = "secondary-btn";
    rename.type = "button";
    rename.textContent = "Rename";
    rename.setAttribute("aria-label", `Rename goal "${goal.title}"`);
    rename.addEventListener("click", () => {
      const next = prompt("Rename goal:", goal.title);
      if (next !== null && Core.renameGoal(state, goal.id, next)) {
        save();
        renderAll();
      }
    });
    const archive = document.createElement("button");
    archive.className = "secondary-btn";
    archive.type = "button";
    archive.textContent = goal.archived ? "Restore" : "Archive";
    archive.setAttribute("aria-label", `${goal.archived ? "Restore" : "Archive"} goal "${goal.title}"`);
    archive.addEventListener("click", () => {
      Core.setGoalArchived(state, goal.id, !goal.archived);
      save();
      renderAll();
    });
    actions.append(rename, archive);

    row.append(text, actions);
    list.appendChild(row);
  }
}

function renderDashboard() {
  const capacity = Core.checkinFor(state, todayISO()).minutes;
  const day = Core.daySummary(state.tasks, todayISO(), capacity);
  const money = Core.financeSummary(state.money, state.tasks);

  $("#capacityHeadline").textContent = `${day.plannedMinutes} / ${capacity} min planned`;
  $("#capacityText").textContent = day.overCapacity
    ? "You are over capacity. Move or remove something."
    : day.heavy
      ? "Heavy day. Protect the highest-value work."
      : "You have room to take action.";

  $("#capacityPercent").textContent = `${day.capacityPercent}%`;
  $("#capacityRing").style.background = `conic-gradient(var(--accent) ${day.capacityPercent * 3.6}deg, var(--surface-2) 0deg)`;

  $("#savingHeadline").textContent = formatKES(state.money.current);
  $("#savingText").textContent = money.target
    ? `${formatKES(money.leftToTarget)} left to hit this month's target.`
    : "Set a monthly target to give your money a job.";
  $("#savingBar").style.width = `${money.savingPercent}%`;
  $("#savingPercent").textContent = `${money.savingPercent}% of target`;

  const streak = Core.calculateStreak(state.tasks, todayISO());
  $("#statCompleted").textContent = day.completedCount;
  $("#statFocus").textContent = Core.totalFocusMinutes(state);
  $("#statSpend").textContent = formatKES(day.plannedSpend);
  $("#statStreak").textContent = `${streak} day${streak === 1 ? "" : "s"}`;
}

function renderBalance() {
  const allTasks = state.tasks;
  const totalTasks = allTasks.length || 1;
  const completedRatio = allTasks.filter(t => t.completed).length / totalTasks;
  const capacity = Core.checkinFor(state, todayISO()).minutes;
  const { plannedMinutes } = Core.daySummary(allTasks, todayISO(), capacity);
  const capacityRatio = plannedMinutes <= capacity ? 1 : capacity / plannedMinutes;
  const focusRatio = Math.min(1, Core.totalFocusMinutes(state) / 180);
  const score = Math.min(100, Math.round((completedRatio * 55) + (capacityRatio * 25) + (focusRatio * 20)));

  const badge = score >= 75 ? "Balanced" : score >= 50 ? "Watchful" : "Overloaded";
  const text = score >= 75
    ? "Your plan is healthy. Maintain the routine and avoid adding low-value tasks."
    : score >= 50
      ? "You are moving, but a few tasks are crowding out your best work. Prioritize 3 wins."
      : "The plan is too full. Cut or defer low-impact work to protect focus and energy.";

  $("#lifeBalanceValue").textContent = score;
  $("#balanceBar").style.width = `${score}%`;
  $("#balanceBadge").textContent = badge;
  $("#balanceText").textContent = text;
}

function renderFinance() {
  $("#incomeInput").value = state.money.income || "";
  $("#savingsTargetInput").value = state.money.target || "";
  $("#currentSavingsInput").value = state.money.current || "";

  const money = Core.financeSummary(state.money, state.tasks);
  $("#financeAvailable").textContent = formatKES(money.available);
  $("#financeIncome").textContent = formatKES(money.income);
  $("#financePlanned").textContent = formatKES(money.planned);
  $("#financeTarget").textContent = formatKES(money.target);
}

function renderStudy() {
  const study = state.tasks.filter(t => t.category === "study" && !t.completed);
  const minutes = study.reduce((sum, t) => sum + Number(t.minutes || 0), 0);
  const done = state.tasks.filter(t => t.category === "study" && t.completed).length;
  const total = state.tasks.filter(t => t.category === "study").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("#studyMinutes").textContent = `${minutes} min`;
  $("#studyBar").style.width = `${pct}%`;
  $("#studyCompletion").textContent = `${pct}% completed`;
}

function renderFitness() {
  const all = state.tasks.filter(t => t.category === "fitness");
  const done = all.filter(t => t.completed);
  const mins = all.reduce((s, t) => s + Number(t.minutes || 0), 0);
  const energyMap = { low: 1, medium: 2, high: 3 };
  const avg = all.length ? Math.round(all.reduce((s, t) => s + (energyMap[t.energy] ?? 2), 0) / all.length) : 0;
  $("#fitnessMinutes").textContent = mins;
  $("#fitnessDone").textContent = done.length;
  $("#fitnessPlanned").textContent = all.length - done.length;
  $("#fitnessEnergy").textContent = avg === 3 ? "High" : avg === 2 ? "Medium" : avg === 1 ? "Low" : "—";
}

function renderInsights() {
  const all = state.tasks;
  const done = all.filter(t => t.completed);
  const completion = all.length ? done.length / all.length : 0;
  const highDone = all.length ? done.filter(t => Number(t.priority) === 3).length / Math.max(1, all.filter(t => Number(t.priority) === 3).length) : 0;
  const streak = Core.calculateStreak(all, todayISO());
  const score = Math.min(100, Math.round((completion * 65) + (Math.min(streak, 7) / 7 * 20) + (highDone * 15)));
  $("#executionScore").textContent = score;

  const cats = Core.CATEGORIES.map(cat => {
    const rows = all.filter(t => t.category === cat);
    const pct = rows.length ? rows.filter(t => t.completed).length / rows.length : 0;
    return { cat, pct, count: rows.length };
  }).filter(x => x.count).sort((a,b) => b.pct - a.pct);
  $("#bestCategory").textContent = cats.length ? categoryNames[cats[0].cat] : "—";

  const today = todayISO();
  const todayAll = all.filter(t => t.date === today);
  const todayMinutes = todayAll.reduce((s, t) => s + Number(t.minutes || 0), 0);
  const spend = all.filter(t => !t.completed).reduce((s, t) => s + Number(t.cost || 0), 0);
  let insight = "Add more tasks and complete a few to unlock stronger feedback.";
  const capacity = Core.checkinFor(state, today).minutes;
  if (todayMinutes > capacity) insight = `Today is over capacity by ${todayMinutes - capacity} minutes. Defer or delete tasks to fit your available time.`;
  else if (spend > (state.money.income || Infinity) * 0.2 && state.money.income) insight = `Planned task spending is ${formatKES(spend)}. Check whether all costs support your current priorities.`;
  else if (streak >= 3) insight = `${streak}-day execution streak. Protect the routine rather than chasing a perfect plan.`;
  else if (completion >= .7) insight = "Your completion rate is strong. The next upgrade is improving task quality and effort estimates.";
  $("#realityCheck").textContent = insight;
}

function renderAll() {
  renderTasks();
  renderNextUp();
  renderDashboard();
  renderBalance();
  renderFinance();
  renderStudy();
  renderFitness();
  renderInsights();
  renderGoals();
  applyTheme();
}

function switchView(view) {
  $$(".view").forEach(v => v.classList.remove("active-view"));
  $(`#${view}View`).classList.add("active-view");
  $$(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  const titles = { today: "Today", finance: "Money", study: "Study", fitness: "Fitness", insights: "Insights" };
  $("#pageTitle").textContent = titles[view];
}

let timerSeconds = FOCUS_SESSION_SECONDS;
let timerId = null;
function renderTimer() {
  const m = Math.floor(timerSeconds / 60).toString().padStart(2, "0");
  const s = (timerSeconds % 60).toString().padStart(2, "0");
  $("#timerDisplay").textContent = `${m}:${s}`;
}
function startTimer() {
  if (timerId) return;
  $("#timerLabel").textContent = "Focus mode running…";
  timerId = setInterval(() => {
    timerSeconds -= 1;
    renderTimer();
    if (timerSeconds <= 0) {
      clearInterval(timerId);
      timerId = null;
      state.timerFocusMinutes += FOCUS_SESSION_SECONDS / 60;
      save();
      $("#timerLabel").textContent = "Focus session complete. Nice work.";
      timerSeconds = BREAK_SECONDS;
      renderTimer();
      renderDashboard();
    }
  }, 1000);
}
function resetTimer() {
  clearInterval(timerId);
  timerId = null;
  timerSeconds = FOCUS_SESSION_SECONDS;
  $("#timerLabel").textContent = "Ready when you are.";
  renderTimer();
}

function download(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportData() {
  download(`taskledger-${todayISO()}.json`, JSON.stringify(state, null, 2), "application/json");
}

function downloadUnreadable() {
  download(`taskledger-unreadable-${todayISO()}.txt`, unreadableRaw, "text/plain");
}

function loadDemo() {
  const ok = confirm("Replace your current tasks and money plan with sample data? Export first if you want to keep them.");
  if (ok) replaceState(Core.demoState(todayISO()));
}

function clearData() {
  const ok = confirm("Delete all tasks and reset your money plan to zero? Export first if you want to keep them.");
  if (ok) replaceState(Core.emptyState());
}

function startFresh() {
  const ok = confirm("Start with an empty TaskLedger? The unreadable data stays in this browser as a backup copy, but TaskLedger won't use it.");
  if (ok) replaceState(Core.emptyState());
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  setGreeting();
  renderTimer();
  renderAll();

  $$(".nav-item").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  $("#openTaskBtn").addEventListener("click", () => openDialog());
  $("#emptyAddBtn").addEventListener("click", () => openDialog());
  $$(".primary-btn[data-prefill]").forEach(btn => btn.addEventListener("click", () => openDialog({ category: btn.dataset.prefill })));

  $("#themeBtn").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    save();
    applyTheme();
  });

  $("#taskFilter").addEventListener("change", renderTasks);
  $("#taskForm").addEventListener("submit", submitTask);
  $("#taskGoal").addEventListener("change", onGoalSelect);
  $("#checkinEnergy").addEventListener("change", updateCheckin);
  $("#checkinMinutes").addEventListener("change", updateCheckin);
  $("#goalForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (Core.addGoal(state, $("#goalTitleInput").value)) {
      $("#goalTitleInput").value = "";
      save();
      renderAll();
    }
  });
  $("#closeDialog").addEventListener("click", () => $("#taskDialog").close());
  $("#cancelDialog").addEventListener("click", () => $("#taskDialog").close());
  $("#taskDialog").addEventListener("close", () => { editingId = null; });

  $("#moneyForm").addEventListener("submit", (e) => {
    e.preventDefault();
    state.money.income = Number($("#incomeInput").value || 0);
    state.money.target = Number($("#savingsTargetInput").value || 0);
    state.money.current = Number($("#currentSavingsInput").value || 0);
    save();
    renderAll();
  });

  $("#timerStart").addEventListener("click", startTimer);
  $("#timerReset").addEventListener("click", resetTimer);
  $("#exportBtn").addEventListener("click", exportData);
  $("#demoBtn").addEventListener("click", loadDemo);
  $("#resetBtn").addEventListener("click", clearData);
  $("#downloadRawBtn").addEventListener("click", downloadUnreadable);
  $("#startFreshBtn").addEventListener("click", startFresh);
});
