#!/bin/sh
set -e

ROUTER=${1:-192.168.1.1}
REMOTE_USER=root

echo "Building..."
npm run build

echo "Deploying admin to $ROUTER..."
ssh "$REMOTE_USER@$ROUTER" "mkdir -p /www/net4sats"
scp -r dist/admin/. "$REMOTE_USER@$ROUTER:/www/net4sats/"

echo "Deploying captive portal to $ROUTER..."
ssh "$REMOTE_USER@$ROUTER" "mkdir -p /etc/nodogsplash/htdocs"
scp -r dist/portal/. "$REMOTE_USER@$ROUTER:/etc/nodogsplash/htdocs/"

echo "Installing rpcd plugin..."
ssh "$REMOTE_USER@$ROUTER" "mkdir -p /usr/libexec/rpcd /usr/share/rpcd/acl.d"
scp openwrt/rpcd/tollgate "$REMOTE_USER@$ROUTER:/usr/libexec/rpcd/tollgate"
scp openwrt/rpcd/tollgate_acl.json "$REMOTE_USER@$ROUTER:/usr/share/rpcd/acl.d/tollgate.json"
ssh "$REMOTE_USER@$ROUTER" "chmod +x /usr/libexec/rpcd/tollgate; /etc/init.d/rpcd restart"

echo "Configuring uhttpd..."
scp openwrt/files/etc/config/uhttpd_net4sats "$REMOTE_USER@$ROUTER:/etc/config/uhttpd_net4sats"
ssh "$REMOTE_USER@$ROUTER" "/etc/init.d/uhttpd restart"

echo "Restarting NoDogSplash..."
ssh "$REMOTE_USER@$ROUTER" "/etc/init.d/nodogsplash restart 2>/dev/null || echo 'nodogsplash not installed'"

echo "Done!"
echo "  Admin:    http://$ROUTER/"
echo "  Portal:   http://$ROUTER:2050/ (via NoDogSplash redirect)"
echo "  LuCI:     http://$ROUTER:8080/"
