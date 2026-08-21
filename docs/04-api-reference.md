# InternForge — REST API Reference

> Complete OpenAPI-style reference for every HTTP route exposed by the InternForge platform.
> All endpoints are server-rendered Next.js 16 Route Handlers (`src/app/api/**/route.ts`) backed by Prisma + SQLite.

**Base URL (REST):** `/api` (relative to the application origin)
**Base URL (WebSocket mini-service):** `/?XTransformPort=3003` (routed by the Caddy gateway to the socket.io service on port `3003`)
**Default content type:** `application/json`
**Default cache policy:** `no-store` (every response carries `Cache-Control: no-store` via the typed client; server routes return `NextResponse.json` which is no-store by default in the App Router)

---

## 1. Conventions

### 1.1 Request & response format
- All request bodies are JSON (`Content-Type: application/json`).
- All responses are JSON. Successful responses return the resource directly (single object) or an array of resources (list endpoints). There is **no envelope** on success — the resource IS the body.
- Paginated endpoints do **not** currently return a `{ data, total, page }` envelope; they return a flat array truncated to a sensible cap (see §1.3). The `Paginated<T>` helper exists in `src/lib/types.ts` for future use but is unused by live routes today.

### 1.2 Error shape
Every error response is a single JSON object:

```json
{
  "error": "Not found",
  "code": "NOT_FOUND"   // optional — not all routes populate this
}
```

### 1.3 Pagination & result caps
List endpoints truncate server-side to keep demo payloads small:

| Endpoint                  | Default cap | Order                          |
|---------------------------|-------------|--------------------------------|
| `GET /api/users`          | `take: 50`  | `name asc`                     |
| `GET /api/logs`           | `take: 30`  | `date desc`                    |
| `GET /api/notifications` | `take: 30`  | `createdAt desc`               |
| `GET /api/attendance`     | `take: 30`  | `date desc`                    |
| `GET /api/admin/audit`    | `take: 50`  | `createdAt desc`               |
| `GET /api/messages`       | `take: 1` per conversation (latest message only) | `createdAt desc` |

All other list endpoints return unbounded results (the seed dataset is small enough to make this safe for the demo).

### 1.4 HTTP status codes used

| Code | Meaning                                                              | Where used                                  |
|------|----------------------------------------------------------------------|---------------------------------------------|
| 200  | OK (default for GET, PATCH, POST that returns existing-or-created)   | Most routes                                 |
| 400  | Bad request — missing/invalid body field                             | `POST /api/submissions`, `POST /api/assessments/[id]/submit` |
| 404  | Resource not found / no demo user for role                           | `GET /api/internships/[id]`, `POST /api/internships/[id]/save`, `POST /api/submissions/[id]/plagiarism`, `GET /api/users/me`, `POST /api/assessments/[id]/submit`, `POST /api/ai/feedback`, `POST /api/ai/recommend`, `POST /api/ai/skill-analysis` |
| 500  | Server error (uncaught)                                              | Implicit (Next.js default)                  |

Routes that accept an `if-exists` semantics (e.g. `POST /api/applications`) return **200** with the existing record rather than 409 — see §4 for the conflict policy.

### 1.5 Caching
- Server routes do not set explicit `Cache-Control` headers; Next.js App Router defaults to `no-store` for dynamic routes.
- The typed client in `src/lib/api.ts` sets `cache: 'no-store'` on every `fetch` so intermediate CDN caches never serve stale data for the demo.
- Production deployments should add explicit `Cache-Control: private, no-store` and `Vary: Authorization` once auth is wired.

### 1.6 CORS
- Same-origin only by default (the Next.js app serves both UI and `/api`).
- The socket.io mini-service sets `cors: { origin: '*', methods: ['GET','POST'] }` so the WebSocket handshake can originate from any host in the sandbox.

---

## 2. Authentication & headers

### 2.1 Demo mode (current sandbox build)
There is **no authentication** in the demo build. Authorization is enforced client-side via the role switcher (`src/components/platform/role-switcher.tsx`) and the persisted `usePlatform` store (`src/lib/role-store.ts`). The role and selected `userId` are passed as **query parameters** to role-aware endpoints (e.g. `GET /api/users/me?role=STUDENT&userId=…`).

The typed client always sends `Content-Type: application/json`. No `Authorization` header is sent.

### 2.2 Production mode (intended upgrade path)
The intended production deployment wraps every `/api/*` route in **NextAuth.js v4** session validation. The recommended headers:

| Header            | Value                                                       |
|-------------------|-------------------------------------------------------------|
| `Authorization`   | `Bearer <nextauth.session.token>` (JWT, HS256, 30d)         |
| `X-Forwarded-For` | Set by Caddy gateway (`{remote_host}`) — used for audit IP  |
| `Content-Type`    | `application/json` for write bodies                         |

