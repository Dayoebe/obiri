const state = {
  token: localStorage.getItem("obiri_token"),
  user: JSON.parse(localStorage.getItem("obiri_user") || "null"),
  view: "dashboard",
  data: {
    departments: [],
    employees: [],
    leaveTypes: [],
    requests: [],
    auditLogs: [],
  },
  approval: null,
};

const views = {
  dashboard: document.getElementById("dashboardView"),
  requests: document.getElementById("requestsView"),
  departments: document.getElementById("departmentsView"),
  employees: document.getElementById("employeesView"),
  leaveTypes: document.getElementById("leaveTypesView"),
  auditLogs: document.getElementById("auditLogsView"),
};

const pageTitles = {
  dashboard: "Dashboard",
  requests: "Leave Requests",
  departments: "Departments",
  employees: "Employees",
  leaveTypes: "Leave Types",
  auditLogs: "Audit Logs",
};

const roleLabels = {
  ADMIN: "Administrator",
  HR: "Human Resources",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function normalizeRole(employee) {
  if (!employee) return "EMPLOYEE";
  if (typeof employee.role === "string") return employee.role;
  return employee.role?.name || "EMPLOYEE";
}

function showToast(message, isError = false) {
  const toast = $("toast");
  toast.textContent = message;
  toast.style.borderColor = isError ? "#f0c7c2" : "#b7e2da";
  toast.style.background = isError ? "#fff1f2" : "#ecfdf8";
  toast.style.color = isError ? "#b42318" : "#124a42";
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 3500);
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload?.message || payload?.error || payload || "Request failed";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return payload;
}

function canManageDepartments() {
  return state.user?.role === "ADMIN";
}

function canManageEmployees() {
  return state.user?.role === "ADMIN";
}

function canManageLeaveTypes() {
  return ["ADMIN", "HR"].includes(state.user?.role);
}

function canViewPeopleData() {
  return ["ADMIN", "HR", "MANAGER"].includes(state.user?.role);
}

function canViewAuditLogs() {
  return state.user?.role === "ADMIN";
}

function canActOnRequest(request) {
  if (!state.user || request.status !== "Pending") return false;
  if (state.user.role === "ADMIN") return true;
  if (
    state.user.role === "MANAGER" &&
    request.currentStage === "MANAGER" &&
    request.employee?.manager?.id === state.user.id
  ) {
    return true;
  }
  return state.user.role === "HR" && request.currentStage === "HR";
}

function setAuthenticatedSession(loginResponse) {
  state.token = loginResponse.accessToken;
  state.user = {
    ...loginResponse.employee,
    role: normalizeRole(loginResponse.employee),
  };
  localStorage.setItem("obiri_token", state.token);
  localStorage.setItem("obiri_user", JSON.stringify(state.user));
}

function clearAuthenticatedSession() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("obiri_token");
  localStorage.removeItem("obiri_user");
}

function updateShellVisibility() {
  $("loginScreen").classList.toggle("hidden", Boolean(state.token));
  $("appScreen").classList.toggle("hidden", !state.token);

  if (!state.user) return;

  $("currentRole").textContent = roleLabels[state.user.role] || state.user.role;
  $("currentUserName").textContent =
    `${state.user.firstName || ""} ${state.user.lastName || ""}`.trim() ||
    "Signed in user";
  $("currentUserEmail").textContent = state.user.email;

  document
    .querySelectorAll("[data-view='departments']")
    .forEach((button) => button.classList.toggle("hidden", !canViewPeopleData()));
  document
    .querySelectorAll("[data-view='employees']")
    .forEach((button) => button.classList.toggle("hidden", !canViewPeopleData()));
  document
    .querySelectorAll("[data-view='auditLogs']")
    .forEach((button) => button.classList.toggle("hidden", !canViewAuditLogs()));

  document
    .querySelectorAll(".admin-only")
    .forEach((element) =>
      element.classList.toggle("hidden", !canManageEmployees()),
    );
  document
    .querySelectorAll(".hr-only")
    .forEach((element) =>
      element.classList.toggle("hidden", !canManageLeaveTypes()),
    );
}

