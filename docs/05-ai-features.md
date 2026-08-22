# InternForge — AI Features

> Reference for the four AI capabilities shipped in InternForge, plus the heuristic plagiarism
> detector and the responsible-AI guardrails enforced across all of them.
>
> All AI calls are made **server-side only** by route handlers under `src/app/api/ai/` and
> `src/app/api/submissions/[id]/plagiarism/`. The browser never sees the SDK; it only sees the
> final JSON. The LLM is treated as an **enhancement** — if it is unavailable, every route
> degrades gracefully to a deterministic fallback so the UI never breaks.

---

## 1. AI overview

### 1.1 SDK & runtime
- **SDK:** `z-ai-web-dev-sdk` (imported as `ZAI from 'z-ai-web-dev-sdk'`).
- **Wrapper:** `src/lib/zai.ts` exposes three exports:
  - `getZai()` — lazily creates and memoizes the singleton. Returns `null` on init failure (logs to stderr).
  - `chat(messages)` — returns a `string | null`. Returns `null` on any failure (init, network, malformed response, empty content).
  - `chatJson<T>(messages, fallback)` — calls `chat`, extracts the first `{...}` JSON object via regex, parses it, and returns the typed `T`. Falls back to the provided `fallback: T` if the SDK is unavailable, the response contains no JSON object, or `JSON.parse` throws.
- **Singleton caching:** the SDK instance is created once per process (`let cached`) so subsequent requests reuse it; this avoids repeated handshake/credential overhead.
- **Server-only:** all four routes live under `src/app/api/ai/`, which means the SDK is **never** imported by client bundles. There is no `NEXT_PUBLIC_*` exposure of any AI credential.

### 1.2 Graceful-fallback philosophy
Every AI route constructs a deterministic fallback object **before** calling the LLM. The fallback is structurally identical to the success shape, so the consuming portal component never has to branch on "AI worked vs. didn't". This means:
- The Mentor Portal's "Generate AI feedback" button always fills the form with sensible text — even if the LLM is rate-limited, the SDK is missing, or the network is offline.
- The Student Portal's `discover` view always shows 4 recommendation cards — even if the LLM call fails.
- The `skill-analysis` dialog always renders an analysis paragraph and a skills table.
- The AI chat always returns a reply (the fallback reply is hard-coded inside `route.ts`).

### 1.3 What "AI" is **not** doing
- It does **not** make any authorization or admission decision.
- It does **not** grade assessments (the `POST /api/assessments/[id]/submit` route scores purely from the canonical `answer` key).
- It does **not** compute certificates (the grade is derived from mentor evaluation averages; see `POST /api/certificates`).
- It does **not** auto-publish feedback; the mentor reviews and submits (`POST /api/evaluations`) before anything is persisted as the canonical evaluation.

---

## 2. Capabilities

| # | Route                              | Purpose                                              | Surfaced in                          |
|---|-------------------------------------|------------------------------------------------------|---------------------------------------|
| 1 | `POST /api/ai/feedback`             | Structured mentor-style review of a submission        | Mentor Portal → **Reviews** view      |
| 2 | `POST /api/ai/recommend`           | Top-4 internship recommendations for a student         | Student Portal → **Discover** view    |
| 3 | `POST /api/ai/skill-analysis`      | Map internship work to industry skills + evidence     | Student Portal → **Skills** view       |
| 4 | `POST /api/ai/chat`                | Free-form conversational mentor assistant ("Forge")   | Student Portal → **Chat** view (toggle) |

### 2.1 `POST /api/ai/feedback` — AI-assisted evaluation

**Purpose.** Help a mentor draft a structured review of a student submission. The mentor still signs off — the AI output is a *draft*, never the canonical evaluation.

**Inputs.**
```json
{ "submissionId": "clx..." }
```
The handler loads the submission with `project`, `student`, and `task` joined. Only the submission's first **3000 characters** of `content` are sent to the LLM (input truncation = data minimization).