A `withAuth` middleware wrapper (planned) will reject any request without a valid session and populate `req.user = { id, role, companyId }` for downstream handlers. The current `/api/users/me` route already accepts an explicit `role` + `userId` query pair, which maps cleanly to `(session.user.role, session.user.id)` in production.

---

## 3. Resources

Routes are grouped by resource. Each entry documents: **method, path, query/body, response schema, example request, example response, error codes.** Field types come from `src/lib/types.ts`.

### 3.1 Users

#### `GET /api/users`
List platform users with optional role / company-membership filter.

| Query param      | Type    | Default   | Notes                                              |
|------------------|---------|-----------|----------------------------------------------------|
| `role`           | string  | —         | `STUDENT` \| `MENTOR` \| `COMPANY` \| `ADMIN` \| `RECRUITER` |
| `companyOnly`    | boolean | `false`   | `true` → only users with at least one `CompanyMembership` |

**Response:** `User[]` (with nested `companyMemberships[].company`).

**Example request:**
```http
GET /api/users?role=MENTOR&companyOnly=false
```

**Example response (truncated):**
```json
[
  {
    "id": "clx...",
    "email": "arjun.nair@internforge.io",
    "name": "Arjun Nair",
    "role": "MENTOR",
    "status": "ACTIVE",
    "companyMemberships": []
  }
]
```

#### `GET /api/users/me`
Resolve the "current" demo user for a role. Smart-picks the most relevant seed user per role (e.g. the mentor with the most assigned projects, the student with the most enrolled projects) so each portal renders rich data on first load.

| Query param | Type   | Default     | Notes                                                                  |
|-------------|--------|-------------|------------------------------------------------------------------------|
| `role`      | string | `STUDENT`   | One of the 5 roles                                                     |
| `userId`    | string | — (omitted) | If supplied, return that exact user (must match the `role`).           |

**Response:** `User & { company?: Company | null }` plus nested `userSkills`, `userBadges`.

**Errors:**

| Status | Body                                                  | When                                            |
|--------|-------------------------------------------------------|-------------------------------------------------|
| 404    | `{ "error": "No demo user for role" }`                | No user exists for the requested role           |

**Example request:**
```http
GET /api/users/me?role=STUDENT
```

---

### 3.2 Companies

#### `GET /api/companies`
List all companies, each with a slim `internships: [{ id, status }]` projection.

**Response:** `(Company & { internships: { id: string; status: string }[] })[]`

---

### 3.3 Internships

#### `GET /api/internships`
Marketplace listing with filters. Defaults to `status=OPEN`.

| Query param | Type    | Default | Notes                                                                  |
|-------------|---------|---------|------------------------------------------------------------------------|
| `status`    | string  | `OPEN`  | `OPEN` \| `CLOSED` \| `DRAFT` \| `ARCHIVED` \| `""` (all)             |
| `domain`    | string  | —       | Exact match (e.g. `Frontend`)                                          |
| `remote`    | boolean | —       | `true` \| `false`; omitted → both                                      |
| `companyId` | string  | —       | Restrict to a single company                                           |
| `q`         | string  | —       | Substring match on `title` OR `description`                            |

**Response:** `(Internship & { applicantsCount: number })[]`. Each row includes `company` and `_count.applications` flattened into `applicantsCount`.

**Example request:**
```http
GET /api/internships?status=OPEN&q=frontend&remote=true
```

**Example response (truncated):**
```json
[
  {
    "id": "clx...",
    "title": "Frontend Engineering Intern",
    "domain": "Frontend",
    "durationWeeks": 12,
    "remote": true,
    "status": "OPEN",
    "slots": 2,
    "skillsRequired": ["React", "TypeScript", "Next.js"],
    "applicantsCount": 3,
    "company": { "id": "clx...", "name": "FinEdge", "industry": "Fintech" }
  }
]
```

#### `GET /api/internships/[id]`
Single internship detail with `company`, `assessments`, and `applicantsCount`.

**Path param:** `id` (cuid)

**Response:** `Internship & { assessments: Assessment[]; applicantsCount: number }`

**Errors:** `404 { "error": "Not found" }` if the internship doesn't exist.

#### `POST /api/internships/[id]/save`
Toggle "saved" status for the active user. **Demo placeholder** — does not yet persist; always returns `{ saved: true, internshipId: id }`. Production should write a `SavedInternship` row.

**Path param:** `id` (cuid)

**Response:**
```json
{ "saved": true, "internshipId": "clx..." }
```

**Errors:** `404 { "error": "Not found" }`.

---

### 3.4 Applications

#### `GET /api/applications`
List applications with multi-axis filters.