function setView(nextView) {
  if (nextView === "departments" && !canViewPeopleData()) nextView = "dashboard";
  if (nextView === "employees" && !canViewPeopleData()) nextView = "dashboard";
  if (nextView === "auditLogs" && !canViewAuditLogs()) nextView = "dashboard";

  state.view = nextView;
  Object.entries(views).forEach(([key, element]) => {
    element.classList.toggle("hidden", key !== nextView);
  });
  document.querySelectorAll("#appNav button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === nextView);
  });
  $("pageTitle").textContent = pageTitles[nextView] || "Dashboard";
}

async function loadData() {
  if (!state.token) return;

  const requests = api("/leave-requests");
  const leaveTypes = api("/leave-types");
  const departments = canViewPeopleData()
    ? api("/departments").catch(() => [])
    : Promise.resolve([]);
  const employees = canViewPeopleData()
    ? api("/employees").catch(() => [])
    : Promise.resolve([]);
  const auditLogs = canViewAuditLogs()
    ? api("/audit-logs").catch(() => [])
    : Promise.resolve([]);

  try {
    const [requestData, leaveTypeData, departmentData, employeeData, auditData] =
      await Promise.all([
        requests,
        leaveTypes,
        departments,
        employees,
        auditLogs,
      ]);

    state.data.requests = requestData;
    state.data.leaveTypes = leaveTypeData;
    state.data.departments = departmentData;
    state.data.employees = employeeData;
    state.data.auditLogs = auditData;

    renderAll();
  } catch (error) {
    if (/unauthorized|jwt|token/i.test(error.message)) {
      clearAuthenticatedSession();
      updateShellVisibility();
      showToast("Session expired. Sign in again.", true);
      return;
    }
    showToast(error.message, true);
  }
}

function renderAll() {
  updateShellVisibility();
  renderDashboard();
  renderLeaveTypes();
  renderDepartments();
  renderEmployees();
  renderRequests();
  renderAuditLogs();
  populateSelects();
}

function renderDashboard() {
  const requests = state.data.requests;
  $("metricTotal").textContent = requests.length;
  $("metricPending").textContent = requests.filter(
    (request) => request.status === "Pending",
  ).length;
  $("metricApproved").textContent = requests.filter(
    (request) => request.status === "Approved",
  ).length;
  $("metricRejected").textContent = requests.filter(
    (request) => request.status === "Rejected",
  ).length;

  renderRequestCollection(
    $("pendingActions"),
    requests.filter(canActOnRequest).slice(0, 4),
    { compact: true },
  );
  renderRequestCollection($("recentRequests"), requests.slice(0, 5), {
    compact: true,
  });
}

function statusClass(status) {
  return String(status || "").toLowerCase();
}

function renderRequestCollection(container, requests, options = {}) {
  if (!requests.length) {
    container.innerHTML = `<div class="empty-state">No leave requests to show.</div>`;
    return;
  }

  container.innerHTML = requests
    .map((request) => renderRequestCard(request, options))
    .join("");
}