**System prompt (verbatim).**
> You are a senior engineering mentor reviewing an intern submission. Output strict JSON with keys: feedback (string, 2-3 sentences), strengths (array of strings), improvements (array of strings), score (integer 0-100). Be specific, kind, and actionable.

**User prompt template.**
```
Project: <project.title>
Task: <task.title ?? 'N/A'>
Submission title: <submission.title>
Content:
<submission.content.slice(0, 3000)>
```

**Outputs.**
```ts
{
  feedback: string         // 2-3 sentences
  strengths: string[]
  improvements: string[]
  score: number            // 0-100
}
```

**Fallback (used on any LLM failure).**
```json
{
  "feedback": "Solid submission with clear structure and readable code. Address edge cases and add regression tests before merging.",
  "strengths": ["Readable structure", "Reasonable naming"],
  "improvements": ["Cover edge cases", "Add regression tests", "Extract magic numbers"],
  "score": 80
}
```

**UI flow (Mentor Portal `reviews` view).**
1. Mentor opens the submission review dialog.
2. Sets 4 sliders (`codeQuality`, `communication`, `delivery`, `learning`), types a feedback draft, and adds strengths/improvements tags.
3. Clicks **"Generate AI feedback"** → `POST /api/ai/feedback`.
4. The returned `feedback`, `strengths`, `improvements`, and `score` are filled into the form (AI feedback is stored in a separate `AIBadge`-marked card alongside the human feedback for transparency).
5. Mentor reviews, edits, and clicks **Submit evaluation** → `POST /api/evaluations` (which also flips the submission to `APPROVED`).

**Example request.**
```bash
curl -X POST https://internforge.io/api/ai/feedback \
  -H 'Content-Type: application/json' \
  -d '{"submissionId":"clx..."}'
```

**Example response.**
```json
{
  "feedback": "The login form is well-structured and covers the happy path with sensible validation. Edge cases (empty submit, network failure, rapid double-submit) are missing — wrap the handler in a debounced guard and add tests for each.",
  "strengths": ["Clean component decomposition", "Type-safe props"],
  "improvements": ["Add loading & error states", "Debounce the submit handler", "Cover edge cases"],
  "score": 78
}
```

### 2.2 `POST /api/ai/recommend` — Recommendation engine

**Purpose.** Match a student to the top 4 most relevant open internships using their verified skill profile. Output is a ranked list with a score (0–100) and up to 3 short reasons each.

**Inputs.**
```json
{ "userId": "clx..." }
```
The handler loads the user with `userSkills.skill` joined, plus all `status=OPEN` internships with `company` and application counts. The student skills are sent as `{ name, level, verified }` and internships as the top 12 by recency, brief shape `{ id, title, domain, skillsRequired, company }`.

**System prompt (verbatim).**
> You are a career recommendation engine matching a student to open internships. Output strict JSON: { recommendations: [{ internshipId, score (0-100), reasons (array of short strings, max 3) }] }. Pick the top 4 most relevant.

**User prompt template.**
```
Student skills: <JSON.stringify(studentSkills)>

Open internships: <JSON.stringify(internshipsBrief)>
```

**Outputs.**
```ts
{
  recommendations: {
    internshipId: string
    score: number            // 0-100
    reasons: string[]       // ≤ 3 short strings
  }[]
}
```

**Fallback.** Top 4 internships by recency, with descending hardcoded scores (80, 72, 64, 56) and the same three reasons on every card.

**UI flow (Student Portal `discover` view).**
1. The banner at the top of the marketplace calls `aiApi.recommend({ userId })` on mount.
2. The top 3 results render as compact cards (logo, title, score badge, reasons chips).
3. Clicking a card scrolls the marketplace grid to that internship.
4. The full marketplace grid (with `q` / `domain` / `remote` filters) renders below — recommendations are an enhancement, not a replacement for browse.

**Example request.**
```bash
curl -X POST https://internforge.io/api/ai/recommend \
  -H 'Content-Type: application/json' \
  -d '{"userId":"clx..."}'
```

