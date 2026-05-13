import { useState, useEffect, useCallback } from 'preact/hooks';
import { ubusCall } from '../lib/ubus';

interface WifiIface {
  ifname: string;
  ssid: string;
  encryption: string;
  hidden: boolean;
  mode: string;
  network: string[];
}

interface WifiRadio {
  up: boolean;
  config: {
    channel: number;
    hwmode: string;
    htmode: string;
    country?: string;
  };
  interfaces: WifiIface[];
}

export default function Wifi() {
  const [radios, setRadios] = useState<Record<string, WifiRadio>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editSsid, setEditSsid] = useState<string | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const data = await ubusCall('wireless', 'status');
      setRadios(data || {});
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to load WiFi status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  function startEdit(ifname: string, ssid: string) {
    setEditSsid(ifname);
    setEditName(ssid);
    setEditPassword('');
    setSaveMsg('');
  }

  async function saveEdit() {
    if (!editSsid) return;
    setSaving(true);
    setSaveMsg('');
    try {
      // Set SSID
      await ubusCall('uci', 'set', {
        config: 'wireless',
        section: editSsid,
        values: { ssid: editName },
      });
      // Set password if provided
      if (editPassword) {
        await ubusCall('uci', 'set', {
          config: 'wireless',
          section: editSsid,
          values: { key: editPassword },
        });
      }
      // Commit and reload wireless
      await ubusCall('uci', 'commit', { config: 'wireless' });
      await ubusCall('wireless', 'reload');

      setSaveMsg('saved');
      setEditSsid(null);
      setTimeout(() => fetchStatus(), 2000);
    } catch (err: any) {
      setSaveMsg(err.message || 'Failed to save');
    } finally {
      setSaving(false);
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
        <button className="btn btn-secondary btn-sm" onClick={fetchStatus}>
          Retry
        </button>
      </div>
    );
  }

  const radioEntries = Object.entries(radios);

  return (
    <div className="flex flex-col gap-md">
      <div
        className="flex items-center justify-between animate-in"
        style={{ marginBottom: '-0.3rem' }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-large)',
            fontWeight: 700,
          }}
        >
          WiFi
        </h2>
        <button className="btn btn-secondary btn-sm" onClick={fetchStatus}>
          Refresh
        </button>
      </div>

      {radioEntries.length === 0 && (
        <div className="card animate-in-delay-1">
          <p className="text-dim" style={{ fontSize: 'var(--font-size-small)' }}>
            No wireless radios found
          </p>
        </div>
      )}

      {radioEntries.map(([radioName, radio], ri) => (
        <div key={radioName} className={`card animate-in-delay-${ri + 1}`}>
          <div className="card-header">
            <div className="card-title">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={radio.up ? 'var(--success)' : 'var(--error)'}
                stroke-width="2"
              >
                <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <circle cx="12" cy="20" r="1" fill={radio.up ? 'var(--success)' : 'var(--error)'} />
              </svg>
              {radioName}
            </div>
            <span className={`badge ${radio.up ? 'badge-success' : 'badge-error'}`}>
              {radio.up ? 'Up' : 'Down'}
            </span>
          </div>

          <div className="card-body">
            <div className="stat-row">
              <span className="stat-label">Channel</span>
              <span className="stat-value">{radio.config?.channel || '—'}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Mode</span>
              <span className="stat-value">{radio.config?.htmode || '—'}</span>
            </div>

            {radio.interfaces?.map((iface) => (
              <div key={iface.ifname} style={{ marginTop: '0.75rem' }}>
                <hr className="divider" />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 'var(--font-size-small)',
                    }}
                  >
                    {iface.ssid || iface.ifname}
                  </span>
                  <span className="badge badge-accent">{iface.mode}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Interface</span>
                  <span className="stat-value text-mono">{iface.ifname}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Encryption</span>
                  <span className="stat-value">
                    {iface.encryption || 'None'}
                  </span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Hidden</span>
                  <span className="stat-value">{iface.hidden ? 'Yes' : 'No'}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Network</span>
                  <span className="stat-value">
                    {iface.network?.join(', ') || '—'}
                  </span>
                </div>

                {editSsid === iface.ifname ? (
                  <div
                    className="flex flex-col gap-sm"
                    style={{ marginTop: '0.75rem' }}
                  >
                    <div className="input-group">
                      <label className="input-label">SSID Name</label>
                      <input
                        type="text"
                        className="input"
                        value={editName}
                        onInput={(e) =>
                          setEditName((e.target as HTMLInputElement).value)
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Password</label>
                      <input
                        type="password"
                        className="input"
                        value={editPassword}
                        onInput={(e) =>
                          setEditPassword((e.target as HTMLInputElement).value)
                        }
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                    <div className="flex gap-sm">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={saveEdit}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditSsid(null)}
                      >
                        Cancel
                      </button>
                    </div>
                    {saveMsg && saveMsg !== 'saved' && (
                      <p className="error-text">{saveMsg}</p>
                    )}
                    {saveMsg === 'saved' && (
                      <p className="success-text">Changes applied</p>
                    )}
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: '0.6rem' }}
                    onClick={() => startEdit(iface.ifname, iface.ssid)}
                  >
                    Edit
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
