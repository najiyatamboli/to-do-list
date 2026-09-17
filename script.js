/* =========================================================
   TASKFLOW - MAIN JAVASCRIPT
========================================================= */

const STORAGE_KEY = "taskflow_tasks";
const TRASH_KEY = "taskflow_trash";
const CALENDAR_KEY = "taskflow_calendar";
const SETTINGS_KEY = "taskflow_settings";
const CATEGORIES_KEY = "taskflow_categories";

const defaultCategories = [
    { name: "Personal", color: "#8b5cf6" },
    { name: "Study", color: "#3b82f6" },
    { name: "Work", color: "#10b981" },
    { name: "Other", color: "#64748b" }
];

let tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
tasks = tasks.map(task => ({
    ...task,
    description: task.description || "",
    dueDate: task.dueDate || "",
    reminder: task.reminder || "",
    priority: task.priority || "medium",
    category: task.category || "Other",
    notes: task.notes || "",
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
    completed: Boolean(task.completed)
}));
let trash = JSON.parse(localStorage.getItem(TRASH_KEY)) || [];
let calendarStatuses = JSON.parse(localStorage.getItem(CALENDAR_KEY)) || {};

let categories =
    JSON.parse(localStorage.getItem(CATEGORIES_KEY)) ||
    defaultCategories;

let currentFilterStatus = "all";
let currentCalendarDate = new Date();
let selectedCalendarDate = null;
let confirmCallback = null;


/* =========================================================
   SAVE DATA
========================================================= */

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function saveTrash() {
    localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
}

function saveCalendar() {
    localStorage.setItem(CALENDAR_KEY, JSON.stringify(calendarStatuses));
}

function saveCategories() {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}


/* =========================================================
   UTILITIES
========================================================= */

function generateId() {
    return Date.now().toString() + Math.random().toString(16).slice(2);
}

