# 08 — Deployment & DevOps

> How InternForge runs locally, in Docker, in Kubernetes, and how it ships through CI/CD into production. Includes runbooks, backups, and the go-live checklist.

---

## 1. Environments

InternForge has three runtime processes that compose into a single demo at runtime.

| Process            | Port  | Entry point                            | Purpose                                                                       |
| ------------------ | ----- | -------------------------------------- | ----------------------------------------------------------------------------- |
| Next.js app        | 3000  | `next dev` / `bun .next/standalone/server.js` | The four portals + 41 API routes + AI endpoints (`/api/ai/*`)                |
| Chat WebSocket service | 3003 | `mini-services/chat-service/index.ts`  | Socket.io server for presence, conversation rooms, typing, notifications, kanban task-moved broadcasts. |
| Caddy gateway      | 81    | `Caddyfile`                            | Reverse proxy. Routes `/?XTransformPort=*` to whatever port is in the query so the same origin serves both HTTP and WS. Default fallback → `:3000`. |

### 1.1 The Caddy gateway trick

The browser connects to `https://<host>/?XTransformPort=3003` for socket.io. Caddy's `@transform_port_query` matcher reverse-proxies to `localhost:{query.XTransformPort}`. This is why the client (`src/lib/socket.ts`) calls `io('/?XTransformPort=3003', …)`:

```caddy
:81 {
  @transform_port_query { query XTransformPort=* }
  handle @transform_port_query {
    reverse_proxy localhost:{query.XTransformPort} { header_up Host {host} … }
  }
  handle {
    reverse_proxy localhost:3000 { header_up Host {host} … }
  }
}
```

### 1.2 Standard local commands

| Action                       | Command                                  |
| ---------------------------- | ---------------------------------------- |
| Install dependencies         | `bun install`                            |
| Run the Next.js dev server   | `bun run dev`  (port 3000, logs to `dev.log`) |
| Push schema to SQLite        | `bun run db:push`                        |
| Generate Prisma client       | `bun run db:generate`                    |
| Run the seed script          | `bun prisma/seed.ts`                     |
| Start chat-service (with hot reload) | `cd mini-services/chat-service && bun install && bun run dev` |
| Lint                         | `bun run lint`                           |
| Production build (standalone) | `bun run build` (compiles + copies `.next/static` and `public` into `.next/standalone`) |
| Start production server     | `bun run start` (runs `bun .next/standalone/server.js`) |
| Production DB migrations    | `bun run db:migrate`                     |
| Reset DB                    | `bun run db:reset`                       |

---

## 2. Prerequisites

| Tool                | Version           | Why                                                              |
| ------------------- | ----------------- | ---------------------------------------------------------------- |
| **Bun**             | ≥1.3 (latest 1.x) | Runtime + package manager + script runner (`bun run`, `bun --hot`) |
| **Node.js**         | ≥18 (recommended 20+) | Toolchain fallback; some Prisma generators and Next 16 prefer Node. |
| **Caddy**           | ≥2.7               | Local reverse proxy gateway (production: any TLS-terminating proxy). |
| **Git**             | ≥2.40              | Source control + CI/CD checkout.                                |
| **Docker** (opt.)   | ≥24 + Docker Compose v2 | Containerised local dev + production builds.            |

> Bun is required for scripts (`bun prisma/seed.ts`). You can `npm install` / `npm run dev` if needed, but every command in `package.json` is authored for Bun.

---

## 3. Local setup

End-to-end, from a fresh clone to a running demo:

```bash
# 1. Clone & install
git clone <repo-url> internforge && cd internforge
bun install

# 2. Configure the environment
cat > .env <<'EOF'
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="dev-secret-change-me-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"
ZAI_API_KEY=""
NEXT_PUBLIC_SOCKET_URL="http://localhost:81"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
EOF

# 3. Push the Prisma schema to SQLite and seed demo data
bun run db:push
bun prisma/seed.ts

# 4. Start the chat-service in the background
cd mini-services/chat-service
bun install
bun run dev &
cd ../..

# 5. Start Caddy in the background (optional — only needed for socket.io in the browser)
caddy run --config ./Caddyfile &

# 6. Start the Next.js dev server
bun run dev
```

