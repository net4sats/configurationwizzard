# Issue #9 — Fix Plan

Unresolved captive portal + admin issues.

Reference: https://github.com/net4sats/configurationwizzard/issues/9
PR: https://github.com/net4sats/configurationwizzard/pull/10

## Overview

Nine bugs fixed in PR #10, two remaining bugs + one feature request still
open. Fixes span three repos:

1. **`configurationwizzard`** — frontend SPA + packaging
2. **`gonuts-tollgate`** — Cashu wallet library (BOLT11 handling)
3. **`tollgate-module-basic-go`** — Go backend daemon (packaging)

### Fixed in PR #10 (Bugs 1–9)

| Bug | Description | Status |
|-----|-------------|--------|
| 1 | Invoice generation fails (BOLT11 decode) | Fixed |
| 2 | `profit_share` / `devsplit` setting errors | Fixed |
| 3 | Draining wallet shows no funds | Fixed |
| 4 | No accepted mints displayed | Fixed |
| 5 | NoDogSplash port conflict (discovered during deployment) | Fixed |
| 6 | Empty password rejected by login form | Fixed |
| 7 | Wrong password gives confusing error message | Fixed |
| 8 | ubusCall() doesn't handle OpenWrt 25 error format | Fixed |
| 9 | Test mint Lightning flow blocked by lnbc check | Fixed |

### Still Open

| ID | Description | Type |
|----|-------------|------|
| A | Lightning/Cashu tab labels white-on-white | Bug |
| B | PWA install instructions don't work in captive portal webview | Bug |
| C | WiFi scanning / connecting to upstream | Feature |

---

## Bug 1: Invoice generation fails

> `error decoding bolt11 invoice: zpay32 decoding failed: checksum failed.
> Expected can5u8, got 477023.`

### Root cause

The `gonuts-tollgate` wallet library (`wallet/wallet.go:272`) unconditionally
calls `decodepay.Decodepay(mintResponse.Request)` after receiving a mint quote.
Test mints like `testnut.cashu.exchange` return a dummy string
(`dummy-mint-1-...`) instead of a real BOLT11 invoice. The `zpay32` decoder
fails, aborting the entire `RequestMint` call — even though the mint
successfully created the quote.

The library only uses `bolt11.CreatedAt` from the decoded invoice, which can
fall back to `time.Now().Unix()` when decoding fails.

### Fix

**Frontend (already deployed):**

- [x] `src/routes/captive-portal.tsx` — validate that `res.invoice` is non-empty
      and starts with `lnbc` before displaying
- [x] `src/lib/payment-api.ts` — add missing `allotment`/`metric` fields to
      `LnInvoiceResponse` interface
- [x] Improved error message for non-Lightning mints

**Backend library (gonuts-tollgate):**

- [x] Fork `Amperstrand/gonuts-tollgate` → `net4sats/gonuts-tollgate`
- [x] Patch `wallet/wallet.go` — make `decodepay.Decodepay` non-fatal in
      `RequestMint()`, fall back to `time.Now().Unix()` for `CreatedAt`
- [x] Tag as `v0.7.1`
- [x] Open PR #2 to `Amperstrand/gonuts-tollgate`
- [x] Discovered @Amperstrand already has identical fix at commit `9b2b843`
      on `feature/v2-keyset-ids` branch (better documented, same logic)
- [x] Close our PR #2 — @Amperstrand's fix supersedes ours
- [x] Request @Amperstrand merge `9b2b843` into main and tag as `v0.7.1`
- [x] Clean up net4sats fork (delete branch + tag)

**Backend daemon (tollgate-module-basic-go):**

- [x] Update `src/go.mod` replace directive to `net4sats/gonuts-tollgate v0.7.1`
- [x] Fix `99-tollgate-setup` nodogsplash gatewayport → 2050 + allow rule
- [x] Rebuild `tollgate-wrt` binary for `aarch64_cortex-a53`
- [ ] Switch replace directive to `Amperstrand/gonuts-tollgate v0.7.1` once tagged upstream

---

## Bug 2: `profit_share` / `devsplit` setting errors

> `Error setting profit_share: Failed to set profit_share: unsupported type slice for set`

### Root cause

`settings.tsx:saveSchemaChanges()` calls `config_set` per changed key with the
entire array JSON-stringified as the value. The Go backend's `setFieldValue()`
at `config_dotpath.go:267` rejects `reflect.Slice` — it only supports scalar
types and indexed dot-paths like `profit_share.0.factor`.

