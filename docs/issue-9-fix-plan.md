# Issue #9 — Fix Plan

Unresolved captive portal + admin issues.

Reference: https://github.com/net4sats/configurationwizzard/issues/9

## Overview

Four bugs identified during on-device testing, plus a NoDogSplash port
conflict discovered during deployment. Fixes span three repos:

1. **`configurationwizzard`** — frontend SPA + packaging
2. **`gonuts-tollgate`** — Cashu wallet library (BOLT11 handling)
3. **`tollgate-module-basic-go`** — Go backend daemon (packaging)

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

- [ ] Fork `Amperstrand/gonuts-tollgate` → `net4sats/gonuts-tollgate`
- [ ] Patch `wallet/wallet.go` — make `decodepay.Decodepay` non-fatal in
      `RequestMint()`, fall back to `time.Now().Unix()` for `CreatedAt`
- [ ] Tag as `v0.7.1`
- [ ] Open PR to `Amperstrand/gonuts-tollgate`

**Backend daemon (tollgate-module-basic-go):**

- [ ] Update `src/go.mod` replace directive to `v0.7.1`
- [ ] Rebuild `tollgate-wrt` binary

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

- [ ] `packaging/postinst` — set nodogsplash `gatewayport=2050` and add
      `users_to_router 'allow tcp port 2050'`
- [ ] `packaging/files/etc/uci-defaults/91-configurationwizzard-setup` — same
- [ ] `packaging/Makefile` inline postinst — same

### Fix (tollgate-module-basic-go packaging)

- [ ] `packaging/files/etc/uci-defaults/99-tollgate-setup` — change
      `gatewayport='80'` to `gatewayport='2050'` and add
      `allow tcp port 2050` to `users_to_router` rules

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
- [ ] Bug 5: Fix postinst / uci-defaults / Makefile for nodogsplash port 2050
- [ ] Bug 1 error message: improve wording for non-Lightning mints
- [ ] Push updates to PR branch

### gonuts-tollgate (upstream PR)

- [ ] Fork `Amperstrand/gonuts-tollgate` to `net4sats/gonuts-tollgate`
- [ ] Patch `wallet/wallet.go` RequestMint — non-fatal BOLT11 decode
- [ ] Tag `v0.7.1`
- [ ] Open PR to `Amperstrand/gonuts-tollgate`

### tollgate-module-basic-go (separate commit/PR)

- [ ] Update `src/go.mod` to gonuts-tollgate `v0.7.1`
- [ ] Fix `99-tollgate-setup` nodogsplash gatewayport → 2050 + allow rule
- [ ] Rebuild `tollgate-wrt` binary for `aarch64_cortex-a53`

### Router deployment

- [ ] Deploy updated configurationwizzard packaging to router
- [ ] Deploy rebuilt `tollgate-wrt` binary to router
- [ ] Verify Lightning invoice flow with testnut
- [ ] Verify Cashu payment flow
- [ ] Verify admin settings (profit_share, drain, mints)