function renderRequestCard(request, options = {}) {
  const employeeName = `${request.employee?.firstName || ""} ${
    request.employee?.lastName || ""
  }`.trim();
  const approvals = request.approvals || [];
  const approvalHistory = approvals.length
    ? `<div class="approval-history">${approvals
        .map(
          (approval) => `
            <div>
              <span>${escapeHtml(approval.stage)} ${escapeHtml(
                approval.decision,
              )}</span>
              <strong>${escapeHtml(
                approval.approver
                  ? `${approval.approver.firstName} ${approval.approver.lastName}`
                  : "Approver",
              )}</strong>
            </div>
          `,
        )
        .join("")}</div>`
    : "";

  const actions = canActOnRequest(request)
    ? `<div class="button-row">
        <button class="primary" type="button" data-approve="${request.id}">Approve</button>
        <button class="danger subtle" type="button" data-reject="${request.id}">Reject</button>
      </div>`
    : "";

  return `
    <article class="request-card">
      <div class="request-card-header">
        <div>
          <h3>${escapeHtml(request.leaveType?.name || "Leave Request")}</h3>
          <p class="muted">${escapeHtml(employeeName || "Employee")}</p>
        </div>
        <span class="status ${statusClass(request.status)}">${escapeHtml(
          request.status,
        )}</span>
      </div>
      <div class="meta-grid">
        <div><span>Start</span><strong>${formatDate(
          request.startDate,
        )}</strong></div>
        <div><span>End</span><strong>${formatDate(
          request.endDate,
        )}</strong></div>
        <div><span>Stage</span><strong>${escapeHtml(
          request.currentStage,
        )}</strong></div>
        <div><span>Created</span><strong>${formatDate(
          request.createdAt,
        )}</strong></div>
      </div>
      ${
        options.compact
          ? ""
          : `<p class="muted">${escapeHtml(request.reason)}</p>${approvalHistory}`
      }
      ${actions}
    </article>
  `;
}

function renderRequests() {
  const filter = $("requestFilter").value;
  const requests =
    filter === "all"
      ? state.data.requests
      : state.data.requests.filter((request) => request.status === filter);
  renderRequestCollection($("requestsList"), requests);
}

