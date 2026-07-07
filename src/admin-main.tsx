import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import './styles/variables.css';
import './styles/admin.css';
import { initRouter, useRoute, navigate } from './lib/router';
import { checkSession, isLoggedIn, isMock, onSessionExpired, startSessionKeepalive } from './lib/ubus';
import Layout from './components/layout';
import LoginPage from './routes/login';

function AdminApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const route = useRoute();

  useEffect(() => {
    initRouter();
    // Register session expiry handler — auto-redirect to login
    onSessionExpired(() => {
      setAuthed(false);
      navigate('login');
    });
    (async () => {
      if (isMock()) {
        setAuthed(true);
        setReady(true);
        return;
      }
      if (isLoggedIn()) {
        const valid = await checkSession();
        setAuthed(valid);
        if (valid) {
          startSessionKeepalive();
        } else {
          navigate('login');
        }
      } else {
        setAuthed(false);
        navigate('login');
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (route === 'login' && authed) {
      navigate('dashboard');
    } else if (route !== 'login' && !authed) {
      navigate('login');
    }
  }, [route, authed, ready]);

  if (!ready) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg)',
        }}
      >
        <div className="loading-spinner loading-spinner-lg" />
      </div>
    );
  }

  if (route === 'login' || !authed) {
    return <LoginPage onLoggedIn={() => setAuthed(true)} />;
  }

  return <Layout />;
}

render(<AdminApp />, document.getElementById('app')!);
