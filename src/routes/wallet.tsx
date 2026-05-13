import { useState, useEffect, useCallback } from 'preact/hooks';
import { ubusCall } from '../lib/ubus';

export default function Wallet() {
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBalance = useCallback(async () => {
    try {
      const data = await ubusCall('tollgate', 'wallet_balance');
      setBalance(data);
      setError('');
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return (
    <div className="flex flex-col gap-md">
      <h2
        className="animate-in"
        style={{
          fontSize: 'var(--font-size-large)',
          fontWeight: 700,
        }}
      >
        Wallet
      </h2>

      {balance && (
        <div className="card animate-in-delay-1">
          <div className="card-header">
            <div className="card-title">Balance</div>
          </div>
          <div
            style={{
              fontSize: 'var(--font-size-large)',
              fontWeight: 700,
              color: 'var(--accent)',
            }}
          >
            {typeof balance.balance === 'number'
              ? `${balance.balance} sats`
              : balance.balance || '—'}
          </div>
          {balance.pending && (
            <p
              className="text-muted"
              style={{ fontSize: 'var(--font-size-small)', marginTop: '0.3rem' }}
            >
              Pending: {balance.pending} sats
            </p>
          )}
        </div>
      )}

      <div className="card animate-in-delay-2">
        <div
          className="flex flex-col items-center justify-center"
          style={{ padding: '2.5rem 1rem' }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-dim)"
            stroke-width="1.2"
            style={{ marginBottom: '1rem' }}
          >
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <p
            style={{
              fontWeight: 600,
              fontSize: 'var(--font-size)',
              marginBottom: '0.3rem',
            }}
          >
            Wallet Coming Soon
          </p>
          <p
            className="text-muted"
            style={{
              fontSize: 'var(--font-size-small)',
              textAlign: 'center',
              maxWidth: '260px',
            }}
          >
            Coco Lightning integration is planned for managing payments, viewing transactions, and wallet balance.
          </p>
        </div>
      </div>
    </div>
  );
}
