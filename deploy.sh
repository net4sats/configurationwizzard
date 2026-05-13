#!/bin/sh
set -e

ROUTER=${1:-192.168.1.1}
REMOTE_USER=root

echo "Building..."
npm run build

echo "Deploying to $ROUTER..."
ssh "$REMOTE_USER@$ROUTER" "mkdir -p /www/net4sats"
scp -r dist/. "$REMOTE_USER@$ROUTER:/www/net4sats/"

echo "Installing rpcd plugin..."
ssh "$REMOTE_USER@$ROUTER" "mkdir -p /usr/libexec/rpcd /usr/share/rpcd/acl.d"
scp openwrt/rpcd/tollgate "$REMOTE_USER@$ROUTER:/usr/libexec/rpcd/tollgate"
scp openwrt/rpcd/tollgate_acl.json "$REMOTE_USER@$ROUTER:/usr/share/rpcd/acl.d/tollgate.json"
ssh "$REMOTE_USER@$ROUTER" "chmod +x /usr/libexec/rpcd/tollgate; /etc/init.d/rpcd restart"

echo "Configuring uhttpd..."
scp openwrt/files/etc/config/uhttpd_net4sats "$REMOTE_USER@$ROUTER:/etc/config/uhttpd_net4sats"
ssh "$REMOTE_USER@$ROUTER" "/etc/init.d/uhttpd restart"

echo "Done! Access at http://$ROUTER/ or http://net4sats.lan/"
echo "LuCI available at http://$ROUTER:8080/"
