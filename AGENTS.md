# AGENTS.md — configurationwizzard Architecture for LLM Sessions

## Architectural Principle

**This repo is a thin UI wrapper.** All business logic resides in
`tollgate-module-basic-go` (the Go backend installed as a system package
on OpenWrt routers). This repo only calls backend APIs and renders
results — it does NOT implement or duplicate business logic.

## What This Repo Is

A Preact/TypeScript PWA that serves two separate web applications:

1. **Admin Dashboard** (admin-main.tsx): Router operator panel
   - Served on port 8090 (dedicated uhttpd instance)
   - Configures WiFi, DHCP, network settings via ubus/rpcd
   - Shows router identity (npub, IP, MAC, seed phrase)
   - Reset identity button, kind:0 publish toggle
   - Calls GET /identity, POST /identity/reveal-seed on the Go backend

2. **Captive Portal** (portal-main.tsx): WiFi user payment screen
   - Served on port 80 (nodogsplash-intercepted)
   - Handles Cashu ecash token paste and Lightning invoice payment
   - Fetches pricing from the Go backend's kind:10021 advertisement event
   - Parses supports_ln tags (PR #181) to show/hide Lightning per mint
   - Handles test mint dummy invoices (non-BOLT11, commit 432d106)

## Key Rules for Agents

1. **Do NOT add backend logic here.** If you need identity derivation,
   pricing computation, or key management — add it to tollgate-module-basic-go
   instead. This repo calls API endpoints, it does not reimplement them.

2. **Both apps must work with old and new backends.** Always handle the case
   where the backend is v0.5.0-alpha3 (no /identity endpoint, no supports_ln
   tags). Gracefully degrade: hide identity panel if API returns 404, show
   Lightning for all mints if supports_ln tags are absent.

3. **Two separate build targets.** `dev` mode builds portal+admin together.
   Production builds produce two distinct IPKs:
   - `configurationwizzard.ipk` (captive portal, replaces /www/)
   - `net4sats-admin.ipk` (admin panel, installs to /www/net4sats/)

4. **The Go backend owns ALL identity logic.**
   - DeriveIPv4, DeriveMAC: implemented in tollgate-module-basic-go/src/identity/
   - BIP39 mnemonic: implemented in tollgate-module-basic-go/src/identity/
   - uci-defaults 95-router-identity: ships in tollgate-module-basic-go packaging
   - This repo calls GET /identity and POST /identity/reveal-seed, nothing more

## Related Repos

- github.com/OpenTollGate/tollgate-module-basic-go — all backend logic
- github.com/OpenTollGate/net4sats-wizard-go — cross-platform onboarding wizard
