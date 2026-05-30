# Construction Cost Estimator — Implementation Plan

A full-featured web application for estimating construction project costs, modeled after the reference screenshots and GitHub repo. Built with **React + TypeScript + Vite**, **Supabase** (Auth, Database, Edge Functions), **Tailwind CSS**, **Radix UI**, and **Apache ECharts**.

---

## User Review Required

> [!IMPORTANT]
> **Supabase Project Setup Required**: You will need a Supabase project (free tier works). After scaffolding, I'll need your `SUPABASE_URL` and `SUPABASE_ANON_KEY` to connect the app to the backend. If you don't have a project yet, create one at https://supabase.com.

> [!WARNING]
> **This is a large-scale application.** Implementation will be phased. Phase 1 covers core scaffolding, auth, project management, and cost estimation. Phase 2 covers advanced features (PDFs, analytics, sharing, admin panel, i18n, PWA).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Radix UI components |
| Backend / Auth | Supabase (PostgreSQL + Auth + Edge Functions) |
| Charts | Apache ECharts (`echarts-for-react`) |
| PDF Generation | `@react-pdf/renderer` |
| i18n | `react-i18next` (English + Arabic, RTL support) |
| PWA | `vite-plugin-pwa` |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod validation |
| State | Zustand |
| CSV | PapaParse |
| Currency | Open Exchange Rates API (or mock) |

---

## Proposed Changes

### Phase 1 — Project Scaffolding & Foundation

#### [NEW] Project root: `c:/Users/Asus/Desktop/ARUN/furkan/`

Initialize a new **Vite + React + TypeScript** app in the workspace and configure:

- `tailwind.config.ts` — custom design tokens (colors, fonts, shadows)  
- `postcss.config.js`  
- `vite.config.ts` — path aliases, PWA plugin  
- `tsconfig.json`  
- `.env` — Supabase keys placeholder  
- `package.json` — all required dependencies  

---

### Phase 2 — Supabase Schema & Auth

#### Supabase Tables

```sql
-- Core tables
profiles (id, full_name, role, avatar_url, subscription_tier, created_at)
projects (id, user_id, name, type, size, size_unit, location, duration, duration_unit, client_requirements, description, status, created_at, updated_at)
cost_items (id, project_id, category [materials|labor|equipment|additional], name, quantity, unit, unit_price, workers, daily_rate, days, rental_cost, maintenance, fuel, notes, created_at)
risks (id, project_id, name, description, probability, impact, mitigation, created_at)
financial_settings (id, project_id, overhead_pct, contingency_pct, markup_pct, tax_pct, currency)
project_versions (id, project_id, version_number, snapshot_data, created_at)
shared_projects (id, project_id, share_token, password_hash, expires_at, access_count, created_at)
project_collaborators (id, project_id, user_id, permission [view|edit], invited_by, created_at)
resources (id, user_id, category [materials|labor|equipment|assemblies], name, description, unit, unit_price, currency, created_at)
cost_databases (id, user_id, name, description, currency, is_public, created_at)
notifications (id, user_id, title, message, is_read, created_at)

-- Admin tables
audit_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
subscriptions (id, user_id, tier, status, expires_at, created_at)
app_settings (id, key, value, updated_at)
dropdown_options (id, category, label, value, created_at)
```

#### [MODIFY] Auth flow
- Email/password signup & login via Supabase Auth  
- `onAuthStateChange` listener for session persistence  
- Row Level Security (RLS) policies on all tables  

---

### Phase 3 — Application Pages & Components

#### Sidebar Navigation
```
Projects          → /projects
Resources         → /resources
Cost Databases    → /cost-databases
Analytics         → /analytics
Settings          → /settings

ADMIN PANEL (role-based):
App Settings      → /admin/settings
Users             → /admin/users
Subscriptions     → /admin/subscriptions
Projects          → /admin/projects
Project Data      → /admin/project-data
Audit Logs        → /admin/audit-logs

Logout
```

#### Pages

**`/login` & `/signup`** — Auth pages with gradient background, form validation, Google OAuth option

**`/projects`** — Dashboard with:
- "My Projects" panel + "Shared With Me" panel
- Search bar + "Create New Project" button
- Project cards with name, date, type badge, quick actions

**`/projects/new`** — Project creation wizard (type, size, location, duration, client requirements, description)

**`/projects/:id`** — Project detail with tabs:
1. **Overview** — project metadata grid  
2. **Costs** — tabbed: Materials | Labor | Equipment | Additional | Summary  
3. **Risks** — probability/impact table, contingency  
4. **Scenario Analysis** — Edge Function simulation  
5. **Profit & Pricing** — overhead/markup/tax sliders + grand total  
6. **Analytics** — ECharts bar + pie charts  
7. **Reports** — PDF export (Proposal / Cost Breakdown)  
8. **Versions** — version history + restore  