### Fix

- [x] `src/routes/settings.tsx` — change `saveSchemaChanges()` to detect
      array/object values and use `config_save` (full config JSON) instead of
      individual `config_set` calls for those keys

---

## Bug 3: Draining the wallet shows no funds

> After a drain the money just disappears; the drained amount/token isn't
> surfaced to the user.

### Root cause

Field name mismatch. The Go `CashuToken` struct serializes as `balance_sats`
but the frontend `DrainToken` interface expects `balance`. Additionally, the
ubus response may nest the data under a second `data` layer.

### Fix

- [x] `src/routes/wallet.tsx` — rename `DrainToken.balance` to
      `balance_sats` to match the Go JSON tag, and update all references
- [x] Updated mock in `ubus.mock.ts` to match Go backend field names
      (`balance_sats`, nested `success` field)

---

## Bug 4: No accepted mints displayed when paying with Cashu

> The accepted mint list isn't shown.

### Root cause

The captive portal fetches `pricing.mintUrl` from the advertisement but never
displays it on the Cashu tab. Users have no way to know which mint's tokens
are accepted.

### Fix

- [x] `src/routes/captive-portal.tsx` — show the accepted mint URL below the
      Cashu token input field

---

## Bug 5: NoDogSplash port conflict (discovered during deployment)

> NoDogSplash crash-loop: `Could not create web server: Bad file descriptor`
> Captive portal unreachable on port 2050.

### Root cause

`tollgate-module-basic-go`'s first-boot setup (`99-tollgate-setup` line 138)
sets `nodogsplash.gatewayport='80'`, conflicting with uhttpd on the same port.
The port 2050 allow rule is also missing from `users_to_router`.

### Fix (configurationwizzard packaging)

- [x] `packaging/postinst` — set nodogsplash `gatewayport=2050` and add
      `users_to_router 'allow tcp port 2050'`
- [x] `packaging/files/etc/uci-defaults/91-configurationwizzard-setup` — same
- [x] `packaging/Makefile` inline postinst — same

### Fix (tollgate-module-basic-go packaging)

- [x] `packaging/files/etc/uci-defaults/99-tollgate-setup` — change
      `gatewayport='80'` to `gatewayport='2050'` and add
      `allow tcp port 2050` to `users_to_router` rules

---

## Bug 6: Empty password rejected by login form

> Fresh OpenWrt root accounts often have no password set, but the Sign-In
> button is disabled when the password field is empty.

Reported by @Origami74 on issue #9.

### Root cause

`src/routes/login.tsx:140` has `disabled={loading || !password}` which prevents
submitting an empty password. On a fresh OpenWrt install, the root account may
have no password set.

### Fix

- [x] `src/routes/login.tsx` — remove `!password` from disabled check, allow
      empty password submission

---

## Bug 7: Wrong password gives confusing error message

> Wrong credentials surface as "ubus error 2: unknown" instead of a clear
> "Invalid credentials" message.

Reported by @Origami74 on issue #9.

### Root cause (initial hypothesis)

`src/lib/ubus.ts:81-83` checks `json.result[0] !== 0` during login, but ubus
returns error code `2` (not `0`) for invalid credentials. The generic error
path produces "ubus error 2: unknown" which is confusing.

### Root cause (actual — discovered via testing on Arjen's router)

Tested on @Origami74's router (OpenWrt 25.12.2, `192.168.1.1`) and found:

1. **Root has no password set** (`root::` in `/etc/shadow`). When no password
   is set, `session.login` accepts ANY password — wrong credentials never fail.
   The "ubus error 2" Arjen saw was NOT from login failure.

2. **OpenWrt 25 returns different error format** for session expiry:
   - OpenWrt 24: `{"result":[6]}` (result array)
   - OpenWrt 25: `{"error":{"code":-32002,"message":"Access denied"}}` (JSON-RPC error object)

3. **`ubusCall()` has a gap on OpenWrt 25**: When a session expires, `json.result`
   is `undefined` (no `result` property), so line 40 throws "No result from ubus"
   instead of "SESSION_EXPIRED". The user sees a confusing error instead of being
   redirected to login. This is likely the real source of Arjen's "ubus error" —
   a post-login `ubusCall()` that hit an expired/invalid session on OpenWrt 25.