| Query param    | Type   | Notes                                                 |
|----------------|--------|-------------------------------------------------------|
| `studentId`    | string | Restrict to one student                               |
| `internshipId` | string | Restrict to one internship                            |
| `companyId`    | string | Filter via `internship.companyId` (relational)        |
| `status`       | string | `SUBMITTED` \| `SCREENING` \| `INTERVIEW` \| `OFFERED` \| `ACCEPTED` \| `REJECTED` \| `WITHDRAWN` \| `DRAFT` |

**Response:** `Application[]` (each with nested `internship.company`, `student`, `interviews`).

#### `POST /api/applications`
Apply to an internship. In the demo, the student is auto-picked (first `STUDENT` user by `createdAt asc`) if not provided. **Idempotent** — if an existing application for the same `internshipId`+`studentId` exists, it is returned as-is (200, not 201/409).

**Request body:**
```json
{ "internshipId": "clx...", "coverLetter": "I would love to..." }
```

**Response:** `Application & { internship: { company: Company } }`. A random `matchScore` between 60–94 is assigned; `status` defaults to `SUBMITTED`.

**Errors:** `400 { "error": "No student" }` if no student user exists in the DB.

#### `PATCH /api/applications/[id]`
Update application status. Also writes an `AuditLog` entry (`action=UPDATE`, `resource=Application`, `severity=INFO`).

**Path param:** `id` (cuid)

**Request body:**
```json
{ "status": "OFFERED" }
```

**Response:** `Application & { internship: { company }, student }`

---

### 3.5 Projects

#### `GET /api/projects`
List projects, optionally scoped to a student or mentor.

| Query param | Type   | Notes                              |
|-------------|--------|------------------------------------|
| `studentId` | string | Projects where `studentId` matches |
| `mentorId`  | string | Projects where `mentorId` matches  |

**Response:** `Project[]` with nested `student`, `mentor`, `internship.company`, `milestones` (ordered by `order`), `tasks` (ordered by `order`), and `_count` of `submissions` + `evaluations`.

#### `GET /api/projects/[id]`
Full project detail with deeply nested relations for the project workspace view.

**Response:** `Project` with nested:
- `student`, `mentor`, `internship.company`
- `milestones` (ordered by `order`)
- `tasks` (ordered by `order`, with `assignee`)
- `submissions` (ordered by `submittedAt desc`, each with `evaluations.mentor`)
- `evaluations` (ordered by `createdAt desc`, each with `mentor`)

**Errors:** `404 { "error": "Not found" }`.

---

### 3.6 Tasks (Kanban)

#### `GET /api/tasks`
List tasks. Each row includes `assignee` and `project`.

| Query param  | Type   | Notes                              |
|--------------|--------|------------------------------------|
| `projectId`  | string | Tasks within a project             |
| `assigneeId` | string | Tasks assigned to a user           |

**Response:** `Task[]` (ordered by `order asc`).

#### `POST /api/tasks`
Create a task at the end of the board. `order` is auto-computed as `count(*)` for the project.

**Request body:**
```json
{
  "projectId": "clx...",
  "title": "Implement login form",
  "description": "Email + password with validation",
  "status": "TODO",
  "priority": "MEDIUM",
  "assigneeId": "clx...",
  "dueDate": "2025-09-30",
  "estimateHours": 6,
  "tags": ["frontend", "auth"]
}
```

Only `projectId` and `title` are required. Defaults: `status=TODO`, `priority=MEDIUM`, `tags=[]`.

**Response:** `Task`.

#### `PATCH /api/tasks/[id]`
Move a task on the kanban board (status/order/priority/assignee).

**Path param:** `id` (cuid)

**Request body (any subset):**
```json
{ "status": "IN_PROGRESS", "order": 2 }
```

**Response:** `Task` (updated).

---

### 3.7 Submissions

#### `GET /api/submissions`
List submissions, each with `student`, `project`, `task`, and `evaluations.mentor`.

| Query param  | Type   | Notes                            |
|--------------|--------|----------------------------------|
| `studentId`  | string | Submissions by a student         |
| `projectId`  | string | Submissions for a project        |
| `status`     | string | `SUBMITTED` \| `REVIEWED` \| `APPROVED` \| `REVISION_REQUESTED` |

**Response:** `Submission[]` (ordered by `submittedAt desc`).

#### `POST /api/submissions`
Create a new submission. The student defaults to the first `STUDENT` user. `version` is auto-incremented per project (`count(*) + 1`). A trivial `plagiarismScore` between 0 and 0.15 is seeded; `status=SUBMITTED`.

**Request body:**
```json
{
  "projectId": "clx...",
  "taskId": "clx...",
  "studentId": "clx...",
  "title": "Login form v1",
  "content": "import React from 'react'..."
}
```

Only `projectId`, `title`, `content` are required.

**Response:** `Submission & { project: Project }`.

**Errors:** `400 { "error": "No student" }` if no student user exists.

