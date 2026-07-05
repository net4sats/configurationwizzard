# AGENTS.md — configurationwizzard Operational Knowledge

## Architecture — Thin UI Wrapper

configurationwizzard is a **thin UI layer** that wraps two separate
applications:

1. **Admin dashboard** (admin-main.tsx) — router operator configuration UI
2. **Captive portal** (portal-main.tsx) — WiFi user payment screen

Both apps call the TollGate Go backend API and OpenWrt ubus/RPC. They do
NOT contain business logic.

## Boundary Rules (CRITICAL — do not violate)

| Responsibility | Belongs in |
|---|---|
| Router identity derivation | **tollgate-module-basic-go** |
| Kind:10021 advertisement events | **tollgate-module-basic-go** |
| Mint reachability & Lightning probes | **tollgate-module-basic-go** |
| Cashu token parsing & payment | **tollgate-module-basic-go** |
| Nodogsplash session management | **tollgate-module-basic-go** |
| uci-defaults infrastructure scripts | **tollgate-module-basic-go** |
| OpenWrt config via ubus schemas | **both** — schema in backend, display in this repo |
| Admin dashboard UI rendering | **this repo** (admin-main.tsx) |
| Captive portal UI rendering | **this repo** (portal-main.tsx) |
| Seed phrase display | **this repo** — calls POST /identity/reveal-seed, renders result |
| Identity reset button | **this repo** — calls backend, renders confirmation |
| Kind:0 publish toggle | **this repo** — calls backend config API, renders checkbox |

**THIS REPO MUST NEVER DERIVE COMPUTATIONS THAT THE BACKEND OWNS.**
All crypto, identity management, payment processing, and Nostr event handling
belongs in tollgate-module-basic-go. This repo is HTML/CSS/TypeScript rendering.

## Two Build Targets — Different Applications

### Admin Dashboard (build-ipk-admin.sh)
- Entry: `src/admin-main.tsx` → `/www/net4sats/` → port 8090
- Integrates via: ubus JSON-RPC over `/ubus`
- Routes: dashboard, WiFi, devices, settings, wallet, login
- For: **router operators** configuring the device

### Captive Portal
- Entry: `src/portal-main.tsx` → `/www/` → port 80 (nodogsplash)
- Integrates via: `:2121` TollGate API (direct HTTP, not ubus)
- Routes: Lightning tab, Cashu tab, success/loading/error
- For: **WiFi users** paying for internet access

These are DIFFERENT applications sharing components (particle-bg, pwa-modal, payment-api).

## Ports

| Port | Service | Repo |
|------|---------|------|
| 80 | Captive portal (nodogsplash) | this repo (portal build) |
| 8090 | Admin dashboard (uhttpd) | this repo (admin build) |
| 8080 | LuCI (if enabled) | tollgate-module-basic-go |
| 2121 | TollGate API | tollgate-module-basic-go |
| 2050 | Nodogsplash gateway | tollgate-module-basic-go |

## Lightning Reliability — supports_ln Tag

PR #181 in tollgate-module-basic-go adds `supports_ln` tags to kind:10021.
The captive portal must parse them and show Lightning ONLY per-mint when true.
If absent (old backend): show Lightning for all mints (backward compat).

## Backward Compatibility

- Parse new tags if present, skip gracefully if absent
- Handle kind:21023 (error/no-reachable-mints) without rendering "00"
- Handle test mint dummy invoices (non-BOLT11) via polling path

## Build

```bash
./packaging/build-ipk-admin.sh          # Admin IPK
# Portal build: output to dist/, scp to router
scp dist/* root@192.168.1.1:/www/
```
