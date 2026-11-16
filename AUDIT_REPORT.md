# PRE-DEPLOYMENT PRESENTATION READINESS AUDIT
## Lastro - Product Monitoring and Notification System

**Audit Date:** 16/11/2026  
**Repository:** `c:\Users\nnmsg\OneDrive\Documents\atelier-noir`  
**Scope:** Code readiness audit only — no live deployment, no production access

## A. EXECUTIVE SUMMARY

### 1. Is the current codebase ready for the presentation workflow?

**NO.** The codebase is **NOT READY FOR DEPLOYMENT** for the presentation scenario.

### 2. What already works?

| Component | Status | Evidence |
|-----------|--------|----------|
| Frontend build (Vite + React + Tailwind) | Builds successfully | `npm run build` exits 0, 0 errors |
| User registration (Supabase Auth) | Implemented | `src/pages/Auth.jsx`, `backend/routes/auth.routes.js` |
| User login | Implemented | `src/pages/Auth.jsx`, `backend/routes/auth.routes.js` |
| Product browsing / catalog | Implemented | `src/pages/Catalog.jsx`, `backend/routes/pecas.routes.js` GET |
| Product details view | Implemented | `src/pages/ItemDetails.jsx` |
| Product submission with "em revisão" status | Implemented | `src/pages/CreateItem.jsx`, `backend/routes/pecas.routes.js` POST |
| Notifications UI (list + mark read) | Implemented | `src/pages/Notificacoes.jsx` |
| Notification preferences | Implemented | `backend/routes/notificacoes.routes.js` GET/PUT |
| Wishlists / saved lists | Implemented | `src/pages/Wishlist.jsx`, `backend/routes/listas.routes.js` |
| Database schema (pecas, notificacoes, etc.) | Defined | `backend/sql/schema_p0_dre_v2.sql` |
| Linting | 24 warnings, 0 errors | `npx oxlint` |

### 3. What is incomplete?

P0-critical workflow components are MISSING or PARTIALLY IMPLEMENTED:

| # | Missing Component | Impact |
|---|-------------------|--------|
| 1 | Category Tracking UI | Person B cannot track "Watches" (Stage 2 blocked) |
| 2 | Category Tracking Database table | No persistence for tracking preference |
| 3 | Category Tracking API | Cannot save/retrieve tracking preference |
| 4 | Initial Notification on Submission | Person B receives no initial notification (Stage 3 blocked) |
| 5 | Store/Admin Verification Interface | Person C cannot verify products (Stage 4 blocked) |
| 6 | Product Approval API | Status cannot transition to approved (Stage 4 blocked) |
| 7 | Approval Notification | Person B receives no second notification (Stage 5 blocked) |
| 8 | Notification Types CHECK constraint | Missing 'peca_pendente' and 'peca_aprovada' types |
| 9 | Database Triggers | No automatic notification generation |
| 10 | RLS Policies | No Row Level Security defined |

### 4. What is broken?

Nothing crashes, but functionally defective for the presentation:
- No auth middleware on backend routes — any request can access any endpoint
- Product submission never generates notifications
- `notificacoes.tipo` CHECK constraint excludes submission/approval types
- `vercel.json` only rewrites to `index.html`; Express backend not included

### 5. Overall Status: NOT READY FOR DEPLOYMENT

---

## B. WORKFLOW VERIFICATION MATRIX

| Stage | User | Expected Behavior | Status | Code Evidence | Test Evidence | Remaining Work |
|-------|------|-------------------|--------|---------------|---------------|----------------|
| Registration | A | Register and log in | IMPLEMENTED, UNTESTED | `src/pages/Auth.jsx` lines 1-160; `backend/routes/auth.routes.js` lines 64-118 | Build passes; no integration tests | Verify Supabase Auth configured |
| Registration | B | Register and log in | IMPLEMENTED, UNTESTED | Same as above | Build passes; no integration tests | Verify Supabase Auth configured |
| Product browsing | A and B | Browse products | IMPLEMENTED, UNTESTED | `src/pages/Catalog.jsx` lines 26-230; `backend/routes/pecas.routes.js` GET lines 17-39 | Build passes | Verify DB has products |
| Category tracking | B | Track "Watches" | MISSING | No UI, table, or API exists | N/A | Create tracking table, UI, API |
| Product submission | A | Submit Watch | PARTIALLY IMPLEMENTED | `src/pages/CreateItem.jsx`; `backend/routes/pecas.routes.js` POST lines 98-196 | Build passes | Submission works but no notification triggered |
| Initial notification | B | Receive pending notification | MISSING | No code generates notification on creation | N/A | Add notification logic to POST /api/pecas |
| Store verification | C | Approve Watch | MISSING | No admin UI, no approval API | N/A | Create verification interface and API |
| Approval notification | B | Receive approved notification | MISSING | No code generates notification on approval | N/A | Add notification logic to approval endpoint |
| Product discovery | B | Open approved Watch | IMPLEMENTED, UNTESTED | `src/pages/ItemDetails.jsx`; `src/pages/Notificacoes.jsx` | Build passes | Depends on Stages 4-5 |