### Fix (already applied)

- [x] `src/lib/ubus.ts` — in the `login()` function, map any non-zero ubus
      response to "Invalid username or password" instead of the generic error
- [x] Wrapped `res.json()` in try/catch for non-JSON responses

### Fix (Bug 8 — already applied)

- [x] `src/lib/ubus.ts` — in `ubusCall()`, detect OpenWrt 25 JSON-RPC error
      objects (`json.error`) and map `-32002` to SESSION_EXPIRED before checking
      `json.result`

---

## Bug 9: Test mint Lightning invoice — lnbc check blocks auto-pay flow

> Phone shows "This mint doesn't support Lightning payments" when trying to pay
> via Lightning on a router using testnut mint.

### Root cause

The testnut mint (`testnut.cashu.exchange`) returns a dummy invoice string
(`dummy-mint-1-...`) instead of a real `lnbc` BOLT11 invoice. Testnut
auto-pays these dummy quotes within seconds, so the Lightning payment flow
should still complete.

However, the Bug 1 fix added a strict `lnbc` prefix check in
`captive-portal.tsx:218-221` that **blocks the entire flow** when no valid
BOLT11 is found. The error message is shown and the polling loop never starts,
preventing testnut's auto-pay from being detected.

### Fix

Relax the `lnbc` check to be non-blocking for the Lightning invoice flow:
- If `invoice` starts with `lnbc`: show invoice string + QR code, start polling
- If `invoice` is non-empty but not `lnbc`: show "Processing payment..." state,
  start polling immediately (test mint auto-pay will settle the quote)
- If `invoice` is empty: show error and stop (genuine failure)

### Checklist

- [x] `src/routes/captive-portal.tsx` — refactor `handleGenerateInvoice` to allow
      non-lnbc invoices, add "processing" state for test mints
- [x] Build verification
- [x] Deploy to routers
- [x] Phone test: Lightning tab → "Processing payment..." → success
- [x] Push to PR #10

---

## Bug 8: ubusCall() doesn't handle OpenWrt 25 error format

> Post-login ubus calls fail with "No result from ubus" instead of redirecting
> to login when session expires on OpenWrt 25.

Discovered during testing on @Origami74's router.

### Root cause

OpenWrt 25 returns JSON-RPC error objects for permission failures:
```json
{"error":{"code":-32002,"message":"Access denied"}}
```

While OpenWrt 24 returns result arrays:
```json
{"result":[6]}
```

`ubusCall()` at `src/lib/ubus.ts:40` checks `!json.result` first, which throws
"No result from ubus" on OpenWrt 25 — the `result[0] === 6` session expiry check
at line 42 is never reached.

### Fix

- [x] `src/lib/ubus.ts` — add `json.error` check before `json.result` check in
      `ubusCall()`, map `error.code === -32002` to SESSION_EXPIRED
- [x] Verify on OpenWrt 25 router (192.168.1.1)
- [x] Verify on OpenWrt 24 router (10.47.41.1) — regression test

---

## Test automation (physical-router-test-automation)

### Bash E2E (Phase 6: Login/Auth)

Add login/auth tests to `scripts/test-configwizzard-e2e.sh`:

- [x] Test empty password login via ubus (Bug 6 backend validation)
- [x] Test wrong password returns ubus error code 6 (Bug 7 backend validation)
- [x] Restore router password state after tests
- [x] Auto-detect curl vs wget on router (BusyBox compatibility)
- [x] Check SPA JS bundle for disabled button pattern (Bug 6 SPA)

### Playwright browser test

Create `tests/browser/admin-login.spec.mjs`:

- [x] Login page renders with enabled Sign In button
- [x] Wrong password shows "Invalid credentials" (no raw ubus error)
- [x] Empty password field leaves Sign In button enabled (Bug 6)
- [x] Add project to `tests/playwright.config.mjs`

### Router verification

- [x] E2E script passes on OpenWrt 24.10.4 (37 passed, 0 failed)
- [x] E2E script passes on OpenWrt 25.12.2 (35 passed, 1 failed pre-existing, 6 skipped)

---

## Execution checklist

### configurationwizzard (this PR)

