# configurationwizzard

net4sats router admin interface and captive portal for OpenWrt devices.
Built with Preact + Vite, deployed to the router as a static SPA.

Two apps in one repo:

```
src/
  admin-main.tsx   →  /www/net4sats/    (port 8090)  operator dashboard
  portal-main.tsx  →  /etc/nodogsplash/htdocs/      captive portal for guests
```

**Admin dashboard** — authenticated via ubus/rpcd. Router operators use this
to configure WiFi, pricing, accepted mints, wallet, and identity.

**Captive portal** — unauthenticated, served by nodogsplash. Guests see this
when they connect to the portal WiFi. They pay via Lightning invoice or Cashu
ecash token to get internet access.

## Quick start (develop locally)

```sh
npm install
npm run dev          # admin dashboard at localhost:5173
npm run dev:portal   # captive portal at localhost:5173
```

Mock-mode (no router needed):

```sh
npm run demo         # admin dashboard with mock data
```

## Deploy to a router

```sh
# Build both apps
npm run build

# Deploy to router (default: 192.168.1.1)
./deploy.sh
# or: ./deploy.sh 10.47.41.1
```

This builds admin + portal, SCPs them to the router, installs the rpcd plugin,
configures uhttpd, and restarts nodogsplash.

After deploy:
- **Admin panel:** `http://ROUTER_IP/` or `http://ROUTER_IP/net4sats/`
- **Captive portal:** `http://ROUTER_IP:2050/` (via nodogsplash redirect)
- **LuCI (if installed):** `http://ROUTER_IP:8080/`

Login: `root` + the router's root password.

## Admin panel pages

| Page | What it does |
|------|-------------|
| **Dashboard** | Router status: hostname, OpenWrt version, uptime, tollgate health, WiFi state |
| **WiFi** | Portal AP config (SSID, encryption) + upstream STA scan/connect |
| **Devices** | DHCP lease table — connected clients |
| **Settings** | Schema-driven config from tollgate backend — see below |
| **Wallet** | Cashu balances per mint, fund (deposit token), drain (withdraw) |
| **Identity** | Router npub, deterministic LAN IPv4/MAC, 24-word seed phrase reveal, kind:0 publish |

## Schema-driven settings

The Settings page fetches a live schema from the tollgate backend
(`ubus call tollgate config_schema`) and renders forms dynamically. When the
backend adds a new config field, it appears here automatically — no UI update
needed.

Groups:

| Group | Fields |
|-------|--------|
| General | log_level, metric, step_size, margin, show_setup, reseller_mode |
| Accepted Mints | accepted_mints (array of Cashu mint URLs) |
| Profit Share | profit_share (split configuration object) |
| Upstream Detector | probe_timeout, probe_retry_count, require_valid_signature, etc. |

Saving sends changed keys via `ubus call tollgate config_save`. Complex types
(arrays, objects) use the full-config JSON save path; scalar fields use
individual `config_set` calls.

## GitHub Pages demo

A mock-mode build is published to GitHub Pages:

```sh
npm run build:pages    # builds with VITE_MOCK=true, base path /configurationwizzard/
```

The mock-mode demo runs entirely in the browser — no router needed. Useful for
showing the admin UI without hardware.

Static mockups (design references) are in `mockup/`.

## Build commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server — admin dashboard |
| `npm run dev:portal` | Dev server — captive portal |
| `npm run demo` | Dev server — admin with mock data |
| `npm run build` | Production build (both admin + portal) |
| `npm run build:admin` | Build admin only |
| `npm run build:portal` | Build portal only |
| `npm run build:pages` | Build mock-mode demo for GitHub Pages |
| `./deploy.sh [IP]` | Build + deploy to router |

## Architecture

This is a **thin UI layer**. It calls:
- `ubus` JSON-RPC (via rpcd) for OpenWrt config (WiFi, DHCP, system)
- TollGate REST API (`:2121`) for identity, payments, wallet

No business logic lives here — all crypto, identity derivation, payment
processing, and Nostr event handling belongs in
[tollgate-module-basic-go](https://github.com/net4sats/tollgate-module-basic-go).

```
┌─ Admin SPA (:8090) ──────────┐    ┌─ Captive Portal (:2050) ─────┐
│  ubus → rpcd plugin           │    │  :2121 TollGate API           │
│  └─ tollgate --json           │    │  └─ GET /  (pricing NIP-61)  │
│     └─ /var/run/tollgate.sock│    │  └─ POST / (Cashu payment)   │
│                               │    │  └─ POST /ln-invoice         │
│  dashboard / wifi / devices   │    │  └─ GET /balance             │
│  settings / wallet / identity │    │  (no ubus, no auth)          │
└───────────────────────────────┘    └───────────────────────────────┘
```

## Documentation

- **[Admin panel guide](https://github.com/net4sats/net4sats.github.io/pull/1)** —
  operator guide for every admin page, schema-driven settings, pricing/mint
  configuration, wallet, identity
- **[Setup guide](https://github.com/net4sats/net4sats.github.io/pull/1)** —
  deploying net4sats using the wizard binary
- **[Integration plan](docs/part-b-integration-plan.md)** — architecture and
  API contract between this SPA and the tollgate backend
- **[Issue #9 fix plan](docs/issue-9-fix-plan.md)** — 9 bugs fixed across
  configurationwizzard + gonuts-tollgate + tollgate-module-basic-go

## Router ports

| Port | Service | Description |
|------|---------|-------------|
| 80 | uhttpd | Admin SPA (redirect to HTTPS if configured) |
| 2050 | nodogsplash | Captive portal gateway |
| 2121 | tollgate-wrt | Payment backend REST API |
| 8080 | LuCI | OpenWrt native admin (if installed) |

## Related repos

| Repo | Role |
|------|------|
| [net4sats-wizard-go](https://github.com/net4sats/net4sats-wizard-go) | Laptop-side onboarding wizard |
| [tollgate-module-basic-go](https://github.com/net4sats/tollgate-module-basic-go) | Payment backend (Cashu + Lightning) |
| [conwrt](https://github.com/net4sats/conwrt) | Router flashing + deployment automation |

## License

MIT