---

## C. TECHNICAL FINDINGS

### C.1. Category Tracking Missing (Stage 2)

**Requirement:** Person B must navigate to category tracking, add "Watches", save, and see it in tracked categories.

**Gap:** No category tracking feature exists anywhere in the codebase.

| Area | Details |
|------|---------|
| Frontend | No component/page for category tracking. `src/pages/Dashboard.jsx` has wishlists but no category tracking. |
| Backend | No route for category tracking in `backend/routes/`. |
| Database | No `categorias_rastreadas` table in `backend/sql/schema_p0_dre_v2.sql`. |
| Migrations | Table doesn't exist. |
| RLS | None defined. |
| Triggers | None. |

**Correction:** Create `categorias_rastreadas` table (id, user_id, categoria, criado_at), API routes (GET/POST/DELETE), and frontend page with "Watches" option.

---

### C.2. Initial Notification Missing (Stage 3)

**Requirement:** When Person A submits a product, Person B (tracking "Watches") must receive an initial notification.

**Gap:** `backend/routes/pecas.routes.js` POST (lines 98-196) calls `logEvent('peca_cadastrada', ...)` but **never creates a notification** in the `notificacoes` table. No logic finds users tracking the submitted category.

| Area | Details |
|------|---------|
| Frontend | `src/pages/CreateItem.jsx` — submits product, no notification expectation. |
| Backend | `backend/routes/pecas.routes.js` lines 98-196 — product creation endpoint. |
| Database | `notificacoes.tipo` CHECK (line 260) excludes submission types: `CHECK (tipo IN ('primeiro_investimento', 'peca_compatível', 'laudo_concluido', 'lembrete_conservacao', 'alerta_generico'))`. |
| Migration | Line 257-272 of `schema_p0_dre_v2.sql`. |

**Correction:** Add `'peca_pendente'` to CHECK constraint; in POST handler, after insert, query tracking users and insert notifications.

---

### C.3. Store Verification Interface Missing (Stage 4)

**Requirement:** Person C must access admin interface, locate pending Watch, inspect, approve.

**Gap:** No admin/verification interface exists. No route to approve/reject products.

| Area | Details |
|------|---------|
| Frontend | `src/App.jsx` routes (lines 20-34) — no admin route. |
| Backend | `backend/routes/pecas.routes.js` — only GET and POST; no PATCH/PUT for status updates. |
| Database | `pecas.status` exists (default `'em revisão'`) but no transition logic. |

**Correction:** Create `PATCH /api/pecas/:id/status` endpoint; create frontend admin page listing pending products with approve/reject buttons; add auth middleware.

---

### C.4. Approval Notification Missing (Stage 5)

**Requirement:** After Person C approves, Person B must receive second notification.

**Gap:** No code generates notifications on product status change. No approval notification type exists.

**Correction:** Add `'peca_aprovada'` to `notificacoes.tipo` CHECK constraint; in approval endpoint, after status update, query tracking users and insert notifications.

---

### C.5. Notification Types CHECK Constraint (Stages 3 & 5)

**Gap:** `schema_p0_dre_v2.sql` line 260:

```sql
tipo TEXT NOT NULL CHECK (
  tipo IN ('primeiro_investimento', 'peca_compatível', 'laudo_concluido', 'lembrete_conservacao', 'alerta_generico')
)
```

Missing `'peca_pendente'` and `'peca_aprovada'`.

**Correction:** Add both types to the CHECK constraint.

---

### C.6. No Database Triggers or Edge Functions (Stages 3 & 5)

**Gap:** No database triggers, no Edge Functions, no Realtime configuration in the repository.

**Correction:** Add notification logic in API routes (simplest), or create DB triggers, or Edge Functions.

---

### C.7. No RLS Policies (All Stages)

**Gap:** `schema_p0_dre_v2.sql` has zero `ALTER TABLE ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` statements. All tables publicly accessible.

**Correction:** Add RLS policies for `pecas`, `notificacoes`, `categorias_rastreadas`, `preferencias_notificacao`.

---

### C.8. No Authentication Middleware on Backend (All Stages)

**Gap:** `backend/server.js` mounts all routes without auth middleware. `backend/middlewares/` only has `validate.js` (Zod), not auth validation.

**Correction:** Create auth middleware verifying Supabase JWT from `Authorization` header; apply to protected routes.

---

### C.9. Vercel Deployment Configuration