- [x] Create this planning document
- [x] Bug 1 frontend: Invoice validation + error message
- [x] Bug 2: config_save for arrays
- [x] Bug 3: Drain field name fix
- [x] Bug 4: Show accepted mints
- [x] Build verification (`npm run build`) — passes cleanly
- [x] PR #10 created: https://github.com/net4sats/configurationwizzard/pull/10
- [x] Bug 5: Fix postinst / uci-defaults / Makefile for nodogsplash port 2050
- [x] Bug 1 error message: improve wording for non-Lightning mints
- [x] Push updates to PR branch
- [x] Bug 6: Allow empty password in login form
- [x] Bug 7: Clear "Invalid credentials" error for wrong password
- [x] Push login fixes to PR branch
- [x] Final build verification
- [x] Bug 8: ubusCall() OpenWrt 25 error format handling
- [x] Push Bug 8 fix to PR branch
- [x] Build verification after Bug 8 fix
- [x] Bug 9: Relax lnbc check for test mint Lightning flow
- [x] Build verification after Bug 9 fix
- [x] Push Bug 9 fix to PR branch
- [ ] Bug A: Fix white-on-white tab labels CSS
- [ ] Bug B: PWA/CNA — link manifest, register SW, detect CNA webview
- [ ] Build verification after Bug A + B
- [ ] Push Bug A + B to PR branch

### gonuts-tollgate (OpenTollGate org fork)

- [x] Fork `Amperstrand/gonuts-tollgate` to `net4sats/gonuts-tollgate`
- [x] Patch `wallet/wallet.go` RequestMint — non-fatal BOLT11 decode
- [x] Tag `v0.7.1` on our fork
- [x] Open PR #2 to `Amperstrand/gonuts-tollgate`
- [x] Discovered @Amperstrand has identical fix at `9b2b843` on `feature/v2-keyset-ids`
- [x] Close our PR #2 (superseded by @Amperstrand's fix)
- [x] Request @Amperstrand merge `9b2b843` into main + tag `v0.7.1`
- [x] Clean up net4sats fork (delete branch + tag)
- [x] Fork `Amperstrand/gonuts-tollgate` to `OpenTollGate/gonuts-tollgate` (org fork)
- [x] Cherry-pick `9b2b843` into main on the org fork
- [x] Tag `v0.7.1` on the org fork
- [x] Preserve `feature/v2-keyset-ids` branch for future reference

### tollgate-module-basic-go (separate commit/PR)

- [x] Update `src/go.mod` to gonuts-tollgate `v0.7.1` (currently net4sats fork)
- [x] Fix `99-tollgate-setup` nodogsplash gatewayport → 2050 + allow rule
- [x] Rebuild `tollgate-wrt` binary for `aarch64_cortex-a53`
- [x] Switch `src/go.mod` replace to `OpenTollGate/gonuts-tollgate v0.7.1`
- [x] Rebuild binary with org fork dependency
- [x] Open PR to `OpenTollGate/tollgate-module-basic-go`

### Router deployment

- [x] Deploy updated configurationwizzard packaging to router
- [x] Deploy rebuilt `tollgate-wrt` binary to router
- [x] Deploy to Arjen's router (192.168.1.1, OpenWrt 25)
- [x] Deploy to our router (10.47.41.1, OpenWrt 24)
- [x] E2E tests pass on both routers (35/1/6 each)
- [x] Requested reviews on PR #10 (Origami74, Amperstrand)
- [x] Requested reviews on PR #158 (Origami74, Amperstrand)
- [x] Comment on issue #9 about pre-existing /whoami failure
- [x] Verify Lightning invoice flow with testnut (Bug 9 fix) — phone test passed
- [ ] Verify Cashu payment flow (WiFi client test)
- [ ] Verify admin settings (profit_share, drain, mints)
- [ ] Verify Bug A fix (tab labels visible on phone)
- [ ] Verify Bug B fix (PWA modal shows CNA-specific instructions)

---

## Roadmap (post-issue-9)

### Remaining from issue #9 (PR #10 continuation)

#### Bug A: Lightning/Cashu tab labels white-on-white

> Captive portal tab labels are unreadable against the white background.

**Root cause:** `.tollgate-captive-portal-tabs-tab` inherits `color: var(--text)`
= `#fff` from `:root` (dark admin theme). The tabs have `background: #fff`,
producing white-on-white text.

**Fix:** Add explicit `color: #0a0a0a` to `.tollgate-captive-portal-tabs-tab`
in `src/styles/base.css:100-110`.

**Checklist:**
- [ ] Add `color: #0a0a0a` to `.tollgate-captive-portal-tabs-tab` in base.css
- [ ] Build verification
- [ ] Deploy and verify on phone

