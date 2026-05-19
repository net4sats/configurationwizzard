import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { ubusCall } from '../lib/ubus';

type Tab = 'lightning' | 'cashu';
type PortalPhase = 'loading' | 'select' | 'success';

interface PricingData {
  model: 'time' | 'data';
  rate: number;
  minimum: number;
  currency: string;
}

interface SizeOption {
  label: string;
  value: number;
}

const TIME_OPTIONS: SizeOption[] = [
  { label: '15 min', value: 100 },
  { label: '1 hour', value: 400 },
  { label: '10 hours', value: 4000 },
  { label: 'More', value: 0 },
];

const DATA_OPTIONS: SizeOption[] = [
  { label: '100 MB', value: 100 },
  { label: '1 GB', value: 1000 },
  { label: '10 GB', value: 10000 },
  { label: 'More', value: 0 },
];

function formatSats(v: number): string {
  return v.toLocaleString() + ' sats';
}

function formatGranted(pricing: PricingData, value: number): string {
  if (pricing.model === 'time') {
    if (value <= 0) return '0 min';
    const mins = Math.round(value / pricing.rate);
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m > 0 ? `${h}h ${m}min` : `${h} hour${h > 1 ? 's' : ''}`;
    }
    return `${mins} min`;
  }
  if (value >= 1000) {
    const gb = value / 1000;
    return gb >= 10 ? `${gb.toFixed(0)} GB` : `${gb.toFixed(1)} GB`;
  }
  return `${value} MB`;
}

function getMinimumLabel(pricing: PricingData): string {
  if (pricing.model === 'time') {
    return `Minimum purchase: ${pricing.minimum} minutes`;
  }
  if (pricing.minimum >= 1000) {
    return `Minimum purchase: ${pricing.minimum / 1000} GB`;
  }
  return `Minimum purchase: ${pricing.minimum} MB`;
}

function getMoreSuffix(pricing: PricingData): string {
  return pricing.model === 'time' ? 'min' : 'GB';
}

function getMorePlaceholder(pricing: PricingData): string {
  return pricing.model === 'time' ? '60' : '50';
}

function computeMoreValue(pricing: PricingData, input: number): number {
  if (pricing.model === 'time') {
    return Math.round(input * pricing.rate / 60);
  }
  return input * 1000;
}

