# Part B: configurationwizzard Integration Plan

## Overview

Integrate the configurationwizzard SPA with the tollgate-module-basic-go backend. Two independent Preact apps in one repo:

- **Admin SPA** — authenticated via ubus, served by uhttpd on :80, manages config/wallet/status
- **Captive Portal SPA** — unauthenticated, served by NoDogSplash on :2050, accepts payments via `:2121`

## Architecture

```
┌─────────────────────────────────┐     ┌──────────────────────────────────┐
│  Admin SPA (uhttpd :80)         │     │  Captive Portal (NoDogSplash     │
│  Authenticated via ubus session │     │  :2050, unauthenticated)         │
├─────────────────────────────────┤     ├──────────────────────────────────┤
│  dashboard / wifi / devices     │     │  Pricing ← GET :2121/            │
│  settings / wallet / login      │     │  MAC ← GET :2121/whoami         │
├─────────────────────────────────┤     │  Cashu → POST :2121/             │
│  ubus → rpcd plugin             │     │  Lightning → POST :2121/ln-invoice│
│  ↓                              │     │  + GET :2121/ln-invoice?quote=   │
│  tollgate --json                │     │  Balance ← GET :2121/balance     │
│  ↓                              │     ├──────────────────────────────────┤
│  /var/run/tollgate.sock         │     │  (no ubus, no auth)              │
└─────────────────────────────────┘     └──────────────────────────────────┘
```

## Payment API Endpoints (`:2121`)

| Endpoint | Method | Response Format | Purpose |
|----------|--------|----------------|---------|
| `/` | GET | Nostr kind 10021 JSON | Pricing discovery |
| `/` | POST | Nostr kind 1022 or 21023 | Cashu payment |
| `/whoami` | GET | `text/plain` `mac=<addr>` | Device MAC |
| `/ln-invoice` | POST | JSON `{status, quote, invoice, ...}` | Create Lightning invoice |
| `/ln-invoice?quote=<id>` | GET | JSON `{status, state, access_granted}` | Poll invoice status |
| `/balance` | GET | JSON `{session_active, usage, allotment, remaining}` | Session balance |

## CLI `--json` Contract (rpcd plugin must match)

All commands return `CLIResponse`:
```json
{
  "success": true|false,
  "message": "...",
  "data": { ... },
  "error": "...",
  "timestamp": "..."
}
```

Key commands:
- `tollgate --json config schema` → `{config: FieldSchema[], identities: FieldSchema[]}`
- `tollgate --json config get` → `{config: {...}, identities: {...}}`
- `tollgate --json config set <key> <value>` → `{key, value}` + immediate disk persist
- `tollgate --json config save <json>` → replaces entire config file
- `tollgate --json wallet balance` → `{balance: <uint64>}`
- `tollgate --json wallet info` → `{total_balance, mint_count, mint_balances}`
- `tollgate --json wallet fund <token>` → `{amount_received}`
- `tollgate --json wallet drain cashu` → `{tokens: [...], total_sats}`
- `tollgate --json status` → `{running, version, uptime, config_ok, wallet_ok, network_ok}`
- `tollgate --json health` → `{status: "ok", ...}`

## File Structure After Restructuring

```
configurationwizzard/
├── admin.html                 # NEW - admin entry HTML
├── portal.html                # NEW - portal entry HTML
├── vite.config.ts             # MODIFIED - dual-mode via VITE_APP env var
├── package.json               # MODIFIED - new scripts
├── src/
│   ├── admin-main.tsx         # NEW - admin bootstrap (from current app.tsx)
│   ├── portal-main.tsx        # NEW - portal bootstrap (from captive-portal branch)
│   ├── components/
│   │   ├── layout.tsx         # admin sidebar + routing shell
│   │   ├── particle-bg.tsx    # shared (portal + login)
│   │   ├── pwa-modal.tsx      # portal only
│   │   └── schema-form.tsx    # NEW - dynamic schema renderer
│   ├── lib/
│   │   ├── router.ts          # admin hash router
│   │   ├── ubus.ts            # admin ubus client
│   │   ├── ubus.mock.ts       # MODIFIED - new mock handlers
│   │   ├── payment-api.ts     # NEW - :2121 client (portal)
│   │   ├── nostr-parser.ts    # NEW - kind 10021/1022/21023 parser
│   │   └── paths.ts           # shared path helper
│   ├── routes/
│   │   ├── dashboard.tsx      # MODIFIED - real tollgate status
│   │   ├── devices.tsx        # unchanged
│   │   ├── login.tsx          # unchanged
│   │   ├── settings.tsx       # REWRITTEN - schema-driven
│   │   ├── wallet.tsx         # REWRITTEN - real backend
│   │   ├── wifi.tsx           # unchanged
│   │   └── captive-portal.tsx # MODIFIED - real :2121 API
│   └── styles/
│       ├── base.css           # MODIFIED - portal + admin styles
│       └── variables.css      # shared
├── openwrt/
│   ├── rpcd/
│   │   ├── tollgate           # REWRITTEN - uses tollgate --json
│   │   └── tollgate_acl.json  # MODIFIED - new methods + read/write split
│   └── files/etc/config/
│       └── uhttpd_net4sats    # unchanged
├── scripts/
│   ├── build-app.mjs          # NEW - dual build script
│   └── build-pages.mjs        # NEW - GitHub Pages demo build
└── deploy.sh                  # MODIFIED - deploys both apps
```

---

## Step 8: Repo Setup + Dual Build Infrastructure

