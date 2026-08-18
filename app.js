const STORAGE_KEY = "taskledger-v1";
const DAILY_CAPACITY_MINUTES = 360; // six-hour default execution budget
const FOCUS_SESSION_SECONDS = 25 * 60; // Pomodoro focus block
const BREAK_SECONDS = 5 * 60; // short break after a focus session

const state = {
  tasks: [],
  money: { income: 0, target: 0, current: 0 },
  theme: "light",
  focusMinutes: 0
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const categoryNames = {
  study: "Study", finance: "Money", fitness: "Fitness", work: "Work", personal: "Personal"
};

const todayISO = () => {
  const d = new Date();
  const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const formatKES = (value) => `KES ${Number(value || 0).toLocaleString("en-KE")}`;

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    seedDemo();
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    Object.assign(state, parsed);
    state.tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    state.money = parsed.money || { income: 0, target: 0, current: 0 };
    state.theme = parsed.theme || "light";
  } catch {
    // Saved data exists but isn't valid JSON. Don't overwrite it with demo
    // data silently — tell the user first, since this discards their tasks.
    alert("Your saved TaskLedger data couldn't be read and will be reset to the demo state. If this keeps happening, use Export to back up your data first.");
    seedDemo();
  }
}

function seedDemo() {
  const t = todayISO();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().slice(0, 10);

  state.tasks = [
    { id: uid(), title: "Finish JavaScript array exercises", category: "study", priority: 3, date: t, minutes: 60, cost: 0, energy: "high", note: "Complete the tests, then push to GitHub.", completed: false, completedAt: null },
    { id: uid(), title: "Save KES 500 toward monthly target", category: "finance", priority: 3, date: t, minutes: 10, cost: 0, energy: "low", note: "Transfer the planned amount before spending.", completed: false, completedAt: null },
    { id: uid(), title: "30-minute home workout", category: "fitness", priority: 2, date: t, minutes: 30, cost: 0, energy: "medium", note: "Push-ups, squats, lunges and core.", completed: false, completedAt: null },
    { id: uid(), title: "Buy lunch", category: "personal", priority: 1, date: tomorrowISO, minutes: 10, cost: 150, energy: "low", note: "Keep it within the daily food budget.", completed: false, completedAt: null }
  ];
  state.money = { income: 30000, target: 5000, current: 1200 };
  state.theme = "light";
  save();
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

function smartSort(a, b) {
  if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (Number(a.priority) !== Number(b.priority)) return Number(b.priority) - Number(a.priority);
  return Number(a.minutes) - Number(b.minutes);
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

  const deleteBtn = card.querySelector(".delete-task");
  deleteBtn.setAttribute("aria-label", `Delete "${task.title}"`);
  deleteBtn.addEventListener("click", () => deleteTask(task.id));
  container.appendChild(card);
}

function renderTasks() {
  const filter = $("#taskFilter").value;
  const today = todayISO();
  // "Today" means due today or overdue — future-dated tasks belong to their
  // own day and shouldn't clutter today's queue.
  let tasks = state.tasks.filter(t => t.date <= today);
  if (filter !== "all") tasks = tasks.filter(t => t.category === filter);
  tasks.sort(smartSort);

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
    state.tasks.filter(t => t.category === cat).sort(smartSort).forEach(t => renderTaskCard(t, box));
  }
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  
  const wasCompleted = task.completed;
  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  
  if (task.category === "study") {
    const minuteChange = Number(task.minutes || 0);
    if (task.completed && !wasCompleted) {
      state.focusMinutes += minuteChange;
    } else if (!task.completed && wasCompleted) {
      state.focusMinutes -= minuteChange;
    }
  }
  
  save();
  renderAll();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  save();
  renderAll();
}

function openDialog(prefillCategory = null) {
  $("#taskForm").reset();
  $("#taskDate").value = todayISO();
  if (prefillCategory) $("#taskCategory").value = prefillCategory;
  $("#taskMinutes").value = 30;
  $("#taskCost").value = 0;
  $("#taskEnergy").value = "medium";
  $("#taskDialog").showModal();
  setTimeout(() => $("#taskTitle").focus(), 0);
}

function addTask(event) {
  event.preventDefault();
  const task = {
    id: uid(),
    title: $("#taskTitle").value.trim(),
    category: $("#taskCategory").value,
    priority: Number($("#taskPriority").value),
    date: $("#taskDate").value || todayISO(),
    minutes: Number($("#taskMinutes").value || 30),
    cost: Number($("#taskCost").value || 0),
    energy: $("#taskEnergy").value,
    note: $("#taskNote").value.trim(),
    completed: false,
    completedAt: null
  };
  state.tasks.push(task);
  save();
  $("#taskDialog").close();
  renderAll();
}