export default function CaptivePortal() {
  const [phase, setPhase] = useState<PortalPhase>('loading');
  const [tab, setTab] = useState<Tab>('lightning');
  const [pricing, setPricing] = useState<PricingData>({ model: 'time', rate: 50, minimum: 15, currency: 'sats' });
  const [selectedValue, setSelectedValue] = useState(100);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const [moreInput, setMoreInput] = useState('');
  const [deviceMac, setDeviceMac] = useState('AA:BB:CC:DD:EE:FF');

  const [cashuToken, setCashuToken] = useState('');
  const [cashuError, setCashuError] = useState('');
  const [cashuSuccess, setCashuSuccess] = useState(false);

  const [lnInvoice, setLnInvoice] = useState('');
  const [lnGenerating, setLnGenerating] = useState(false);
  const [lnGenerated, setLnGenerated] = useState(false);
  const [lnError, setLnError] = useState('');

  const [grantedText, setGrantedText] = useState('');
  const moreRef = useRef<HTMLInputElement>(null);

  const options = pricing.model === 'time' ? TIME_OPTIONS : DATA_OPTIONS;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await ubusCall('tollgate', 'status');
        const pr = await ubusCall('tollgate', 'pricing');
        if (cancelled) return;
        const p: PricingData = {
          model: pr.model || 'time',
          rate: pr.rate || 50,
          minimum: pr.minimum || (pr.model === 'time' ? 15 : 100),
          currency: pr.currency || 'sats',
        };
        setPricing(p);
        const defaultVal = options[0].value;
        setSelectedValue(defaultVal);
        if (status.device_mac) setDeviceMac(status.device_mac);
      } catch {
        if (cancelled) return;
      }
      setTimeout(() => {
        if (!cancelled) setPhase('select');
      }, 600);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSelectSize = useCallback((idx: number) => {
    setSelectedIdx(idx);
    setLnInvoice('');
    setLnGenerated(false);
    setLnGenerating(false);
    setLnError('');
    setCashuError('');
    setCashuSuccess(false);
    setCashuToken('');

    if (idx === options.length - 1) {
      setShowMore(true);
      setTimeout(() => moreRef.current?.focus(), 50);
    } else {
      setShowMore(false);
      setMoreInput('');
      setSelectedValue(options[idx].value);
    }
  }, [options]);

  const handleMoreInput = useCallback((val: string) => {
    setMoreInput(val);
    const n = parseFloat(val);
    if (!isNaN(n) && n > 0) {
      setSelectedValue(computeMoreValue(pricing, n));
    }
  }, [pricing]);

  const handleCashuInput = useCallback((val: string) => {
    setCashuToken(val);
    setCashuError('');
    setCashuSuccess(false);
    if (val.trim() && !val.trim().startsWith('cashu')) {
      setCashuError('Cashu tokens should start with "cashu"');
    }
  }, []);

  const handleCashuPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      handleCashuInput(text);
    } catch {
      setCashuError('Clipboard access denied. Please paste manually.');
    }
  }, [handleCashuInput]);

  const handleCashuClear = useCallback(() => {
    setCashuToken('');
    setCashuError('');
    setCashuSuccess(false);
  }, []);

  const handleCashuPay = useCallback(() => {
    if (!cashuToken.trim().startsWith('cashu')) return;
    setCashuSuccess(true);
    setTimeout(() => {
      setGrantedText(formatGranted(pricing, selectedValue));
      setPhase('success');
    }, 600);
  }, [cashuToken, pricing, selectedValue]);

  const handleGenerateInvoice = useCallback(() => {
    setLnGenerating(true);
    setLnError('');
    setTimeout(() => {
      const mockInvoice = 'lnbc' + Math.random().toString(36).substring(2, 20) + '...';
      setLnInvoice(mockInvoice);
      setLnGenerating(false);
      setLnGenerated(true);
      setTimeout(() => {
        setGrantedText(formatGranted(pricing, selectedValue));
        setPhase('success');
      }, 3000);
    }, 1200);
  }, [pricing, selectedValue]);

  const isCashuValid = cashuToken.trim().startsWith('cashu');

  if (phase === 'loading') {
    return (
      <div className="tollgate-captive-portal">
        <div className="tollgate-captive-portal-header">
          <img
            src="/assets/logo/colour/net4sats-logo-colour.png"
            alt="net4sats"
          />
          <p className="powered-by">
            Powered by{' '}
            <a href="https://tollgate.me/" target="_blank" rel="noreferrer" style="color:#fff;text-decoration:none">
              TollGate
            </a>
          </p>
        </div>
        <div className="tollgate-captive-portal-content">
          <div className="tollgate-captive-portal-content-container">
            <div className="tollgate-captive-portal-tabs" role="tablist">
              <button
                className="tollgate-captive-portal-tabs-tab tollgate-captive-portal-tabs-tab-lightning"
                data-active="true"
                role="tab"
              >
                ⚡ Lightning
              </button>
              <button
                className="tollgate-captive-portal-tabs-tab tollgate-captive-portal-tabs-tab-cashu"
                data-active="false"
                role="tab"
              >
                🥜 Cashu
              </button>
            </div>
            <div className="tollgate-captive-portal-view">
              <div className="tollgate-captive-portal-loading">
                <div className="cp-spinner big" />
                <span>Loading…</span>
              </div>
            </div>
          </div>
        </div>
        <div className="tollgate-captive-portal-footer">
          <p><span>Device: {deviceMac}</span> &nbsp;·&nbsp; net4sats v1.0</p>
        </div>
      </div>
    );
  }

  if (phase === 'success') {
    return (
      <div className="tollgate-captive-portal">
        <div className="tollgate-captive-portal-header">
          <img
            src="/assets/logo/colour/net4sats-logo-colour.png"
            alt="net4sats"
          />
          <p className="powered-by">
            Powered by{' '}
            <a href="https://tollgate.me/" target="_blank" rel="noreferrer" style="color:#fff;text-decoration:none">
              TollGate
            </a>
          </p>
        </div>
        <div className="tollgate-captive-portal-content">
          <div className="tollgate-captive-portal-content-container">
            <div className="tollgate-captive-portal-tabs" role="tablist">
              <button
                className="tollgate-captive-portal-tabs-tab tollgate-captive-portal-tabs-tab-lightning"
                data-active="true"
                role="tab"
              >
                ⚡ Lightning
              </button>
              <button
                className="tollgate-captive-portal-tabs-tab tollgate-captive-portal-tabs-tab-cashu"
                data-active="false"
                role="tab"
              >
                🥜 Cashu
              </button>
            </div>
            <div className="tollgate-captive-portal-view">
              <div className="tollgate-captive-portal-access-granted">
                <div className="tollgate-captive-portal-access-granted-checkmark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="tollgate-captive-portal-access-granted-label">
                  <h2>Payment successful!</h2>
                  <p>You now have <strong>{grantedText}</strong> of internet access.</p>
                  <p className="small">Redirecting to your balance page…</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="tollgate-captive-portal-footer">
          <p><span>Device: {deviceMac}</span> &nbsp;·&nbsp; net4sats v1.0</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tollgate-captive-portal">
      <div className="tollgate-captive-portal-header">
        <img
          src="/assets/logo/colour/net4sats-logo-colour.png"
          alt="net4sats"
        />
        <p className="powered-by">
          Powered by{' '}
          <a href="https://tollgate.me/" target="_blank" rel="noreferrer" style="color:#fff;text-decoration:none">
            TollGate
          </a>
        </p>
      </div>

      <div style={{ textAlign: 'center', padding: '1rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
        <p style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 700 }}>How much Internet would you like to buy?</p>
      </div>
      <p style={{ textAlign: 'center', margin: '0 0 0.4rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'inherit' }}>
        {getMinimumLabel(pricing)}
      </p>

      <div className="size-choices">
        {options.map((opt, idx) => (
          <button
            key={opt.label}
            className={`size-btn${idx === selectedIdx ? ' active' : ''}`}
            onClick={() => handleSelectSize(idx)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className={`more-input-wrap${showMore ? ' visible' : ''}`}>
        <div className="more-input-row">
          <input
            ref={moreRef}
            type="number"
            min="0"
            placeholder={getMorePlaceholder(pricing)}
            value={moreInput}
            onInput={(e) => handleMoreInput((e.target as HTMLInputElement).value)}
          />
          <span className="suffix">{getMoreSuffix(pricing)}</span>
        </div>
      </div>

      <div className="tollgate-captive-portal-content">
        <div className="tollgate-captive-portal-content-container">
          <div className="tollgate-captive-portal-tabs" role="tablist">
            <button
              className="tollgate-captive-portal-tabs-tab tollgate-captive-portal-tabs-tab-lightning"
              data-active={tab === 'lightning' ? 'true' : 'false'}
              role="tab"
              onClick={() => setTab('lightning')}
            >
              ⚡ Lightning
            </button>
            <button
              className="tollgate-captive-portal-tabs-tab tollgate-captive-portal-tabs-tab-cashu"
              data-active={tab === 'cashu' ? 'true' : 'false'}
              role="tab"
              onClick={() => setTab('cashu')}
            >
              🥜 Cashu
            </button>
          </div>

          <div className="tollgate-captive-portal-view">
            {tab === 'lightning' && (
              <>
                <div className="tollgate-captive-portal-method-header">
                  <h2>
                    Pay with{' '}
                    <a href="https://bitcoin.org/" target="_blank" rel="noreferrer">
                      BTC Lightning
                    </a>{' '}
                    to access the internet.
                  </h2>
                </div>

                <div className="tollgate-captive-portal-method-input" style={{ textAlign: 'center', padding: '1.2rem', border: 'none' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0a0a0a' }}>
                    {formatSats(selectedValue)}
                  </div>
                </div>

                {lnGenerated && lnInvoice && (
                  <div style={{ textAlign: 'center', padding: '1rem', background: '#fff', borderRadius: 'var(--border-radius)' }}>
                    <div
                      style={{
                        width: '180px',
                        height: '180px',
                        background: '#f5f5f5',
                        margin: '0 auto 0.8rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        color: 'rgba(0,0,0,0.3)',
                      }}
                    >
                      QR code
                    </div>
                    <div style={{ fontSize: 'var(--font-size-small)', color: 'rgba(0,0,0,0.4)', wordBreak: 'break-all' }}>
                      {lnInvoice}
                    </div>
                  </div>
                )}

                {lnError && (
                  <div className="error-msg">
                    <div className="dot" />
                    <span>{lnError}</span>
                  </div>
                )}

                <div className="tollgate-captive-portal-method-submit">
                  <button
                    disabled={lnGenerating || lnGenerated}
                    onClick={handleGenerateInvoice}
                    style={lnGenerated ? { background: '#32d74b', color: '#fff' } : undefined}
                  >
                    {lnGenerating ? 'Generating…' : lnGenerated ? 'Invoice Generated ✓' : 'Generate Invoice'}
                  </button>
                </div>
              </>
            )}

            {tab === 'cashu' && (
              <>
                <div className="tollgate-captive-portal-method-header">
                  <h2>
                    Pay with{' '}
                    <a href="https://cashu.space/" target="_blank" rel="noreferrer">
                      Cashu
                    </a>{' '}
                    to access the internet.
                  </h2>
                </div>

                <div className="tollgate-captive-portal-method-input" style={{ textAlign: 'center', padding: '1.2rem', border: 'none' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0a0a0a' }}>
                    {formatSats(selectedValue)}
                  </div>
                </div>

                {cashuSuccess && (
                  <div className="success-msg">
                    <div className="dot" />
                    <span>Valid Cashu token — you will receive internet access.</span>
                  </div>
                )}

                {cashuError && (
                  <div className="error-msg">
                    <div className="dot" />
                    <span>{cashuError}</span>
                  </div>
                )}

                <div className="tollgate-captive-portal-method-input">
                  <input
                    type="text"
                    placeholder="cashuxyz…"
                    autoComplete="off"
                    value={cashuToken}
                    onInput={(e) => handleCashuInput((e.target as HTMLInputElement).value)}
                  />
                  <div className="tollgate-captive-portal-method-input-actions">
                    {cashuToken && (
                      <button className="cancel" onClick={handleCashuClear}>✕</button>
                    )}
                    {!cashuToken && (
                      <button className="ghost" onClick={handleCashuPaste}>Paste</button>
                    )}
                    <button className="ghost">QR</button>
                  </div>
                </div>

                <div className="tollgate-captive-portal-method-submit" style={{ marginTop: '1.5rem' }}>
                  <button disabled={!isCashuValid} onClick={handleCashuPay}>
                    Continue
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="tollgate-captive-portal-footer">
        <p>
          <span>Device: {deviceMac}</span> &nbsp;·&nbsp; net4sats v1.0
        </p>
      </div>
    </div>
  );
}
