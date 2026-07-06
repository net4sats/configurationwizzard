import { useState, useEffect } from 'preact/hooks';

const GATEWAY_PORT = 2121;

function getGatewayBase(): string {
  const host = window.location.hostname || '192.168.1.1';
  return `http://${host}:${GATEWAY_PORT}`;
}

interface IdentityInfo {
  npub: string;
  ipv4: string;
  macs: Record<string, string>;
}

interface SeedResponse {
  mnemonic?: string;
  error?: string;
}

export default function IdentityPanel() {
  const [identity, setIdentity] = useState<IdentityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSeed, setShowSeed] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [seedLoading, setSeedLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [publishProfile, setPublishProfile] = useState(false);

  useEffect(() => {
    fetchIdentity();
  }, []);

  async function fetchIdentity() {
    try {
      const res = await fetch(`${getGatewayBase()}/identity`);
      if (!res.ok) {
        setError('Identity API not available');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.error || data.kind) {
        setError('Identity API not available on this firmware');
        setLoading(false);
        return;
      }
      setIdentity(data);
      setError('');
    } catch (err: any) {
      setError('Failed to fetch identity');
    } finally {
      setLoading(false);
    }
  }

  async function revealSeed() {
    setSeedLoading(true);
    try {
      const res = await fetch(`${getGatewayBase()}/identity/reveal-seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: SeedResponse = await res.json();
      if (data.error) {
        setError(`Seed reveal failed: ${data.error}`);
      } else if (data.mnemonic) {
        setSeedPhrase(data.mnemonic);
        setShowSeed(true);
      }
    } catch (err: any) {
      setError('Failed to reveal seed phrase');
    } finally {
      setSeedLoading(false);
    }
  }

  function copySeed() {
    navigator.clipboard.writeText(seedPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadSeed() {
    const blob = new Blob([seedPhrase], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'net4sats-seed-phrase.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="card animate-in-delay-3">
        <div className="card-header">
          <div className="card-title">Router Identity</div>
        </div>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error && !identity) {
    return (
      <div className="card animate-in-delay-3">
        <div className="card-header">
          <div className="card-title">Router Identity</div>
        </div>
        <p className="error-text" style={{ fontSize: 'var(--font-size-sm)' }}>{error}</p>
        <button className="btn btn-secondary btn-sm" onClick={fetchIdentity}>Retry</button>
      </div>
    );
  }

  const seedWords = seedPhrase ? seedPhrase.trim().split(/\s+/) : [];

  return (
    <div className="card animate-in-delay-3">
      <div className="card-header">
        <div className="card-title">Router Identity</div>
      </div>
      {identity && (
        <div className="flex flex-col gap-sm">
          <div className="input-group">
            <label className="input-label">Nostr Public Key</label>
            <div className="mono-text" style={{ fontSize: 'var(--font-size-xs)', wordBreak: 'break-all', opacity: 0.8 }}>
              {identity.npub}
            </div>
          </div>

          <div className="flex gap-sm">
            <div className="input-group" style={{ flex: 1 }}>
              <label className="input-label">Derived IPv4</label>
              <div className="mono-text" style={{ fontWeight: 600 }}>{identity.ipv4}</div>
            </div>
          </div>

          {identity.macs && Object.keys(identity.macs).length > 0 && (
            <div className="input-group">
              <label className="input-label">Derived MAC Addresses</label>
              {Object.entries(identity.macs).map(([iface, mac]) => (
                <div key={iface} className="flex items-center gap-xs" style={{ fontSize: 'var(--font-size-xs)' }}>
                  <span style={{ opacity: 0.6, minWidth: '60px' }}>{iface}</span>
                  <span className="mono-text">{mac}</span>
                </div>
              ))}
            </div>
          )}

          {/* Seed phrase reveal */}
          {!showSeed ? (
            <div className="flex items-center gap-sm">
              <button
                className="btn btn-secondary btn-sm"
                onClick={revealSeed}
                disabled={seedLoading}
              >
                {seedLoading ? 'Revealing…' : 'Reveal Seed Phrase'}
              </button>
              {error && <span className="error-text" style={{ fontSize: 'var(--font-size-xs)' }}>{error}</span>}
            </div>
          ) : (
            <div className="flex flex-col gap-sm">
              <div style={{
                background: 'var(--bg-warning, #fff3cd)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: 'var(--font-size-sm)',
              }}>
                <p style={{ fontWeight: 600, marginBottom: '4px' }}>⚠ Write down these 24 words</p>
                <p style={{ opacity: 0.8 }}>
                  This seed phrase is the ONLY way to recover your router identity.
                  Anyone with these words controls your router's Nostr identity and derived addresses.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '4px',
                padding: '12px',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
              }}>
                {seedWords.map((word, i) => (
                  <div key={i} className="mono-text" style={{ fontSize: 'var(--font-size-xs)' }}>
                    <span style={{ opacity: 0.5, marginRight: '4px' }}>{i + 1}.</span>
                    {word}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-xs" style={{ flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-xs" onClick={copySeed}>
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button className="btn btn-secondary btn-xs" onClick={downloadSeed}>
                  Download
                </button>
              </div>

              <label className="flex items-center gap-xs" style={{ cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed((e.target as HTMLInputElement).checked)}
                />
                I have written down my seed phrase
              </label>

              <button
                className="btn btn-primary btn-sm"
                disabled={!confirmed}
                onClick={() => { setShowSeed(false); setSeedPhrase(''); setConfirmed(false); }}
              >
                Done
              </button>
            </div>
          )}

          {/* Kind:0 profile publishing toggle */}
          <div className="input-group" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
            <label className="flex items-center gap-xs" style={{ cursor: 'pointer', fontSize: 'var(--font-size-sm)' }}>
              <input
                type="checkbox"
                checked={publishProfile}
                onChange={(e) => setPublishProfile((e.target as HTMLInputElement).checked)}
              />
              <span>Publish router identity to Nostr (kind:0)</span>
            </label>
            <p style={{ fontSize: 'var(--font-size-xs)', opacity: 0.6, marginLeft: '24px' }}>
              Off by default for privacy. When enabled, your router's Nostr identity is discoverable on the network.
            </p>
          </div>

          {error && <p className="error-text" style={{ fontSize: 'var(--font-size-xs)' }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
