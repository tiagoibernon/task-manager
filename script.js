const STORAGE_KEY = "task-manager:v1";
const SAMPLE_TASK_TITLE = "Revisar prioridades da semana";

let toastTimeoutId;

// Centralizar referências do DOM facilita manutenção e evita buscas repetidas.
const elements = {
  form: document.getElementById("taskForm"),
  taskInput: document.getElementById("taskInput"),
  searchInput: document.getElementById("searchInput"),
  taskList: document.getElementById("taskList"),
  emptyState: document.getElementById("emptyState"),
  emptyStateTitle: document.querySelector("#emptyState h3"),
  emptyStateDescription: document.getElementById("emptyStateDescription"),
  emptyStateAction: document.getElementById("emptyStateAction"),
  emptyStateSampleButton: document.getElementById("emptyStateSampleButton"),
  heroSampleButton: document.getElementById("heroSampleButton"),
  toast: document.getElementById("toast"),
  filterButtons: document.querySelectorAll("[data-filter]"),
  totalTasks: document.getElementById("totalTasks"),
  pendingTasks: document.getElementById("pendingTasks"),
  completedTasks: document.getElementById("completedTasks"),
  allCount: document.getElementById("allCount"),
  pendingCount: document.getElementById("pendingCount"),
  completedCount: document.getElementById("completedCount"),
  taskCounter: document.getElementById("taskCounter"),
  taskTemplate: document.getElementById("taskItemTemplate"),
};

const state = {
  tasks: loadTasks(),
  filter: "all",
  searchTerm: "",
};

function normalizeTask(task) {
  const title = String(task?.title || "").trim();

  if (!title) {
    return null;
  }

  return {
    id: String(task?.id || `${Date.now()}-${Math.floor(Math.random() * 100000)}`),
    title,
    completed: Boolean(task?.completed),
  };
}

function normalizeStateTasks() {
  state.tasks = state.tasks.map(normalizeTask).filter(Boolean);
}

function getActiveFilter() {
  const allowedFilters = ["all", "pending", "completed"];
  return allowedFilters.includes(state.filter) ? state.filter : "all";
}

// Faz a hidratação inicial com tolerância a dados inválidos no localStorage.
function loadTasks() {
  const savedTasks = localStorage.getItem(STORAGE_KEY);

  if (!savedTasks) {
    return [];
  }

  try {
    const parsedTasks = JSON.parse(savedTasks);

    if (!Array.isArray(parsedTasks)) {
      return [];
    }

    return parsedTasks
      .map((task) => ({
        id: String(task.id),
        title: String(task.title || "").trim(),
        completed: Boolean(task.completed),
      }))
      .filter((task) => task.title);
  } catch (error) {
    console.error("Não foi possível carregar as tarefas salvas.", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar as tarefas.", error);
    showToast("Não foi possível salvar localmente. Verifique as permissões do navegador.");
    return false;
  }
}

function showToast(message) {
  clearTimeout(toastTimeoutId);
  elements.toast.textContent = message;
  elements.toast.hidden = false;

  toastTimeoutId = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2600);
}

function createTask(title) {
  const generatedId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  return {
    id: generatedId,
    title,
    completed: false,
  };
}

function getTaskById(taskId) {
  normalizeStateTasks();
  return state.tasks.find((task) => task.id === taskId);
}

function getTaskByTitle(title) {
  normalizeStateTasks();
  return state.tasks.find(
    (task) => task.title.trim().toLowerCase() === title.trim().toLowerCase()
  );
}

function clearViewFilters() {
  state.searchTerm = "";
  state.filter = "all";
  elements.searchInput.value = "";
}

function taskMatchesCurrentView(task) {
  const activeFilter = getActiveFilter();
  const matchesSearch = task.title
    .toLowerCase()
    .includes(state.searchTerm.toLowerCase());

  if (!matchesSearch) {
    return false;
  }

  if (activeFilter === "pending") {
    return !task.completed;
  }

  if (activeFilter === "completed") {
    return task.completed;
  }

  return true;
}