function todayString() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(dateString) {

    if (!dateString) return "No due date";

    const date = new Date(dateString + "T00:00:00");

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function isOverdue(task) {

    if (!task.dueDate || task.completed) {
        return false;
    }

    return task.dueDate < todayString();
}

function showToast(message, type = "success") {

    const container = document.getElementById("toastContainer");

    if (!container) return;

    const toast = document.createElement("div");

    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}


/* =========================================================
   THEME
========================================================= */

function initializeTheme() {

    const savedTheme = localStorage.getItem("taskflow_theme");

    if (savedTheme) {

        document.documentElement.setAttribute(
            "data-theme",
            savedTheme
        );

    } else {

        const dark =
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (dark) {
            document.documentElement.setAttribute(
                "data-theme",
                "dark"
            );
        }
    }

    updateThemeButton();
}

function updateThemeButton() {

    const button = document.getElementById("themeToggle");

    if (!button) return;

    const dark =
        document.documentElement.getAttribute("data-theme") === "dark";

    button.textContent = dark ? "☀️" : "🌙";
}

function toggleTheme() {

    const current =
        document.documentElement.getAttribute("data-theme");

    const newTheme = current === "dark" ? "light" : "dark";

    document.documentElement.setAttribute(
        "data-theme",
        newTheme
    );

    localStorage.setItem(
        "taskflow_theme",
        newTheme
    );

    updateThemeButton();
}


/* =========================================================
   TASK PAGE
========================================================= */

function initializeTasksPage() {

    const taskList = document.getElementById("taskList");

    if (!taskList) return;

    populateCategoryFilters();

    renderTasks();

    document
        .getElementById("searchInput")
        ?.addEventListener("input", renderTasks);

    document
        .getElementById("priorityFilter")
        ?.addEventListener("change", renderTasks);

    document
        .getElementById("categoryFilter")
        ?.addEventListener("change", renderTasks);

    document
        .getElementById("dateFilter")
        ?.addEventListener("change", renderTasks);

    document
        .getElementById("sortFilter")
        ?.addEventListener("change", renderTasks);

    document.querySelectorAll(".filter-tab").forEach(button => {

        button.addEventListener("click", () => {

            document
                .querySelectorAll(".filter-tab")
                .forEach(btn => btn.classList.remove("active"));

            button.classList.add("active");

            currentFilterStatus =
                button.dataset.status;

            renderTasks();
        });
    });

    document
        .getElementById("openTaskForm")
        ?.addEventListener("click", () => openTaskModal());

    document
        .getElementById("closeTaskModal")
        ?.addEventListener("click", closeTaskModal);

    document
        .getElementById("taskForm")
        ?.addEventListener("submit", saveTaskFromForm);

    document
        .getElementById("addSubtaskBtn")
        ?.addEventListener("click", addSubtask);

    document
        .getElementById("newSubtask")
        ?.addEventListener("keydown", event => {

            if (event.key === "Enter") {
                event.preventDefault();
                addSubtask();
            }

        });
}

function populateCategoryFilters() {

    const categoryFilter =
        document.getElementById("categoryFilter");

    const taskCategory =
        document.getElementById("taskCategory");

    if (categoryFilter) {

        categoryFilter.innerHTML =
            `<option value="all">All Categories</option>`;

        categories.forEach(category => {

            categoryFilter.innerHTML += `
                <option value="${escapeHTML(category.name)}">
                    ${escapeHTML(category.name)}
                </option>
            `;

        });
    }

    if (taskCategory) {

        taskCategory.innerHTML = "";

        categories.forEach(category => {

            taskCategory.innerHTML += `
                <option value="${escapeHTML(category.name)}">
                    ${escapeHTML(category.name)}
                </option>
            `;

        });
    }
}

function renderTasks() {

    const container =
        document.getElementById("taskList");

    if (!container) return;

    let filtered = [...tasks];

    const search =
        document.getElementById("searchInput")?.value
        .toLowerCase()
        .trim() || "";

    const priority =
        document.getElementById("priorityFilter")?.value || "all";

    const category =
        document.getElementById("categoryFilter")?.value || "all";

    const dateFilter =
        document.getElementById("dateFilter")?.value || "all";

    const sort =
        document.getElementById("sortFilter")?.value || "custom";


    /* Search */

    if (search) {

        filtered = filtered.filter(task =>
            task.title.toLowerCase().includes(search) ||
            task.description.toLowerCase().includes(search)
        );

    }


    /* Status */

    if (currentFilterStatus === "active") {

        filtered = filtered.filter(task => !task.completed);

    }

    if (currentFilterStatus === "completed") {

        filtered = filtered.filter(task => task.completed);

    }


    /* Priority */

    if (priority !== "all") {

        filtered =
            filtered.filter(task =>
                task.priority === priority
            );

    }


    /* Category */

    if (category !== "all") {

        filtered =
            filtered.filter(task =>
                task.category === category
            );

    }


    /* Date */

    if (dateFilter === "today") {

        filtered =
            filtered.filter(task =>
                task.dueDate === todayString()
            );

    }

    if (dateFilter === "upcoming") {

        filtered =
            filtered.filter(task =>
                task.dueDate &&
                task.dueDate >= todayString()
            );

    }

    if (dateFilter === "overdue") {

        filtered =
            filtered.filter(task =>
                isOverdue(task)
            );

    }


    /* Sorting */

    if (sort === "newest") {

        filtered.sort((a, b) =>
            b.createdAt - a.createdAt
        );

    }

    if (sort === "oldest") {

        filtered.sort((a, b) =>
            a.createdAt - b.createdAt
        );

    }

    if (sort === "due") {

        filtered.sort((a, b) =>
            (a.dueDate || "9999").localeCompare(
                b.dueDate || "9999"
            )
        );

    }

    if (sort === "priority") {

        const values = {
            high: 1,
            medium: 2,
            low: 3
        };

        filtered.sort(
            (a, b) =>
                values[a.priority] -
                values[b.priority]
        );

    }


    if (!filtered.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No tasks found</h3>
                <p>Try changing your filters or create a new task.</p>
            </div>
        `;

        return;
    }


    container.innerHTML = filtered
        .map(task => createTaskCard(task))
        .join("");

    addTaskEvents();
}

function createTaskCard(task) {

    const completedSubtasks =
        task.subtasks.filter(sub => sub.completed).length;

    const totalSubtasks =
        task.subtasks.length;

    const subtaskPercent =
        totalSubtasks
            ? Math.round(
                completedSubtasks /
                totalSubtasks *
                100
            )
            : 0;

    return `
        <article
            class="task-card ${task.completed ? "completed" : ""}"
            draggable="true"
            data-id="${task.id}"
        >

            <div>
                <input
                    type="checkbox"
                    class="complete-checkbox"
                    data-action="complete"
                    ${task.completed ? "checked" : ""}
                >
            </div>

            <div>

                <h3 class="task-title">
                    ${escapeHTML(task.title)}
                </h3>

                ${
                    task.description
                    ? `
                        <p class="task-description">
                            ${escapeHTML(task.description)}
                        </p>
                    `
                    : ""
                }

                <div class="task-meta">

                    <span class="badge priority-${task.priority}">
                        ${capitalize(task.priority)}
                    </span>

                    <span class="badge category-badge">
                        ${escapeHTML(task.category)}
                    </span>

                    ${
                        task.dueDate
                        ? `
                            <span class="badge category-badge">
                                📅 ${formatDate(task.dueDate)}
                            </span>
                        `
                        : ""
                    }

                    ${
                        isOverdue(task)
                        ? `
                            <span class="overdue">
                                ⚠ Overdue
                            </span>
                        `
                        : ""
                    }

                </div>

                ${
                    totalSubtasks
                    ? `
                        <div class="subtask-mini">

                            <div class="mini-task-meta">
                                ${completedSubtasks}/${totalSubtasks}
                                subtasks completed
                            </div>

                            <div class="subtask-mini-bar">
                                <div style="width:${subtaskPercent}%"></div>
                            </div>

                        </div>
                    `
                    : ""
                }

            </div>

            <div class="task-actions">

                <button
                    class="icon-btn"
                    data-action="edit"
                    title="Edit"
                >
                    ✏️
                </button>

                <button
                    class="icon-btn"
                    data-action="delete"
                    title="Move to Trash"
                >
                    🗑️
                </button>

            </div>

        </article>
    `;
}

function addTaskEvents() {

    document
        .querySelectorAll(".task-card")
        .forEach(card => {

            const id = card.dataset.id;

            card.querySelectorAll("[data-action]")
                .forEach(button => {

                    button.addEventListener("click", event => {

                        event.stopPropagation();

                        const action =
                            button.dataset.action;

                        if (action === "complete") {
                            toggleTask(id);
                        }

                        if (action === "edit") {
                            openTaskModal(id);
                        }

                        if (action === "delete") {
                            moveToTrash(id);
                        }

                    });

                });


            /* Drag and drop */

            card.addEventListener("dragstart", () => {
                card.classList.add("dragging");
            });

            card.addEventListener("dragend", () => {

                card.classList.remove("dragging");

                saveNewTaskOrder();
            });

            card.addEventListener("dragover", event => {

                event.preventDefault();

                const dragging =
                    document.querySelector(".dragging");

                if (
                    dragging &&
                    dragging !== card
                ) {

                    const rect =
                        card.getBoundingClientRect();

                    const after =
                        event.clientY >
                        rect.top +
                        rect.height / 2;

                    if (after) {
                        card.after(dragging);
                    } else {
                        card.before(dragging);
                    }

                }

            });

        });
}

function saveNewTaskOrder() {

    const cards =
        document.querySelectorAll(".task-card");

    const order =
        [...cards].map(card =>
            card.dataset.id
        );

    const reordered = [];

    order.forEach(id => {

        const task =
            tasks.find(task => task.id === id);

        if (task) {
            reordered.push(task);
        }

    });

    tasks.forEach(task => {

        if (!order.includes(task.id)) {
            reordered.push(task);
        }

    });

    tasks = reordered;

    saveTasks();
}


/* =========================================================
   ADD / EDIT TASK
========================================================= */

let editingSubtasks = [];

function openTaskModal(id = null) {

    const modal =
        document.getElementById("taskModal");

    if (!modal) return;

    const form =
        document.getElementById("taskForm");

    form.reset();

    document.getElementById("editingTaskId").value =
        id || "";

    if (id) {

        const task =
            tasks.find(task => task.id === id);

        if (!task) return;

        document.getElementById("formTitle")
            .textContent = "Edit Task";

        document.getElementById("taskTitle")
            .value = task.title;

        document.getElementById("taskDescription")
            .value = task.description;

        document.getElementById("taskDueDate")
            .value = task.dueDate;

        document.getElementById("taskReminder")
            .value = task.reminder || "";

        document.getElementById("taskPriority")
            .value = task.priority;

        document.getElementById("taskCategory")
            .value = task.category;

        document.getElementById("taskNotes")
            .value = task.notes;

        editingSubtasks =
            JSON.parse(
                JSON.stringify(task.subtasks)
            );

    } else {

        document.getElementById("formTitle")
            .textContent = "Create New Task";

        const params = new URLSearchParams(window.location.search);
        const selectedDate = params.get("date");

        if (selectedDate) {
            document.getElementById("taskDueDate").value = selectedDate;
        }

        editingSubtasks = [];

    }

    renderSubtasks();

    modal.classList.remove("hidden");
}

function closeTaskModal() {

    document
        .getElementById("taskModal")
        ?.classList.add("hidden");

}

function saveTaskFromForm(event) {

    event.preventDefault();

    const id =
        document.getElementById("editingTaskId").value;

    const title =
        document.getElementById("taskTitle").value.trim();

    if (!title) return;

    const taskData = {

        title,

        description:
            document.getElementById("taskDescription").value.trim(),

        dueDate:
            document.getElementById("taskDueDate").value,

        reminder:
            document.getElementById("taskReminder").value,

        priority:
            document.getElementById("taskPriority").value,

        category:
            document.getElementById("taskCategory").value,

        notes:
            document.getElementById("taskNotes").value.trim(),

        subtasks:
            editingSubtasks

    };


    if (id) {

        const index =
            tasks.findIndex(task =>
                task.id === id
            );

        if (index !== -1) {

            const oldTask = tasks[index];

            const allSubtasksDone =
                editingSubtasks.length > 0 &&
                editingSubtasks.every(
                    sub => sub.completed
                );

            tasks[index] = {
                ...oldTask,
                ...taskData,
                completed:
                    allSubtasksDone
                        ? true
                        : oldTask.completed,
                updatedAt: Date.now()
            };

        }

        showToast("Task updated successfully");

    } else {

        const allSubtasksDone =
            editingSubtasks.length > 0 &&
            editingSubtasks.every(
                sub => sub.completed
            );

        const newTask = {

            id: generateId(),

            ...taskData,

            completed: allSubtasksDone,

            createdAt: Date.now(),

            completedAt:
                allSubtasksDone
                    ? Date.now()
                    : null

        };

        tasks.push(newTask);

        showToast("Task added successfully");

    }

    saveTasks();

    closeTaskModal();

    renderTasks();

    scheduleReminder(taskData);
}

function toggleTask(id) {

    const task =
        tasks.find(task => task.id === id);

    if (!task) return;

    task.completed =
        !task.completed;

    task.completedAt =
        task.completed
            ? Date.now()
            : null;

    saveTasks();

    renderTasks();

    showToast(
        task.completed
            ? "Task completed ✓"
            : "Task marked as active"
    );
}


/* =========================================================
   SUBTASKS
========================================================= */

function addSubtask() {

    const input =
        document.getElementById("newSubtask");

    const value =
        input.value.trim();

    if (!value) return;

    editingSubtasks.push({

        id: generateId(),

        title: value,

        completed: false

    });

    input.value = "";

    renderSubtasks();
}

function renderSubtasks() {

    const container =
        document.getElementById("subtaskList");

    if (!container) return;

    container.innerHTML =
        editingSubtasks
            .map((sub, index) => `

                <div class="
                    subtask-item
                    ${sub.completed ? "completed" : ""}
                ">

                    <input
                        type="checkbox"
                        ${sub.completed ? "checked" : ""}
                        onchange="toggleSubtask(${index})"
                    >

                    <span>
                        ${escapeHTML(sub.title)}
                    </span>

                    <button
                        type="button"
                        class="subtask-delete"
                        onclick="deleteSubtask(${index})"
                    >
                        ×
                    </button>

                </div>

            `)
            .join("");

    updateSubtaskProgress();
}

function toggleSubtask(index) {

    editingSubtasks[index].completed =
        !editingSubtasks[index].completed;

    renderSubtasks();
}

function deleteSubtask(index) {

    editingSubtasks.splice(index, 1);

    renderSubtasks();
}

function updateSubtaskProgress() {

    const total =
        editingSubtasks.length;

    const completed =
        editingSubtasks.filter(
            sub => sub.completed
        ).length;

    const percentage =
        total
            ? Math.round(
                completed / total * 100
            )
            : 0;

    const text =
        document.getElementById("subtaskProgress");

    const bar =
        document.getElementById("subtaskProgressBar");

    if (text) {
        text.textContent =
            `${percentage}%`;
    }

    if (bar) {
        bar.style.width =
            `${percentage}%`;
    }
}


/* =========================================================
   TRASH
========================================================= */

function moveToTrash(id) {

    const index =
        tasks.findIndex(task =>
            task.id === id
        );

    if (index === -1) return;

    const task =
        tasks[index];

    tasks.splice(index, 1);

    task.deletedAt =
        Date.now();

    trash.push(task);

    saveTasks();
    saveTrash();

    showToast(
        "Task moved to Trash"
    );

    renderTasks();
}

function initializeTrashPage() {

    const container =
        document.getElementById("trashList");

    if (!container) return;

    renderTrash();

    document
        .getElementById("emptyTrashBtn")
        ?.addEventListener("click", () => {

            if (!trash.length) {

                showToast(
                    "Trash is already empty"
                );

                return;
            }

            openConfirmation(
                "Empty Trash?",
                "All deleted tasks will be permanently removed.",
                () => {

                    trash = [];

                    saveTrash();

                    renderTrash();

                    showToast(
                        "Trash emptied"
                    );

                }
            );

        });
}

function renderTrash() {

    const container =
        document.getElementById("trashList");

    if (!container) return;

    if (!trash.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>Trash is empty</h3>
                <p>Deleted tasks will appear here.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        trash.map(task => `

            <article class="task-card">

                <div>🗑️</div>

                <div>

                    <h3 class="task-title">
                        ${escapeHTML(task.title)}
                    </h3>

                    <p class="task-description">
                        Deleted:
                        ${new Date(task.deletedAt)
                            .toLocaleDateString("en-IN")}
                    </p>

                </div>

                <div class="task-actions">

                    <button
                        class="icon-btn"
                        onclick="restoreTask('${task.id}')"
                        title="Restore"
                    >
                        ↩️
                    </button>

                    <button
                        class="icon-btn"
                        onclick="permanentlyDelete('${task.id}')"
                        title="Delete permanently"
                    >
                        ❌
                    </button>

                </div>

            </article>

        `).join("");
}

function restoreTask(id) {

    const index =
        trash.findIndex(task =>
            task.id === id
        );

    if (index === -1) return;

    const task =
        trash[index];

    trash.splice(index, 1);

    delete task.deletedAt;

    tasks.push(task);

    saveTasks();
    saveTrash();

    renderTrash();

    showToast(
        "Task restored successfully"
    );
}

function permanentlyDelete(id) {

    openConfirmation(
        "Permanently Delete?",
        "This task cannot be recovered after deletion.",
        () => {

            trash =
                trash.filter(
                    task => task.id !== id
                );

            saveTrash();

            renderTrash();

            showToast(
                "Task permanently deleted"
            );

        }
    );
}


/* =========================================================
   CONFIRMATION MODAL
========================================================= */

function openConfirmation(
    title,
    message,
    callback
) {

    const modal =
        document.getElementById("confirmModal");

    if (!modal) return;

    document.getElementById("confirmTitle")
        .textContent = title;

    document.getElementById("confirmMessage")
        .textContent = message;

    confirmCallback = callback;

    modal.classList.remove("hidden");
}

function closeConfirmation() {

    document
        .getElementById("confirmModal")
        ?.classList.add("hidden");

    confirmCallback = null;
}

function initializeConfirmation() {

    document
        .getElementById("cancelConfirm")
        ?.addEventListener(
            "click",
            closeConfirmation
        );

    document
        .getElementById("confirmAction")
        ?.addEventListener(
            "click",
            () => {

                if (confirmCallback) {
                    confirmCallback();
                }

                closeConfirmation();

            }
        );
}


/* =========================================================
   CALENDAR
========================================================= */

function initializeCalendar() {

    const grid =
        document.getElementById("calendarGrid");

    if (!grid) return;

    document
        .getElementById("prevMonth")
        ?.addEventListener("click", () => {

            currentCalendarDate.setMonth(
                currentCalendarDate.getMonth() - 1
            );

            renderCalendar();

        });

    document
        .getElementById("nextMonth")
        ?.addEventListener("click", () => {

            currentCalendarDate.setMonth(
                currentCalendarDate.getMonth() + 1
            );

            renderCalendar();

        });

    document
        .getElementById("closeCalendarModal")
        ?.addEventListener(
            "click",
            closeCalendarModal
        );

    document
        .querySelectorAll(".status-btn")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    if (!selectedCalendarDate)
                        return;

                    calendarStatuses[
                        selectedCalendarDate
                    ] = button.dataset.status;

                    saveCalendar();

                    renderCalendar();

                    closeCalendarModal();

                    showToast(
                        "Calendar status updated"
                    );

                }
            );

        });

    document
        .getElementById("clearCalendarStatus")
        ?.addEventListener(
            "click",
            () => {

                if (!selectedCalendarDate)
                    return;

                delete calendarStatuses[
                    selectedCalendarDate
                ];

                saveCalendar();

                renderCalendar();

                closeCalendarModal();

                showToast(
                    "Calendar status cleared"
                );

            }
        );

    document
        .getElementById("calendarAddTask")
        ?.addEventListener(
            "click",
            () => {

                window.location.href =
                    `tasks.html?date=${selectedCalendarDate}`;

            }
        );

    document
        .getElementById("setReminderBtn")
        ?.addEventListener(
            "click",
            () => {

                window.location.href =
                    `tasks.html?date=${selectedCalendarDate}&reminder=true`;

            }
        );

    renderCalendar();
}

function renderCalendar() {

    const grid =
        document.getElementById("calendarGrid");

    const monthYear =
        document.getElementById("monthYear");

    if (!grid || !monthYear) return;

    const year =
        currentCalendarDate.getFullYear();

    const month =
        currentCalendarDate.getMonth();

    const firstDay =
        new Date(year, month, 1).getDay();

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();

    monthYear.textContent =
        new Date(year, month)
            .toLocaleDateString("en-US", {
                month: "long",
                year: "numeric"
            });

    grid.innerHTML = "";

    for (let i = 0; i < firstDay; i++) {

        grid.innerHTML += `
            <div class="calendar-day empty"></div>
        `;

    }

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const status =
            calendarStatuses[date] ||
            "no-status";

        let symbol = "";

        if (status === "completed") {
            symbol = "✓";
        }

        if (status === "partial") {
            symbol = "◐";
        }

        if (status === "pending") {
            symbol = "✕";
        }

        const today =
            date === todayString()
                ? "today"
                : "";

        grid.innerHTML += `

            <div
                class="calendar-day ${status} ${today}"
                data-date="${date}"
            >

                ${
                    symbol
                    ? `<span class="status-symbol">${symbol}</span>`
                    : ""
                }

                <span class="date-number">
                    ${day}
                </span>

            </div>

        `;

    }

    document
        .querySelectorAll(".calendar-day:not(.empty)")
        .forEach(day => {

            day.addEventListener(
                "click",
                () => {

                    openCalendarModal(
                        day.dataset.date
                    );

                }
            );

        });
}

function openCalendarModal(date) {

    selectedCalendarDate = date;

    const modal =
        document.getElementById("calendarModal");

    if (!modal) return;

    const dateObject =
        new Date(date + "T00:00:00");

    document.getElementById(
        "selectedDateTitle"
    ).textContent =
        dateObject.toLocaleDateString(
            "en-US",
            {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        );

    const tasksForDate =
        tasks.filter(
            task => task.dueDate === date
        );

    const container =
        document.getElementById(
            "selectedDateTasks"
        );

    if (!tasksForDate.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>No tasks for this day</h3>
                <p>Add a task or set a reminder.</p>
            </div>
        `;

    } else {

        container.innerHTML =
            tasksForDate.map(task => `

                <div class="mini-task">

                    <div class="mini-task-title">
                        ${escapeHTML(task.title)}
                    </div>

                    <div class="mini-task-meta">

                        ${
                            task.completed
                            ? "✓ Completed"
                            : "✕ Pending"
                        }

                        ·
                        ${capitalize(task.priority)}

                    </div>

                </div>

            `).join("");

    }

    modal.classList.remove("hidden");
}

function closeCalendarModal() {

    document
        .getElementById("calendarModal")
        ?.classList.add("hidden");

}


/* =========================================================
   DASHBOARD
========================================================= */

function initializeDashboard() {

    const total =
        document.getElementById("totalTasks");

    if (!total) return;

    updateDashboard();

}

function updateDashboard() {

    const total =
        tasks.length;

    const completed =
        tasks.filter(
            task => task.completed
        ).length;

    const active =
        total - completed;

    const totalElement =
        document.getElementById("totalTasks");

    const activeElement =
        document.getElementById("activeTasks");

    const completedElement =
        document.getElementById("completedTasks");

    if (totalElement)
        totalElement.textContent = total;

    if (activeElement)
        activeElement.textContent = active;

    if (completedElement)
        completedElement.textContent = completed;

    const streak =
        calculateCurrentStreak();

    const streakElement =
        document.getElementById("currentStreak");

    if (streakElement)
        streakElement.textContent = streak;

    renderTodayTasks();

    renderUpcomingTasks();
}

function renderTodayTasks() {

    const container =
        document.getElementById("todayTasks");

    if (!container) return;

    const todayTasks =
        tasks.filter(
            task => task.dueDate === todayString()
        );

    if (!todayTasks.length) {

        container.innerHTML = `
            <div class="empty-state">
                <p>No tasks for today.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        todayTasks.map(task => `

            <div class="mini-task">

                <div class="mini-task-title">
                    ${task.completed ? "✓ " : ""}
                    ${escapeHTML(task.title)}
                </div>

                <div class="mini-task-meta">
                    ${capitalize(task.priority)}
                    ·
                    ${escapeHTML(task.category)}
                </div>

            </div>

        `).join("");
}

function renderUpcomingTasks() {

    const container =
        document.getElementById("upcomingTasks");

    if (!container) return;

    const upcoming =
        tasks
            .filter(
                task =>
                    task.dueDate &&
                    task.dueDate > todayString() &&
                    !task.completed
            )
            .sort(
                (a, b) =>
                    a.dueDate.localeCompare(b.dueDate)
            )
            .slice(0, 5);

    if (!upcoming.length) {

        container.innerHTML = `
            <div class="empty-state">
                <p>No upcoming tasks.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        upcoming.map(task => `

            <div class="mini-task">

                <div class="mini-task-title">
                    ${escapeHTML(task.title)}
                </div>

                <div class="mini-task-meta">
                    📅 ${formatDate(task.dueDate)}
                </div>

            </div>

        `).join("");
}


/* =========================================================
   PROGRESS PAGE
========================================================= */

function initializeProgress() {

    const percentage =
        document.getElementById(
            "completionPercentage"
        );

    if (!percentage) return;

    const total =
        tasks.length;

    const completed =
        tasks.filter(
            task => task.completed
        ).length;

    const pending =
        total - completed;

    const completion =
        total
            ? Math.round(
                completed / total * 100
            )
            : 0;

    percentage.textContent =
        `${completion}%`;

    document.getElementById(
        "progressTotal"
    ).textContent = total;

    document.getElementById(
        "progressCompleted"
    ).textContent = completed;

    document.getElementById(
        "progressPending"
    ).textContent = pending;

    document.getElementById(
        "bestStreak"
    ).textContent =
        calculateBestStreak();

    const message =
        document.getElementById(
            "progressMessage"
        );

    if (message) {

        if (completion === 0)
            message.textContent =
                "Start completing your tasks.";

        else if (completion < 50)
            message.textContent =
                "Good start. Keep building momentum.";

        else if (completion < 100)
            message.textContent =
                "You're making great progress.";

        else
            message.textContent =
                "Amazing! All tasks completed.";

    }

    renderCategoryProgress();
    renderPriorityProgress();
    renderCompletedHistory();
}

function renderCategoryProgress() {

    const container =
        document.getElementById(
            "categoryProgress"
        );

    if (!container) return;

    container.innerHTML =
        categories.map(category => {

            const categoryTasks =
                tasks.filter(
                    task =>
                        task.category === category.name
                );

            const completed =
                categoryTasks.filter(
                    task => task.completed
                ).length;

            const percent =
                categoryTasks.length
                    ? Math.round(
                        completed /
                        categoryTasks.length *
                        100
                    )
                    : 0;

            return `

                <div class="progress-row">

                    <div class="progress-row-header">

                        <span>
                            ${escapeHTML(category.name)}
                        </span>

                        <span>
                            ${completed}/${categoryTasks.length}
                        </span>

                    </div>

                    <div class="analytics-bar">
                        <div style="width:${percent}%"></div>
                    </div>

                </div>

            `;

        }).join("");
}

function renderPriorityProgress() {

    const container =
        document.getElementById(
            "priorityProgress"
        );

    if (!container) return;

    const priorities =
        ["high", "medium", "low"];

    container.innerHTML =
        priorities.map(priority => {

            const priorityTasks =
                tasks.filter(
                    task =>
                        task.priority === priority
                );

            const completed =
                priorityTasks.filter(
                    task => task.completed
                ).length;

            const percent =
                priorityTasks.length
                    ? Math.round(
                        completed /
                        priorityTasks.length *
                        100
                    )
                    : 0;

            return `

                <div class="progress-row">

                    <div class="progress-row-header">

                        <span>
                            ${capitalize(priority)}
                        </span>

                        <span>
                            ${completed}/${priorityTasks.length}
                        </span>

                    </div>

                    <div class="analytics-bar">
                        <div style="width:${percent}%"></div>
                    </div>

                </div>

            `;

        }).join("");
}

function renderCompletedHistory() {

    const container =
        document.getElementById(
            "completedHistory"
        );

    if (!container) return;

    const completed =
        tasks
            .filter(
                task =>
                    task.completed
            )
            .sort(
                (a, b) =>
                    (b.completedAt || 0) -
                    (a.completedAt || 0)
            )
            .slice(0, 10);

    if (!completed.length) {

        container.innerHTML = `
            <div class="empty-state">
                <p>No completed tasks yet.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        completed.map(task => `

            <div class="history-item">

                <div class="history-title">
                    ✓ ${escapeHTML(task.title)}
                </div>

                <div class="history-date">
                    Completed on
                    ${new Date(
                        task.completedAt
                    ).toLocaleDateString("en-IN")}
                </div>

            </div>

        `).join("");
}


/* =========================================================
   STREAK
========================================================= */

function getCompletedDates() {

    const dates = new Set();

    tasks.forEach(task => {

        if (
            task.completed &&
            task.completedAt
        ) {

            const date =
                new Date(task.completedAt)
                    .toISOString()
                    .split("T")[0];

            dates.add(date);

        }

    });

    return [...dates].sort();
}

function calculateCurrentStreak() {

    const dates =
        getCompletedDates();

    if (!dates.length) return 0;

    let streak = 0;

    const current =
        new Date();

    while (true) {

        const date =
            current
                .toISOString()
                .split("T")[0];

        if (!dates.includes(date))
            break;

        streak++;

        current.setDate(
            current.getDate() - 1
        );

    }

    return streak;
}

function calculateBestStreak() {

    const dates =
        getCompletedDates();

    if (!dates.length) return 0;

    let best = 1;
    let current = 1;

    for (let i = 1; i < dates.length; i++) {

        const previous =
            new Date(
                dates[i - 1] + "T00:00:00"
            );

        const currentDate =
            new Date(
                dates[i] + "T00:00:00"
            );

        const difference =
            (
                currentDate -
                previous
            ) /
            (1000 * 60 * 60 * 24);

        if (difference === 1) {

            current++;

            best =
                Math.max(
                    best,
                    current
                );

        } else {

            current = 1;

        }

    }

    return best;
}


/* =========================================================
   REMINDERS
========================================================= */

function scheduleReminder(task) {

    if (!task.reminder) return;

    const reminderTime =
        new Date(task.reminder).getTime();

    const delay =
        reminderTime -
        Date.now();

    if (delay <= 0) return;

    setTimeout(
        () => {

            sendNotification(
                `Reminder: ${task.title}`,
                task.description ||
                "You have a task reminder."
            );

        },
        Math.min(
            delay,
            2147483647
        )
    );
}

function sendNotification(title, body) {

    showToast(
        `🔔 ${title}`
    );

    if (
        "Notification" in window &&
        Notification.permission === "granted"
    ) {

        new Notification(
            title,
            {
                body
            }
        );

    }

}

function requestNotificationPermission() {

    if (
        "Notification" in window &&
        Notification.permission === "default"
    ) {

        Notification.requestPermission();

    }

}


/* =========================================================
   UTILITIES
========================================================= */

function capitalize(value) {

    if (!value) return "";

    return value.charAt(0).toUpperCase() +
        value.slice(1);
}

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   GLOBAL INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeTheme();

        document
            .getElementById("themeToggle")
            ?.addEventListener(
                "click",
                toggleTheme
            );

        initializeDashboard();

        initializeTasksPage();

        initializeCalendar();

        initializeProgress();

        initializeTrashPage();

        initializeConfirmation();

        requestNotificationPermission();

    }
);