**Gap:**
- `vercel.json` only rewrites SPA routes to `index.html`. Express backend not included.
- `vite.config.js` proxies `/api` to `localhost:3000` (dev only). Production needs `VITE_API_URL`.
- No `.env` at root for frontend env vars.
- `backend/.env` contains actual Supabase credentials committed locally.

**Correction:** Deploy backend separately; add `VITE_API_URL` to Vercel; remove `backend/.env` from version control.

---

### C.10. Hardcoded localhost URLs

**Gap:** `backend/utils/eventLogger.js` line 60 uses `http://localhost:5173` as default base URL.

**Correction:** Use `process.env.FRONTEND_URL` as default.

---

## D. DEPLOYMENT READINESS CHECKLIST

### Vercel Readiness

| Item | Status | Notes |
|------|--------|-------|
| Build configuration | READY | `vite build` succeeds, outputs to `dist/` |
| Routing (SPA rewrite) | READY | `vercel.json` rewrites `/(.*)` → `/index.html` |
| Environment variables | MISSING | No `VITE_API_URL` configured; needed for production API calls |
| Runtime dependencies | READY | All dependencies in `package.json` |
| Production compatibility | READY | Static build, no SSR |
| API route compatibility | MISSING | Express backend not part of Vercel deploy; must deploy separately |
| Hardcoded localhost | BROKEN | `vite.config.js` proxies to localhost:3000 (dev only) |

### Supabase Readiness

| Item | Status | Notes |
|------|--------|-------|
| Migrations | PARTIAL | `schema_p0_dre_v2.sql` exists but missing: category tracking table, notification types, RLS policies, triggers |
| Database schema | PARTIAL | Core tables exist (`pecas`, `notificacoes`, `eventos`, `preferencias_notificacao`) but missing `categorias_rastreadas` |
| RLS | MISSING | No RLS policies anywhere |
| Authentication | PARTIAL | Supabase Auth integrated via backend routes, but no middleware enforcement |
| Database functions/triggers | MISSING | No triggers for auto-notifications |
| Edge Functions | MISSING | None in repository |
| Realtime | MISSING | Not configured |
| Notification persistence | PARTIAL | `notificacoes` table exists but CHECK constraint missing needed types |
| Seed data | READY | `backend/seed/placeholder.js` has mock products |

---

## E. MINIMUM IMPLEMENTATION PLAN

### P0: Mandatory

| Task | What | Why | Files Affected | Affects | Dependencies |
|------|------|-----|----------------|---------|--------------|
| E.1 | Add `categorias_rastreadas` table (id, user_id, categoria, criado_at) | Person B must persist "Watches" tracking | `backend/sql/schema_p0_dre_v2.sql` | Supabase (DB) | None |
| E.2 | Add `'peca_pendente'` and `'peca_aprovada'` to CHECK constraint | Notifications must reflect correct status | `backend/sql/schema_p0_dre_v2.sql` line 260 | Supabase (DB) | None |
| E.3 | Create category tracking API: GET/POST/DELETE `/api/categorias-rastreadas` | Frontend needs to save/retrieve tracking | New: `backend/routes/categorias-rastreadas.routes.js`; `backend/server.js` | Backend | E.1 |
| E.4 | Create category tracking frontend page | Person B needs UI to track Watches | New: `src/pages/CategoriaTracking.jsx`; `src/App.jsx` | Frontend | E.3 |
| E.5 | Add initial notification on product submission | Person B must receive notification when Watch submitted | `backend/routes/pecas.routes.js` POST | Backend | E.1, E.2, E.3 |
| E.6 | Create `PATCH /api/pecas/:id/status` approval endpoint with auth | Person C must approve products | `backend/routes/pecas.routes.js`; new auth middleware | Backend | E.2 |
| E.7 | Add approval notification on status change | Person B must receive second notification | Same as E.6 | Backend | E.1-E.3, E.6 |
| E.8 | Create store verification frontend page | Person C needs UI to verify products | New: `src/pages/AdminVerify.jsx`; `src/App.jsx` | Frontend | E.6 |
| E.9 | Add RLS policies on all tables | Data security and user isolation | `backend/sql/schema_p0_dre_v2.sql` | Supabase (DB) | E.1, E.2 |
| E.10 | Add backend auth middleware (verify Supabase JWT) | Protected routes require authentication | New: `backend/middlewares/auth.js`; `backend/server.js` | Backend | None |
| E.11 | Configure `VITE_API_URL` in Vercel | Frontend must reach backend in production | Vercel dashboard | Vercel | Backend deployed |

### P1: Reliability

| Task | Description |
|------|-------------|
| E.12 | Add loading/error states to all new frontend pages |
| E.13 | Add duplicate notification prevention |
| E.14 | Add session persistence check on app load |
| E.15 | Fix hardcoded `localhost:5173` in `eventLogger.js` |
| E.16 | Add proper error handling for Supabase connection failures |

