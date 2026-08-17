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