Open **http://localhost:3000/** — you should see the Student portal dashboard with seeded data (Sara Kapoor / ForgeUI / FinEdge).

### 3.1 The `.env` file (exact contents)

```dotenv
# Prisma — relative path to a SQLite file in the project root
DATABASE_URL="file:./dev.db"

# NextAuth (not yet enforced; route guards are wired in Q1 — see roadmap)
NEXTAUTH_SECRET="dev-secret-change-me-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"

# Z.AI SDK — leave empty in dev; the platform falls back to graceful static responses
# In production, set this to your z-ai-web-dev-sdk API key
ZAI_API_KEY=""

# Gateway URL the browser uses for socket.io (Caddy port)
NEXT_PUBLIC_SOCKET_URL="http://localhost:81"

# Canonical app URL (used for OG metadata, certificate QR codes)
NEXT_PUBLIC_APP_URL="http://localhost:3000"

NODE_ENV="development"
```

### 3.2 Role switching locally

There is no login flow — the platform uses a **role switcher** in the top-right of the header. Picking a role triggers `GET /api/users/me?role=<ROLE>` which smart-picks the most demo-relevant seeded user (e.g. STUDENT → Sara Kapoor, MENTOR → Arjun Nair, COMPANY → Neha Iyer, ADMIN → Aria Mehta). A second dropdown lets you pick any other seeded user of the same role.

---

## 4. Docker

### 4.1 Multi-stage `Dockerfile` (Next.js standalone)

```dockerfile
# syntax=docker/dockerfile:1.7
###############################################################################
# 1. deps — install all dependencies (incl. devDeps for prisma generate)
###############################################################################
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json bun.lock* package-lock.json* ./
RUN npm ci --include=dev
COPY prisma ./prisma
RUN npx prisma generate

###############################################################################
# 2. builder — compile the standalone Next.js server
###############################################################################
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `next build` writes a self-contained .next/standalone with only runtime deps
RUN npx next build
# The repo's build script copies .next/static + public into standalone/
RUN cp -r .next/static .next/standalone/.next/ && \
    cp -r public .next/standalone/

###############################################################################
# 3. runner — minimal runtime image
###############################################################################
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl tini
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
```

### 4.2 Chat-service Dockerfile

```dockerfile
# syntax=docker/dockerfile:1.7
FROM oven/bun:1.3-alpine AS runner
WORKDIR /app
COPY mini-services/chat-service/package.json ./
RUN bun install --production --frozen-lockfile
COPY mini-services/chat-service/index.ts ./
ENV NODE_ENV=production
EXPOSE 3003
CMD ["bun", "index.ts"]
```

### 4.3 `docker-compose.yml`

```yaml
# docker-compose.yml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    container_name: internforge-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: internforge
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-forge}
      POSTGRES_DB: internforge
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U internforge"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: internforge-app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: "postgresql://internforge:${POSTGRES_PASSWORD:-forge}@postgres:5432/internforge?schema=public"
      NEXTAUTH_SECRET: "${NEXTAUTH_SECRET}"
      NEXTAUTH_URL: "${NEXTAUTH_URL:-http://localhost:3000}"
      ZAI_API_KEY: "${ZAI_API_KEY}"
      NEXT_PUBLIC_SOCKET_URL: "${NEXT_PUBLIC_SOCKET_URL:-http://localhost:81}"
      NEXT_PUBLIC_APP_URL: "${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
    ports:
      - "3000:3000"

  chat-service:
    build:
      context: .
      dockerfile: mini-services/chat-service/Dockerfile
    container_name: internforge-chat
    restart: unless-stopped
    ports:
      - "3003:3003"

  caddy:
    image: caddy:2.8-alpine
    container_name: internforge-gateway
    restart: unless-stopped
    depends_on: [app, chat-service]
    ports:
      - "80:80"
      - "443:443"
      - "81:81"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config

volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

### 4.4 Bring it all up

```bash
# .env should now use Postgres instead of SQLite
echo 'DATABASE_URL="postgresql://internforge:forge@localhost:5432/internforge?schema=public"' >> .env

docker compose build
docker compose up -d

