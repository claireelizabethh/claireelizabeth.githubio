const initialTasks = [
  { id: 1, title: "Finish the research draft", category: "Study", done: false },
  { id: 2, title: "Reply to the project email", category: "Work", done: false },
  { id: 3, title: "Read for 20 minutes", category: "Personal", done: false },
  { id: 4, title: "Plan this week’s priorities", category: "Personal", done: true },
];

const storedTasks = localStorage.getItem("taskit-tasks");
let tasks = storedTasks ? JSON.parse(storedTasks) : initialTasks;
let visibleFilter = "all";
let currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selectedDate = new Date();
let toastTimer;

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const monthFormatter = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

function saveTasks() {
  localStorage.setItem("taskit-tasks", JSON.stringify(tasks));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function setView(viewName) {
  $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${viewName}-view`));
  $$(".nav-link[data-view]").forEach((link) => link.classList.toggle("active", link.dataset.view === viewName));
  const label = viewName === "todo" ? "To-Do List" : viewName[0].toUpperCase() + viewName.slice(1);
  $("#page-label").textContent = label;
  document.title = `Taskit — ${label}`;
  window.location.hash = viewName;
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (viewName === "todo") renderTasks();
  if (viewName === "calendar") renderCalendar();
}

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createTaskRow(task) {
  const row = document.createElement("div");
  row.className = `task-row${task.done ? " done" : ""}`;
  row.dataset.taskId = String(task.id);

  const check = document.createElement("button");
  check.className = "task-checkbox";
  check.type = "button";
  check.dataset.action = "toggle";
  check.setAttribute("aria-label", `${task.done ? "Mark incomplete" : "Mark complete"}: ${task.title}`);
  check.setAttribute("aria-pressed", String(task.done));
  check.textContent = task.done ? "✓" : "";

  const text = document.createElement("span");
  text.className = "task-text";
  text.textContent = task.title;

  const category = document.createElement("span");
  category.className = `task-category ${task.category.toLowerCase()}`;
  category.textContent = task.category;

  const remove = document.createElement("button");
  remove.className = "task-delete";
  remove.type = "button";
  remove.dataset.action = "delete";
  remove.setAttribute("aria-label", `Delete ${task.title}`);
  remove.textContent = "×";

  row.append(check, text, category, remove);
  return row;
}

function renderTasks() {
  const completed = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - completed;
  const percentage = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const navCount = $("#nav-count");
  navCount.textContent = String(remaining);
  navCount.style.display = remaining ? "inline-block" : "none";
  $("#completed-stat").innerHTML = `${completed} <small>/ ${tasks.length}</small>`;
  $("#task-heading-count").textContent = String(remaining);
  $("#progress-count").textContent = `${percentage}%`;
  $("#progress-bar").style.width = `${percentage}%`;
  $("#dashboard-progress").textContent = tasks.length
    ? `${completed} of ${tasks.length} tasks complete`
    : "Add a task to get started";

  const dashboardTasks = $("#dashboard-task-list");
  dashboardTasks.replaceChildren(...tasks.slice(0, 4).map(createTaskRow));

  const searchTerm = $("#task-search").value.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) => {
    const matchesFilter = visibleFilter === "all"
      || (visibleFilter === "active" && !task.done)
      || (visibleFilter === "completed" && task.done);
    return matchesFilter && task.title.toLowerCase().includes(searchTerm);
  });
  const fullList = $("#full-task-list");
  fullList.replaceChildren(...filteredTasks.map(createTaskRow));
  $("#empty-tasks").hidden = filteredTasks.length > 0;
  $("#list-task-summary").textContent = `${remaining} task${remaining === 1 ? "" : "s"} left · ${completed} completed`;
}

function addTask(title, category = "Personal") {
  const cleanedTitle = title.trim();
  if (!cleanedTitle) return;
  tasks.unshift({ id: Date.now() + Math.random(), title: cleanedTitle, category, done: false });
  saveTasks();
  renderTasks();
  showToast("Task added to your list");
}

function renderMonthGrid(container, monthDate, fullSize = false) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPreviousMonth = new Date(year, month, 0).getDate();
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const fragment = document.createDocumentFragment();

  weekdays.forEach((day) => {
    const heading = document.createElement("span");
    heading.className = "calendar-day-label";
    heading.textContent = day;
    fragment.append(heading);
  });

  for (let index = 0; index < 42; index += 1) {
    let dayNumber;
    let cellMonth = month;
    let cellYear = year;
    let outside = false;

    if (index < firstDayOffset) {
      dayNumber = daysInPreviousMonth - firstDayOffset + index + 1;
      cellMonth -= 1;
      outside = true;
    } else if (index >= firstDayOffset + daysInMonth) {
      dayNumber = index - firstDayOffset - daysInMonth + 1;
      cellMonth += 1;
      outside = true;
    } else {
      dayNumber = index - firstDayOffset + 1;
    }

    const cellDate = new Date(cellYear, cellMonth, dayNumber);
    const isToday = cellDate.toDateString() === new Date().toDateString();
    const isSelected = cellDate.toDateString() === selectedDate.toDateString();
    const hasEvent = !outside && [8, 14, 22].includes(dayNumber);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `calendar-date${outside ? " outside" : ""}${isToday ? " today" : ""}${isSelected && !isToday ? " selected-day" : ""}${hasEvent ? " has-event" : ""}`;
    cell.dataset.date = toLocalDateKey(cellDate);
    cell.setAttribute("aria-label", new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(cellDate));
    if (isToday && fullSize) {
      const todayNumber = document.createElement("span");
      todayNumber.textContent = String(dayNumber);
      cell.append(todayNumber);
    } else {
      cell.textContent = String(dayNumber);
    }
    fragment.append(cell);
  }

  container.replaceChildren(fragment);
}

function renderCalendar() {
  const monthLabel = monthFormatter.format(currentMonth);
  $("#mini-month-label").textContent = monthLabel;
  $("#full-month-label").textContent = monthLabel;
  renderMonthGrid($("#mini-calendar"), currentMonth);
  renderMonthGrid($("#full-calendar"), currentMonth, true);
  $("#events-date-label").textContent = `SELECTED DAY · ${new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(selectedDate).toUpperCase()}`;
}

function selectSettings(settingName) {
  $$(".settings-tab").forEach((tab) => tab.classList.toggle("selected", tab.dataset.setting === settingName));
  $$(".settings-section").forEach((section) => section.classList.toggle("active", section.id === `${settingName}-settings`));
}

function initializeDates() {
  const today = new Date();
  $("#today-date").textContent = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(today).toUpperCase();
  $("#today-short").textContent = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(today);
  $("#todo-date-label").textContent = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(today);
}

$$(".nav-link[data-view]").forEach((link) => {
  link.addEventListener("click", () => setView(link.dataset.view));
});

$$("[data-open-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.openView));
});

$(".profile-chip").addEventListener("click", () => {
  setView("settings");
  selectSettings("profile");
});

$("#quick-add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#quick-task-input");
  addTask(input.value);
  input.value = "";
});

$("#add-task-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = $("#new-task-input");
  addTask(input.value, $("#new-task-category").value);
  input.value = "";
  input.focus();
});

document.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    const row = actionButton.closest("[data-task-id]");
    const taskId = Number(row.dataset.taskId);
    if (actionButton.dataset.action === "toggle") {
      const task = tasks.find((item) => item.id === taskId);
      task.done = !task.done;
      showToast(task.done ? "Nicely done!" : "Task moved back to in progress");
    } else {
      tasks = tasks.filter((item) => item.id !== taskId);
      showToast("Task removed");
    }
    saveTasks();
    renderTasks();
    return;
  }

  const monthButton = event.target.closest("[data-month-step]");
  if (monthButton) {
    currentMonth.setMonth(currentMonth.getMonth() + Number(monthButton.dataset.monthStep));
    renderCalendar();
    return;
  }

  const dateButton = event.target.closest(".calendar-date");
  if (dateButton) {
    selectedDate = new Date(`${dateButton.dataset.date}T12:00:00`);
    renderCalendar();
    return;
  }

  const filterButton = event.target.closest(".filter-tab");
  if (filterButton) {
    visibleFilter = filterButton.dataset.filter;
    $$(".filter-tab").forEach((tab) => {
      const selected = tab === filterButton;
      tab.classList.toggle("selected", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    renderTasks();
    return;
  }

  const settingsButton = event.target.closest(".settings-tab");
  if (settingsButton) selectSettings(settingsButton.dataset.setting);
});

$("#task-search").addEventListener("input", renderTasks);
$("#clear-completed").addEventListener("click", () => {
  const oldCount = tasks.length;
  tasks = tasks.filter((task) => !task.done);
  if (oldCount === tasks.length) {
    showToast("No completed tasks to clear");
    return;
  }
  saveTasks();
  renderTasks();
  showToast("Completed tasks cleared");
});

$("#calendar-today").addEventListener("click", () => {
  currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  selectedDate = new Date();
  renderCalendar();
});

$("#profile-form").addEventListener("submit", (event) => {
  event.preventDefault();
  showToast("Your profile has been saved");
});

$("#password-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const [currentPassword, newPassword, confirmPassword] = $$('input[type="password"]', event.currentTarget);
  if (newPassword.value !== confirmPassword.value) {
    confirmPassword.setCustomValidity("Your passwords do not match.");
    confirmPassword.reportValidity();
    confirmPassword.addEventListener("input", () => confirmPassword.setCustomValidity(""), { once: true });
    return;
  }
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
  showToast("Password updated");
});

const darkModeToggle = $("#dark-mode-toggle");
darkModeToggle.checked = localStorage.getItem("taskit-dark-mode") === "true";
document.body.classList.toggle("dark-mode", darkModeToggle.checked);
darkModeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark-mode", darkModeToggle.checked);
  localStorage.setItem("taskit-dark-mode", String(darkModeToggle.checked));
});

$("#accent-select").addEventListener("change", (event) => {
  const accent = event.target.value;
  const colors = {
    pink: ["#ed1684", "#c90c69"],
    lavender: ["#8a63d2", "#6941b0"],
    peach: ["#ed785d", "#cc5139"],
  };
  document.documentElement.style.setProperty("--pink", colors[accent][0]);
  document.documentElement.style.setProperty("--pink-dark", colors[accent][1]);
  localStorage.setItem("taskit-accent", accent);
});

const savedAccent = localStorage.getItem("taskit-accent");
if (savedAccent && ["pink", "lavender", "peach"].includes(savedAccent)) {
  $("#accent-select").value = savedAccent;
  $("#accent-select").dispatchEvent(new Event("change"));
}

$(".logout-link").addEventListener("click", () => showToast("You’re all set — see you soon!"));
$(".notification-button").addEventListener("click", () => showToast("You’re all caught up!"));
$("#calendar-today").setAttribute("aria-label", "Jump to today");

initializeDates();
renderCalendar();
renderTasks();

const requestedView = window.location.hash.slice(1);
if (["dashboard", "calendar", "todo", "settings"].includes(requestedView)) setView(requestedView);