**Example response.**
```json
{
  "recommendations": [
    {
      "internshipId": "clx...",
      "score": 91,
      "reasons": ["Strong React + TypeScript overlap", "Verified skills match 3 of 4 requirements"]
    },
    {
      "internshipId": "clx...",
      "score": 74,
      "reasons": ["Adjacent domain", "Company growth trajectory"]
    }
  ]
}
```

### 2.3 `POST /api/ai/skill-analysis` — Skill mapping

**Purpose.** Take a student's internship artifacts (skills tracked, recent submissions, certificates, badges) and produce (a) a 3–4 sentence narrative analysis of their growth and (b) a per-skill mapping to an industry-standard level (`Beginner | Intermediate | Advanced`) with concrete evidence drawn from their actual work.

**Inputs.**
```json
{ "userId": "clx..." }
```
The handler loads the user with `userSkills.skill`, the latest **5 submissions** (titles only), `certificates` (count), and `userBadges.badge` (names). The LLM sees the raw `evidence` JSON on each user skill, so it can ground its claims.

**System prompt (verbatim).**
> You are an AI skill analyst. Map the student's internship work to industry-standard skills. Output strict JSON: { analysis: string (3-4 sentences), mapped: [{ skill, level, evidence }] }. level in [Beginner, Intermediate, Advanced].

**User prompt template.**
```
Student: <user.name>
Skills: <JSON.stringify(skills with evidence)>
Submissions: <comma-separated submission titles>
Certificates: <count>
Badges: <comma-separated badge names>
```

**Outputs.**
```ts
{
  analysis: string                       // 3-4 sentences
  mapped: {
    skill: string
    level: 'Beginner' | 'Intermediate' | 'Advanced'
    evidence: string                      // concrete reference to a submission, project, or badge
  }[]
}
```

**Fallback.** Derives the level purely from the stored `current` score (`≥80` → Advanced, `≥60` → Intermediate, else Beginner) and uses the first evidence entry's title or `"Verified internship work"`.

**Special handling.** Because this route uses `chat` (not `chatJson`), it manually:
1. Calls the LLM.
2. If `chat` returns `null`, returns the fallback object (200).
3. If the LLM returns text but no JSON object is matchable, returns `{ analysis: text.slice(0, 500), mapped: fallbackMapped }` — i.e. the LLM's narrative is preserved even if the structured part fails.
4. If `JSON.parse` throws, returns the fallback.

**UI flow (Student Portal `skills` view).**
1. The student opens the Skill Gap Analysis section.
2. Clicks **"AI skill analysis"** → opens a Dialog.
3. The Dialog renders the `analysis` paragraph + a table of `skill / level / evidence`.
4. Levels are color-coded using the shared `scoreColor` helper.

**Example request.**
```bash
curl -X POST https://internforge.io/api/ai/skill-analysis \
  -H 'Content-Type: application/json' \
  -d '{"userId":"clx..."}'
```

**Example response.**
```json
{
  "analysis": "Your internship work demonstrates measurable growth, particularly in applied frontend engineering. The ForgeUI project shows strong component decomposition and type safety. To round out your profile, focus on system design (caching, state hydration) and strengthen evidence of impact (metrics, A/B results).",
  "mapped": [
    { "skill": "React",        "level": "Advanced",     "evidence": "ForgeUI project — login form with controlled state, 5 submissions" },
    { "skill": "TypeScript",   "level": "Intermediate", "evidence": "Type-safe API client and Prisma schema" },
    { "skill": "System Design","level": "Beginner",     "evidence": "No evidence of caching or hydration work yet" }
  ]
}
```

### 2.4 `POST /api/ai/chat` — AI mentor assistant ("Forge")

**Purpose.** A free-form conversational assistant that lives inside the Student Portal chat view. When the "AI Mentor" toggle is on, the student's sends are routed to the LLM instead of (or alongside) the human peer in the conversation.