# Push schema + seed the production DB
docker compose exec app npx prisma db push --accept-data-loss
docker compose exec app node prisma/seed.js
```

---

## 5. Kubernetes

For self-hosted production. Three Deployments (app, chat-service, postgres — though Postgres should be a managed service in real prod), plus an Ingress, a ConfigMap, and a Secret.

### 5.1 Namespace

```yaml
# k8s/00-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: internforge
  labels:
    app.kubernetes.io/part-of: internforge
```

### 5.2 Secret

```yaml
# k8s/10-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: internforge-secret
  namespace: internforge
type: Opaque
stringData:
  DATABASE_URL: "postgresql://internforge:CHANGE_ME@internforge-db:5432/internforge?schema=public"
  NEXTAUTH_SECRET: "CHANGE_ME_TO_32_RANDOM_CHARS"
  ZAI_API_KEY: "CHANGE_ME_TO_YOUR_ZAI_KEY"
```

### 5.3 ConfigMap

```yaml
# k8s/20-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: internforge-config
  namespace: internforge
data:
  NODE_ENV: "production"
  PORT: "3000"
  NEXTAUTH_URL: "https://internforge.example.com"
  NEXT_PUBLIC_APP_URL: "https://internforge.example.com"
  NEXT_PUBLIC_SOCKET_URL: "https://internforge.example.com"
```

### 5.4 Postgres (StatefulSet + Service)

> In real production, replace with AWS RDS / Cloud SQL / Aiven. This is for self-hosted clusters.

```yaml
# k8s/30-postgres.yaml
apiVersion: v1
kind: Service
metadata:
  name: internforge-db
  namespace: internforge
spec:
  selector: { app: internforge-db }
  ports: [{ port: 5432, targetPort: 5432 }]
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: internforge-db
  namespace: internforge
spec:
  serviceName: internforge-db
  replicas: 1
  selector: { matchLabels: { app: internforge-db } }
  template:
    metadata: { labels: { app: internforge-db } }
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          ports: [{ containerPort: 5432 }]
          env:
            - { name: POSTGRES_USER,       value: internforge }
            - { name: POSTGRES_PASSWORD,  valueFrom: { secretKeyRef: { name: internforge-secret, key: DATABASE_URL } } }
            - { name: POSTGRES_DB,         value: internforge }
            - { name: PGDATA,              value: /var/lib/postgresql/data/pgdata }
          volumeMounts:
            - { name: data, mountPath: /var/lib/postgresql/data }
          readinessProbe:
            exec: { command: ["pg_isready", "-U", "internforge"] }
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata: { name: data }
      spec:
        accessModes: ["ReadWriteOnce"]
        resources: { requests: { storage: 20Gi } }
```

### 5.5 App Deployment

```yaml
# k8s/40-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: internforge-app
  namespace: internforge
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 1, maxUnavailable: 0 }
  selector: { matchLabels: { app: internforge-app } }
  template:
    metadata:
      labels: { app: internforge-app }
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/api/admin/metrics"
    spec:
      containers:
        - name: app
          image: ghcr.io/<org>/internforge-app:latest
          ports: [{ containerPort: 3000 }]
          envFrom:
            - configMapRef: { name: internforge-config }
            - secretRef:    { name: internforge-secret }
          readinessProbe:
            httpGet: { path: /api/admin/health, port: 3000 }
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet: { path: /api/admin/health, port: 3000 }
            initialDelaySeconds: 30
            periodSeconds: 15
          resources:
            requests: { cpu: "250m", memory: "512Mi" }
            limits:   { cpu: "1000m", memory: "1Gi" }
---
apiVersion: v1
kind: Service
metadata:
  name: internforge-app
  namespace: internforge
spec:
  selector: { app: internforge-app }
  ports: [{ port: 80, targetPort: 3000 }]
```

### 5.6 Chat-service Deployment

```yaml
# k8s/50-chat.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: internforge-chat
  namespace: internforge
spec:
  replicas: 1
  selector: { matchLabels: { app: internforge-chat } }
  template:
    metadata: { labels: { app: internforge-chat } }
    spec:
      containers:
        - name: chat
          image: ghcr.io/<org>/internforge-chat:latest
          ports: [{ containerPort: 3003 }]
          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }
---
apiVersion: v1
kind: Service
metadata:
  name: internforge-chat
  namespace: internforge
