# LuCI — the fallback admin (and when to use it)

The net4sats router has **two web interfaces**. This page explains which one to
use, how to reach the second one, and what to do if your main one breaks.

**Short version:**

- **net4sats admin on port 8090 is your primary tool.** Use it for everything
  about WiFi, pricing, mints, wallet, and identity.
- **LuCI on port 8080 stays installed on purpose.** It is the fallback. Use it
  for OpenWrt-level work the net4sats admin does not cover — firewall rules,
  firmware upgrades, deep diagnostics — and when the net4sats admin itself is
  broken.

This split is a deliberate decision (Felix, Aug 16 2026): LuCI stays as the
documented fallback, net4sats admin on `:8090` is primary.

## How to reach each one

| Interface | Address (today) | Login | Serves |
|---|---|---|---|
| **net4sats admin** (primary) | `http://192.168.2.1:8090/` | `root` + router password | `/www/net4sats` (this repo) |
| **LuCI** (fallback) | `http://192.168.2.1:8080/` | `root` + router password | full OpenWrt web admin |

Both ask for the same `root` account and password.

> `192.168.2.1` is the router's LAN address as of August 2026. If you moved
> your router's LAN to a different subnet, use your router's actual IP — the
> ports never change, only the address does.

## Full port layout (for reference)

| Port | Address | What runs there | Who uses it |
|---|---|---|---|
| 22 | `ssh root@192.168.2.1` | dropbear (SSH) | operators (repairs, scripts) |
| 80 | `http://192.168.2.1/` | captive portal entry (nodogsplash intercepts) | **guests** — payment page |
| 2050 | `http://192.168.2.1:2050/` | nodogsplash gateway engine | guests (redirect target) |
| 2121 | `http://192.168.2.1:2121/` | tollgate-wrt REST API | portal + admin (payments, identity) |
| 8080 | `http://192.168.2.1:8080/` | LuCI web admin | **operators — fallback** |
| 8090 | `http://192.168.2.1:8090/` | net4sats admin SPA | **operators — primary** |

LuCI is not an accident on the router: the `tollgate-wrt` package depends on
it, so every install ships with it. It listens on its own web server instance
(`uhttpd`, section `luci`) with its own files under `/www` — separate from the
net4sats admin instance (section `net4sats`, port 8090).

## What LuCI covers that the net4sats admin does not

The net4sats admin is a thin screen over the tollgate backend. It deliberately
does not re-implement OpenWrt. Three areas are LuCI-only today:

1. **Firewall rules** — LuCI → *Network → Firewall*. Adding, editing, or
   reordering zones, traffic rules, and port forwards. The net4sats admin has
   no firewall page; if you need to open or close a port by hand, this is the
   place.
2. **Firmware upgrades and backups** — LuCI → *System → Backup / Flash
   Firmware*. Upload a new OpenWrt image, keep or reset settings, download a
   backup archive of your config, or restore one. This is the only
   browser-based way to flash the router.
3. **Full diagnostics** — LuCI → *Network → Diagnostics* (ping, traceroute,
   DNS lookup straight from the router), plus *Status → Routes*, *Status →
   System Log / Kernel Log*, real-time traffic graphs, running processes
   (*Status → Processes*), and which services start at boot (*System →
   Startup*).

Also LuCI territory: LED behavior, uhttpd/dropbear service settings, switch
and VLAN config on some models — in short, anything OpenWrt exposes that no
net4sats page covers.

## What the net4sats admin covers better

Do your daily work here, not in LuCI. LuCI knows nothing about tollgate,
Cashu, or Nostr — changing tollgate things through LuCI's raw UCI screens is
error-prone and not supported.

| net4sats admin page | What it does |
|---|---|
| Dashboard | router + tollgate health at a glance |
| WiFi | portal AP settings **and** upstream (internet) connection, with scan |
| Devices | everyone currently connected (DHCP leases) |
| Settings | all tollgate config — schema-driven, grows automatically when the backend adds fields |
| Wallet | Cashu balance per mint, fund (deposit), drain (withdraw) |
| Identity | router npub, LAN identity, seed phrase reveal, kind:0 profile publish |

## When to prefer which

| You want to… | Use |
|---|---|
| Change WiFi name/password, upstream link, pricing, mints, wallet, identity | **net4sats admin** `:8090` |
| See who is connected / what the router is doing (net4sats view) | **net4sats admin** `:8090` |
| Edit firewall rules or port forwards | **LuCI** `:8080` |
| Upgrade firmware, backup or restore the config | **LuCI** `:8080` |
| Ping/traceroute/DNS from the router, read system logs | **LuCI** `:8080` |
| Anything about money, mints, or the Nostr identity | **net4sats admin** `:8090` — never LuCI |
| Script or automate something | **SSH** `:22` |

## Rescue: the net4sats admin is broken

First, the reassuring part: **guests and payments keep working.** The admin
page is just static files — the captive portal (ports 80/2050) and the payment
engine (port 2121) are separate processes and do not depend on it. A broken
admin page costs you configuration access, not service.

Work down this ladder:

1. **Rule out the trivial.** Reload the page, check you are on
   `http://192.168.2.1:8090/` (not `https`, not another port), and that the
   root password is right.
2. **Check the router is healthy via LuCI** — `http://192.168.2.1:8080/`.
   Because LuCI runs from a different web server instance and different files,
   it works even when the net4sats admin files are damaged or missing. If LuCI
   loads, the router is fine and only the admin layer needs repair.
3. **Repair over SSH.** `ssh root@192.168.2.1`, then:

   ```sh
   netstat -tln | grep -E ':(8080|8090)'   # both listeners should show up
   /etc/init.d/uhttpd restart              # restart the web servers
   ls /www/net4sats                        # admin files present?
   uci show uhttpd | grep -E 'luci|net4sats'
   ```

4. **Redeploy the admin in one command.** On your computer, from a checkout of
   this repo:

   ```sh
   ./deploy.sh 192.168.2.1
   ```

   That rebuilds the admin SPA and portal, copies them to the router,
   reinstalls the rpcd plugin and access rules, restores the web server
   layout (LuCI `:8080`, net4sats `:8090`), and restarts everything.
5. **Last resorts.** From LuCI: *System → Backup / Flash Firmware* — restore a
   known-good config archive, or (destructive) reset to factory settings. If
   the router itself is unreachable, use OpenWrt failsafe mode (hold the reset
   button during the first seconds of boot). **Warning:** a factory reset
   wipes the tollgate setup — mints, wallet, and identity must be set up
   again, and a lost seed phrase means lost funds. Do it only when the ladder
   above failed.

---

*Decision record: Aug 16 2026 — LuCI stays installed and documented as the
fallback admin; the net4sats admin on `:8090` is primary. Port layout lives in
[`AGENTS.md`](../AGENTS.md) and `openwrt/files/etc/config/uhttpd_net4sats`.*