#### `POST /api/submissions/[id]/plagiarism`
Run a deterministic **heuristic plagiarism re-score** on the submission. Updates `plagiarismScore` and sets `status=REVIEWED`.

The heuristic computes word-repetition ratio (`(words - unique) / words`) scaled by 1.4, adds 0.10 if the literal token `TODO` appears, then clamps to `[0.02, 0.95]`. This is a placeholder for an embedding/external service in production.

**Path param:** `id` (cuid)

**Response:**
```json
{ "score": 0.18, "submission": { /* Submission */ } }
```

**Errors:** `404 { "error": "Not found" }`.

---

### 3.8 Evaluations

#### `GET /api/evaluations`
List evaluations, each with `mentor`, `submission.student`, `project`.

| Query param | Type   | Notes                              |
|-------------|--------|------------------------------------|
| `mentorId`  | string | Evaluations authored by a mentor   |
| `projectId` | string | Evaluations for a project          |

**Response:** `Evaluation[]` (ordered by `createdAt desc`).

#### `POST /api/evaluations`
Create an evaluation. The composite `score` is computed server-side as the integer mean of `codeQuality` + `communication` + `delivery` + `learning`. The related submission is automatically moved to `status=APPROVED`.

**Request body:**
```json
{
  "submissionId": "clx...",
  "projectId": "clx...",
  "mentorId": "clx...",
  "codeQuality": 85,
  "communication": 80,
  "delivery": 88,
  "learning": 82,
  "feedback": "Strong work...",
  "aiFeedback": "AI suggested: ...",
  "strengths": ["Clean structure"],
  "improvements": ["Add tests"]
}
```

Required: `submissionId`, `projectId`, `mentorId` + the four numeric dimensions. Other fields default to `""` or `[]`.

**Response:** `Evaluation` (created).

---

### 3.9 Skills

#### `GET /api/skills`
List skills, optionally scoped to a single user.

| Query param | Type   | Notes                                                                   |
|-------------|--------|-------------------------------------------------------------------------|
| `userId`    | string | Returns skills the user has tracked, with their `userSkills` row joined |

Without `userId`, returns all skills ordered by `category asc`. With `userId`, only skills where the user has a `UserSkill` are returned, each carrying its `userSkills[]` filtered to that user.

#### `GET /api/skills/gap`
Compute the gap between a student's current skill levels and the requirements of an internship. The reference target is **75%**.

| Query param    | Type   | Notes                                |
|----------------|--------|--------------------------------------|
| `userId`       | string | **Required.**                        |
| `internshipId` | string | **Required.**                        |

**Response:**
```json
{
  "skills": [
    { "name": "React",     "current": 72, "required": true,  "gap": 3  },
    { "name": "TypeScript","current": 50, "required": true,  "gap": 25 },
    { "name": "GraphQL",  "current": 40, "required": false, "gap": 0  }
  ]
}
```

`required=true` rows are derived from the internship's `skillsRequired` JSON. `required=false` rows are the student's other tracked skills shown for context. `gap = max(0, 75 - current)`.

**Errors:** `200 { "skills": [] }` if the internship doesn't exist.

---

### 3.10 Assessments

#### `GET /api/assessments`
List assessments, optionally scoped to an internship. If `userId` is supplied, each assessment carries its `results` filtered to that user, exposed as `result` (the first matching row or `null`).

| Query param    | Type   | Notes                              |
|----------------|--------|------------------------------------|
| `internshipId` | string | Assessments for an internship      |
| `userId`       | string | Join the user's `AssessmentResult` |

**Response:** `(Assessment & { result?: AssessmentResult | null })[]`.

#### `POST /api/assessments/[id]/submit`
Submit answers for an assessment. The server scores automatically: each question's `selected` is compared to the canonical `answer`; correct count is scaled by `maxScore`. Result rows are **upserted** (`@@unique([assessmentId, userId])`), so retaking replaces the prior score.

**Path param:** `id` (cuid, the assessment)

**Request body:**
```json
{
  "userId": "clx...",
  "answers": [
    { "id": "q1", "selected": "B" },
    { "id": "q2", "selected": "A" }
  ]
}
```

**Response:** `AssessmentResult`. Auto-feedback is `"Strong work."` when `score ≥ 80`, else `"Review fundamentals."`.

**Errors:**

| Status | Body                                          | When                                       |
|--------|-----------------------------------------------|--------------------------------------------|
| 400    | `{ "error": "userId required" }`             | `userId` missing in body                   |
| 404    | `{ "error": "Not found" }`                   | Assessment id doesn't exist                |

---

### 3.11 Certificates

#### `GET /api/certificates`
List certificates, optionally scoped to a user. Each carries `user`, `internship.company`, `project`.

| Query param | Type   | Notes                  |
|-------------|--------|------------------------|
| `userId`    | string | Filter by recipient    |

