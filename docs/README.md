# InternForge — Documentation

> **InternForge** is a production-ready internship management platform that turns the student journey — from discovering an internship to earning a verified certificate — into a single, measurable, AI-assisted experience. Built with Next.js 16 + TypeScript + Tailwind 4 + shadcn/ui + Prisma + z-ai-web-dev-sdk, it ships four portals (Student / Mentor / Company / Admin), 27 domain models, 41 API routes, four AI features, and a real-time WebSocket layer — all wrapped in a premium glassmorphic, emerald-and-amber design system.

---

## Quick links

| # | Document                          | One-line description                                                                                                                            |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 01 | `01-architecture.md`              | System architecture: process model, request flow, the Caddy gateway trick, the role-switcher pattern, the four-portal composition.              |
| 02 | `02-api-reference.md`             | Every API route, request/response shapes, query params, error codes — the contract between portals and persistence.                              |
| 03 | `03-database-schema.md`           | The 27 Prisma models, their relationships, indexes, and the seed data that powers the demo.                                                    |
| 04 | `04-data-flow.md`                 | How data moves through the platform: from a student applying, to a mentor evaluating, to a certificate being minted and verified.                |
| 05 | `05-ai-features.md`                | The four AI features (recommend, chat, feedback, skill-analysis), the z-ai-web-dev-sdk integration, and the graceful-fallback design.         |
| 06 | `06-realtime.md`                   | The chat-service: socket.io rooms, presence, typing, notification fan-out, kanban task-moved broadcast — and the Caddy gateway routing.       |
| 07 | [`07-design-system.md`](./07-design-system.md) | The visual language: tokens, typography, components, layouts, motion, accessibility.                                                |
| 08 | [`08-deployment-devops.md`](./08-deployment-devops.md) | Local setup, Docker, Kubernetes, CI/CD, env vars, migrations, monitoring, backups, and the production launch checklist.            |
| 09 | [`09-testing-qa.md`](./09-testing-qa.md)     | The testing pyramid: unit, integration, E2E (Playwright), security, load, accessibility, visual regression, sandbox QA loop, bug triage.   |
| 10 | [`10-roadmap.md`](./10-roadmap.md)         | Current state, the 12-month quarterly roadmap (Q1–Q4 2025), backlog, risks, and success metrics.                                       |

> Docs 01–06 are owned by parallel doc agents; if a file is missing from this folder, see the worklog for the latest draft. 07–10 are the canonical versions delivered by Task D3.

---

## Quickstart

Four steps to a running platform.

```bash
# 1. Install deps (Bun required, Node 18+ fallback)
bun install

# 2. Configure .env (see docs/08 §3.1 for the exact contents)
cat > .env <<'EOF'
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="dev-secret-change-me-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:81"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
EOF

# 3. Push the schema + seed rich demo data
bun run db:push
bun prisma/seed.ts

# 4. Start the dev server (and the chat-service in a second terminal)
bun run dev
cd mini-services/chat-service && bun install && bun run dev
```

Open **http://localhost:3000/**. You'll land on the Student portal as Sara Kapoor (accepted at FinEdge, working on the ForgeUI project).

### Switching roles

There's no login flow in v1.0 — the platform uses a **role switcher** in the top-right of the header.

| Action                              | How                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Switch role                         | Click the green `Student` button (top-right) → pick a role from the menu. |
| Pick a different demo user of a role | Click the avatar+name button next to the role switcher → pick a user.     |
| Toggle dark / light theme           | Click the moon/sun icon next to the role switcher.                       |
| See real-time notifications         | Click the bell icon (badge count = unread).                              |

The role/user pair is persisted in `localStorage` (`internforge-platform` key), so reloading the page preserves your view.

---

## Project structure