function renderDashboard() {
  const today = todayISO();
  const todayTasks = state.tasks.filter(t => t.date === today);
  const done = todayTasks.filter(t => t.completed);
  const plannedMinutes = todayTasks.filter(t => !t.completed).reduce((sum, t) => sum + Number(t.minutes || 0), 0);
  const plannedSpend = todayTasks.filter(t => !t.completed).reduce((sum, t) => sum + Number(t.cost || 0), 0);
  const capacity = Math.min(100, Math.round((plannedMinutes / DAILY_CAPACITY_MINUTES) * 100));

  $("#capacityHeadline").textContent = `${plannedMinutes} / ${DAILY_CAPACITY_MINUTES} min planned`;
  $("#capacityText").textContent = plannedMinutes > DAILY_CAPACITY_MINUTES
    ? "You are over capacity. Move or remove something."
    : plannedMinutes > DAILY_CAPACITY_MINUTES - 60
      ? "Heavy day. Protect the highest-value work."
      : "You have room to take action.";

  $("#capacityPercent").textContent = `${capacity}%`;
  $("#capacityRing").style.background = `conic-gradient(var(--accent) ${capacity * 3.6}deg, var(--surface-2) 0deg)`;

  const savingPct = state.money.target ? Math.min(100, Math.round((state.money.current / state.money.target) * 100)) : 0;
  $("#savingHeadline").textContent = formatKES(state.money.current);
  $("#savingText").textContent = state.money.target
    ? `${formatKES(Math.max(0, state.money.target - state.money.current))} left to hit this month's target.`
    : "Set a monthly target to give your money a job.";
  $("#savingBar").style.width = `${savingPct}%`;
  $("#savingPercent").textContent = `${savingPct}% of target`;

  $("#statCompleted").textContent = done.length;
  $("#statFocus").textContent = state.focusMinutes;
  $("#statSpend").textContent = formatKES(plannedSpend);
  $("#statStreak").textContent = `${calculateStreak()} day${calculateStreak() === 1 ? "" : "s"}`;
}

function renderBalance() {
  const allTasks = state.tasks;
  const totalTasks = allTasks.length || 1;
  const completedRatio = allTasks.filter(t => t.completed).length / totalTasks;
  const activeToday = allTasks.filter(t => t.date === todayISO() && !t.completed);
  const plannedMinutes = activeToday.reduce((sum, t) => sum + Number(t.minutes || 0), 0);
  const capacityRatio = Math.min(1, DAILY_CAPACITY_MINUTES / Math.max(plannedMinutes || DAILY_CAPACITY_MINUTES, DAILY_CAPACITY_MINUTES));
  const focusRatio = Math.min(1, (state.focusMinutes || 0) / 180);
  const spendRatio = state.money.income ? Math.min(1, (state.tasks.filter(t => !t.completed).reduce((sum, t) => sum + Number(t.cost || 0), 0) / (state.money.income * 0.2 || 1))) : 0.7;
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

  const planned = state.tasks.filter(t => !t.completed).reduce((sum, t) => sum + Number(t.cost || 0), 0);
  const available = Number(state.money.income || 0) - planned - Number(state.money.target || 0);
  $("#financeAvailable").textContent = formatKES(available);
  $("#financeIncome").textContent = formatKES(state.money.income);
  $("#financePlanned").textContent = formatKES(planned);
  $("#financeTarget").textContent = formatKES(state.money.target);
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

function calculateStreak() {
  const days = new Set(state.tasks
    .filter(t => t.completedAt)
    .map(t => t.completedAt.slice(0, 10))
  );
  
  if (days.size === 0) return 0;
  
  let cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  
  return streak;
}

function renderInsights() {
  const all = state.tasks;
  const done = all.filter(t => t.completed);
  const completion = all.length ? done.length / all.length : 0;
  const highDone = all.length ? done.filter(t => Number(t.priority) === 3).length / Math.max(1, all.filter(t => Number(t.priority) === 3).length) : 0;
  const streak = calculateStreak();
  const score = Math.min(100, Math.round((completion * 65) + (Math.min(streak, 7) / 7 * 20) + (highDone * 15)));
  $("#executionScore").textContent = score;

  const cats = ["study","finance","fitness","work","personal"].map(cat => {
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
  if (todayMinutes > DAILY_CAPACITY_MINUTES) insight = `Today is overloaded by ${todayMinutes - DAILY_CAPACITY_MINUTES} minutes. Defer or delete tasks to fit your capacity.`;
  else if (spend > (state.money.income || Infinity) * 0.2 && state.money.income) insight = `Planned task spending is ${formatKES(spend)}. Check whether all costs support your current priorities.`;
  else if (streak >= 3) insight = `${streak}-day execution streak. Protect the routine rather than chasing a perfect plan.`;
  else if (completion >= .7) insight = "Your completion rate is strong. The next upgrade is improving task quality and effort estimates.";
  $("#realityCheck").textContent = insight;
}

function renderAll() {
  renderTasks();
  renderDashboard();
  renderBalance();
  renderFinance();
  renderStudy();
  renderFitness();
  renderInsights();
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
      state.focusMinutes += FOCUS_SESSION_SECONDS / 60;
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

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `taskledger-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function resetData() {
  const ok = confirm("Reset TaskLedger to its demo state?");
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  seedDemo();
  renderAll();
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  setGreeting();
  renderTimer();
  renderAll();

  $$(".nav-item").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  $("#openTaskBtn").addEventListener("click", () => openDialog());
  $("#emptyAddBtn").addEventListener("click", () => openDialog());
  $$(".primary-btn[data-prefill]").forEach(btn => btn.addEventListener("click", () => openDialog(btn.dataset.prefill)));

  $("#themeBtn").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    save();
    applyTheme();
  });

  $("#taskFilter").addEventListener("change", renderTasks);
  $("#taskForm").addEventListener("submit", addTask);
  $("#closeDialog").addEventListener("click", () => $("#taskDialog").close());
  $("#cancelDialog").addEventListener("click", () => $("#taskDialog").close());

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
  $("#resetBtn").addEventListener("click", resetData);
});