#### `POST /api/certificates`
Generate a new certificate. Computes the grade from the project's average evaluation score (default 85 if no evaluations), mints a unique `certificateNumber` (`IF-CERT-2025-NNNN`), a 6-char verification code (`IF-VERIFY-XXXXXX`), and a `qrData` link. Skills seeded from the project title's first word.

**Request body:**
```json
{ "userId": "clx...", "projectId": "clx...", "internshipId": "clx..." }
```

Required: `userId`, `projectId`. `internshipId` optional.

**Grade thresholds:**

| Avg score | Grade |
|-----------|-------|
| ≥ 90      | A+    |
| ≥ 80      | A     |
| ≥ 70      | B+    |
| ≥ 60      | B     |
| < 60      | C     |

**Response:** `Certificate & { user, internship.company, project }`.

#### `GET /api/certificates/verify`
Verify a certificate by its public `verificationCode`. Used by the public verification portal.

| Query param | Type   | Notes                       |
|-------------|--------|-----------------------------|
| `code`      | string | The `IF-VERIFY-XXXXXX` code |

**Response:**

| Outcome | Body                                                       |
|---------|------------------------------------------------------------|
| Valid   | `{ "valid": true, "certificate": Certificate }`            |
| Invalid | `{ "valid": false }` (no `code` query, or no matching row) |

---

### 3.12 Daily Logs

#### `GET /api/logs`
List daily logs for a user (most recent 30).

| Query param | Type   | Notes                 |
|-------------|--------|-----------------------|
| `userId`    | string | **Required.**         |

**Response:** `DailyLog[]` (ordered by `date desc`).

#### `POST /api/logs`
Upsert a daily log for a user + internship + date triple (`@@unique([userId, internshipId, date])`). The date is normalized to midnight local. If `internshipId` is omitted, the literal string `"none"` is used as the upsert key for demo convenience.

**Request body:**
```json
{
  "userId": "clx...",
  "internshipId": "clx...",
  "date": "2025-08-21",
  "content": "Worked on login form...",
  "hoursSpent": 4.5,
  "mood": "GOOD",
  "tasksCompleted": ["login-form", "tests"]
}
```

Required: `userId`, `content`. Defaults: `hoursSpent=0`, `mood="GOOD"`, `tasksCompleted=[]`.

**Response:** `DailyLog`.

---

### 3.13 Attendance

#### `GET /api/attendance`
List attendance records for a user (most recent 30).

| Query param | Type   | Notes         |
|-------------|--------|---------------|
| `userId`    | string | **Required.** |

**Response:** `Attendance[]` (ordered by `date desc`).

> **Note:** No write endpoint exists for attendance in the demo. The mentor portal's "Mark today" control is a non-persistent toast (see Mentor Portal Builder worklog).

---

### 3.14 Notifications

#### `GET /api/notifications`
List a user's notifications (most recent 30).

| Query param | Type   | Notes         |
|-------------|--------|---------------|
| `userId`    | string | **Required.** |

#### `PATCH /api/notifications/[id]`
Mark a notification as read.

**Path param:** `id` (cuid)

**Request body:**
```json
{ "read": true }
```

(The handler always sets `read=true`; the body is accepted for shape parity with future flags.)

**Response:** `Notification` (updated).

---

### 3.15 Messages

#### `GET /api/messages`
List conversations the user is a member of, each with `members[].user` and the **single most recent** message (`take: 1`, `createdAt desc`).

| Query param | Type   | Notes         |
|-------------|--------|---------------|
| `userId`    | string | **Required.** |

**Response:** `Conversation[]` with `members[].user` and `messages: [Message]` (length 1).

> **Known gap:** Full message history per conversation is not exposed. A future `GET /api/messages/[conversationId]` route is recommended (see Student Portal Builder worklog).

#### `POST /api/messages`
Send a text message in a conversation. `type=TEXT`, `readBy=[senderId]`.

**Request body:**
```json
{ "conversationId": "clx...", "senderId": "clx...", "content": "Hi Sara!" }
```

**Response:** `Message & { sender: User }`.

---

### 3.16 Announcements

#### `GET /api/announcements`
List announcements, optionally scoped to an internship. Pinned items float to the top via `orderBy: { pinned: 'desc' }`.

| Query param    | Type   | Notes                          |
|----------------|--------|--------------------------------|
| `internshipId` | string | Restrict to one internship      |

**Response:** `(Announcement & { author: User })[]`.

> **Note:** No POST route exists for announcements in the demo. The Company Portal "Broadcast" dialog is a non-persistent toast.

---

### 3.17 Onboarding

#### `GET /api/onboarding`
List onboarding tasks.

| Query param    | Type   | Notes                              |
|----------------|--------|------------------------------------|
| `internshipId` | string | Tasks for an internship             |
| `userId`       | string | Tasks assigned to a user            |