```
internforge/
├── prisma/
│   ├── schema.prisma          # 27 models: User, Company, Internship, Application, Project,
│   │                          #   Milestone, Task, Submission, Evaluation, Skill, UserSkill,
│   │                          #   Assessment, AssessmentResult, Certificate, DailyLog, Attendance,
│   │                          #   Feedback, Conversation, Message, Notification, Announcement,
│   │                          #   OnboardingTask, Badge, AuditLog, PlatformSetting, + composite types
│   └── seed.ts                # Rich demo data: 8 users, 4 companies, 6 internships, 2 projects…
│
├── src/
│   ├── app/
│   │   ├── api/               # 41 route handlers across 23 resource groups
│   │   │   ├── users/           # GET /api/users  · GET /api/users/me?role=…
│   │   │   ├── companies/       # GET /api/companies
│   │   │   ├── internships/     # GET, POST · GET /:id · POST /:id/save
│   │   │   ├── applications/    # GET, POST · PATCH /:id
│   │   │   ├── projects/        # GET, GET /:id
│   │   │   ├── tasks/           # GET, POST · PATCH /:id/move
│   │   │   ├── submissions/     # GET, POST · POST /:id/plagiarism
│   │   │   ├── evaluations/     # GET, POST
│   │   │   ├── skills/          # GET · GET /gap
│   │   │   ├── assessments/     # GET · POST /:id/submit
│   │   │   ├── certificates/   # GET, POST · POST /verify
│   │   │   ├── logs/            # GET (and upsert)
│   │   │   ├── messages/        # GET conversations · POST send
│   │   │   ├── notifications/   # GET · PATCH /:id
│   │   │   ├── announcements/   # GET
│   │   │   ├── onboarding/      # GET · PATCH /:id
│   │   │   ├── badges/          # GET
│   │   │   ├── feedback/        # GET, POST
│   │   │   ├── attendance/      # GET
│   │   │   ├── analytics/       # GET /overview?role=…
│   │   │   ├── admin/           # GET audit · GET settings · POST seed · GET health
│   │   │   └── ai/              # POST chat · POST recommend · POST feedback · POST skill-analysis
│   │   ├── layout.tsx          # Geist fonts, metadata, ThemeProvider, Sonner toaster
│   │   ├── page.tsx            # Orchestrator: loads current user → renders Shell + active portal
│   │   └── globals.css         # Design tokens (OKLCH), glass utilities, dark mode, animations
│   │
│   ├── components/
│   │   ├── platform/
│   │   │   ├── shared.tsx       # 14 shared primitives (PageHeader, GlassCard, StatCard, …)
│   │   │   ├── shell.tsx        # Sticky header + sidebar + sticky footer + responsive drawer
│   │   │   ├── nav-config.tsx   # Per-role sidebar nav (12 / 8 / 7 / 5 / 8 items)
│   │   │   ├── role-switcher.tsx
│   │   │   ├── theme-toggle.tsx
│   │   │   ├── notification-bell.tsx
│   │   │   └── theme-provider.tsx
│   │   ├── portals/
│   │   │   ├── student/student-portal.tsx    # 12 views, ~2 240 lines
│   │   │   ├── mentor/mentor-portal.tsx      # 8 views, ~1 935 lines
│   │   │   ├── company/company-portal.tsx    # 7 views, ~1 200 lines
│   │   │   └── admin/admin-portal.tsx       # 8 views, ~1 050 lines
│   │   └── ui/                 # Full shadcn/ui registry (button, card, dialog, table, …)
│   │
│   └── lib/
│       ├── db.ts               # Prisma client singleton
│       ├── types.ts            # Domain types + STUDENT_JOURNEY constant
│       ├── format.ts           # Date / initials / status-color helpers
│       ├── api.ts              # Typed client API for every resource
│       ├── zai.ts              # z-ai-web-dev-sdk wrapper (chat / chatJson with fallbacks)
│       ├── role-store.ts       # Zustand persisted role/user/view
│       ├── socket.ts           # socket.io-client singleton
│       └── utils.ts           # cn() classnames helper
│
├── mini-services/
│   └── chat-service/           # Socket.io server on port 3003 (presence, rooms, notifications, task:moved)
│
├── docs/                       # This documentation set (01 → 10)
│
├── Caddyfile                   # Gateway on :81 — routes /?XTransformPort=* to that port, default :3000
├── package.json                # Next 16, Prisma 6, React 19, framer-motion 12, recharts 2, zod 4, etc.
└── worklog.md                  # Build log + handover notes per agent / task
```

