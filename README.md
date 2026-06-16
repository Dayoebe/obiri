# ERP Leave Management Module

Production-ready Leave Management API for an ERP system, built with NestJS, TypeScript, TypeORM, PostgreSQL, JWT authentication, RBAC, Swagger/OpenAPI, Docker, and unit tests.

## Architecture Overview

The module is organized around ERP domain boundaries:

- `AuthModule`: JWT login for employees.
- `DepartmentsModule`: department CRUD and assignment target for employees.
- `EmployeesModule`: employee CRUD, department assignment, manager reporting lines, role assignment, and password hashing.
- `LeaveTypesModule`: HR/admin-managed leave policies such as Annual, Sick, Maternity, and Compassionate Leave.
- `LeaveRequestsModule`: leave request submission, visibility rules, manager approval, HR final approval, rejection handling, and approval history.
- `AuditLogsModule`: centralized audit trail for leave requests, approvals, employee changes, and department changes.

The approval workflow is:

```text
Employee -> Manager Approval -> HR Approval -> Final Approval
```

Manager rejection immediately marks the request as `Rejected`. Manager approval moves the request to HR. HR approval marks the request as `Approved`; HR rejection marks it as `Rejected`.

## Tech Stack

- Node.js
- TypeScript
- NestJS
- TypeORM
- PostgreSQL
- JWT authentication
- RBAC guards
- Swagger/OpenAPI
- Docker and Docker Compose
- Jest unit tests

## Setup With Docker

Run the API and PostgreSQL with one command:

```bash
docker compose up
```

Use `docker compose up --build` after code or dependency changes when you need to force an image rebuild.

The API starts on:

```text
http://localhost:3000
```

The responsive web app is available at:

```text
http://localhost:3000/
```

Swagger is available at:

```text
http://localhost:3000/docs
```

Runtime health is available at:

```text
http://localhost:3000/health
```

The Docker container runs the seed script before starting the API. The seed script is idempotent, so it can be run multiple times safely.

## Local Setup

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Start PostgreSQL locally or use the Docker database service:

```bash
docker compose up db
```

Run seed data:

```bash
npm run seed
```

Start the API:

```bash
npm run start:dev
```

Then open the responsive web app:

```text
http://localhost:3000/
```

## Environment Variables

| Variable         | Description                           | Example                            |
| ---------------- | ------------------------------------- | ---------------------------------- |
| `PORT`           | API port                              | `3000`                             |
| `DB_HOST`        | PostgreSQL host                       | `localhost`                        |
| `DB_PORT`        | PostgreSQL port                       | `5432`                             |
| `DB_USERNAME`    | PostgreSQL username                   | `leave_user`                       |
| `DB_PASSWORD`    | PostgreSQL password                   | `leave_password`                   |
| `DB_DATABASE`    | PostgreSQL database                   | `leave_management`                 |
| `TYPEORM_SYNC`   | Auto-create schema for local/demo use | `true`                             |
| `JWT_SECRET`     | JWT signing secret                    | `change-this-secret-in-production` |
| `JWT_EXPIRES_IN` | JWT expiry                            | `1d`                               |

For production, use a strong `JWT_SECRET`, managed secrets, TLS, and migrations instead of schema synchronization.

## Authentication Flow

1. Login with `POST /auth/login`.
2. Copy the returned `accessToken`.
3. Send authenticated requests with:

```text
Authorization: Bearer <accessToken>
```

Swagger supports bearer authentication through the `Authorize` button.

## Sample Credentials

All seeded users use this password:

```text
Password123!
```

| Role                | Email                           |
| ------------------- | ------------------------------- |
| Admin               | `admin@erp.local`               |
| HR                  | `hr@erp.local`                  |
| Engineering Manager | `manager.engineering@erp.local` |
| Finance Manager     | `manager.finance@erp.local`     |
| Employee            | `employee1@erp.local`           |
| Employee            | `employee2@erp.local`           |
| Employee            | `employee3@erp.local`           |
| Employee            | `employee4@erp.local`           |
| Employee            | `employee5@erp.local`           |

## RBAC Summary

| Role       | Permissions                                                                              |
| ---------- | ---------------------------------------------------------------------------------------- |
| `EMPLOYEE` | Submit leave requests and view own requests.                                             |
| `MANAGER`  | View own and subordinate requests; approve/reject subordinate requests at manager stage. |
| `HR`       | View all requests, manage leave types, and perform final HR approvals/rejections.        |
| `ADMIN`    | Full access across the module.                                                           |

## API Summary

### Auth

- `POST /auth/login`

### Departments

- `GET /departments`
- `GET /departments/:id`
- `POST /departments`
- `PUT /departments/:id`
- `DELETE /departments/:id`

### Employees

- `GET /employees`
- `GET /employees/:id`
- `POST /employees`
- `PUT /employees/:id`
- `DELETE /employees/:id`

Assign an employee to a department by sending `departmentId` in `POST /employees` or `PUT /employees/:id`. Assign a manager by sending `managerId`.

### Leave Types

- `GET /leave-types`
- `GET /leave-types/:id`
- `POST /leave-types`
- `PUT /leave-types/:id`
- `DELETE /leave-types/:id`

### Leave Requests

- `POST /leave-requests`
- `GET /leave-requests`
- `GET /leave-requests/:id`
- `POST /leave-requests/:id/approve`
- `POST /leave-requests/:id/reject`

### Audit Logs

- `GET /audit-logs`

### Health

- `GET /health`

The Docker image includes a health check that calls this endpoint and verifies database connectivity.

## Validation Rules

The API uses `class-validator` and service-level business validation:

- Required DTO fields are enforced.
- Unknown request properties are rejected.
- Employee and leave type records must exist.
- Leave types must be active before they can be requested.
- End date cannot be before start date.
- Finalized requests cannot be approved or rejected again.
- Managers can only act on subordinate requests.
- HR can only act at the HR stage.

## Testing

Run unit tests:

```bash
npm test
```

Run a build:

```bash
npm run build
```
