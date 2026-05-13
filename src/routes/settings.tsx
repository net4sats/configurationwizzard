import { useState, useEffect, useCallback } from 'preact/hooks';
import { ubusCall } from '../lib/ubus';

interface PricingConfig {
  model: string;
  rate: string;
  minimum: string;
  currency?: string;
}

export default function Settings() {
  const [pricing, setPricing] = useState<PricingConfig>({
    model: 'time',
    rate: '',
    minimum: '',
  });
  const [hostname, setHostname] = useState('');
  const [currentHostname, setCurrentHostname] = useState('');
  const [lnurl, setLnurl] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Record<string, string>>({});

  const fetchSettings = useCallback(async () => {
    try {
      const [boardData, pricingData] = await Promise.allSettled([
        ubusCall('system', 'board'),
        ubusCall('tollgate', 'pricing'),
      ]);

      if (boardData.status === 'fulfilled' && boardData.value?.hostname) {
        setHostname(boardData.value.hostname);
        setCurrentHostname(boardData.value.hostname);
      }

      if (pricingData.status === 'fulfilled' && pricingData.value) {
        setPricing({
          model: pricingData.value.model || 'time',
          rate: String(pricingData.value.rate || ''),
          minimum: String(pricingData.value.minimum || ''),
          currency: pricingData.value.currency || 'sats',
        });
      }

      // Try to get LNURL from UCI
      try {
        const cfg = await ubusCall('uci', 'get', {
          config: 'tollgate',
          section: 'lnurl',
        });
        if (cfg?.value?.lnurl) {
          setLnurl(cfg.value.lnurl);
        }
      } catch {
        // Not configured
      }

      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function setMessage(key: string, msg: string) {
    setMessages((prev) => ({ ...prev, [key]: msg }));
    setTimeout(() => {
      setMessages((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 3000);
  }

  async function savePricing() {
    try {
      await ubusCall('tollgate', 'configure', {
        model: pricing.model,
        rate: Number(pricing.rate),
        minimum: Number(pricing.minimum),
      });
      setMessage('pricing', 'saved');
    } catch (err: any) {
      setMessage('pricing', `Error: ${err.message}`);
    }
  }

  async function saveHostname() {
    try {
      await ubusCall('uci', 'set', {
        config: 'system',
        section: '@system[0]',
        values: { hostname },
      });
      await ubusCall('uci', 'commit', { config: 'system' });
      setCurrentHostname(hostname);
      setMessage('hostname', 'saved');
    } catch (err: any) {
      setMessage('hostname', `Error: ${err.message}`);
    }
  }

  async function saveLnurl() {
    try {
      await ubusCall('uci', 'set', {
        config: 'tollgate',
        section: 'lnurl',
        values: { lnurl },
      });
      await ubusCall('uci', 'commit', { config: 'tollgate' });
      setMessage('lnurl', 'saved');
    } catch (err: any) {
      setMessage('lnurl', `Error: ${err.message}`);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      setMessage('password', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 4) {
      setMessage('password', 'Password too short');
      return;
    }
    try {
      await ubusCall('system', 'password_set', {
        password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('password', 'saved');
    } catch (err: any) {
      setMessage('password', `Error: ${err.message}`);
    }
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner loading-spinner-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-page flex-col gap-sm">
        <p className="error-text">{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={fetchSettings}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-md">
      <h2
        className="animate-in"
        style={{
          fontSize: 'var(--font-size-large)',
          fontWeight: 700,
        }}
      >
        Settings
      </h2>

      {/* Hostname */}
      <div className="card animate-in-delay-1">
        <div className="card-header">
          <div className="card-title">Hostname</div>
        </div>
        <div className="flex flex-col gap-sm">
          <input
            type="text"
            className="input"
            value={hostname}
            onInput={(e) => setHostname((e.target as HTMLInputElement).value)}
          />
          <div className="flex items-center gap-sm">
            <button
              className="btn btn-primary btn-sm"
              onClick={saveHostname}
              disabled={hostname === currentHostname}
            >
              Save
            </button>
            {messages.hostname &&
              (messages.hostname === 'saved' ? (
                <span className="success-text">{messages.hostname}</span>
              ) : (
                <span className="error-text">{messages.hostname}</span>
              ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="card animate-in-delay-2">
        <div className="card-header">
          <div className="card-title">Pricing</div>
        </div>
        <div className="flex flex-col gap-sm">
          <div className="input-group">
            <label className="input-label">Model</label>
            <select
              className="input"
              value={pricing.model}
              onChange={(e) =>
                setPricing((p) => ({
                  ...p,
                  model: (e.target as HTMLSelectElement).value,
                }))
              }
              style={{ appearance: 'none', paddingRight: '2rem' }}
            >
              <option value="time">Time-based</option>
              <option value="data">Data-based</option>
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">
              Rate ({pricing.model === 'time' ? 'sats/hour' : 'sats/MB'})
            </label>
            <input
              type="number"
              className="input"
              value={pricing.rate}
              onInput={(e) =>
                setPricing((p) => ({
                  ...p,
                  rate: (e.target as HTMLInputElement).value,
                }))
              }
              placeholder="e.g. 100"
            />
          </div>
          <div className="input-group">
            <label className="input-label">
              Minimum purchase ({pricing.model === 'time' ? 'minutes' : 'MB'})
            </label>
            <input
              type="number"
              className="input"
              value={pricing.minimum}
              onInput={(e) =>
                setPricing((p) => ({
                  ...p,
                  minimum: (e.target as HTMLInputElement).value,
                }))
              }
              placeholder="e.g. 30"
            />
          </div>
          <div className="flex items-center gap-sm">
            <button className="btn btn-primary btn-sm" onClick={savePricing}>
              Save
            </button>
            {messages.pricing &&
              (messages.pricing === 'saved' ? (
                <span className="success-text">{messages.pricing}</span>
              ) : (
                <span className="error-text">{messages.pricing}</span>
              ))}
          </div>
        </div>
      </div>

      {/* LNURL */}
      <div className="card animate-in-delay-3">
        <div className="card-header">
          <div className="card-title">LNURL</div>
        </div>
        <div className="flex flex-col gap-sm">
          <div className="input-group">
            <label className="input-label">Lightning LNURL</label>
            <input
              type="text"
              className="input"
              value={lnurl}
              onInput={(e) => setLnurl((e.target as HTMLInputElement).value)}
              placeholder="lnurlp://..."
              style={{ fontSize: 'var(--font-size-small)' }}
            />
          </div>
          <div className="flex items-center gap-sm">
            <button className="btn btn-primary btn-sm" onClick={saveLnurl}>
              Save
            </button>
            {messages.lnurl &&
              (messages.lnurl === 'saved' ? (
                <span className="success-text">{messages.lnurl}</span>
              ) : (
                <span className="error-text">{messages.lnurl}</span>
              ))}
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="card animate-in-delay-4">
        <div className="card-header">
          <div className="card-title">Admin Password</div>
        </div>
        <div className="flex flex-col gap-sm">
          <div className="input-group">
            <label className="input-label">New Password</label>
            <input
              type="password"
              className="input"
              value={newPassword}
              onInput={(e) =>
                setNewPassword((e.target as HTMLInputElement).value)
              }
              placeholder="Enter new password"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Confirm Password</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onInput={(e) =>
                setConfirmPassword((e.target as HTMLInputElement).value)
              }
              placeholder="Confirm new password"
            />
          </div>
          <div className="flex items-center gap-sm">
            <button
              className="btn btn-primary btn-sm"
              onClick={changePassword}
              disabled={!newPassword || !confirmPassword}
            >
              Change
            </button>
            {messages.password &&
              (messages.password === 'saved' ? (
                <span className="success-text">{messages.password}</span>
              ) : (
                <span className="error-text">{messages.password}</span>
              ))}
          </div>
        </div>
      </div>

      {/* Advanced (LuCI) */}
      <div className="card animate-in-delay-4">
        <div className="card-header">
          <div className="card-title">Advanced</div>
        </div>
        <p
          className="text-muted"
          style={{ fontSize: 'var(--font-size-small)', marginBottom: '0.6rem' }}
        >
          Open the full LuCI web interface for advanced configuration options.
        </p>
        <a
          href="http://192.168.1.1:8080"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
          style={{
            display: 'inline-flex',
            textDecoration: 'none',
          }}
        >
          Open LuCI
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  );
}