### P2: Non-Essential

| Task | Description |
|------|-------------|
| E.17 | Realtime subscriptions for notifications |
| E.18 | Edge Functions |
| E.19 | Email notification channel |
| E.20 | Product image upload to Supabase Storage |
| E.21 | Advanced filtering and search |

---

## F. PRESENTATION RUNBOOK

### Pre-Screen-Sharing Preparation

1. **Database Setup:** Run `schema_p0_dre_v2.sql` plus all P0 fixes against target Supabase project.
2. **Backend Deployment:** Deploy `backend/` to hosting provider. Set `SUPABASE_URL`, `SUPABASE_KEY`, `PORT`.
3. **Frontend Deployment:** Deploy to Vercel. Set `VITE_API_URL` to deployed backend URL. Verify `npm run build` succeeds.
4. **Account Preparation:** Create accounts for Person A, Person B, and Person C via registration page. Record credentials.

### Demonstration Sequence

| Step | Actor | Action | Expected Result |
|------|-------|--------|-----------------|
| 1 | A | Register and log in | Session active, redirected to `/dashboard` |
| 2 | B | Register and log in | Session active, redirected to `/dashboard` |
| 3 | B | Navigate to category tracking; select "Relógios"; save | "Relógios" appears in tracked categories |
| 4 | A | Navigate to `/dashboard/nova-peca`; submit product name="Watch", category="Relógios" | Product created with status "em revisão" |
| 5 | B | Open `/notificacoes` | New notification about pending Watch submission |
| 6 | C | Log in; navigate to admin verification page; locate pending Watch; click "Aprovar" | Status changes to "verificado" |
| 7 | B | Refresh `/notificacoes` | New notification about Watch approval |
| 8 | B | Click notification or navigate to `/catalogo`; open Watch product details | Product shows status "verificado" |

### Expected Product Statuses

| Stage | Status | Portuguese Label |
|-------|--------|------------------|
| After submission | `em revisão` | Under Validation / Under Review |
| After approval | `verificado` | Verified / Approved |

### Expected Notifications

| Trigger | Type | Recipient |
|---------|------|-----------|
| Product submitted | `peca_pendente` | Users tracking the category |
| Product approved | `peca_aprovada` | Users tracking the category |

---

## G. FINAL READINESS CHECKLIST

### Before Deploying for Tomorrow's Presentation

**Frontend:**
- [ ] `npm run build` passes with 0 errors
- [ ] `VITE_API_URL` environment variable set in Vercel
- [ ] Category tracking page created and routed
- [ ] Admin verification page created and routed
- [ ] Navigation links to new pages added

**Backend:**
- [ ] Express server deployed and reachable
- [ ] `SUPABASE_URL` and `SUPABASE_KEY` configured
- [ ] Auth middleware applied to protected routes
- [ ] Category tracking API routes mounted
- [ ] Product approval endpoint implemented
- [ ] Notification generation on product submit implemented
- [ ] Notification generation on product approval implemented

**Database (Supabase):**
- [ ] Migration `schema_p0_dre_v2.sql` executed
- [ ] `categorias_rastreadas` table created
- [ ] `notificacoes.tipo` CHECK constraint includes `'peca_pendente'` and `'peca_aprovada'`
- [ ] RLS policies enabled on all tables
- [ ] Seed data loaded

**Workflow Verification:**
- [ ] Person A can register and log in
- [ ] Person B can register and log in
- [ ] Person B can track "Watches" category
- [ ] Person A can submit a "Watch" product
- [ ] Product appears with status "em revisão"
- [ ] Person B receives initial notification
- [ ] Person C can access admin interface
- [ ] Person C can approve the product
- [ ] Product status changes to "verificado"
- [ ] Person B receives approval notification
- [ ] Person B can open the approved product

**Both Notification Events Confirmed:**
- [ ] Initial notification (submission): YES / NO
- [ ] Approval notification (verification): YES / NO

**Overall Deployment Decision:**
- [ ] READY FOR DEPLOYMENT
- [ ] NOT READY FOR DEPLOYMENT

---

## AUDITOR NOTES

1. **Code readiness audit only.** No live deployment, no production Supabase access, no Vercel project access was performed.

2. **Backend `.env` contains actual credentials** (`SUPABASE_URL`, `SUPABASE_KEY`) at `backend/.env`. These must be removed from version control before deployment.

3. **Frontend and backend are separate deployments.** Vercel config only handles SPA frontend. Express backend must be deployed separately or converted to Vercel serverless functions.

4. **All P0 tasks are mandatory.** Without Tasks E.1 through E.11, the presentation workflow cannot be completed. The system currently supports registration, login, browsing, and submission — but not category tracking, notifications, or store verification.

5. **Build and lint pass** (0 errors, 24 warnings), but this only confirms code compiles — not that the workflow is functional.