**Inputs.**
```json
{ "message": "How should I structure my week?", "context": "Working on the login form, due Friday" }
```
`context` is optional. When present, it's injected as a prior user message followed by a canned assistant acknowledgment (`"Got it. How can I help?"`) — a lightweight RAG-style priming.

**System prompt (verbatim).**
> You are Forge, an AI mentor assistant inside the InternForge internship platform. You help students with project guidance, study plans, debugging approaches, and career advice. Be concise, warm, and practical. Use short paragraphs and occasional bullet points. Never invent credentials.

**Outputs.**
```ts
{ reply: string }
```

**Fallback.** A deterministic empathetic reply that nudges the student toward concrete asks:
> I am here to help — try asking about your project plan, a debugging approach, or how to prioritize your week.

**UI flow (Student Portal `chat` view).**
1. The student opens the Chat view, sees their conversation list on the left.
2. The chat panel header has an **"AI Mentor"** Switch.
3. When toggled on, the header changes to "Forge AI" (violet tint), and outbound sends are POSTed to `/api/ai/chat` instead of `/api/messages`.
4. AI replies render with the shared `AIBadge` component + violet bubble so they're visually distinct from human messages.
5. Enter sends; Shift+Enter inserts a newline.

**Example request.**
```bash
curl -X POST https://internforge.io/api/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "message":"I am stuck on the form validation, what should I try next?",
    "context":"Project: ForgeUI, task: Login form v1"
  }'
```

**Example response.**
```json
{
  "reply": "Start by isolating the failure mode:\n\n- Is the validation synchronous or async?\n- Are you using a schema lib (zod) or hand-rolled rules?\n\nFor hand-rolled, write one rule at a time and a test per rule. For zod, expose `safeParse` so the form can show inline errors without throwing."
}
```

---

## 3. AI-assisted evaluation

The Mentor Portal's **Reviews** view is the canonical human-in-the-loop flow for AI in InternForge:

```mermaid
sequenceDiagram
    autonumber
    participant M as Mentor
    participant UI as Reviews View
    participant API1 as /api/ai/feedback
    participant LLM as z-ai-web-dev-sdk
    participant API2 as /api/evaluations
    participant DB as Prisma/SQLite

    M->>UI: Open submission review dialog
    UI->>M: Render code block + 4 sliders + feedback draft + tag inputs
    M->>M: Drafts human feedback (optional)
    M->>UI: Click "Generate AI feedback"
    UI->>API1: POST /api/ai/feedback { submissionId }
    API1->>LLM: chatJson([system, user], fallback)
    alt LLM succeeds
        LLM-->>API1: JSON { feedback, strengths, improvements, score }
    else LLM unavailable / malformed
        API1-->>API1: Use deterministic fallback
    end
    API1-->>UI: 200 { feedback, strengths, improvements, score }
    UI->>M: Fill form (AIBadge card shows the AI draft)
    M->>M: Review + edit + sign off
    M->>UI: Click "Submit evaluation"
    UI->>API2: POST /api/evaluations { submissionId, projectId, mentorId, … }
    API2->>DB: INSERT Evaluation; UPDATE Submission SET status='APPROVED'
    API2-->>UI: 200 Evaluation
    UI->>M: Toast + reload queue
```

