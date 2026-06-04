import { useState, useEffect } from 'preact/hooks';

const PWA_SEEN_KEY = 'pwa-seen';

const isCNA = /CaptiveNetworkAssistant|com\.android\.captiveportallogin/i.test(
  typeof navigator !== 'undefined' ? navigator.userAgent : '',
);

export default function PwaModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(PWA_SEEN_KEY)) {
      setVisible(true);
      sessionStorage.setItem(PWA_SEEN_KEY, '1');
    }
  }, []);

  if (!visible) return null;

  const portalUrl = `http://${window.location.hostname}:2050`;

  return (
    <div className="pwa-modal" onClick={() => setVisible(false)}>
      <div className="pwa-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={() => setVisible(false)}>×</button>
        <div className="icon-wrap">
          <img
            src="/assets/icon/white/net4sats-icon-white.png"
            alt="net4sats"
          />
        </div>
        {isCNA ? (
          <>
            <h1>Open in Browser First</h1>
            <p>
              PWA install is not available in this captive portal browser.
              Open the page in your regular browser first, then add it to your
              home screen.
            </p>
            <div className="steps">
              <div className="step">
                <div className="step-num">1</div>
                <div className="step-text">
                  Copy this address:<br />
                  <strong style={{ wordBreak: 'break-all', userSelect: 'all' }}>
                    {portalUrl}
                  </strong>
                </div>
              </div>
              <div className="step">
                <div className="step-num">2</div>
                <div className="step-text">
                  Open your regular browser, paste the address, and follow the
                  "Add to Home Screen" instructions.
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1>Add to Home Screen</h1>
            <p>Access net4sats PWA instantly from your home screen.</p>
            <div className="steps">
              <div className="step">
                <div className="step-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="step-num">1</div>
                <div className="step-text">Tap the share button below</div>
              </div>
              <div className="step">
                <div className="step-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <div className="step-num">2</div>
                <div className="step-text">
                  Scroll down and tap<br />"Add to Home Screen"
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
