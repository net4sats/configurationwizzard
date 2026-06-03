# Issue #9 — Fix Plan

Unresolved captive portal + admin issues.

Reference: https://github.com/net4sats/configurationwizzard/issues/9

## Overview

Four bugs identified during on-device testing. All fixes are in the
**configurationwizzard** frontend — no changes needed to
`tollgate-module-basic-go`.

---

## Bug 1: Invoice generation fails

> `error decoding bolt11 invoice: zpay32 decoding failed: invalid index of 1`

### Root cause

The Go backend returns the BOLT11 invoice in `lightningInvoiceResponse.invoice`.
The error originates from the mint returning a malformed/empty BOLT11 string via
the Cashu NUT-04 `RequestMintQuote` call. The frontend does not validate the
invoice string before displaying it.

### Fix

- [x] `src/routes/captive-portal.tsx` — validate that `res.invoice` is non-empty
      and starts with `lnbc` before displaying; show a clear error if invalid
- [x] `src/lib/payment-api.ts` — add missing `allotment`/`metric` fields to
      `LnInvoiceResponse` interface

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

## Execution checklist

- [x] Create this planning document
- [x] Bug 1: Invoice validation
- [x] Bug 2: config_save for arrays
- [x] Bug 3: Drain field name fix
- [x] Bug 4: Show accepted mints
- [x] Build verification (`npm run build`) — passes cleanly
