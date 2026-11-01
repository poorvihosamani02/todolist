// ============================================
// toDoList — app logic
// ============================================

const STORAGE_KEY = "todolist.tasks.v1";

// --- DOM references ---------------------------------------------------
const form = document.getElementById("task-form");
const descInput = document.getElementById("task-desc");
const dateInput = document.getElementById("task-date");
const errorEl = document.getElementById("form-error");
const listEl = document.getElementById("task-list");
const emptyStateEl = document.getElementById("empty-state");
const toggleListBtn = document.getElementById("toggle-list-btn");
const taskSection = document.getElementById("task-section");

// --- State --------------------------------------------------------------
let tasks = loadTasks();

// --- Persistence ---------------------------------------------------------
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Could not read saved tasks:", err);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error("Could not save tasks:", err);
  }
}

// --- Helpers --------------------------------------------------------------
function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

// Whole-day difference between a task's due date and today.
// Negative = overdue, 0 = due today, positive = days remaining.
function daysUntil(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const [ty, tm, td] = todayISO().split("-").map(Number);
  const today = new Date(ty, tm - 1, td);
  return Math.round((due - today) / 86400000);
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function urgencyInfo(dateStr, completed) {
  if (completed) {
    return { className: "badge--done", label: "done" };
  }
  const diff = daysUntil(dateStr);
  if (diff < 0) return { className: "badge--overdue", label: "overdue" };
  if (diff <= 2) return { className: "badge--soon", label: "due soon" };
  return { className: "", label: "upcoming" };
}

// Nearest deadline first. Same-day tasks keep the order they were added in.
function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date < b.date ? -1 : 1;
    }
    return a.createdAt - b.createdAt;
  });
}

// --- Mutations --------------------------------------------------------------
function addTask(description, date) {
  tasks.push({
    id: createId(),
    description,
    date,
    completed: false,
    createdAt: Date.now(),
  });
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function toggleComplete(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.completed = !task.completed;
  saveTasks();
  render();
}

// --- Rendering --------------------------------------------------------------
function render() {
  const sorted = sortTasks(tasks);

  listEl.innerHTML = "";
  emptyStateEl.classList.toggle("hidden", sorted.length > 0);

  for (const task of sorted) {
    listEl.appendChild(buildTaskRow(task));
  }
}

function buildTaskRow(task) {
  const li = document.createElement("li");
  li.className = "task-item" + (task.completed ? " completed" : "");

  // Left: checkbox + description
  const left = document.createElement("div");
  left.className = "task-left";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute(
    "aria-label",
    `Mark "${task.description}" as ${task.completed ? "not done" : "done"}`
  );
  checkbox.addEventListener("change", () => toggleComplete(task.id));

  const desc = document.createElement("span");
  desc.className = "task-desc";
  desc.textContent = task.description;

  left.append(checkbox, desc);

  // Right: deadline badge + delete button
  const right = document.createElement("div");
  right.className = "task-right";

  const { className, label } = urgencyInfo(task.date, task.completed);
  const badge = document.createElement("span");
  badge.className = "badge" + (className ? ` ${className}` : "");
  badge.textContent = formatDate(task.date);
  badge.setAttribute("aria-label", `Deadline: ${formatDate(task.date)} (${label})`);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.innerHTML = "&times;";
  deleteBtn.setAttribute("aria-label", `Delete "${task.description}"`);
  deleteBtn.addEventListener("click", () => deleteTask(task.id));

  right.append(badge, deleteBtn);

  li.append(left, right);
  return li;
}

// --- Form handling --------------------------------------------------------------
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const description = descInput.value.trim();
  const date = dateInput.value;

  if (!description || !date) {
    errorEl.textContent = "Add a task and pick a deadline before adding it.";
    return;
  }

  errorEl.textContent = "";
  addTask(description, date);

  descInput.value = "";
  dateInput.value = "";
  descInput.focus();
});

// --- Show/Hide list toggle --------------------------------------------------------------
toggleListBtn.addEventListener("click", () => {
  const willShow = taskSection.hidden; // section is currently hidden -> this click reveals it
  taskSection.hidden = !willShow;
  toggleListBtn.textContent = willShow ? "Hide List" : "Show List";
  toggleListBtn.setAttribute("aria-expanded", String(willShow));
});

// --- Init --------------------------------------------------------------
render();