// Busca e filtro são aplicados juntos para manter a renderização previsível.
function getFilteredTasks() {
  normalizeStateTasks();
  const activeFilter = getActiveFilter();

  return state.tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(state.searchTerm.toLowerCase());

    if (!matchesSearch) {
      return false;
    }

    if (activeFilter === "pending") {
      return !task.completed;
    }

    if (activeFilter === "completed") {
      return task.completed;
    }

    return true;
  });
}

function getTaskCounterText(total, pending) {
  if (total === 0) {
    return "Nenhuma tarefa cadastrada";
  }

  if (pending === 0) {
    return "Tudo concluído";
  }

  if (pending === 1) {
    return "1 tarefa pendente";
  }

  return `${pending} tarefas pendentes`;
}

function getEmptyStateContent() {
  normalizeStateTasks();
  const hasTasks = state.tasks.length > 0;
  const hasSearch = state.searchTerm.length > 0;
  const isFiltered = getActiveFilter() !== "all";

  if (!hasTasks) {
    return {
      title: "Sua lista ainda está vazia",
      description:
        "Crie a primeira tarefa para transformar a lista em um painel de acompanhamento da sua rotina.",
      actionLabel: "Criar primeira tarefa",
    };
  }

  if (hasSearch || isFiltered) {
    return {
      title: "Nenhuma tarefa encontrada",
      description:
        "Tente mudar a busca ou selecionar outro filtro para encontrar resultados mais rapidamente.",
      actionLabel: "Limpar filtros",
    };
  }

  return {
    title: "Nenhuma tarefa encontrada",
    description: "Adicione uma nova tarefa ou ajuste sua busca e filtros para ver os resultados aqui.",
    actionLabel: "Criar tarefa",
  };
}

