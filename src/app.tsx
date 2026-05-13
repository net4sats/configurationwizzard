import { useState, useEffect } from 'preact/hooks';
import { initRouter, useRoute, navigate } from './lib/router';
import { checkSession, isLoggedIn } from './lib/ubus';
import Layout from './components/layout';
import LoginPage from './routes/login';

export default function App() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const route = useRoute();

  useEffect(() => {
    initRouter();
    (async () => {
      if (isLoggedIn()) {
        const valid = await checkSession();
        setAuthed(valid);
        if (!valid) navigate('login');
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
    return <LoginPage />;
  }

  return <Layout />;
}
