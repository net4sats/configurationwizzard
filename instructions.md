# net4sats on OpenWrt

Turn a supported router into a Cashu/Lightning pay-for-access WiFi gateway:
**stock OpenWrt** → **tollgate** payment backend → **net4sats** captive portal + admin.

> This document is the **manual procedure**. The same flow is being automated by
> `conwrt` (see *Automation* at the bottom). Every shell block below is what conwrt
> runs under the hood, so you can follow it by hand on any of the three routers.

> **📦 Package managers — OpenWrt 24 vs 25.** OpenWrt **24.10.x** uses **opkg**
> (`.ipk` packages); OpenWrt **25.x** switched to **apk** (`.apk` packages). The
> install commands below differ accordingly (`opkg install …` vs
> `apk add --allow-untrusted …`). Pick the block that matches your router's
> OpenWrt version. `tollgate` publishes `.apk` builds only for `aarch64`, so MIPS
> routers (x1860) must stay on 24.10.x — see *Why the version split* below.

---

## Supported routers

| Router | OpenWrt | Target | CPU arch | Flash method | Package mgr |
|--------|---------|--------|----------|--------------|-------------|
| **D-Link COVR-X1860 A1** | **24.10.7** | `ramips/mt7621` | `mipsel_24kc` | U-Boot recovery (`192.168.0.1`) | **opkg** |
| **GL.iNet MT3000** (Beryl AX) | **25.12.0** | `mediatek/filogic` | `aarch64_cortex-a53` | U-Boot HTTP (`192.168.1.1`) / GL.iNet web UI | **apk** |
| **GL.iNet MT6000** (Flint 2) | **25.12.0** | `mediatek/filogic` | `aarch64_cortex-a53` | GL.iNet web UI (manual) | **apk** |

### Why the version split

`tollgate` publishes **`.apk` (OpenWrt 25.x) builds only for `aarch64_cortex-a53`**.
The x1860 is MIPS (`mipsel_24kc`), which only has a `.ipk` build → it must stay on
the **24.10.x** line (opkg). The two GL.iNet routers are aarch64 → they run **25.12.0**
(apk). See <https://releases.tollgate.me> → channel `alpha` → `v0.5.0-alpha3`.

### What gets installed (and what does *not*)

- ✅ **Stock OpenWrt** from downloads.openwrt.org (no custom firmware, no brick risk)
- ✅ **tollgate** `v0.5.0-alpha3` — the payment backend, from `releases.tollgate.me`
- ✅ **configurationwizzard** portal — net4sats captive-portal site + admin panel
- ❌ **NOT** `tollgate-wrt` the all-in-one firmware. We install the backend as a
  package on top of stock OpenWrt, which is safe and architecture-portable.

---

## Software artifacts

### tollgate `v0.5.0-alpha3` (pick by arch — filename is the sha256)

| Arch | File | URL |
|------|------|-----|
| `mipsel_24kc` (x1860) | `2fb588b10a445555923f1325d11c3cb28220cb32f078b283d71d4d3100e58286.ipk` | `https://blossom.primal.net/2fb588b10a445555923f1325d11c3cb28220cb32f078b283d71d4d3100e58286.ipk` |
| `aarch64_cortex-a53` (MT3000/MT6000) | `1fcc1635a7d94a005ff270c4a44f49fb9c56b05a7fbfe01eabcba40e8d31571d.apk` | `https://blossom.primal.net/1fcc1635a7d94a005ff270c4a44f49fb9c56b05a7fbfe01eabcba40e8d31571d.apk` |

Always confirm the exact URL + hash at <https://releases.tollgate.me> (Packages →
`alpha` → `v0.5.0-alpha3` → pick arch → *Fill install*). The blossom filename **is**
the sha256.

### configurationwizzard portal

```
https://github.com/net4sats/configurationwizzard/releases/download/net4sats-portal-3e05134/configurationwizzard.ipk
```
sha256: `9928e1f08dc1024c2ea8fbe4d9ca7ead59c8e7327b09916960b7797da557558f`
(`Architecture: all` — same `.ipk` installs on every router; its only hard deps,
`tollgate-wrt` + `nodogsplash` + `luci` + `jq`, are pulled by the package manager.)