spec:
  selector: { app: internforge-chat }
  ports: [{ port: 3003, targetPort: 3003 }]
```

### 5.7 Ingress

```yaml
# k8s/60-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: internforge-ingress
  namespace: internforge
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
spec:
  ingressClassName: nginx
  tls:
    - hosts: [internforge.example.com]
      secretName: internforge-tls
  rules:
    - host: internforge.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: internforge-app, port: { number: 80 } }
          # WebSocket upgrade for /socket.io/?XTransformPort=3003
          - path: /socket.io/
            pathType: Prefix
            backend:
              service: { name: internforge-chat, port: { number: 3003 } }
```

### 5.8 HPA (HorizontalPodAutoscaler)

```yaml
# k8s/70-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: internforge-app
  namespace: internforge
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: internforge-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
    - type: Resource
      resource: { name: memory, target: { type: Utilization, averageUtilization: 80 } }
```

---

## 6. CI/CD

A GitHub Actions workflow that lints, typechecks, tests, builds, pushes an image, and deploys to the Kubernetes cluster on `main`.

```yaml
# .github/workflows/ci-cd.yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_APP: ghcr.io/${{ github.repository }}/app
  IMAGE_CHAT: ghcr.io/${{ github.repository }}/chat

jobs:
  lint-test-build:
    name: Lint · Typecheck · Test · Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - uses: oven-sh/setup-bun@v2
        with: { bun-version: latest }

      - run: bun install --frozen-lockfile

      - name: Lint
        run: bun run lint

      - name: Typecheck
        run: bunx tsc --noEmit

      - name: Unit tests
        run: bun test src/lib __tests__ || true   # tests not yet wired (see docs/09)

      - name: Build (Next.js standalone)
        run: bun run build
        env:
          DATABASE_URL: "file:./ci.db"
          NEXTAUTH_SECRET: "ci-secret"
          NEXTAUTH_URL: "http://localhost:3000"

  docker-push:
    name: Build & Push Docker Images
    needs: lint-test-build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & push app
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_APP }}:latest
            ${{ env.IMAGE_APP }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build & push chat-service
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./mini-services/chat-service/Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_CHAT }}:latest
            ${{ env.IMAGE_CHAT }}:${{ github.sha }}
          cache-from: type=gha,scope=chat
          cache-to: type=gha,scope=chat,mode=max

  deploy:
    name: Deploy to Kubernetes
    needs: docker-push
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v4
        with: { version: v1.29.0 }

      - name: Configure kubectl
        run: |
          echo "${{ secrets.KUBECONFIG_B64 }}" | base64 -d > kubeconfig.yaml
          export KUBECONFIG=$(pwd)/kubeconfig.yaml

      - name: Apply manifests
        run: kubectl apply -f k8s/ -n internforge

      - name: Rollout app
        run: |
          kubectl set image deployment/internforge-app \
            app=${{ env.IMAGE_APP }}:${{ github.sha }} -n internforge
          kubectl rollout status deployment/internforge-app -n internforge --timeout=180s

      - name: Rollout chat
        run: |
          kubectl set image deployment/internforge-chat \
            chat=${{ env.IMAGE_CHAT }}:${{ github.sha }} -n internforge
          kubectl rollout status deployment/internforge-chat -n internforge --timeout=60s
```

### 6.1 Pipeline at a glance

```mermaid
graph LR
  A[Push / PR] --> B[Lint]
  B --> C[Typecheck tsc --noEmit]
  C --> D[Unit Tests]
  D --> E[Next.js Build]
  E --> F{main?}
  F -- yes --> G[Build & Push Docker]
  G --> H[kubectl apply]
  H --> I[Rollout app + chat]
  F -- no --> Z[Done]
