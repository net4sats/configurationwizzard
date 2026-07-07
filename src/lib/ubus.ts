import { mockUbusCall, mockLogin, mockSessionId } from './ubus.mock';

const MOCK = import.meta.env.VITE_MOCK === 'true';

export function isMock(): boolean {
  return MOCK;
}

const UBUS_URL = '/ubus';
const SESSION_KEY = 'net4sats_session';
const SESSION_USER = 'net4sats_user';

let sessionId: string = MOCK ? mockSessionId() : '00000000000000000000000000000000';

const saved = localStorage.getItem(SESSION_KEY);
if (saved) sessionId = saved;

let rpcId = 0;

// Session expiry callback — only called when auto-relogin fails
let sessionExpiredCallback: (() => void) | null = null;

export function onSessionExpired(cb: () => void) {
  sessionExpiredCallback = cb;
}

// In-memory credentials cache (NOT localStorage) for silent auto-relogin
let cachedCreds: { username: string; password: string } | null = null;

export function cacheCredentials(username: string, password: string) {
  cachedCreds = { username, password };
}

export function clearCachedCredentials() {
  cachedCreds = null;
}

// Keepalive timer — pings ubus every 4 min to prevent 5-min session timeout
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

export function startSessionKeepalive() {
  if (MOCK) return;
  if (keepaliveTimer) clearInterval(keepaliveTimer);
  keepaliveTimer = setInterval(async () => {
    if (sessionId === '00000000000000000000000000000000') return;
    try {
      await ubusCall('session', 'access', {
        scope: 'ubus',
        object: 'session',
        function: 'login',
      });
    } catch {
      // Keepalive failed — session probably expired. Auto-relogin handles this.
    }
  }, 240000); // 4 minutes (under uhttpd default 5-min timeout)
}

export function stopSessionKeepalive() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
}

// Try silent auto-relogin from in-memory credentials.
// Returns true if re-login succeeded, false otherwise.
async function tryAutoRelogin(): Promise<boolean> {
  if (!cachedCreds) return false;
  try {
    const res = await fetch(UBUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++rpcId,
        method: 'call',
        params: [
          '00000000000000000000000000000000',
          'session',
          'login',
          { username: cachedCreds.username, password: cachedCreds.password },
        ],
      }),
    });
    const json = await res.json();
    if (!json.result || json.result[0] !== 0) return false;
    const data = json.result[1];
    sessionId = data.ubus_rpc_session;
    localStorage.setItem(SESSION_KEY, sessionId);
    startSessionKeepalive();
    return true;
  } catch {
    return false;
  }
}

async function handleSessionExpired(obj?: string, method?: string, params?: Record<string, any>): Promise<any> {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_USER);
  sessionId = '00000000000000000000000000000000';
  stopSessionKeepalive();

  // Try silent auto-relogin first
  if (await tryAutoRelogin()) {
    // Retry the original ubus call with new session
    if (obj && method) {
      return ubusCall(obj, method, params || {});
    }
    return; // Just a session check, re-auth done
  }

  // Auto-relogin failed — fire redirect callback
  if (sessionExpiredCallback) sessionExpiredCallback();
  throw new Error('SESSION_EXPIRED');
}

export async function ubusCall(
  obj: string,
  method: string,
  params: Record<string, any> = {}
): Promise<any> {
  if (MOCK) {
    return mockUbusCall(obj, method, params);
  }

  const res = await fetch(UBUS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: ++rpcId,
      method: 'call',
      params: [sessionId, obj, method, params],
    }),
  });
  const json = await res.json();
  if (json.error) {
    if (json.error.code === -32002) {
      // Session expired — attempt auto-relogin + retry
      return handleSessionExpired(obj, method, params);
    }
    throw new Error(`ubus error: ${json.error.message || 'unknown'}`);
  }
  if (!json.result) throw new Error('No result from ubus');
  if (json.result[0] !== 0) {
    if (json.result[0] === 6) {
      // Session expired — attempt auto-relogin + retry
      return handleSessionExpired(obj, method, params);
    }
    throw new Error(
      `ubus error ${json.result[0]}: ${json.result[1] || 'unknown'}`
    );
  }
  return json.result[1];
}

export async function login(
  username: string,
  password: string
): Promise<any> {
  if (MOCK) {
    const data = await mockLogin(username, password);
    sessionId = data.ubus_rpc_session;
    localStorage.setItem(SESSION_KEY, sessionId);
    localStorage.setItem(SESSION_USER, username);
    return data;
  }

  const res = await fetch(UBUS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: ++rpcId,
      method: 'call',
      params: [
        '00000000000000000000000000000000',
        'session',
        'login',
        { username, password },
      ],
    }),
  });

  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new Error('Invalid username or password');
  }

  if (!json.result || json.result[0] !== 0) {
    throw new Error('Invalid username or password');
  }
  const data = json.result[1];
  sessionId = data.ubus_rpc_session;
  localStorage.setItem(SESSION_KEY, sessionId);
  localStorage.setItem(SESSION_USER, username);
  // Cache credentials in memory for auto-relogin
  cacheCredentials(username, password);
  startSessionKeepalive();
  return data;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_USER);
  sessionId = '00000000000000000000000000000000';
  clearCachedCredentials();
  stopSessionKeepalive();
}

export async function checkSession(): Promise<boolean> {
  if (MOCK) return true;
  if (sessionId === '00000000000000000000000000000000') return false;
  try {
    await ubusCall('session', 'access', {
      scope: 'ubus',
      object: 'session',
      function: 'login',
    });
    return true;
  } catch {
    return false;
  }
}

export function isLoggedIn(): boolean {
  return sessionId !== '00000000000000000000000000000000';
}

export function getSessionUser(): string {
  return localStorage.getItem(SESSION_USER) || (MOCK ? 'root' : '');
}