**`/resources`** — Library with tabs: Materials | Labor | Equipment | Assemblies  
- Table view with search, pagination, CRUD actions (duplicate, edit, delete)  

**`/cost-databases`** — List of cost databases with public/private toggle  

**`/analytics`** — Global analytics dashboard:
- Project selector + currency selector  
- Total cost KPI card  
- Cost distribution pie chart (ECharts)  
- Cost breakdown bar chart by project  

**`/settings`** — Profile, preferences, language toggle (EN/AR), notification settings

**`/admin/*`** — Admin panel pages (users table, subscriptions, audit logs, app settings, dropdown options)

**`/share/:token`** — Public share view (password-protected, read-only)

---

### Phase 4 — Core Features

#### Cost Calculation Engine (Client-Side)
```ts
directCost = sum(materials) + sum(labor) + sum(equipment) + sum(additional)
contingency = directCost × (contingency_pct / 100)
overhead = directCost × (overhead_pct / 100)
subtotal = directCost + contingency + overhead
markup = subtotal × (markup_pct / 100)
tax = (subtotal + markup) × (tax_pct / 100)
grandTotal = subtotal + markup + tax
```

#### Scenario Simulation (Supabase Edge Function)
- Endpoint: `POST /functions/v1/simulate-scenario`  
- Input: project_id, scenario (e.g., `{ type: "price_increase", category: "materials", percent: 10 }`)  
- Returns: recalculated totals  

#### PDF Generation
- Proposal template: project overview + client info + grand total  
- Cost Breakdown template: itemized table of all cost categories  

#### Secure Sharing
- Generate SHA-256 token, optional password hash (bcrypt), optional expiry  
- `GET /share/:token` — validates token + password, renders read-only view  

#### i18n (EN/AR)
- `src/i18n/en.json` + `src/i18n/ar.json`  
- `dir="rtl"` on `<html>` when Arabic is active  
- Language toggle in header  

#### PWA
- `vite-plugin-pwa` with Workbox strategy  
- Offline fallback page + install prompt  
- Service worker caches API responses  

#### CSV Import/Export
- PapaParse for parsing CSV files  
- Import cost items into a project  
- Export as CSV or trigger PDF download  

---

### Phase 5 — Design System

**Color Palette** (Dark + Light mode):
- Primary: `#1a1a2e` (dark navy) + `#0f3460` (blue accent)  
- Accent: `#e94560` (coral-red)  
- Surface: `#16213e`  
- Text: `#eaeaea`  

**Typography**: Inter (Google Fonts)  

**Components** (Radix UI + custom):
- `Button` — variants: primary, outline, ghost, destructive  
- `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`  
- `Dialog` / `Modal`  
- `Tabs`  
- `Table` with sort + pagination  
- `Badge`, `Tooltip`, `Toast/Sonner`  
- `Sidebar` — collapsible  
- `Avatar`, `Dropdown Menu`  

---

## File Structure

```
src/
├── components/
│   ├── ui/           # Radix-based primitives
│   ├── layout/       # Sidebar, Header, AppLayout
│   ├── projects/     # ProjectCard, ProjectForm, CostTable
│   ├── charts/       # PieChart, BarChart wrappers
│   ├── admin/        # AdminUserTable, AuditLog
│   └── shared/       # ShareView
├── pages/
│   ├── auth/         # Login, Signup
│   ├── projects/     # ProjectList, ProjectDetail, tabs
│   ├── resources/    # Resources library
│   ├── analytics/    # Analytics dashboard
│   ├── admin/        # Admin panel pages
│   └── settings/     # User settings
├── lib/
│   ├── supabase.ts   # Supabase client
│   ├── calculations.ts # Cost calculation engine
│   ├── pdf.tsx       # PDF templates
│   └── utils.ts
├── hooks/            # useProjects, useAuth, useI18n
├── store/            # Zustand stores
├── i18n/             # en.json, ar.json
└── types/            # TypeScript interfaces
```

---

## Open Questions

> [!IMPORTANT]
> **Do you have a Supabase project?** If yes, please share the `SUPABASE_URL` and `SUPABASE_ANON_KEY` from your Supabase project settings so I can wire up the backend. If not, I'll scaffold the full app and leave the `.env` file for you to fill in.

> [!NOTE]
> **Currency Conversion** — The reference app uses live exchange rates. Should I use a free API (e.g., ExchangeRate-API free tier) or mock rates for now?

> [!NOTE]
> **Google OAuth** — Should I include Google Sign-In alongside email/password auth?

---

## Verification Plan

### Automated
- TypeScript compilation: `tsc --noEmit`
- Dev server startup: `npm run dev`

### Manual Verification
- Auth flow: signup → login → logout
- Project CRUD: create → edit → delete
- Cost calculation: add items → verify totals match formula
- Chart rendering: ECharts pie + bar charts
- Language toggle: EN ↔ AR with RTL flip
- PDF export download
- Share link generation + access