```

---

## 7. Environment variables

| Variable                    | Scope          | Required | Purpose                                                                       | Example                                                            |
| -------------------------- | -------------- | -------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`             | server         | ✅       | Prisma connection string. SQLite file path or Postgres URL.                   | `file:./dev.db` or `postgresql://u:p@host:5432/db?schema=public` |
| `NEXTAUTH_SECRET`          | server         | ✅ (prod) | NextAuth session-signing secret (32+ random chars).                            | `openssl rand -base64 32`                                          |
| `NEXTAUTH_URL`             | server         | ✅ (prod) | Canonical URL NextAuth uses for callbacks.                                     | `https://internforge.example.com`                                  |
| `ZAI_API_KEY`              | server         | ⚠️ prod | z-ai-web-dev-sdk API key. Empty in dev = SDK falls back to graceful static responses. | `sk-zai-xxxxxxxx`                                                  |
| `NEXT_PUBLIC_SOCKET_URL`   | client         | ✅       | URL the browser uses for socket.io (the Caddy gateway).                        | `http://localhost:81` or `https://internforge.example.com`         |
| `NEXT_PUBLIC_APP_URL`      | client         | ✅       | Canonical app URL (OG metadata, certificate QR codes).                          | `http://localhost:3000`                                            |
| `NODE_ENV`                 | server + client | ✅       | `development` or `production`. Affects Next.js build, React dev warnings, Prisma query logging. | `production`                                                       |
| `PORT`                     | server         | ⚠️      | Next.js standalone server port (default 3000).                                 | `3000`                                                             |
| `POSTGRES_PASSWORD`        | docker-compose | ✅ (prod) | Postgres superuser password (used by compose + init).                          | `forge`                                                            |
| `KUBECONFIG_B64`           | CI secret      | ✅ (prod) | Base64-encoded kubeconfig for `kubectl` deploy step.                           | (base64 blob)                                                      |

> **Client-exposed vars** (`NEXT_PUBLIC_*`) are inlined into the JS bundle at build time. They cannot be rotated without a rebuild.

---

## 8. Database migrations

### 8.1 Dev workflow (`db:push`)

`bun run db:push` runs `prisma db push --accept-data-loss` — useful for the demo SQLite DB where the schema is being iterated. It:
1. Compares the local schema to `prisma/schema.prisma`.
2. Resets columns that changed type (the `--accept-data-loss` flag).
3. Updates `dev.db` in place.

**Never use `db:push` in production** — it can silently drop columns of data.

### 8.2 Production workflow (`db:migrate`)

```bash
# Create a migration from schema changes
bunx prisma migrate dev --name describe_change_here

# Apply migrations in production
DATABASE_URL=$PROD_DATABASE_URL bunx prisma migrate deploy
```

`prisma migrate deploy` is idempotent — it reads `_prisma_migrations` table and applies only what's missing.

### 8.3 Rollback strategy

Prisma doesn't ship a native "down migration" tool. The standard pattern is:

1. **Forward-only migrations.** Every migration is additive (new column, new table, new index). Destructive changes go in a *follow-up* migration after a one-release grace period.
2. **Take a backup before each migration.** (See §10.)
3. **If a migration breaks prod:**
   - Roll the deployment back to the previous image: `kubectl rollout undo deployment/internforge-app -n internforge`.
   - **Do not** roll back the DB — the new schema is forward-compatible. The previous app version reads new columns as `null` and writes to old columns.
   - Patch forward with a fix migration in the next release.

### 8.4 Migration lifecycle

```mermaid
graph LR
  A[Edit prisma/schema.prisma] --> B[migrate dev --name]
  B --> C[Migration file in prisma/migrations/]
  C --> D[Commit + PR]
  D --> E[CI: tsc --noEmit]
  E --> F[Merge to main]
  F --> G[Deploy: migrate deploy]
  G --> H[Backup before]
  H --> I[Apply migration]
  I --> J[Health check]
  J -- ok --> K[Rollout new app]
  J -- fail --> L[Hold + alert on-call]
```

---

## 9. Monitoring & logging

### 9.1 Readiness probe

`GET /api/admin/health` is the canonical readiness/liveness endpoint. It:

