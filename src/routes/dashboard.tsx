import { useState, useEffect, useCallback } from 'preact/hooks';
import { ubusCall } from '../lib/ubus';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function InfoCard({
  title,
  icon,
  children,
  className = '',
}: {
  title: string;
  icon?: any;
  children: any;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div className="card-title">
          {icon}
          {title}
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const [board, setBoard] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [tollgate, setTollgate] = useState<any>(null);
  const [network, setNetwork] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [boardData, infoData, netData] = await Promise.allSettled([
        ubusCall('system', 'board'),
        ubusCall('system', 'info'),
        ubusCall('network.interface', 'dump'),
      ]);

      if (boardData.status === 'fulfilled') setBoard(boardData.value);
      if (infoData.status === 'fulfilled') setInfo(infoData.value);
      if (netData.status === 'fulfilled') setNetwork(netData.value);

      try {
        const tg = await ubusCall('tollgate', 'status');
        setTollgate(tg);
      } catch {
        setTollgate(null);
      }

      setError('');
    } catch (err: any) {
      if (err.message === 'SESSION_EXPIRED') {
        setError('Session expired. Please log in again.');
      } else {
        setError(err.message || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [fetchAll]);

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
        <button className="btn btn-secondary btn-sm" onClick={fetchAll}>
          Retry
        </button>
      </div>
    );
  }

  const interfaces = network?.interface || [];
  const wan = interfaces.find((i: any) => i.interface === 'wan' && i.up);

  return (
    <div className="flex flex-col gap-md">
      <InfoCard
        title="System"
        className="animate-in"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        }
      >
        <StatRow label="Hostname" value={board?.hostname || '—'} />
        <StatRow
          label="Uptime"
          value={info?.uptime ? formatUptime(info.uptime) : '—'}
        />
        <StatRow label="Kernel" value={board?.kernel || '—'} />
        <StatRow label="Architecture" value={board?.system || '—'} />
        <StatRow
          label="Firmware"
          value={board?.release?.revision || board?.release?.version || '—'}
        />
      </InfoCard>

      <InfoCard
        title="Memory"
        className="animate-in-delay-1"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <rect x="9" y="9" width="6" height="6" />
            <line x1="9" y1="2" x2="9" y2="4" />
            <line x1="15" y1="2" x2="15" y2="4" />
            <line x1="9" y1="20" x2="9" y2="22" />
            <line x1="15" y1="20" x2="15" y2="22" />
          </svg>
        }
      >
        {info?.memory && (
          <>
            <StatRow
              label="Total"
              value={formatBytes(info.memory.total)}
            />
            <StatRow
              label="Free"
              value={formatBytes(info.memory.free)}
            />
            <StatRow
              label="Buffers"
              value={formatBytes(info.memory.buffered)}
            />
            <StatRow
              label="Shared"
              value={formatBytes(info.memory.shared)}
            />
            <div style={{ marginTop: '0.5rem' }}>
              <div
                style={{
                  height: '4px',
                  background: 'var(--border)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${((info.memory.total - info.memory.free) / info.memory.total) * 100}%`,
                    background: 'var(--accent)',
                    borderRadius: '2px',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
              <p
                style={{
                  fontSize: 'var(--font-size-xsmall)',
                  color: 'var(--text-dim)',
                  marginTop: '0.3rem',
                  textAlign: 'right' as const,
                }}
              >
                {(
                  ((info.memory.total - info.memory.free) / info.memory.total) *
                  100
                ).toFixed(0)}
                % used
              </p>
            </div>
          </>
        )}
      </InfoCard>

      <InfoCard
        title="Network"
        className="animate-in-delay-2"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        }
      >
        <StatRow
          label="WAN Status"
          value={
            wan ? (
              <span className="badge badge-success">Connected</span>
            ) : (
              <span className="badge badge-error">Disconnected</span>
            )
          }
        />
        {wan && (
          <>
            <StatRow
              label="WAN IP"
              value={wan['ipv4-address']?.[0]?.address || '—'}
            />
            <StatRow
              label="Gateway"
              value={wan.route?.[0]?.target || '—'}
            />
            <StatRow
              label="DNS"
              value={
                wan['dns-server']?.length
                  ? wan['dns-server'].join(', ')
                  : '—'
              }
            />
            <StatRow label="Protocol" value={wan.proto || '—'} />
          </>
        )}
      </InfoCard>

      <InfoCard
        title="Tollgate"
        className="animate-in-delay-3"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        }
      >
        {tollgate ? (
          <>
            <StatRow
              label="Status"
              value={
                tollgate.running ? (
                  <span className="badge badge-success">Running</span>
                ) : (
                  <span className="badge badge-error">Stopped</span>
                )
              }
            />
            <StatRow
              label="Active Sessions"
              value={String(tollgate.active_sessions ?? '—')}
            />
            <StatRow
              label="Pricing"
              value={tollgate.pricing_model || '—'}
            />
          </>
        ) : (
          <p className="text-dim" style={{ fontSize: 'var(--font-size-small)' }}>
            Tollgate service not available
          </p>
        )}
      </InfoCard>
    </div>
  );
}