function focusTaskInput() {
  elements.taskInput.focus();
  elements.taskInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

function revealTask(taskId) {
  clearViewFilters();
  renderTasks();

  const taskItem = elements.taskList.querySelector(`[data-id="${taskId}"]`);

  if (taskItem) {
    taskItem.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function createSampleTask() {
  normalizeStateTasks();
  const existingSampleTask = getTaskByTitle(SAMPLE_TASK_TITLE);

  if (existingSampleTask) {
    revealTask(existingSampleTask.id);
    showToast("O exemplo já está na sua lista.");
    return;
  }

  const newTask = createTask(SAMPLE_TASK_TITLE);
  state.tasks.unshift(newTask);

  if (!taskMatchesCurrentView(newTask)) {
    clearViewFilters();
  }

  if (saveTasks()) {
    renderTasks();
    showToast("Tarefa de exemplo adicionada.");
  }
}

function updateSummary() {
  normalizeStateTasks();
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const pending = total - completed;

  elements.totalTasks.textContent = total;
  elements.pendingTasks.textContent = pending;
  elements.completedTasks.textContent = completed;
  elements.allCount.textContent = total;
  elements.pendingCount.textContent = pending;
  elements.completedCount.textContent = completed;
  elements.taskCounter.textContent = getTaskCounterText(total, pending);
}

function updateEmptyState(visibleTaskCount) {
  const hasVisibleTasks = visibleTaskCount > 0;
  const emptyStateContent = getEmptyStateContent();

  elements.emptyState.hidden = hasVisibleTasks;
  elements.taskList.hidden = !hasVisibleTasks;
  elements.emptyState.style.display = hasVisibleTasks ? "none" : "grid";
  elements.taskList.style.display = hasVisibleTasks ? "grid" : "none";
  elements.emptyState.setAttribute("aria-hidden", String(hasVisibleTasks));
  elements.taskList.setAttribute("aria-hidden", String(!hasVisibleTasks));
  elements.emptyStateTitle.textContent = emptyStateContent.title;
  elements.emptyStateDescription.textContent = emptyStateContent.description;
  elements.emptyStateAction.textContent = emptyStateContent.actionLabel;
}

function updateFilterButtons() {
  const activeFilter = getActiveFilter();

  elements.filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === activeFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function startEditingTask(taskItem, task) {
  const titleElement = taskItem.querySelector(".task-title");
  const editRow = taskItem.querySelector(".task-edit-row");
  const editInput = taskItem.querySelector(".task-edit-input");
  const editButton = taskItem.querySelector(".task-edit-button");
  const saveButton = taskItem.querySelector(".task-save-button");
  const cancelButton = taskItem.querySelector(".task-cancel-button");

  taskItem.dataset.originalTitle = task.title;
  taskItem.classList.add("is-editing");
  titleElement.hidden = true;
  editRow.hidden = false;
  editButton.hidden = true;
  saveButton.hidden = false;
  cancelButton.hidden = false;
  editInput.value = task.title;
  editInput.focus();
  editInput.select();
}

function stopEditingTask(taskItem) {
  taskItem.classList.remove("is-editing");
  taskItem.querySelector(".task-title").hidden = false;
  taskItem.querySelector(".task-edit-row").hidden = true;
  taskItem.querySelector(".task-edit-button").hidden = false;
  taskItem.querySelector(".task-save-button").hidden = true;
  taskItem.querySelector(".task-cancel-button").hidden = true;
  delete taskItem.dataset.originalTitle;
}

function cancelEditingTask(taskItem) {
  const originalTitle =
    taskItem.dataset.originalTitle || taskItem.querySelector(".task-title").textContent || "";
  const editInput = taskItem.querySelector(".task-edit-input");
  const editButton = taskItem.querySelector(".task-edit-button");

  editInput.value = originalTitle;
  stopEditingTask(taskItem);
  editButton.focus();
}

function updateTask(taskId, updates, successMessage) {
  normalizeStateTasks();
  state.tasks = state.tasks.map((task) =>
    task.id === taskId ? { ...task, ...updates } : task
  );

  if (saveTasks()) {
    renderTasks();

    if (successMessage) {
      showToast(successMessage);
    }
  }
}

function deleteTask(taskId) {
  normalizeStateTasks();
  state.tasks = state.tasks.filter((task) => task.id !== taskId);

  if (saveTasks()) {
    renderTasks();
    showToast("Tarefa removida.");
  }
}

// A lista é reconstruída a cada mudança para manter a interface sincronizada.
function renderTasks() {
  normalizeStateTasks();
  const activeFilter = getActiveFilter();
  let filteredTasks = getFilteredTasks();

  if (state.filter !== activeFilter) {
    state.filter = activeFilter;
  }

  // Se existirem tarefas válidas e a visão estiver "Todas" sem busca,
  // a lista não deve cair em estado vazio por inconsistência antiga.
  if (filteredTasks.length === 0 && state.tasks.length > 0 && activeFilter === "all" && !state.searchTerm) {
    filteredTasks = [...state.tasks];
  }

  elements.taskList.innerHTML = "";

  filteredTasks.forEach((task) => {
    const fragment = elements.taskTemplate.content.cloneNode(true);
    const taskItem = fragment.querySelector(".task-item");
    const checkbox = fragment.querySelector(".task-toggle");
    const title = fragment.querySelector(".task-title");
    const editInput = fragment.querySelector(".task-edit-input");
    const editButton = fragment.querySelector(".task-edit-button");
    const deleteButton = fragment.querySelector(".task-delete-button");

    taskItem.dataset.id = task.id;
    taskItem.classList.toggle("is-completed", task.completed);
    checkbox.checked = task.completed;
    checkbox.setAttribute(
      "aria-label",
      task.completed ? `Marcar "${task.title}" como pendente` : `Concluir "${task.title}"`
    );
    title.textContent = task.title;
    editInput.value = task.title;
    editButton.setAttribute("aria-label", `Editar "${task.title}"`);
    deleteButton.setAttribute("aria-label", `Remover "${task.title}"`);

    elements.taskList.appendChild(fragment);
  });

  updateEmptyState(filteredTasks.length);
  updateSummary();
  updateFilterButtons();
}

function handleTaskSubmit(event) {
  event.preventDefault();
  normalizeStateTasks();

  const title = elements.taskInput.value.trim();

  if (!title) {
    elements.taskInput.focus();
    return;
  }

  const newTask = createTask(title);
  state.tasks.unshift(newTask);

  if (!taskMatchesCurrentView(newTask)) {
    clearViewFilters();
  }

  if (saveTasks()) {
    renderTasks();
    elements.form.reset();
    elements.taskInput.focus();
    showToast("Tarefa adicionada.");
  }
}

function handleSearch(event) {
  state.searchTerm = event.target.value.trim();
  renderTasks();
}

function handleFilterClick(event) {
  const { filter } = event.currentTarget.dataset;

  if (!filter) {
    return;
  }

  state.filter = filter;
  renderTasks();
}

function handleEmptyStateAction() {
  normalizeStateTasks();
  if (state.tasks.length === 0) {
    focusTaskInput();
    return;
  }

  clearViewFilters();
  renderTasks();
  showToast("Busca e filtros foram redefinidos.");
}

function handleTaskListChange(event) {
  if (!event.target.classList.contains("task-toggle")) {
    return;
  }

  const taskItem = event.target.closest(".task-item");
  const task = getTaskById(taskItem.dataset.id);

  if (!task) {
    return;
  }

  const isCompleted = event.target.checked;
  updateTask(
    task.id,
    { completed: isCompleted },
    isCompleted ? "Tarefa concluída." : "Tarefa reaberta."
  );
}

function handleTaskListClick(event) {
  const actionButton = event.target.closest("button");

  if (!actionButton) {
    return;
  }

  const taskItem = actionButton.closest(".task-item");

  if (!taskItem) {
    return;
  }

  const task = getTaskById(taskItem.dataset.id);

  if (!task) {
    return;
  }

  if (actionButton.classList.contains("task-edit-button")) {
    startEditingTask(taskItem, task);
    return;
  }

  if (actionButton.classList.contains("task-cancel-button")) {
    cancelEditingTask(taskItem);
    return;
  }

  if (actionButton.classList.contains("task-save-button")) {
    const editInput = taskItem.querySelector(".task-edit-input");
    const updatedTitle = editInput.value.trim();

    if (!updatedTitle) {
      editInput.focus();
      return;
    }

    updateTask(task.id, { title: updatedTitle }, "Tarefa atualizada.");
    return;
  }

  if (actionButton.classList.contains("task-delete-button")) {
    deleteTask(task.id);
  }
}

function handleTaskListKeydown(event) {
  if (!event.target.classList.contains("task-edit-input")) {
    return;
  }

  const taskItem = event.target.closest(".task-item");
  const task = getTaskById(taskItem.dataset.id);

  if (!task) {
    return;
  }

  if (event.key === "Enter") {
    event.preventDefault();
    const updatedTitle = event.target.value.trim();

    if (!updatedTitle) {
      event.target.focus();
      return;
    }

    updateTask(task.id, { title: updatedTitle }, "Tarefa atualizada.");
  }

  if (event.key === "Escape") {
    cancelEditingTask(taskItem);
  }
}

// Eventos globais são registrados uma única vez; os itens ficam por conta do render.
function bindEvents() {
  elements.form.addEventListener("submit", handleTaskSubmit);
  elements.searchInput.addEventListener("input", handleSearch);
  elements.emptyStateAction.addEventListener("click", handleEmptyStateAction);
  elements.emptyStateSampleButton.addEventListener("click", createSampleTask);
  elements.heroSampleButton.addEventListener("click", createSampleTask);
  elements.taskList.addEventListener("change", handleTaskListChange);
  elements.taskList.addEventListener("click", handleTaskListClick);
  elements.taskList.addEventListener("keydown", handleTaskListKeydown);

  elements.filterButtons.forEach((button) => {
    button.addEventListener("click", handleFilterClick);
  });
}

bindEvents();
renderTasks();