- Runs `db.user.count()` against Prisma.
- Returns `{ status: 'ok'|'degraded', timestamp, database: 'connected'|'disconnected', version: '1.0.0' }`.
- HTTP 200 always (so probes don't flap); degrade status is in the JSON body.

Wire it into Kubernetes as shown in §5.5.

### 9.2 Structured logs

The dev script pipes `next dev` through `tee dev.log` — useful for local debugging. For production:

- **Next.js server logs** go to stdout, picked up by your container runtime (Docker / k8s logs).
- **API route logs** should use a structured logger (pino/winston) writing JSON. (Not wired in v1.0; see roadmap Q1.)
- **Audit log** — every administrative write is persisted to the `AuditLog` table (`action`, `resource`, `resourceId`, `details`, `ipAddress`, `severity`, `userId`). The Admin Portal renders this in the Audit view with severity filters and CSV export.

### 9.3 Production monitoring guidance

| Signal                | Source                          | Tool                                 |
| --------------------- | ------------------------------- | ------------------------------------ |
| Application metrics   | `/api/admin/metrics` (planned)  | Prometheus + Grafana, or CloudWatch / Datadog |
| Real user monitoring  | Next.js + Web Vitals            | Vercel Analytics, Sentry, Datadog RUM |
| Error tracking        | Next.js error boundary          | Sentry (`@sentry/nextjs`)            |
| Log aggregation      | container stdout                | Loki, CloudWatch Logs, Datadog Logs  |
| Uptime               | `/api/admin/health`             | UptimeRobot, Pingdom, CloudWatch Synthetics |
| DB health             | Postgres `pg_stat_activity`     | pgWatch2, RDS Enhanced Monitoring    |
| WebSocket health     | Chat-service `/health` (planned) | Prometheus blackbox exporter         |

### 9.4 Recommended alerts (start here)

| Alert                          | Threshold                                  | Severity |
| ------------------------------ | ------------------------------------------ | -------- |
| HTTP 5xx rate                  | >1% of requests for 2 minutes              | Page     |
| p99 latency                    | >1500ms for 5 minutes                      | Page     |
| Health-check failures          | 2 consecutive failures                     | Page     |
| DB connection pool saturation  | >80% of pool for 2 minutes                 | Page     |
| WebSocket connection count     | drops >50% in 5 min vs baseline            | Warn     |
| Audit log writes failing       | any error                                  | Page     |
| Disk usage                     | >85% on Postgres volume                    | Warn     |
| Cert renewal (cert-manager)    | any failed renewal                         | Page     |

---

## 10. Backup & disaster recovery

### 10.1 Backup strategy

| Layer           | Method                                                       | Cadence         | Retention     |
| --------------- | ------------------------------------------------------------ | --------------- | ------------- |
| Postgres data   | `pg_dump` logical backup to S3                              | Daily 02:00 UTC | 30 days       |
| Postgres WAL    | Continuous archive to S3 (PITR)                              | Continuous       | 7 days        |
| SQLite (dev)    | Copy `dev.db` to git-ignored `.backups/`                    | On demand       | Manual        |
| User uploads    | Object storage lifecycle policy                              | Continuous       | Bucket versioning 90 days |
| Config (k8s)    | `kubectl get -o yaml` to S3                                 | Weekly           | 90 days       |

### 10.2 PITR (point-in-time recovery)

For production Postgres:

```bash
# Daily base backup
kubectl exec -n internforge internforge-db-0 -- pg_dump -U internforge internforge \
  | gzip > backups/$(date +%Y%m%d_%H%M%S).sql.gz
aws s3 cp backups/$(date +%Y%m%d_%H%M%S).sql.gz s3://internforge-backups/db/

# For real PITR, configure postgresql.conf:
#   archive_mode = on
#   archive_command = 'aws s3 cp %p s3://internforge-backups/wal/%f'
# and use pgBackRest or Barman for restore.
```

### 10.3 Recovery runbook

> **Scenario:** Production DB corrupted at 14:32 UTC. Last good backup: 02:00 UTC. WAL archived through 14:31 UTC.

```mermaid
graph TD
  A[Alert: 5xx spike on /api/users/*] --> B[Confirm DB health fails]
  B --> C[Declare incident: page on-call]
  C --> D[Stop writes: scale app to 0]
  D --> E[Restore base backup to new instance]
  E --> F[Replay WAL to 14:31 UTC]
  F --> G[Run migrate deploy]
  G --> H[Update DATABASE_URL secret to new instance]
  H --> I[kubectl rollout restart]
  I --> J[Verify /api/admin/health ok]
  J --> K[Postmortem within 24h]
```

| Step | Command                                                          |
| ---- | ---------------------------------------------------------------- |
| 1    | `kubectl scale deploy internforge-app -n internforge --replicas=0` |
| 2    | Provision a fresh RDS instance from the latest snapshot.          |
| 3    | Replay WAL up to the desired timestamp.                           |
| 4    | `DATABASE_URL=… kubectl apply -f k8s/10-secret.yaml`              |
| 5    | `kubectl apply -f k8s/40-app.yaml`                                |
| 6    | `kubectl rollout status deploy/internforge-app -n internforge`    |
| 7    | `curl https://internforge.example.com/api/admin/health`           |
| 8    | Announce recovery, schedule postmortem.                            |

**Recovery objectives:** RPO ≤ 5 minutes (WAL archive), RTO ≤ 30 minutes.

---

## 11. Production launch checklist

A step-by-step gate before flipping the DNS to the production hostname.

### 11.1 Code & build

- [ ] `bun run lint` passes with 0 errors / 0 warnings
- [ ] `bunx tsc --noEmit` passes
- [ ] `bun run build` succeeds and emits `.next/standalone`
- [ ] All secrets rotated (NEXTAUTH_SECRET, ZAI_API_KEY, POSTGRES_PASSWORD)
- [ ] Docker images built and pushed to the registry
- [ ] Image digests recorded in the release notes

### 11.2 Database

- [ ] Production Postgres provisioned (RDS / Cloud SQL)
- [ ] `DATABASE_URL` secret set in the cluster
- [ ] `prisma migrate deploy` ran cleanly
- [ ] Seed data reviewed (do not run `prisma/seed.ts` in prod — write a separate prod-bootstrap script)
- [ ] Daily `pg_dump` cron verified
- [ ] PITR / WAL archiving verified (restore test passed)

### 11.3 Infrastructure

- [ ] TLS certificate issued (cert-manager + Let's Encrypt, or ACM)
- [ ] Ingress hostname resolves to the cluster
- [ ] WebSocket upgrade configured on the Ingress (see §5.7 annotations)
- [ ] HPA installed and tested (`kubectl autoscale` triggers at 70% CPU)
- [ ] PodDisruptionBudget set (min 2 available)
- [ ] NetworkPolicy restricts egress to {RDS, the z-ai API, the docker registry}

### 11.4 Application

- [ ] `/api/admin/health` returns `status: ok`
- [ ] Each of the four portals loads with real prod data (verified via agent-browser)
- [ ] AI endpoints (`/api/ai/chat`, `/api/ai/feedback`, `/api/ai/recommend`, `/api/ai/skill-analysis`) work with the real `ZAI_API_KEY`
- [ ] WebSocket chat service reachable through the gateway
- [ ] Sonner toasts render correctly (top-right, `richColors`)
- [ ] Dark mode toggles and persists
- [ ] Mobile responsive check at 375×812 passes (sidebar collapses to drawer)

### 11.5 Observability

- [ ] Structured logs flowing to Loki / CloudWatch / Datadog
- [ ] Prometheus scraping `/api/admin/metrics` (or planned Q1)
- [ ] Sentry DSN set; sample rate 100% in first week
- [ ] Uptime monitor on `/api/admin/health` with 30s cadence
- [ ] Alert channels wired (PagerDuty / Slack / email)
- [ ] On-call rotation set for the first 2 weeks

### 11.6 Security

- [ ] `NEXTAUTH_SECRET` is 32+ random characters (not in git)
- [ ] CORS configured for the prod hostname only (or NextAuth CSRF for forms)
- [ ] Rate limiting enabled on `/api/ai/*` and `/api/applications` (planned Q1)
- [ ] Audit log writes verified for at least one administrative action
- [ ] OWASP Top 10 walkthrough passed (see docs/09-testing-qa §5)
- [ ] Dependency scan (Snyk / Dependabot) green
- [ ] Container image scan (Trivy) green

### 11.7 Go/no-go

- [ ] All above boxes checked
- [ ] On-call engineer available for 4 hours post-flip
- [ ] Rollback plan reviewed (previous image digests documented)
- [ ] DNS TTL lowered to 60s 24h ahead
- [ ] Communication plan ready (status page + social)

**Only when every box is checked → flip the DNS.**