function renderDepartments() {
  const container = $("departmentsList");
  if (!state.data.departments.length) {
    container.innerHTML = `<div class="empty-state">No departments available.</div>`;
    return;
  }

  container.innerHTML = state.data.departments
    .map(
      (department) => `
        <article class="data-card">
          <div class="data-card-header">
            <div>
              <h3>${escapeHtml(department.name)}</h3>
              <p class="muted">${escapeHtml(
                department.description || "No description",
              )}</p>
            </div>
            ${
              canManageDepartments()
                ? `<div class="button-row">
                    <button class="secondary" type="button" data-edit-department="${department.id}">Edit</button>
                    <button class="danger subtle" type="button" data-delete-department="${department.id}">Delete</button>
                  </div>`
                : ""
            }
          </div>
          <div class="meta-grid">
            <div><span>Employees</span><strong>${
              department.employees?.length || 0
            }</strong></div>
            <div><span>Updated</span><strong>${formatDate(
              department.updatedAt,
            )}</strong></div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderEmployees() {
  const container = $("employeesList");
  if (!state.data.employees.length) {
    container.innerHTML = `<div class="empty-state">No employees available.</div>`;
    return;
  }

  container.innerHTML = state.data.employees
    .map((employee) => {
      const role = normalizeRole(employee);
      return `
        <article class="data-card">
          <div class="data-card-header">
            <div>
              <h3>${escapeHtml(employee.firstName)} ${escapeHtml(
                employee.lastName,
              )}</h3>
              <p class="muted">${escapeHtml(employee.email)}</p>
            </div>
            ${
              canManageEmployees()
                ? `<div class="button-row">
                    <button class="secondary" type="button" data-edit-employee="${employee.id}">Edit</button>
                    <button class="danger subtle" type="button" data-delete-employee="${employee.id}">Delete</button>
                  </div>`
                : ""
            }
          </div>
          <div class="meta-grid">
            <div><span>Role</span><strong>${escapeHtml(role)}</strong></div>
            <div><span>Department</span><strong>${escapeHtml(
              employee.department?.name || "Unassigned",
            )}</strong></div>
            <div><span>Manager</span><strong>${escapeHtml(
              employee.manager
                ? `${employee.manager.firstName} ${employee.manager.lastName}`
                : "None",
            )}</strong></div>
            <div><span>Status</span><strong>${
              employee.isActive ? "Active" : "Inactive"
            }</strong></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLeaveTypes() {
  const container = $("leaveTypesList");
  if (!state.data.leaveTypes.length) {
    container.innerHTML = `<div class="empty-state">No leave types available.</div>`;
    return;
  }

  container.innerHTML = state.data.leaveTypes
    .map(
      (leaveType) => `
        <article class="data-card">
          <div class="data-card-header">
            <div>
              <h3>${escapeHtml(leaveType.name)}</h3>
              <p class="muted">${escapeHtml(
                leaveType.description || "No description",
              )}</p>
            </div>
            ${
              canManageLeaveTypes()
                ? `<div class="button-row">
                    <button class="secondary" type="button" data-edit-leave-type="${leaveType.id}">Edit</button>
                    <button class="danger subtle" type="button" data-delete-leave-type="${leaveType.id}">Delete</button>
                  </div>`
                : ""
            }
          </div>
          <div class="meta-grid">
            <div><span>Allowance</span><strong>${
              leaveType.annualAllowanceDays
            } days</strong></div>
            <div><span>Status</span><strong>${
              leaveType.isActive ? "Active" : "Inactive"
            }</strong></div>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderAuditLogs() {
  const container = $("auditLogsList");
  if (!canViewAuditLogs()) return;
  if (!state.data.auditLogs.length) {
    container.innerHTML = `<div class="empty-state">No audit logs available.</div>`;
    return;
  }

  container.innerHTML = state.data.auditLogs
    .map(
      (log) => `
        <article class="data-card">
          <div class="data-card-header">
            <div>
              <h3>${escapeHtml(log.entityName)} ${escapeHtml(log.action)}</h3>
              <p class="muted">${escapeHtml(log.entityId)}</p>
            </div>
            <small>${formatDateTime(log.timestamp)}</small>
          </div>
          <div class="meta-grid">
            <div><span>User</span><strong>${escapeHtml(
              log.user
                ? `${log.user.firstName} ${log.user.lastName}`
                : "System",
            )}</strong></div>
            <div><span>Action</span><strong>${escapeHtml(
              log.action,
            )}</strong></div>
          </div>
          <pre class="audit-json">${escapeHtml(
            JSON.stringify(
              { oldValues: log.oldValues, newValues: log.newValues },
              null,
              2,
            ),
          )}</pre>
        </article>
      `,
    )
    .join("");
}

function populateSelects() {
  $("requestLeaveType").innerHTML = state.data.leaveTypes
    .filter((leaveType) => leaveType.isActive)
    .map(
      (leaveType) =>
        `<option value="${leaveType.id}">${escapeHtml(leaveType.name)}</option>`,
    )
    .join("");

  $("employeeDepartment").innerHTML =
    `<option value="">No department</option>` +
    state.data.departments
      .map(
        (department) =>
          `<option value="${department.id}">${escapeHtml(
            department.name,
          )}</option>`,
      )
      .join("");

  const eligibleManagers = state.data.employees.filter((employee) =>
    ["ADMIN", "HR", "MANAGER"].includes(normalizeRole(employee)),
  );
  $("employeeManager").innerHTML =
    `<option value="">No manager</option>` +
    eligibleManagers
      .map(
        (employee) =>
          `<option value="${employee.id}">${escapeHtml(
            `${employee.firstName} ${employee.lastName}`,
          )}</option>`,
      )
      .join("");
}

function clearDepartmentForm() {
  $("departmentFormTitle").textContent = "Create Department";
  $("departmentId").value = "";
  $("departmentName").value = "";
  $("departmentDescription").value = "";
}

function clearEmployeeForm() {
  $("employeeFormTitle").textContent = "Create Employee";
  $("employeeId").value = "";
  $("employeeFirstName").value = "";
  $("employeeLastName").value = "";
  $("employeeEmail").value = "";
  $("employeePassword").value = "";
  $("employeeJobTitle").value = "";
  $("employeeRole").value = "EMPLOYEE";
  $("employeeDepartment").value = "";
  $("employeeManager").value = "";
  $("employeeActive").checked = true;
}

function clearLeaveTypeForm() {
  $("leaveTypeFormTitle").textContent = "Create Leave Type";
  $("leaveTypeId").value = "";
  $("leaveTypeName").value = "";
  $("leaveTypeAllowance").value = "0";
  $("leaveTypeDescription").value = "";
  $("leaveTypeActive").checked = true;
}

function openApprovalDialog(id, action) {
  const request = state.data.requests.find((item) => item.id === id);
  if (!request) return;

  state.approval = { id, action };
  $("approvalComments").value = "";
  $("approvalActionLabel").textContent =
    action === "approve" ? "Approve request" : "Reject request";
  $("approvalTitle").textContent = request.leaveType?.name || "Leave Request";
  $("confirmApproval").textContent =
    action === "approve" ? "Approve" : "Reject";
  $("confirmApproval").className =
    action === "approve" ? "primary" : "danger";
  $("approvalDialog").showModal();
}

async function submitApproval() {
  if (!state.approval) return;

  try {
    await api(`/leave-requests/${state.approval.id}/${state.approval.action}`, {
      method: "POST",
      body: JSON.stringify({
        comments: $("approvalComments").value.trim(),
      }),
    });
    $("approvalDialog").close();
    state.approval = null;
    showToast("Leave request updated.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  $("loginError").textContent = "";

  try {
    const loginResponse = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: $("loginEmail").value.trim(),
        password: $("loginPassword").value,
      }),
    });

    setAuthenticatedSession(loginResponse);
    setView("dashboard");
    updateShellVisibility();
    await loadData();
    showToast("Signed in successfully.");
  } catch (error) {
    $("loginError").textContent = error.message;
  }
}

async function handleRequestSubmit(event) {
  event.preventDefault();
  try {
    await api("/leave-requests", {
      method: "POST",
      body: JSON.stringify({
        leaveTypeId: $("requestLeaveType").value,
        startDate: $("requestStartDate").value,
        endDate: $("requestEndDate").value,
        reason: $("requestReason").value.trim(),
      }),
    });
    event.target.reset();
    showToast("Leave request submitted.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleDepartmentSubmit(event) {
  event.preventDefault();
  const id = $("departmentId").value;
  try {
    await api(id ? `/departments/${id}` : "/departments", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({
        name: $("departmentName").value.trim(),
        description: $("departmentDescription").value.trim(),
      }),
    });
    clearDepartmentForm();
    showToast("Department saved.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleEmployeeSubmit(event) {
  event.preventDefault();
  const id = $("employeeId").value;
  const password = $("employeePassword").value;

  if (!id && !password) {
    showToast("Password is required for new employees.", true);
    return;
  }

  const body = {
    firstName: $("employeeFirstName").value.trim(),
    lastName: $("employeeLastName").value.trim(),
    email: $("employeeEmail").value.trim(),
    jobTitle: $("employeeJobTitle").value.trim(),
    roleName: $("employeeRole").value,
    departmentId: $("employeeDepartment").value || undefined,
    managerId: $("employeeManager").value || undefined,
    isActive: $("employeeActive").checked,
  };

  if (password) body.password = password;

  try {
    await api(id ? `/employees/${id}` : "/employees", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(body),
    });
    clearEmployeeForm();
    showToast("Employee saved.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleLeaveTypeSubmit(event) {
  event.preventDefault();
  const id = $("leaveTypeId").value;
  try {
    await api(id ? `/leave-types/${id}` : "/leave-types", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify({
        name: $("leaveTypeName").value.trim(),
        description: $("leaveTypeDescription").value.trim(),
        annualAllowanceDays: Number($("leaveTypeAllowance").value || 0),
        isActive: $("leaveTypeActive").checked,
      }),
    });
    clearLeaveTypeForm();
    showToast("Leave type saved.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function deleteResource(path, message) {
  if (!window.confirm(message)) return;
  try {
    await api(path, { method: "DELETE" });
    showToast("Deleted successfully.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
}

function handleDocumentClick(event) {
  const target = event.target.closest("button");
  if (!target) return;

  if (target.dataset.view) {
    setView(target.dataset.view);
    return;
  }

  if (target.dataset.login) {
    $("loginEmail").value = target.dataset.login;
    $("loginPassword").value = "Password123!";
    return;
  }

  if (target.dataset.approve) {
    openApprovalDialog(target.dataset.approve, "approve");
    return;
  }

  if (target.dataset.reject) {
    openApprovalDialog(target.dataset.reject, "reject");
    return;
  }

  if (target.dataset.editDepartment) {
    const department = state.data.departments.find(
      (item) => item.id === target.dataset.editDepartment,
    );
    if (!department) return;
    $("departmentFormTitle").textContent = "Update Department";
    $("departmentId").value = department.id;
    $("departmentName").value = department.name || "";
    $("departmentDescription").value = department.description || "";
    return;
  }

  if (target.dataset.deleteDepartment) {
    deleteResource(
      `/departments/${target.dataset.deleteDepartment}`,
      "Delete this department?",
    );
    return;
  }

  if (target.dataset.editEmployee) {
    const employee = state.data.employees.find(
      (item) => item.id === target.dataset.editEmployee,
    );
    if (!employee) return;
    $("employeeFormTitle").textContent = "Update Employee";
    $("employeeId").value = employee.id;
    $("employeeFirstName").value = employee.firstName || "";
    $("employeeLastName").value = employee.lastName || "";
    $("employeeEmail").value = employee.email || "";
    $("employeePassword").value = "";
    $("employeeJobTitle").value = employee.jobTitle || "";
    $("employeeRole").value = normalizeRole(employee);
    $("employeeDepartment").value = employee.department?.id || "";
    $("employeeManager").value = employee.manager?.id || "";
    $("employeeActive").checked = Boolean(employee.isActive);
    return;
  }

  if (target.dataset.deleteEmployee) {
    deleteResource(
      `/employees/${target.dataset.deleteEmployee}`,
      "Delete this employee?",
    );
    return;
  }

  if (target.dataset.editLeaveType) {
    const leaveType = state.data.leaveTypes.find(
      (item) => item.id === target.dataset.editLeaveType,
    );
    if (!leaveType) return;
    $("leaveTypeFormTitle").textContent = "Update Leave Type";
    $("leaveTypeId").value = leaveType.id;
    $("leaveTypeName").value = leaveType.name || "";
    $("leaveTypeAllowance").value = leaveType.annualAllowanceDays || 0;
    $("leaveTypeDescription").value = leaveType.description || "";
    $("leaveTypeActive").checked = Boolean(leaveType.isActive);
    return;
  }

  if (target.dataset.deleteLeaveType) {
    deleteResource(
      `/leave-types/${target.dataset.deleteLeaveType}`,
      "Delete this leave type?",
    );
  }
}

function wireEvents() {
  document.addEventListener("click", handleDocumentClick);
  $("loginForm").addEventListener("submit", handleLogin);
  $("logoutButton").addEventListener("click", () => {
    clearAuthenticatedSession();
    updateShellVisibility();
  });
  $("refreshButton").addEventListener("click", () => loadData());
  $("requestFilter").addEventListener("change", renderRequests);
  $("requestForm").addEventListener("submit", handleRequestSubmit);
  $("departmentForm").addEventListener("submit", handleDepartmentSubmit);
  $("employeeForm").addEventListener("submit", handleEmployeeSubmit);
  $("leaveTypeForm").addEventListener("submit", handleLeaveTypeSubmit);
  $("clearDepartment").addEventListener("click", clearDepartmentForm);
  $("clearEmployee").addEventListener("click", clearEmployeeForm);
  $("clearLeaveType").addEventListener("click", clearLeaveTypeForm);
  $("cancelApproval").addEventListener("click", () => {
    state.approval = null;
    $("approvalDialog").close();
  });
  $("confirmApproval").addEventListener("click", submitApproval);
}

async function boot() {
  wireEvents();
  updateShellVisibility();
  setView("dashboard");

  if (state.token && state.user) {
    await loadData();
  }
}

void boot();
