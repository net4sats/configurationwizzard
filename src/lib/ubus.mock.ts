/**
 * Mock ubus layer for Cloudflare Pages demos.
 * Activated when VITE_MOCK=true.
 *
 * Every call returns realistic fake data — no network requests are made.
 */

const MOCK_SESSION = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

// ── helpers ────────────────────────────────────────────────────────────────
const now = () => Math.floor(Date.now() / 1000);

// ── mock data ──────────────────────────────────────────────────────────────

const board = {
  hostname: 'net4sats-gw1',
  model: 'TP-Link Archer C7 v5',
  kernel: '5.15.134',
  system: 'Qualcomm Atheros QCA956X',
  release: {
    distribution: 'OpenWrt',
    version: '23.05.2',
    revision: 'r23630-842932a63d',
    target: 'ath79/generic',
    description: 'OpenWrt 23.05.2 r23630-842932a63d',
  },
};

function info() {
  const uptime = 3 * 86400 + 7 * 3600 + 42 * 60 + 13; // ~3d 7h 42m
  return {
    uptime,
    localtime: now(),
    memory: {
      total: 128 * 1048576, // 128 MB
      free: 40 * 1048576,   // ~40 MB free
      buffered: 12 * 1048576,
      shared: 1 * 1048576,
    },
  };
}

const interfaceDump = {
  interface: [
    {
      interface: 'lan',
      up: true,
      proto: 'static',
      'ipv4-address': [{ address: '192.168.1.1', mask: 24 }],
      route: [{ target: '0.0.0.0', mask: 0, nexthop: '192.168.1.1' }],
      'dns-server': ['192.168.1.1'],
    },
    {
      interface: 'wan',
      up: true,
      proto: 'dhcp',
      'ipv4-address': [{ address: '192.168.1.142', mask: 24 }],
      route: [{ target: '0.0.0.0', mask: 0, nexthop: '192.168.1.1' }],
      'dns-server': ['1.1.1.1', '8.8.8.8'],
    },
  ],
};

const wirelessStatus = {
  radio0: {
    up: true,
    config: {
      channel: 6,
      hwmode: '11g',
      htmode: 'HT40',
      country: 'NO',
    },
    interfaces: [
      {
        ifname: 'wlan0',
        ssid: 'net4sats',
        encryption: 'psk2',
        hidden: false,
        mode: 'Master',
        network: ['lan'],
      },
    ],
  },
  radio1: {
    up: true,
    config: {
      channel: 36,
      hwmode: '11a',
      htmode: 'VHT80',
      country: 'NO',
    },
    interfaces: [
      {
        ifname: 'wlan1',
        ssid: 'net4sats-5g',
        encryption: 'psk2',
        hidden: false,
        mode: 'Master',
        network: ['lan'],
      },
    ],
  },
};

const dhcpLeases = {
  device: {
    br_lan: {
      leases: [
        { hostname: 'iPhone-15-Pro', ipaddr: '192.168.1.101', macaddr: 'A4:83:E7:2B:1F:3A', expires: 43200 },
        { hostname: 'MacBook-Air', ipaddr: '192.168.1.102', macaddr: '3C:22:FB:9D:44:17', expires: 43180 },
        { hostname: 'Galaxy-S24', ipaddr: '192.168.1.103', macaddr: 'D8:6B:D7:11:AE:5C', expires: 42960 },
        { hostname: 'Roku-Ultra', ipaddr: '192.168.1.104', macaddr: 'B0:EE:7B:82:F3:D1', expires: -1 },
        { hostname: 'Nest-Thermostat', ipaddr: '192.168.1.105', macaddr: '18:B4:30:AA:CC:22', expires: 41500 },
        { hostname: 'iPad-Mini', ipaddr: '192.168.1.106', macaddr: 'F0:18:98:7B:3E:91', expires: 42100 },
        { hostname: 'HP-Printer', ipaddr: '192.168.1.107', macaddr: 'A0:D3:C1:55:B2:8E', expires: -1 },
      ],
    },
  },
};

const tollgateStatus = {
  running: true,
  active_sessions: 3,
  pricing_model: 'time',
};

const tollgatePricing = {
  model: 'time',
  rate: 50,
  minimum: 30,
  currency: 'sats',
};

const walletBalance = {
  balance: 14250,
  pending: 300,
};

const uciLnurl = {
  value: {
    lnurl: 'lnurlp://pay.net4sats.com/.well-known/lnurlp/root',
  },
};

// ── handler ────────────────────────────────────────────────────────────────

export function mockUbusCall(
  obj: string,
  method: string,
  _params: Record<string, any> = {}
): Promise<any> {
  const key = `${obj}.${method}`;

  const handlers: Record<string, () => any> = {
    'session.access': () => ({ access: true }),
    'system.board': () => board,
    'system.info': () => info(),
    'system.password_set': () => ({}),
    'network.interface.dump': () => interfaceDump,
    'wireless.status': () => wirelessStatus,
    'wireless.reload': () => ({}),
    'dhcp.ipv4leases': () => dhcpLeases,
    'tollgate.status': () => tollgateStatus,
    'tollgate.pricing': () => tollgatePricing,
    'tollgate.wallet_balance': () => walletBalance,
    'tollgate.configure': () => ({}),
    'uci.get': () => {
      // Return LNURL config when asked for tollgate/lnurl
      if (_params?.config === 'tollgate' && _params?.section === 'lnurl') {
        return uciLnurl;
      }
      return {};
    },
    'uci.set': () => ({}),
    'uci.commit': () => ({}),
    'tollgate.activate': () => ({ success: true, message: 'Access activated' }),
  };

  const handler = handlers[key];
  if (!handler) {
    return Promise.reject(new Error(`mock: unknown call ${key}`));
  }

  return Promise.resolve(handler());
}

export function mockLogin(username: string, _password: string): Promise<any> {
  return Promise.resolve({
    ubus_rpc_session: MOCK_SESSION,
    username,
    expires: 3600,
  });
}

export function mockSessionId(): string {
  return MOCK_SESSION;
}
