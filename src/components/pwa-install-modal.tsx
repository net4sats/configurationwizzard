import { useState, useEffect } from 'preact/hooks';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'net4sats-pwa-modal-dismissed';

export default function PwaInstallModal() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if previously dismissed this session
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    // Detect iOS (no beforeinstallprompt support)
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;

    // Already installed/standalone → never show
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS / non-supporting browsers, show manual instructions after short delay
    if (isIOS) {
      const t = window.setTimeout(() => setVisible(true), 1200);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        window.clearTimeout(t);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
      setVisible(false);
      sessionStorage.setItem(STORAGE_KEY, '1');
    }
  };

  if (!visible) return null;

  const canInstall = deferredPrompt !== null;

  return (
    <div class="pwa-modal" role="dialog" aria-modal="true" aria-label="Install net4sats app">
      <div class="pwa-modal-box">
        <button class="close-btn" onClick={dismiss} aria-label="Close">×</button>

        <div class="icon-wrap">
          <img src="assets/icon/white/net4sats-icon-white.svg" alt="net4sats icon" />
        </div>

        <h1>Add to Home Screen</h1>
        <p>Access net4sats instantly from your home screen.</p>

        {canInstall ? (
          <button
            class="cta-btn"
            onClick={install}
            disabled={installing}
            style={{ width: '100%', background: 'var(--accent)', color: '#fff' }}
          >
            {installing ? 'Installing…' : 'Install App'}
          </button>
        ) : (
          <div class="steps">
            <div class="step">
              <div class="step-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div class="step-num">1</div>
              <div class="step-text">Tap the Share button</div>
            </div>
            <div class="step">
              <div class="step-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div class="step-num">2</div>
              <div class="step-text">
                Scroll down and tap
                <br />
                &ldquo;Add to Home Screen&rdquo;
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