Key properties:
- The AI never writes to `Evaluation` directly. Only `POST /api/evaluations` (called by the mentor's submit) persists.
- The AI's draft is preserved verbatim in `aiFeedback` on the evaluation row, so the side-by-side comparison (human feedback vs. AI feedback) is auditable later from the Mentor Portal `evaluation` view.
- The composite `score` is computed server-side as `round(mean(codeQuality, communication, delivery, learning))`, regardless of whether the AI suggested a score. The mentor's sliders are authoritative.

---

## 4. Recommendation engine

The recommendation engine is intentionally **shallow-by-design**:

1. The student's `userSkills` (with `level` and `verified` flags) and the top 12 open internships (with `skillsRequired` JSON) are JSON-stringified and sent to the LLM.
2. The LLM is asked to pick the top 4 most relevant, returning `{ internshipId, score (0-100), reasons (≤ 3) }`.
3. The 4 cards render in the Discover banner above the browseable marketplace grid.

**Why LLM over a pure cosine similarity?**
- The LLM can compose readable reasons ("Strong React + TypeScript overlap", "Adjacent domain, growing company"). A pure similarity score gives a number but no narrative.
- The set of open internships in the demo is small (≤ 12), so the LLM's reasoning cost is bounded.

**Production hardening recommendations:**
- For marketplaces with >100 listings, pre-filter with a vector search (embeddings) before invoking the LLM, so the model only re-ranks a top-K shortlist.
- Persist explanations per `(userId, internshipId)` for at least 30 days so the student sees consistent recommendations across sessions; refresh weekly.
- Add a "not interested" signal → down-rank in the next call (simple negative-feedback feature).

---

## 5. Skill analysis

The skill analysis route combines a free-text narrative with structured per-skill mapping:

| Output field | Type                                          | Source                                   |
|--------------|------------------------------------------------|------------------------------------------|
| `analysis`   | `string` (3–4 sentences)                       | LLM-generated narrative                   |
| `mapped`     | `{ skill, level, evidence }[]`                 | LLM-generated mapping, grounded in the user's actual `evidence` JSON |

Level enum: `Beginner` (0–59), `Intermediate` (60–79), `Advanced` (80–100). The fallback uses the same thresholds on the stored `current` value.

**Grounding.** The LLM is given the raw `evidence` array (titles of submissions, project names, badge awards) per user skill. The system prompt asks for `evidence` as a free-text string per skill, which the LLM typically fills with a concrete artifact reference (e.g. *"ForgeUI project — login form with controlled state, 5 submissions"*).

**Why this matters for portfolios.** The Student Portal renders these mapped skills in the **Skills** view Dialog, but the same data can be exported into a public portfolio ("verified skills" tick). Each mapped skill points back to a real artifact in the platform — the student isn't self-attesting; the platform is attesting on their behalf.

---

## 6. AI mentor assistant (Forge)

The chat assistant is the most open-ended of the four routes — it accepts arbitrary user text. To keep it safe and on-platform:

**Persona guardrails (system prompt):**
- Scoped identity: "an AI mentor assistant inside the InternForge internship platform."
- Scoped domain: "project guidance, study plans, debugging approaches, career advice."
- Tone: "concise, warm, practical"; "short paragraphs and occasional bullet points."
- Safety: "Never invent credentials."

**Context priming.** When `context` is supplied, two synthetic turns are prepended:
1. `user: Context: <context>`
2. `assistant: Got it. How can I help?`

This gives the LLM a stable conversational frame without leaking the full session history (which the demo doesn't persist anyway — see the message-history gap in the Student Portal Builder worklog).

**Visual differentiation.** AI replies render with the shared `AIBadge` component and a violet-tinted chat bubble. The student can always tell which messages are AI-generated vs. human.

**Always-replies.** Even if the LLM is down, the route returns 200 with the deterministic fallback reply. The student is never left with an empty chat panel.

---

## 7. Fraud / plagiarism detection

### 7.1 The heuristic
`POST /api/submissions/[id]/plagiarism` runs a deterministic word-repetition heuristic:

```ts
const text = sub.content ?? ''
const words = text.split(/\s+/).filter(Boolean)
const repeats = words.length - new Set(words.map((w) => w.toLowerCase())).size
const ratio = words.length ? repeats / words.length : 0
const score = Math.min(0.95, Math.max(0.02, ratio * 1.4 + (text.includes('TODO') ? 0.1 : 0)))
```

- **`ratio`** = (total words − unique case-insensitive words) / total words — a crude proxy for repetition / copy-paste.
- **Multiplier 1.4** amplifies the signal; the floor is 0.02 and the ceiling 0.95.
- **`TODO` bonus** of +0.10 flags unfinished work that may indicate the submission was scaffolded but not completed.

The result is persisted: `Submission.plagiarismScore = score`, `Submission.status = 'REVIEWED'`. The route returns `{ score, submission }`.

### 7.2 Where it's surfaced
- **Student Portal → Submissions view:** each row shows a color-coded plagiarism %; a "Run plagiarism check" button triggers the route.
- **Admin Portal → Security view:** filters `submissionsApi.list()` for `plagiarismScore > 0.25`, sorted desc. Three StatCards (total flagged, high-risk > 0.5, avg score). Each row has a Review Dialog showing the content with Flag/Clear toast actions.
- **Admin Portal → Dashboard:** the "Flagged submissions" panel pulls the same `>0.25` filter for at-a-glance oversight.

### 7.3 What it is **not**
This is **explicitly a heuristic placeholder**. From the route source:
> Heuristic plagiarism "detection": re-score the submission deterministically. Real deployment would call an embedding/external service.

For a production launch, swap the heuristic for one of:
- An embedding-similarity index (e.g. `text-embedding-3-small` over all prior submissions in the platform; flag any cosine similarity > 0.85).
- An external plagiarism service (e.g. Copyleaks, GPTZero for AI-generated text).
- A hybrid: hash-based n-gram match for fast pruning + embedding reranking for the top-K candidates.

### 7.4 The Admin "AI fraud scan" button
The Admin Security view exposes an "AI fraud scan" button. In the current demo, this triggers a non-persistent toast (intentional demo-only behavior). In production, the button should enqueue a batch job that re-runs the plagiarism route across all submissions not yet scored, then surfaces an aggregate report.

---

## 8. Responsible AI & safety

### 8.1 No credential invention
The chat system prompt explicitly forbids inventing credentials: *"Never invent credentials."* This means the assistant will not fabricate certificate numbers, badge names, or "verified" status. The student's profile, skills, and certificates are always authoritative platform data, not LLM-generated.

### 8.2 Human-in-the-loop
- AI feedback is a **draft**, never the canonical evaluation. The mentor must click "Submit evaluation" (`POST /api/evaluations`) to persist.
- AI skill analysis is **advisory**; the canonical user-skill levels are stored in `UserSkill.current`, not overwritten by the LLM.
- AI recommendations are **presented alongside** the browseable marketplace, never as a gating mechanism.

### 8.3 Concise, kind, actionable tone
The system prompts share a consistent voice:
- Feedback: *"Be specific, kind, and actionable."*
- Chat: *"Be concise, warm, and practical."*

This avoids the verbose, hedging "as an AI language model…" register that hurts UX.

### 8.4 Graceful fallbacks
Every route has a deterministic fallback. The UI never renders an error state because the LLM is unavailable — it always has a sensible default to display.

### 8.5 Data minimization
- `POST /api/ai/feedback` truncates the submission `content` to **3000 chars** before sending.
- `POST /api/ai/recommend` sends only the top **12 internships** by recency, brief shape (no descriptions, no company PII beyond the name).
- `POST /api/ai/skill-analysis` sends only submission **titles**, not contents; certificate count, not content; badge names, not criteria.
- `POST /api/ai/chat` sends only the user's `message` + an optional `context` string — no user PII is attached.

### 8.6 No PII to the model
The AI routes do not attach user email, phone, location, university, or any other PII to the prompt. The `userId` is only used server-side to fetch the data; only derived/skill-related fields reach the LLM.

---

## 9. Extensibility — adding a new AI route

The two helpers in `src/lib/zai.ts` are designed for reuse. To add a new AI route:

### 9.1 For structured JSON output
```ts
// src/app/api/ai/<name>/route.ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chatJson } from '@/lib/zai'

export async function POST(req: Request) {
  const { userId } = await req.json()
  const user = await db.user.findUnique({ where: { id: userId }, include: { /* … */ } })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const fallback = { /* shape your route guarantees */ }
  const result = await chatJson<MyResultShape>(
    [
      { role: 'system', content: 'You are … Output strict JSON: { … }.' },
      { role: 'user',   content: `…${JSON.stringify(brief)}…` },
    ],
    fallback
  )
  return NextResponse.json(result)
}
```

### 9.2 For free-form text output
```ts
import { chat } from '@/lib/zai'

export async function POST(req: Request) {
  const { message } = await req.json()
  const reply = await chat([
    { role: 'system', content: 'You are …' },
    { role: 'user',   content: message },
  ])
  return NextResponse.json({ reply: reply ?? 'Fallback reply here.' })
}
```

### 9.3 Patterns to follow
- Always construct the `fallback` object **before** calling the LLM. The fallback shape must match the success shape exactly.
- Truncate large inputs (`content.slice(0, 3000)` is a reasonable upper bound for chat-context submissions).
- Send only derived/brief fields to the LLM — no PII.
- Use the `system` role for the persona + output contract; use the `user` role for the concrete inputs.
- For JSON output, prefix the system prompt with *"Output strict JSON:"* — this measurably improves parseable-response rate.
- Add the new route to `src/lib/api.ts` (`aiApi.<name>`) so portal components can consume it via the typed client.

---

## 10. Cost & latency

### 10.1 Observed performance
During end-to-end verification (see worklog Task 13), the live `POST /api/ai/skill-analysis` call took **~8.8 seconds** wall-clock for a real `z-ai-web-dev-sdk` LLM round-trip with a 5-submission, 6-skill, 1-certificate, 2-badge context. This is the slowest of the four routes because:
- The user-skill `evidence` JSON is included verbatim in the prompt.
- The output is large (analysis paragraph + multi-row mapped table).

The other three routes typically complete in 2–5 s. The chat route is the fastest because its context is small.

### 10.2 Cost guidance
- Per-call cost is dominated by input tokens (the recommendation and skill-analysis routes send the largest inputs) plus output tokens (skill-analysis generates the longest output).
- At ~20 calls/user/day on the recommendation + chat + skill-analysis routes, expect ~80 LLM calls/user/day in steady-state. Budget accordingly.

### 10.3 Caching & de-duplication
The current build does **not** cache AI responses. Production recommendations:

| Route            | Cache key                                   | TTL        | Rationale                                              |
|------------------|---------------------------------------------|------------|--------------------------------------------------------|
| `/ai/recommend`  | `ai:rec:${userId}:${internshipFingerprint}` | 1 hour     | Recommendations should be stable within a session.     |
| `/ai/skill-analysis` | `ai:skills:${userId}:${submissionFingerprint}` | 6 hours | Re-run only when the student submits new work.         |
| `/ai/feedback`   | `ai:fb:${submissionId}:${contentHash}`      | 24 hours   | The mentor may run it twice but the input is stable.   |
| `/ai/chat`       | — (no cache)                                | —          | Free-form; caching would feel broken.                  |

A simple Redis cache wrapper around `chatJson` would look like:
```ts
const key = `ai:${routeName}:${crypto.createHash('sha256').update(JSON.stringify(messages)).digest('hex')}`
const hit = await redis.get(key)
if (hit) return JSON.parse(hit)
const result = await chatJson(messages, fallback)
await redis.setex(key, ttl, JSON.stringify(result))
return result
```

### 10.4 Timeout guidance
For production, wrap each AI call in a hard timeout (e.g. `Promise.race([chatJson(...), timeout(12_000)])`) so a hung LLM call doesn't hold a Next.js serverless function open indefinitely. The fallback should be returned on timeout, not a 504.

### 10.5 Observability
- Log per-call latency, token counts, and fallback-vs-LLM outcome to the existing `AuditLog` table (action `AI_CALL`, resource `AI`, severity `INFO`) — this gives the Admin Portal a built-in "AI usage" view without new infra.
- Alert when the fallback-rate exceeds 5% in a 10-minute window (indicates LLM availability issues).
