include $(TOPDIR)/rules.mk

PKG_NAME:=configurationwizzard
PKG_VERSION:=$(shell cat ../package.json | jq -r '.version')
PKG_RELEASE:=1

PKG_MAINTAINER:=net4sats
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/configurationwizzard
  SECTION:=net
  CATEGORY:=Network
  TITLE:=net4sats Configuration Wizard
  DEPENDS:=+tollgate-wrt +nodogsplash +luci +jq
  PROVIDES:=tollgate-captive-portal-site
  CONFLICTS:=tollgate-captive-portal
  REPLACES:=nodogsplash
  PKGARCH:=all
endef

define Package/configurationwizzard/description
  net4sats configuration wizard admin SPA and captive portal theme.
  Provides tollgate-captive-portal-site interface with Preact-based
  admin panel on /net4sats/ and captive portal on NoDogSplash.
endef

define Build/Compile
endef

define Package/configurationwizzard/install
	$(INSTALL_DIR) $(1)/www/net4sats
	$(CP) ./dist/admin/* $(1)/www/net4sats/

	$(INSTALL_DIR) $(1)/etc/nodogsplash/htdocs
	$(CP) ./dist/portal/* $(1)/etc/nodogsplash/htdocs/

	$(INSTALL_DIR) $(1)/usr/libexec/rpcd
	$(INSTALL_BIN) ./openwrt/rpcd/tollgate $(1)/usr/libexec/rpcd/tollgate

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_CONF) ./openwrt/rpcd/tollgate_acl.json $(1)/usr/share/rpcd/acl.d/tollgate.json

	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./packaging/files/etc/uci-defaults/91-configurationwizzard-setup $(1)/etc/uci-defaults/91-configurationwizzard-setup
endef

define Package/configurationwizzard/postinst
#!/bin/sh

if ! uci -q get uhttpd.net4sats >/dev/null 2>&1; then
    uci set uhttpd.net4sats=uhttpd
    uci set uhttpd.net4sats.home='/www'
    uci set uhttpd.net4sats.ubus_prefix='/ubus'
    uci set uhttpd.net4sats.script_timeout='60'
    uci set uhttpd.net4sats.network_timeout='30'
    uci set uhttpd.net4sats.max_requests='3'
    uci set uhttpd.net4sats.tcp_keepalive='1'
    uci set uhttpd.net4sats.error_page='/net4sats/index.html'
    uci add_list uhttpd.net4sats.listen_http='0.0.0.0:80'
    uci add_list uhttpd.net4sats.listen_http='[::]:80'
    uci commit uhttpd
fi

/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
/etc/init.d/nodogsplash restart 2>/dev/null || true
endef

define Package/configurationwizzard/prerm
#!/bin/sh
/etc/init.d/nodogsplash restart 2>/dev/null || true
endef

$(eval $(call BuildPackage,configurationwizzard))