---

#### Bug B: PWA install instructions don't work in captive portal webview

> The Captive Network Assistant (CNA) mini-browser can't install PWAs. The
> instructions should detect CNA and prompt the user to open in a real browser
> first.

**Root cause (2 problems):**

1. **`manifest.json` is never linked.** Neither `index.html` (admin) nor
   `splash.html` (portal) has `<link rel="manifest">`. The manifest file exists
   in the build output but browsers never discover it, so
   `beforeinstallprompt` never fires.

2. **CNA webviews don't support PWA install.** Android/iOS captive portal
   browsers are restricted — no `beforeinstallprompt`, no service worker
   registration, limited navigation.

**Fix:**

1. Add `<link rel="manifest" href="/manifest.json">` to `splash.html` and
   `index.html`
2. Add service worker registration script to both HTML files
3. In `pwa-modal.tsx`: detect CNA webview via user-agent:
   ```ts
   const isCNA = /CaptiveNetworkAssistant|com.android.captiveportallogin/i.test(navigator.userAgent);
   ```
4. Show CNA-specific instructions: "Open in browser first" with a link that
   opens `http://<current-host>:2050` in the real browser

**Files:** `splash.html`, `index.html`, `src/components/pwa-modal.tsx`

**Checklist:**
- [ ] Add `<link rel="manifest">` to `splash.html` and `index.html`
- [ ] Add SW registration script to both HTML files
- [ ] Add CNA detection in `pwa-modal.tsx`
- [ ] Add CNA-specific instructions (open in browser)
- [ ] Build verification
- [ ] Deploy and verify on phone (CNA) and desktop (normal browser)

---

#### Feature C: WiFi scanning / connecting to upstream (separate PR)

> UI to scan for and connect to upstream networks.

**Existing infrastructure:**
- Backend ubus methods: `tollgate.upstream_scan`, `tollgate.upstream_connect`,
  `tollgate.upstream_list`, `tollgate.upstream_remove` — all implemented in Go
- Mock data in `ubus.mock.ts` — all 4 methods mocked
- Admin route exists: `/wifi` → `src/routes/wifi.tsx` (currently shows local
  radio interfaces only)

**Plan:** Add "Upstream Networks" section at the bottom of `wifi.tsx`:

1. **Scan button** → `tollgate.upstream_scan` → list networks (SSID, signal,
   encryption, BSSID)
2. **Connect button** per network → password input → `tollgate.upstream_connect`
3. **Configured upstreams** → `tollgate.upstream_list` → active connections
4. **Remove button** per upstream → `tollgate.upstream_remove`

**Files:** `src/routes/wifi.tsx` (extend), `src/styles/admin.css` (new styles)

**Checklist:**
- [ ] Add upstream scan section to `wifi.tsx`
- [ ] Add connect UI with password input
- [ ] Add configured upstreams list with remove
- [ ] Style new section in `admin.css`
- [ ] Build verification
- [ ] Test with mock data
- [ ] Open separate PR

---

### gonuts-tollgate org fork + tollgate-module-basic-go

- [x] Fork `Amperstrand/gonuts-tollgate` → `OpenTollGate/gonuts-tollgate`
- [x] Cherry-pick `9b2b843` into main + tag `v0.7.1`
- [x] Update `tollgate-module-basic-go/src/go.mod` replace to `OpenTollGate/gonuts-tollgate v0.7.1`
- [x] Rebuild tollgate-wrt binary
- [x] Open PR #158 to `OpenTollGate/tollgate-module-basic-go` with go.mod + nodogsplash port fix
- [x] Comment on issue #156 noting fork location
- [ ] Archive/delete `net4sats/gonuts-tollgate` personal fork (needs browser auth)

### Ethernet client testing

NoDogSplash only tracks clients that trigger the captive portal redirect
(port 80 → 2050). Direct access to allowed ports (2121, 8080) from
ethernet-connected devices bypasses tracking, so `ndsctl auth <MAC>` fails
for untracked MACs. For now, testing from WiFi clients that hit the portal
first works correctly. A future improvement could ensure ethernet clients
are also tracked, or provide a manual auth mechanism.

### E2E phone test

Full end-to-end test from a WiFi-connected phone: captive portal redirect →
payment → gate open. Requires physical device on the router's WiFi network.

---