**Response:** `OnboardingTask[]` (ordered by `order asc`).

#### `PATCH /api/onboarding/[id]`
Update an onboarding task's status (`PENDING` → `IN_PROGRESS` → `DONE`).

**Path param:** `id` (cuid)

**Request body:**
```json
{ "status": "DONE" }
```

**Response:** `OnboardingTask` (updated).

---

### 3.18 Badges

#### `GET /api/badges`
List a user's earned badges.

| Query param | Type   | Notes         |
|-------------|--------|---------------|
| `userId`    | string | **Required.** |

**Response:** `(UserBadge & { badge: Badge })[]` (ordered by `awardedAt desc`).

---

### 3.19 Feedback

#### `GET /api/feedback`
List feedback, filtered by author or recipient.

| Query param  | Type   | Notes                          |
|--------------|--------|--------------------------------|
| `fromUserId` | string | Feedback authored by this user |
| `toUserId`   | string | Feedback received by this user |

**Response:** `(Feedback & { fromUser, toUser })[]` (ordered by `createdAt desc`).

#### `POST /api/feedback`
Create feedback. Defaults: `rating=5`, `type="WEEKLY"`.

**Request body:**
```json
{
  "fromUserId": "clx...",
  "toUserId": "clx...",
  "internshipId": "clx...",
  "rating": 5,
  "content": "Great progress this week on...",
  "type": "WEEKLY"
}
```

Required: `fromUserId`, `toUserId`, `content`. `type` ∈ `WEEKLY | MID | FINAL | SPONTANEOUS`.

**Response:** `Feedback & { fromUser, toUser }`.

---

### 3.20 Analytics

#### `GET /api/analytics/overview`
Role-aware aggregate metrics for portal dashboards. Always returns `totals`; additional blocks are added per role.

| Query param | Type   | Notes                                  |
|-------------|--------|----------------------------------------|
| `role`      | string | `STUDENT` \| `MENTOR` \| `COMPANY` \| `RECRUITER` \| `ADMIN` (default `STUDENT`) |
| `userId`    | string | Required for `STUDENT` and `MENTOR` blocks |

**Response shape (composite, varies by role):**

```jsonc
{
  "totals": {
    "totalUsers": 8, "totalInternships": 6, "totalApplications": 8,
    "totalProjects": 2, "totalSubmissions": 3, "totalCertificates": 1
  },
  "student": {                    // role=STUDENT & userId
    "applications": 2, "accepted": 1, "projects": 1, "submissions": 2,
    "evaluations": 2, "avgSkill": 64, "skillGrowth": 22,
    "certificates": 1, "badges": 2, "logs": 5, "attendanceRate": 80,
    "skillCount": 6
  },
  "skillTrend": [ { "week": "W1", "value": 35 }, /* ... 8 weeks */ ],
  "mentor": {                     // role=MENTOR & userId
    "mentees": 2, "projects": 2, "pendingReviews": 1,
    "evaluations": 2, "avgScore": 84
  },
  "workload": [ { "week": "W1", "reviews": 1 }, /* ... 6 weeks */ ],
  "company": {                    // role=COMPANY or RECRUITER
    "internships": 6, "applications": 8, "accepted": 2, "offered": 1,
    "activeProjects": 1, "conversionRate": 25
  },
  "funnel": [
    { "stage": "Submitted", "count": 3 },
    { "stage": "Screening", "count": 1 },
    { "stage": "Interview", "count": 1 },
    { "stage": "Offered",   "count": 1 },
    { "stage": "Accepted",  "count": 2 }
  ],
  "admin": {                      // role=ADMIN
    "byRole": [ { "role": "STUDENT", "count": 4 }, /* ... */ ],
    "auditEvents": 12, "flagged": 1
  },
  "signups": [ { "month": "Jul", "value": 23 }, /* ... 6 months */ ]
}
```

The `student.skillTrend`, `mentor.workload`, and `admin.signups` arrays are deterministic-but-mock time series derived from the live aggregate (e.g. `avgSkill * 0.55 + ...`) so charts render sensibly even on a tiny demo dataset.

---

### 3.21 Admin

#### `GET /api/admin/audit`
List audit log entries (most recent 50).

| Query param | Type   | Notes                                                |
|-------------|--------|------------------------------------------------------|
| `severity`  | string | `INFO` \| `WARN` \| `ERROR` \| `CRITICAL`            |

**Response:** `(AuditLog & { user: User | null })[]` (ordered by `createdAt desc`).

#### `GET /api/admin/settings`
List platform settings (`PlatformSetting` rows).

**Response:** `PlatformSetting[]` (each `{ id, key, value, updatedAt }`).

#### `PATCH /api/admin/settings`
Upsert a single platform setting.

**Request body:**
```json
{ "key": "features.aiFeedback", "value": "true" }
```

