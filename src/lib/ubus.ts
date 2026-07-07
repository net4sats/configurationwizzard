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

// Session expiry callback — registered by admin-main.tsx to redirect to login
let sessionExpiredCallback: (() => void) | null = null;

export function onSessionExpired(cb: () => void) {
  sessionExpiredCallback = cb;
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
      // Session expired during keepalive — trigger redirect
      if (sessionExpiredCallback) sessionExpiredCallback();
    }
  }, 240000); // 4 minutes (under uhttpd default 5-min timeout)
}

export function stopSessionKeepalive() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
}

function handleSessionExpired() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_USER);
  sessionId = '00000000000000000000000000000000';
  stopSessionKeepalive();
  if (sessionExpiredCallback) sessionExpiredCallback();
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
      handleSessionExpired();
      throw new Error('SESSION_EXPIRED');
    }
    throw new Error(`ubus error: ${json.error.message || 'unknown'}`);
  }
  if (!json.result) throw new Error('No result from ubus');
  if (json.result[0] !== 0) {
    if (json.result[0] === 6) {
      handleSessionExpired();
      throw new Error('SESSION_EXPIRED');
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
  startSessionKeepalive();
  return data;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_USER);
  sessionId = '00000000000000000000000000000000';
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