---

## Where to go next

Depending on your role, here's where to start.

| Role               | Start here                                                                                                  | Then read…                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Product**        | `10-roadmap.md` §1 (current state) + §2 (vision)                                                              | `07-design-system.md` §1 (philosophy), `09-testing-qa.md` §10 (triage) |
| **Engineer**      | `01-architecture.md` (system model) + `02-api-reference.md` (contracts) + `src/components/platform/shared.tsx` | `09-testing-qa.md` §2–4 (test patterns), `08-deployment-devops.md` §6 (CI/CD) |
| **DevOps / SRE**  | `08-deployment-devops.md` §1 (environments) + §3 (local setup)                                                | `08-deployment-devops.md` §5 (k8s), §9 (monitoring), §11 (launch checklist) |
| **Designer**      | `07-design-system.md` §1 (philosophy) + §2 (tokens) + §5 (component library)                                  | `07-design-system.md` §8 (layout), §10 (a11y), §12 (motion)            |
| **Recruiter**     | `10-roadmap.md` §3.4 Q4 (referral + hiring flows)                                                            | `02-api-reference.md` (the certificates + verify endpoints)           |
| **New hire**      | This README's Quickstart + Project structure                                                                  | `01-architecture.md` (mental model) → skim a portal file              |

---

## Contributing & licence

### Contributing

1. **Pick a ticket** from the worklog or the Q1 roadmap epics.
2. **Branch from `main`** with the pattern `feat/<short-slug>` (feature), `fix/<short-slug>` (bug), `docs/<short-slug>` (docs), or `chore/<short-slug>` (everything else).
3. **Implement following the portal contracts** (see `worklog.md` Task 0 — every portal is a single file exporting `<Role>Portal({ user, view, setView })`).
4. **Run all gates locally** before pushing:
   ```bash
   bun run lint           # 0 errors / 0 warnings
   bunx tsc --noEmit      # 0 errors
   bun run build          # Next.js build succeeds
   ```
5. **Manual QA via `agent-browser`** (see `09-testing-qa.md` §9). Zero console errors is the gate.
6. **Open a PR** with:
   - **What** — one-line summary.
   - **Why** — the ticket or pain point.
   - **How** — short design note + any tradeoffs.
   - **Verification** — `agent-browser errors` output + screenshots/snapshots.
   - **Checklist** — `[x]` lint, `[x]` tsc, `[x]` build, `[x]` manual QA.
7. **Two approvals required** to merge (one engineer + one of: design, product, or devops depending on the change).
8. **Squash-and-merge** to `main`. CI runs on push; prod deploys on green.

### Code-style expectations

- **TypeScript strict** — no `any` in new code (the existing `as any` casts on `audit.details` JSON columns are an accepted exception).
- **No `dangerouslySetInnerHTML`** anywhere.
- **No indigo or blue primary colours** — the palette is emerald + amber + violet/teal/coral accents. See `07-design-system.md` §2.
- **Use the shared component library** from `src/components/platform/shared.tsx` — don't re-implement a card.
- **Section view root** is always `<div className="animate-in-fade space-y-5">` to keep motion consistent.
- **Long lists** cap with `max-h-96 overflow-y-auto scroll-soft`.
- **Tables** wrap in `<div className="overflow-x-auto">`.
- **Loading + empty** states use `<LoadingGrid>` and `<EmptyState>` — no inline spinners in list views.

### Licence

InternForge is released under the **MIT Licence**. See `LICENSE` in the repo root for the full text. Third-party dependencies retain their original licences (`next`, `prisma`, `react`, `recharts`, `framer-motion`, `z-ai-web-dev-sdk`, `socket.io`, etc.).

---

> Built with care on the Z.ai platform. The growth-themed, glassmorphic UI is the visual expression of the platform's promise: **every internship becomes a verifiable, evidence-backed credential**.
