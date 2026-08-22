# InternForge — by Yumaris Agency

> **Yumaris Agency** presents **InternForge** — turn internships into **measurable skills, verified work, mentor feedback, and career-ready evidence** — not just attendance and a certificate.

<div align="center">
  <img src="public/logo-icon.jpg" alt="Yumaris Agency logo" width="96" height="96" />
</div>

InternForge is a production-ready, full-stack internship management platform serving **students, mentors, companies, and administrators**. It is built around a single guiding principle:

> **An internship should produce measurable skills, verified work, mentor feedback, and career-ready evidence — not just a certificate of participation.**

Every portal, API, and UI element reinforces the student journey:

```
Discover → Apply → Get Selected → Onboard → Learn → Work → Submit → Receive Feedback →
Improve → Get Assessed → Complete Project → Get Evaluated → Earn Verified Certificate →
Generate Portfolio → Become Job Ready
```

---

## ✨ Highlights

- **Four full portals** driven by a role switcher (Student · Mentor · Company/Recruiter · Super Admin) — 35+ sub-views total.
- **27 Prisma models** + **41 API route handlers** covering the entire lifecycle.
- **Real-time** chat, notifications, and live kanban via a Socket.io mini-service.
- **AI features** (LLM feedback generation, internship recommendations, skill analysis, AI mentor chat) powered by `z-ai-web-dev-sdk` with graceful fallbacks.
- **Premium glassmorphism UI** — emerald/amber palette, dark/light themes, fully responsive, WCAG-minded.
- **Global Command Palette** (⌘K) for fast navigation and actions.
- **In-app Documentation viewer** + a complete `docs/` suite (product spec, architecture, DB schema, API reference, AI, security, design system, deployment, testing, 12-month roadmap).
- **Verified certificates** with QR-style verification codes + auto-generated portfolios.

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router) + **React 19** |
| Language | **TypeScript 5** (strict) |
| Styling | **Tailwind CSS 4** + **shadcn/ui** (New York) + Lucide icons |
| Database | **Prisma ORM** + **SQLite** (dev) — production path = PostgreSQL |
| State | **Zustand** (client) + fetch-based data layer |
| Charts | **Recharts** |
| Drag & drop | **@dnd-kit** |
| Real-time | **Socket.io** (mini-service on port 3003) |
| AI | **z-ai-web-dev-sdk** (server-side only) |
| Theming | **next-themes** |
| Animations | **framer-motion** + custom keyframes |

---

## 🚀 Quickstart

```bash
# 1. Install dependencies
bun install

# 2. Configure the database
echo 'DATABASE_URL=file:/home/z/my-project/db/custom.db' > .env

# 3. Push schema + seed rich demo data (4 companies, 11 users, 6 internships, …)
bun run db:push
bun prisma/seed.ts

# 4. Start the dev server (port 3000)
bun run dev

# 5. (Optional) Start the real-time chat mini-service (port 3003)
cd mini-services/chat-service && bun install && bun run dev
```

Open the **Preview Panel** (or `http://localhost:3000`). Use the **role switcher** in the top-right to explore every portal. Press **⌘K** (Cmd/Ctrl+K) for the command palette, and click **Docs** in the top bar to browse the full documentation in-app.

### Demo users (auto-picked per role)

| Role | Demo user | Notable context |
|---|---|---|
| Student | Sara Kapoor | Accepted at FinEdge Frontend; owns the "ForgeUI" project |
| Mentor | Arjun Nair | Mentors Sara + Ishaan; 2 submissions awaiting review |
| Company Admin | Neha Iyer | FinEdge — applicant pipeline + analytics |
| Recruiter | Raj Verma | Nimbus Cloud — talent pipeline |
| Super Admin | Aria Mehta | Platform governance + audit |

---

## 📁 Project Structure

```
.
├─ prisma/
│  ├─ schema.prisma        # 27 models (User, Company, Internship, Application, Project, Task, Submission, Evaluation, Skill, Certificate, …)
│  └─ seed.ts              # rich demo dataset
├─ src/
│  ├─ app/
│  │  ├─ api/              # 41 REST route handlers (users, internships, applications, projects, tasks, submissions, evaluations, skills, assessments, certificates, logs, attendance, notifications, messages, announcements, onboarding, badges, feedback, analytics, admin, ai)
│  │  ├─ globals.css       # design system (OKLCH tokens, glassmorphism, dark mode)
│  ├─ components/
│  │  ├─ platform/         # Shell, role switcher, command palette, docs viewer, shared primitives, welcome hero
│  │  ├─ portals/          # student / mentor / company / admin portal components
│  │  └─ ui/               # shadcn/ui components
│  ├─ lib/                 # db, api client, types, zai (AI), socket, role-store, format
├─ mini-services/
│  └─ chat-service/        # Socket.io server (port 3003)
├─ docs/                    # 11 professional documents (spec → roadmap)
├─ Caddyfile                # gateway (XTransformPort pattern)
└─ package.json
```

---

## 📚 Documentation

The complete documentation lives in [`docs/`](./docs) and is also browsable **in-app** via the top-bar **Docs** button:

| # | Document | Covers |
|---|---|---|
| 01 | Product Specification | Vision, personas, 15-stage student journey, success metrics |
| 02 | System Architecture | Mermaid diagram, frontend/backend/data/AI/real-time layers |
| 03 | Database Schema | ER diagram, all 27 models, constraints, enum fields, seed |
| 04 | API Reference | Complete OpenAPI-style spec + WebSocket events |
| 05 | AI Features | 4 AI routes with system prompts, fallbacks, responsible-AI |
| 06 | Security & RBAC | Permission matrix, auth, GDPR, OWASP, demo-vs-prod gap |
| 07 | Design System | OKLCH tokens, 14 shared components, a11y, motion |
| 08 | Deployment & DevOps | Docker, K8s, CI/CD, env vars, DR runbook, go-live checklist |
| 09 | Testing & QA | Vitest/Playwright/k6 examples, OWASP, agent-browser loop |
| 10 | Product Roadmap | Q1–Q4 12-month plan, backlog, risks, north-star metric |

---

## 🛡️ Security & Production Notes

This repository ships a **demo-grade** build (no real authentication, SQLite, demo-only toasts for some writes). The `docs/06-security-rbac.md` and `docs/08-deployment-devops.md` documents specify the exact upgrade path to production: NextAuth.js + OAuth, PostgreSQL, Docker/K8s, CI/CD, rate limiting, and audit. **Never deploy this demo directly to production without those upgrades.**

---

## 📄 License

MIT — see [`docs/README.md`](./docs/README.md).

---

Built with ❤️ by **Yumaris Agency** on **Z.ai**. The platform's north-star metric: **verified certificates issued per week** — because an internship's value is measured, not just attended.