**Response:** `PlatformSetting` ({ id, key, value, updatedAt }).

#### `GET /api/admin/health`
Health-check probe used by the Admin Portal health view.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-08-21T12:34:56.789Z",
  "database": "connected",
  "version": "1.0.0"
}
```

If the DB `count` query throws, `status` degrades to `"degraded"` and `database` to `"disconnected"` (still returns 200 — the route never throws).

#### `POST /api/admin/seed`
Re-seed the database. **Demo-safe stub** — returns immediately with a hint that seeding is run out-of-band via `bun prisma/seed.ts`.

**Response:**
```json
{ "ok": true, "message": "Seed is managed via `bun prisma/seed.ts`." }
```

---

### 3.22 AI

> All four AI routes call the **`z-ai-web-dev-sdk`** server-side (`src/lib/zai.ts`) and **always return a usable response** — if the LLM call fails or returns malformed JSON, a deterministic fallback is returned instead. See `docs/05-ai-features.md` for the full system prompts and design notes.

#### `POST /api/ai/feedback`
Generate structured mentor-style feedback on a submission. Used by the Mentor Portal `reviews` view ("Generate AI feedback" button).

**Request body:**
```json
{ "submissionId": "clx..." }
```

**Response:**
```json
{
  "feedback": "Solid submission with clear structure...",
  "strengths": ["Readable structure", "Reasonable naming"],
  "improvements": ["Cover edge cases", "Add regression tests"],
  "score": 80
}
```

**Errors:** `404 { "error": "Not found" }` if the submission doesn't exist.

#### `POST /api/ai/recommend`
Generate the top 4 internship recommendations for a student based on their skill profile. Used by the Student Portal `discover` view banner.

**Request body:**
```json
{ "userId": "clx..." }
```

**Response:**
```json
{
  "recommendations": [
    { "internshipId": "clx...", "score": 86, "reasons": ["Relevant domain", "Skill overlap"] },
    { "internshipId": "clx...", "score": 78, "reasons": ["Company growth trajectory"] }
  ]
}
```

**Errors:** `404 { "error": "User not found" }`.

#### `POST /api/ai/skill-analysis`
Map a student's internship work to industry-standard skills. Used by the Student Portal `skills` view ("AI skill analysis" button). Returns an analysis paragraph and a per-skill mapping with `Beginner | Intermediate | Advanced` levels and concrete evidence.

**Request body:**
```json
{ "userId": "clx..." }
```

**Response:**
```json
{
  "analysis": "Your internship work demonstrates measurable growth, particularly in applied engineering skills...",
  "mapped": [
    { "skill": "React",        "level": "Advanced",     "evidence": "ForgeUI project — login form implementation" },
    { "skill": "TypeScript",   "level": "Intermediate", "evidence": "Type-safe API client and Prisma models" }
  ]
}
```

**Errors:** `404 { "error": "User not found" }`.

#### `POST /api/ai/chat`
Free-form conversational mentor assistant. Used by the Student Portal `chat` view when "AI Mentor" mode is toggled on. The system prompt enforces the persona "Forge, an AI mentor assistant inside InternForge" and forbids inventing credentials.

**Request body:**
```json
{ "message": "How should I structure my week?", "context": "Working on the login form, due Friday" }
```

`context` is optional.

**Response:**
```json
{ "reply": "Here's a suggested plan: Mon-Tue — scaffold components..." }
```

**Errors:** None (always returns 200 with either the LLM reply or a deterministic fallback reply).

---

## 4. Error codes (standardized)

| Status | code (when populated) | Meaning                                                             | Example trigger                                                       |
|--------|-----------------------|---------------------------------------------------------------------|-----------------------------------------------------------------------|
| 400    | `VALIDATION`           | Required body field missing or malformed                            | `POST /api/submissions` without `title`; `POST /api/assessments/[id]/submit` without `userId` |
| 404    | `NOT_FOUND`            | Resource id does not exist                                          | `GET /api/internships/[id]`, `POST /api/submissions/[id]/plagiarism` |
| 404    | `NOT_FOUND`            | No demo user exists for the requested role                          | `GET /api/users/me?role=MENTOR` on an empty DB                       |
| 409    | n/a                    | **Not used** — `POST /api/applications` is idempotent and returns the existing row instead of 409 | Duplicate application              |
| 500    | `INTERNAL`             | Uncaught server error (Next.js default error page)                  | Prisma connection lost; unexpected throw                              |

### Conflict policy
Two POST endpoints are deliberately idempotent to keep the demo resilient:
- **`POST /api/applications`** — returns the existing application if one already exists for `(studentId, internshipId)`.
- **`POST /api/assessments/[id]/submit`** — upserts the result on `@@unique([assessmentId, userId])`.

Neither route emits a 409.

---

## 5. Rate limiting

There is **no rate limiting** in the sandbox build. Production deployments should add a layered policy:

| Layer            | Tooling                                  | Recommended policy                                                            |
|------------------|------------------------------------------|-------------------------------------------------------------------------------|
| Edge (gateway)   | Caddy `rate_limit` or Cloudflare WAF    | 600 req / min / IP for `/api/*`; 60 req / min / IP for `/api/admin/*`         |
| App (per route)  | Next.js middleware + Redis token bucket | 120 req / min / user for write routes; 30 req / min / user for `/api/ai/*`    |
| AI routes        | Dedicated token bucket per user         | 20 req / hour / user — LLM calls are expensive (see §10 of `05-ai-features.md`) |

The AI routes are the highest-leverage place to add limits first — they incur real per-call cost and can take ~8–10 s each (see §10).

---

## 6. WebSocket events

InternForge ships a small socket.io mini-service at `mini-services/chat-service/index.ts`, running on port **3003**. The browser connects via the **Caddy gateway** using the `XTransformPort` query convention (see `Caddyfile`):

```
socket.io('/?XTransformPort=3003', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 8,
  reconnectionDelay: 1200,
  timeout: 12000,
})
```

### 6.1 Connection lifecycle
- The browser singleton lives in `src/lib/socket.ts`. It lazily creates one socket per tab and exposes `getSocket()` / `disconnectSocket()`.
- `path: '/'` is fixed on the server and **must not be changed** — Caddy routes via the `XTransformPort` query, not a custom path.
- Transports: `['websocket', 'polling']` (polling fallback for restrictive networks).
- `pingInterval: 25000`, `pingTimeout: 60000` on the server.

### 6.2 Event reference

#### Client → Server

| Event                | Payload                                                              | Effect                                                                                  |
|----------------------|----------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `identify`           | `{ id, name, role, avatarUrl? }`                                     | Registers the socket for presence broadcasts; emits `presence` to all clients.          |
| `join:conversation`  | `conversationId: string`                                             | Joins socket.io room `conv:<id>` for chat message fan-out.                              |
| `leave:conversation` | `conversationId: string`                                             | Leaves `conv:<id>`.                                                                      |
| `message`            | `{ conversationId, senderId, senderName, senderAvatar?, content, createdAt, type? }` | Broadcasts to `conv:<id>` via `message` event.                            |
| `typing`             | `{ conversationId, userId, name, typing: boolean }`                 | Relays typing indicator to other members of `conv:<id>` (not echoed back to sender).   |
| `join:user`          | `userId: string`                                                    | Joins `user:<id>` room for personal notification fan-out.                               |
| `notify`             | `{ userId, notification: any }`                                     | Emits `notification` to `user:<userId>` room.                                          |
| `join:project`       | `projectId: string`                                                 | Joins `project:<id>` room for kanban task live updates.                                |
| `task:moved`         | `{ projectId, taskId, status, order?, userId }`                    | Emits `task:moved` to other members of `project:<id>` (not echoed to sender).          |

#### Server → Client

| Event          | Payload                                                                 | When                                                                          |
|----------------|-------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| `presence`     | `Presence[]` (`{ id, name, role, avatarUrl? }`)                         | On every `identify` and every `disconnect`.                                  |
| `message`      | `{ conversationId, senderId, senderName, senderAvatar?, content, createdAt, type? }` | When any client in the conversation emits `message`. |
| `typing`       | `{ conversationId, userId, name, typing }`                              | When a peer in the same conversation emits `typing`.                          |
| `notification` | `Notification` (any shape)                                               | When a server-side or peer emits `notify` to the user's room.                |
| `task:moved`   | `{ projectId, taskId, status, order?, userId }`                        | When a peer in the same project emits `task:moved`.                          |

### 6.3 Room convention

| Room pattern       | Joined via            | Used by                          |
|--------------------|-----------------------|----------------------------------|
| `conv:<id>`        | `join:conversation`   | Real-time chat                   |
| `user:<id>`        | `join:user`           | Personal notification fan-out   |
| `project:<id>`     | `join:project`        | Kanban drag-and-drop sync       |

### 6.4 Disconnect handling
On `disconnect`, the server looks up the socket's presence entry, removes it from the in-memory `Map<socketId, Presence>`, and broadcasts the updated presence list to all connected clients. No persistence layer is involved — presence is purely ephemeral.

### 6.5 Production notes
- Replace `cors: { origin: '*' }` with the production origin allowlist.
- Move presence from the in-memory `Map` to Redis (so it survives multi-process / multi-node horizontal scaling).
- Authenticate the socket handshake via a NextAuth-issued JWT in the `auth` field of `io({ auth: { token } })`; reject unauthenticated handshakes.
- Add per-room rate limiting to prevent `message` / `task:moved` floods.