### OpenWrt firmware (stock, per router)

| Router | File |
|--------|------|
| x1860 | `openwrt-24.10.7-ramips-mt7621-dlink_covr-x1860-a1-squashfs-recovery.bin` |
| MT3000 | `openwrt-25.12.0-mediatek-filogic-glinet_gl-mt3000-squashfs-sysupgrade.bin` |
| MT6000 | `openwrt-25.12.0-mediatek-filogic-glinet_gl-mt6000-squashfs-sysupgrade.bin` |

Verify every download against the official `sha256sums` in the target directory.

---

## 0. Prerequisites

- An ethernet cable + the router
- `conwrt` checked out (for x1860 / MT3000 automated flashing): `../conwrt`
- A WiFi network with internet for the router's uplink (SSID + password)
- On macOS: `sshpass` only needed if you script the password step

---

## 1. Flash stock OpenWrt

### Option A — x1860 (conwrt, U-Boot recovery)

The router must be in U-Boot recovery (hold the reset pin *under* the device, plug in
power, hold ~10–12 s until the status LED blinks red, release). Recovery serves
`http://192.168.0.1` (returns `405` on `HEAD` — that's the signature).

```sh
cd ../conwrt
curl -O --output-dir data \
  https://downloads.openwrt.org/releases/24.10.7/targets/ramips/mt7621/openwrt-24.10.7-ramips-mt7621-dlink_covr-x1860-a1-squashfs-recovery.bin

# Dry-run first (detect recovery + verify image, no upload):
python3 scripts/conwrt.py --model-id dlink-covr-x1860-a1 \
  --image data/openwrt-24.10.7-...-recovery.bin \
  --flash-method recovery-http --no-upload

# Real flash:
python3 scripts/conwrt.py --model-id dlink-covr-x1860-a1 \
  --image data/openwrt-24.10.7-...-recovery.bin \
  --flash-method recovery-http
```

> ⚠️ **conwrt quirk:** if the device is *already* sitting in recovery, conwrt's
> guided flow can stall waiting for a power-cycle transition. If preflight passes but
> it hangs at "STEP 1", abort conwrt and upload manually (nothing has been written
> yet):
> ```sh
> sudo ifconfig en6 alias 192.168.0.10 netmask 255.255.255.0   # your ethernet iface
> curl -F "firmware=@data/openwrt-24.10.7-...-recovery.bin" -F "btn=Upload" \
>      http://192.168.0.1/upload     # expect "Upgrade successfully!" in the response
> ```
> Then wait ~5 min for flash + first boot; the router comes up at `192.168.1.1`.

### Option A — MT3000 (conwrt, U-Boot HTTP)

Hold the reset button on the side, power on, release when the blue LED flashes 6× then
goes solid white. Recovery is at `192.168.1.1`.

```sh
cd ../conwrt
curl -O --output-dir data \
  https://downloads.openwrt.org/releases/25.12.0/targets/mediatek/filogic/openwrt-25.12.0-mediatek-filogic-glinet_gl-mt3000-squashfs-sysupgrade.bin
python3 scripts/conwrt.py --model-id glinet-mt3000 \
  --image data/openwrt-25.12.0-...-mt3000-sysupgrade.bin
```

### Option B — any router via the vendor web UI (no conwrt)

- **GL.iNet MT3000 / MT6000**: plug into a LAN port, open `http://192.168.8.1` →
  *More Settings → Advanced → Upload Firmware*, upload the **sysupgrade.bin**,
  **untick "Keep settings"**, confirm. Comes up at `192.168.1.1`.
- **x1860**: use the U-Boot recovery page at `http://192.168.0.1` (set your PC to
  `192.168.0.10/24`), upload **recovery.bin**.

After flashing, the router boots stock OpenWrt at **`192.168.1.1`**.

---

## 2. SSH in and set a root password

```sh
ssh root@192.168.1.1        # no password on first boot
passwd                       # set one (needed for the admin panel login)
```

> OpenWrt runs BusyBox `ash`, **not `bash`**. When piping a script over SSH use
> `ssh root@192.168.1.1 sh <<'EOF'`, never `bash -s`.

---

## 3. WiFi uplink (STA mode) — so the router has internet

Only needed if upstream internet is WiFi. Skip if you'll plug Ethernet into the WAN
port. Put the uplink on the **5 GHz** radio (leaves 2.4 GHz free for the portal AP).

```sh
ssh root@192.168.1.1 sh <<'EOF'
# x1860 / MT3000: radio1 = 5 GHz. (On MT6000 confirm with: uci get wireless.radio1.band)
uci set wireless.radio1.disabled='0'
uci -q delete wireless.sta1
uci set wireless.sta1=wifi-iface
uci set wireless.sta1.device='radio1'
uci set wireless.sta1.mode='sta'
uci set wireless.sta1.ssid='UPSTREAM_WIFI_NAME'
uci set wireless.sta1.encryption='psk2'          # use 'sae-mixed' for WPA3/mixed
uci set wireless.sta1.key='UPSTREAM_WIFI_PASSWORD'
uci set wireless.sta1.network='wwan'
uci set wireless.default_radio1.disabled='1'      # drop the default AP on the same radio
uci -q delete network.wwan
uci set network.wwan=interface
uci set network.wwan.proto='dhcp'
uci commit wireless; uci commit network
wifi reload
EOF
sleep 25
ssh root@192.168.1.1 'ip route | grep default; ping -c 2 -W 3 1.1.1.1'
```

---

## 4. Install tollgate `v0.5.0-alpha3`

The install differs by package manager. `nodogsplash`, `luci`, `jq` come in
automatically as dependencies.

### x1860 (OpenWrt 24.10 → **opkg**)

```sh
# On the router, bootstrap TLS on the opkg feeds, then install deps + the backend:
ssh root@192.168.1.1 sh <<'EOF'
sed -i 's|https://|http://|g' /etc/opkg/distfeeds.conf
opkg update
opkg install libustream-wolfssl ca-bundle ca-certificates
sed -i 's|http://|https://|g' /etc/opkg/distfeeds.conf
opkg update
EOF
# Push the mipsel ipk from your computer and install it:
curl -L -o tollgate.ipk \
  https://blossom.primal.net/2fb588b10a445555923f1325d11c3cb28220cb32f078b283d71d4d3100e58286.ipk
scp -O tollgate.ipk root@192.168.1.1:/tmp/tollgate.ipk
ssh root@192.168.1.1 'opkg install /tmp/tollgate.ipk'
```

### MT3000 / MT6000 (OpenWrt 25.12 → **apk**)

```sh
# 25.x apk repos are https with TLS in the base image; just update + install deps:
ssh root@192.168.1.1 'apk update && apk add nodogsplash luci jq curl ca-bundles'
# Push the aarch64 apk and install:
curl -L -o tollgate.apk \
  https://blossom.primal.net/1fcc1635a7d94a005ff270c4a44f49fb9c56b05a7fbfe01eabcba40e8d31571d.apk
scp -O tollgate.apk root@192.168.1.1:/tmp/tollgate.apk
ssh root@192.168.1.1 'apk add --allow-untrusted /tmp/tollgate.apk'
```

> `--allow-untrusted`: the tollgate packages aren't signed yet.

Verify the backend is healthy:

```sh
ssh root@192.168.1.1 'tollgate status'   # expect running:true  config_ok:true  wallet_ok:true  network_ok:true
```

---

## 5. Install the net4sats portal + admin

```sh
curl -L -o configurationwizzard.ipk \
  https://github.com/net4sats/configurationwizzard/releases/download/net4sats-portal-3e05134/configurationwizzard.ipk
scp -O configurationwizzard.ipk root@192.168.1.1:/tmp/
ssh root@192.168.1.1 'opkg install /tmp/configurationwizzard.ipk'      # x1860 (24.10)
# ssh root@192.168.1.1 'apk add --allow-untrusted /tmp/configurationwizzard.ipk'   # MT3000/MT6000 (25.12)
```

The postinst configures uhttpd (admin on `:443`/`:8080`, portal site on `:80`), nodogsplash
on `:2050`, points the captive portal at the net4sats branded page, and brings up an open
portal AP. After install, confirm everything is listening:

```sh
ssh root@192.168.1.1 'netstat -tlnp 2>/dev/null | grep -E ":80 |:443 |:2050"'
# uhttpd :80/:443/:8080, nodogsplash :2050
```

---

## 6. Brand as net4sats + finalize the portal AP

The postinst already enables an open portal AP (SSID like `TollGate-XXXX`). Rename it to
`net4sats-portal`, set the hostname/gateway name, and make sure the 2.4 GHz radio is up:

```sh
ssh root@192.168.1.1 sh <<'EOF'
uci set system.@system[0].hostname='net4sats'
echo net4sats > /proc/sys/kernel/hostname
uci -q set nodogsplash.@nodogsplash[0].gatewayname='net4sats'
# Portal AP on 2.4 GHz (radio0). Open network = customers join, hit captive portal, pay.
uci set wireless.radio0.disabled='0'
uci set wireless.default_radio0.ssid='net4sats-portal'
uci set wireless.default_radio0.encryption='none'
uci set wireless.default_radio0.device='radio0'
uci set wireless.default_radio0.network='lan'
uci set wireless.default_radio0.mode='ap'
uci commit system; uci commit nodogsplash; uci commit wireless
wifi reload
# Restart services so branding + config take effect
/etc/init.d/tollgate-wrt restart
/etc/init.d/nodogsplash restart
EOF
```

> Prefer a password on the portal AP for a closed deployment? Set
> `encryption='psk2'` and `key='YOUR_PASSWORD'` instead of `encryption='none'`.
> A public pay-for-access portal is normally **open** — customers must be able to
> associate before they can pay.

The **testnut** testnet mint (`nofee.testnut.cashu.space`) is included in tollgate
alpha3's default config, so free-sats testing works out of the box — no manual mint
add needed (that was required in older setups).

---

## 7. Test

1. Connect a phone to the **`net4sats-portal`** WiFi (open).
2. The captive-portal page should appear automatically (or browse to any HTTP site).
3. Tap **Generate Invoice** — testnut's FakeWallet pays it instantly.
4. You're online.

**Admin panel:** `https://192.168.1.1/` (LuCI, self-signed cert → accept it) or
`http://192.168.1.1:8080/`. Log in with `root` + the password from step 2.
The net4sats admin SPA is served at `http://192.168.1.1/net4sats/`.

> If your computer (used as the operator) keeps getting bounced to the captive
> portal instead of the admin, nodogsplash sees you as a regular client. Either
> complete the portal auth once, or whitelist your MAC:
> ```sh
> ssh root@192.168.1.1 "uci add_list nodogsplash.@nodogsplash[0].TrustedMACList='$(... your mac ...)'; uci commit nodogsplash; /etc/init.d/nodogsplash restart"
> ```

---

## Automation (`conwrt`)

The goal is for `conwrt` to drive this whole flow and emit the script above so it can
also be run by hand:

```
conwrt net4sats deploy --router {x1860|mt3000|mt6000} \
  --upstream-ssid 5 --upstream-band 5ghz --upstream-key '…'
```

which would: flash stock OpenWrt (recovery-http / uboot-http / manual) → wait for SSH →
configure the WiFi STA uplink → install the arch-correct tollgate α3 package → install
configurationwizzard → brand as net4sats → `conwrt net4sats script` emits a
self-contained `.sh` reproducing steps 2–6 for offline/manual runs.

Status: **procedure verified end-to-end on the x1860** (OpenWrt 24.10.7 + mipsel ipk).
The conwrt command + script generator is the remaining work.