**Goal**: Create develop branch, set up dual-entry-point Vite build producing `dist/admin/` and `dist/portal/`.

**Depends on**: Part A PR #124 (for `tollgate --json` commands to exist on router)

### Tasks

- [ ] Clone `net4sats/configurationwizzard`, create `develop` branch from `main`
- [ ] Merge `origin/captive-portal` into `develop` (bring in `captive-portal.tsx`, `pwa-modal.tsx`, CSS)
- [ ] Create `admin.html` entry point
- [ ] Create `portal.html` entry point
- [ ] Create `src/admin-main.tsx` — bootstraps admin app
- [ ] Create `src/portal-main.tsx` — bootstraps portal app (no ubus imports)
- [ ] Update `vite.config.ts` with VITE_APP dual-mode
- [ ] Create `scripts/build-app.mjs` dual build script
- [ ] Update `package.json` scripts
- [ ] Verify `npm run build` produces `dist/admin/` and `dist/portal/`
- [ ] Verify `npm run dev` renders admin, `npm run dev:portal` renders portal
- [ ] Fix external logo reference in captive-portal.tsx → local asset

---

## Step 9: Payment API Client + Wire Portal to Real :2121

**Goal**: Create payment API client library, replace all mock data in captive portal with real `:2121` calls.

**Depends on**: Step 8

### Tasks

- [ ] Create `src/lib/payment-api.ts` — all :2121 endpoints
- [ ] Create `src/lib/nostr-parser.ts` — kind 10021/1022/21023 parsing
- [ ] Update `captive-portal.tsx` — replace all ubusCall with payment-api
- [ ] Remove all `import { ubusCall }` from portal code
- [ ] Calculate pricing options from real kind 10021 data
- [ ] Wire real Cashu payment: POST / → kind 1022/21023
- [ ] Wire real Lightning: POST /ln-invoice + GET polling
- [ ] Wire real MAC from /whoami
- [ ] Test locally against router :2121

---

## Step 10: Rewrite rpcd Plugin

**Goal**: Replace current rpcd plugin with secure `tollgate --json` implementation. Fix shell injection.

**Depends on**: Part A PR #124

### Tasks

- [ ] Rewrite `openwrt/rpcd/tollgate` with all new methods
- [ ] Update `openwrt/rpcd/tollgate_acl.json` with read/write split
- [ ] Update `src/lib/ubus.mock.ts` with new mock handlers
- [ ] Deploy to beta router and test each method

---

## Step 11: Schema-Driven Settings Page

**Goal**: Replace hardcoded settings form with dynamic schema-driven form.

**Depends on**: Step 10

### Tasks

- [ ] Create `src/components/schema-form.tsx` — renders FieldSchema[] → form
- [ ] Rewrite `src/routes/settings.tsx` — fetch schema, render dynamically
- [ ] Handle complex types: arrays (accepted_mints, profit_share), objects, duration
- [ ] Keep hostname/password sections (UCI/system, not tollgate config)
- [ ] Remove hardcoded Pricing/LNURL sections
- [ ] Test with all 67 schema entries

---

## Step 12: Wallet Page

**Goal**: Real wallet page with balance, per-mint breakdown, fund, and drain.

**Depends on**: Step 10

### Tasks

- [ ] Rewrite `src/routes/wallet.tsx` with real backend calls
- [ ] Balance display with per-mint breakdown
- [ ] Fund form: Cashu token input → wallet_fund
- [ ] Drain form: wallet_drain_cashu → display tokens + copy
- [ ] Remove "Coming Soon" placeholder

---

## Step 13: Dashboard Updates + Deployment Infrastructure

**Goal**: Update dashboard with real data, create deployment scripts.

**Depends on**: Steps 10-12

### Tasks

- [ ] Update `src/routes/dashboard.tsx` with real status shape
- [ ] Create NoDogSplash portal deployment config
- [ ] Update `deploy.sh` for dual deployment
- [ ] Add CI workflow for build verification

---

## Step 14: End-to-End Testing on Hardware

**Goal**: Full integration test on beta router.

**Depends on**: All previous steps + Part A merged

### Tasks

- [ ] Deploy Part A to beta router
- [ ] Deploy Part B to beta router via deploy.sh
- [ ] Admin flow: login → dashboard → settings → wallet → wifi → devices
- [ ] Portal flow: redirect → pricing → Cashu payment → access granted
- [ ] Portal flow: Lightning payment → access granted
- [ ] Persistence test across restart
- [ ] Error handling test (invalid token, bad config value)

---

## Risk Areas

| Risk | Mitigation |
|------|-----------|
| `tollgate --json` socket timeout | Set rpcd `script_timeout` to 60s |
| NoDogSplash SPA serving | Portal is single page with hash routing — no server routing needed |
| Kind 10021 parsing across metric types | Test with both `milliseconds` and `bytes` |
| `wallet fund` with long Cashu tokens | Use stdin piping in rpcd plugin |
| CORS for portal → :2121 | :2121 already has CORS middleware for private networks |
| Portal assets without internet | Bundle all assets locally via Vite |

## Estimated Effort

| Step | Effort |
|------|--------|
| 8: Repo setup + dual build | Medium |
| 9: Payment API + portal wiring | Large |
| 10: rpcd plugin rewrite | Medium |
| 11: Schema-driven settings | Large |
| 12: Wallet page | Medium |
| 13: Dashboard + deployment | Small |
| 14: E2E testing | Medium |
