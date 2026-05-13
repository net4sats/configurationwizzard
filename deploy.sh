#!/bin/sh
# Deploy net4sats SPA to an OpenWrt router
# Usage: ./deploy.sh <router_ip> [password]

ROUTER=${1:-192.168.1.1}

echo "Building..."
npm run build

echo "Deploying to $ROUTER..."
scp -r dist/* root@$ROUTER:/www/net4sats/

echo "Installing rpcd plugin..."
ssh root@$ROUTER "mkdir -p /www/net4sats /usr/libexec/rpcd /usr/share/rpcd/acl.d"
scp openwrt/rpcd/tollgate root@$ROUTER:/usr/libexec/rpcd/tollgate
scp openwrt/rpcd/tollgate_acl.json root@$ROUTER:/usr/share/rpcd/acl.d/tollgate.json
ssh root@$ROUTER "chmod +x /usr/libexec/rpcd/tollgate; /etc/init.d/rpcd restart"

echo "Configuring uhttpd..."
scp openwrt/files/etc/config/uhttpd_net4sats root@$ROUTER:/etc/config/uhttpd_net4sats
ssh root@$ROUTER "/etc/init.d/uhttpd restart"

echo "Done! Access at http://$ROUTER/ or http://net4sats.lan/"
echo "LuCI available at http://$ROUTER:8080/"
