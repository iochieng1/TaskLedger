const STORAGE_KEY = "taskledger-v1";

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
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d - offset).toISOString().slice(0, 10);
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
  $("#themeBtn").textContent = state.theme === "dark" ? "☀" : "◐";
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
  card.querySelector(".meta-cost").textContent = `₵ ${Number(task.cost || 0).toLocaleString("en-KE")}`;
  card.querySelector(".meta-due").textContent = task.date === todayISO() ? "Today" : formatDate(task.date);

  card.querySelector(".delete-task").addEventListener("click", () => deleteTask(task.id));
  container.appendChild(card);
}

function renderTasks() {
  const filter = $("#taskFilter").value;
  const today = todayISO();
  let tasks = state.tasks.filter(t => t.date === today || !t.completed);
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
  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  if (task.completed && task.category === "study") state.focusMinutes += Number(task.minutes || 0);
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
