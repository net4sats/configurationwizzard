import { useRoute, navigate, type Route } from '../lib/router';
import { getSessionUser, logout as doLogout } from '../lib/ubus';
import ParticleBg from './particle-bg';
import Dashboard from '../routes/dashboard';
import Wifi from '../routes/wifi';
import Devices from '../routes/devices';
import Settings from '../routes/settings';
import Wallet from '../routes/wallet';


function IconDashboard() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconWifi() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function IconDevices() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M16 12h.01" />
      <path d="M2 10h20" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

interface NavItem {
  route: Route;
  label: string;
  icon: () => any;
}

const NAV_ITEMS: NavItem[] = [
  { route: 'dashboard', label: 'Home', icon: IconDashboard },
  { route: 'wifi', label: 'WiFi', icon: IconWifi },
  { route: 'devices', label: 'Devices', icon: IconDevices },
  { route: 'settings', label: 'Settings', icon: IconSettings },
  { route: 'wallet', label: 'Wallet', icon: IconWallet },
];

function RouteContent({ route }: { route: Route }) {
  switch (route) {
    case 'dashboard':
      return <Dashboard />;
    case 'wifi':
      return <Wifi />;
    case 'devices':
      return <Devices />;
    case 'settings':
      return <Settings />;
    case 'wallet':
      return <Wallet />;
    default:
      return <Dashboard />;
  }
}

export default function Layout() {
  const route = useRoute();
  const user = getSessionUser() || 'root';

  function handleLogout() {
    doLogout();
    navigate('login');
  }

  return (
    <>
      <ParticleBg />

      {/* Header */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'var(--header-h)',
          background: 'rgba(17,17,17,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <img
            src="/net4sats/assets/logo/colour/net4sats-logo-colour.svg"
            alt="net4sats"
            style={{ height: '26px' }}
          />
          <span
            style={{
              fontSize: 'var(--font-size-xsmall)',
              color: 'var(--text-dim)',
              borderLeft: '1px solid var(--border)',
              paddingLeft: '0.7rem',
            }}
          >
            {user}
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-xsmall)',
            padding: '0.35rem 0.5rem',
            borderRadius: 'var(--radius-sm)',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.color = 'var(--error)';
            (e.target as HTMLElement).style.background = 'rgba(255,69,58,0.1)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.color = 'var(--text-muted)';
            (e.target as HTMLElement).style.background = 'none';
          }}
        >
          <IconLogout />
          <span>Logout</span>
        </button>
      </header>

      {/* Content */}
      <main
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 'var(--content-max)',
          margin: '0 auto',
          padding: `calc(var(--header-h) + 1rem) 1rem calc(var(--nav-h) + 1.2rem)`,
          minHeight: '100vh',
          minHeight: '100dvh',
        }}
      >
        <RouteContent route={route} />
      </main>

      {/* Bottom Navigation */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 'var(--nav-h)',
          background: 'rgba(17,17,17,0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          padding: '0 0.25rem',
          zIndex: 100,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active = route === item.route;
          return (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.2rem',
                padding: '0.4rem 0.5rem',
                borderRadius: 'var(--radius-sm)',
                color: active ? 'var(--accent)' : 'var(--text-dim)',
                fontSize: 'var(--font-size-xsmall)',
                fontWeight: active ? 600 : 400,
                transition: 'color 0.15s',
                minWidth: '52px',
              }}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
