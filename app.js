const Core = window.TaskLedgerCore;

const STORAGE_KEY = "taskledger-v1";
const DAILY_CAPACITY_MINUTES = Core.DAILY_CAPACITY_MINUTES;
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

  const editBtn = card.querySelector(".edit-task");
  editBtn.setAttribute("aria-label", `Edit "${task.title}"`);
  editBtn.addEventListener("click", () => openDialog({ task }));

  const deleteBtn = card.querySelector(".delete-task");
  deleteBtn.setAttribute("aria-label", `Delete "${task.title}"`);
  deleteBtn.addEventListener("click", () => deleteTask(task.id));
  container.appendChild(card);
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

function openDialog({ task = null, category = null } = {}) {
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

  $("#taskDialog").showModal();
  setTimeout(() => $("#taskTitle").focus(), 0);
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
    note: $("#taskNote").value
  };
  if (editingId) Core.updateTask(state, editingId, input);
  else Core.addTask(state, input);
  save();
  $("#taskDialog").close();
  renderAll();
}

function renderDashboard() {
  const day = Core.daySummary(state.tasks, todayISO());
  const money = Core.financeSummary(state.money, state.tasks);

  $("#capacityHeadline").textContent = `${day.plannedMinutes} / ${DAILY_CAPACITY_MINUTES} min planned`;
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
  const { plannedMinutes } = Core.daySummary(allTasks, todayISO());
  const capacityRatio = Math.min(1, DAILY_CAPACITY_MINUTES / Math.max(plannedMinutes || DAILY_CAPACITY_MINUTES, DAILY_CAPACITY_MINUTES));
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
