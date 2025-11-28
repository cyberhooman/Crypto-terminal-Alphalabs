'use client';

import { useEffect, useState } from 'react';
import { Bell, TrendingUp, TrendingDown, AlertTriangle, X, Volume2, Trash2, Zap, Target } from 'lucide-react';
import type { ConfluenceAlert } from '@/lib/alerts/confluenceDetector';
import { AlertSeverity, SetupType } from '@/lib/alerts/confluenceDetector';

interface AlertPanelProps {
  alerts: ConfluenceAlert[];
  onDismiss: (id: string) => void;
  onClearAll?: () => void;
  onSymbolClick?: (symbol: string) => void;
}

type FilterType = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export default function AlertPanel({ alerts, onDismiss, onClearAll, onSymbolClick }: AlertPanelProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');

  // Play sound for new CRITICAL alerts
  useEffect(() => {
    if (!soundEnabled) return;

    const criticalAlerts = alerts.filter(a => a.severity === AlertSeverity.CRITICAL);
    if (criticalAlerts.length > 0) {
      // You can add a sound file later
      // const audio = new Audio('/alert-sound.mp3');
      // audio.play().catch(console.error);
    }
  }, [alerts, soundEnabled]);

  // Filter and limit alerts to prevent performance issues
  const filteredAlerts = (filter === 'ALL'
    ? alerts
    : alerts.filter(a => a.severity === filter))
    .slice(0, 50); // Show max 50 alerts at a time

  const criticalCount = alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length;
  const highCount = alerts.filter(a => a.severity === AlertSeverity.HIGH).length;

  if (alerts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div
            className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)'
            }}
          >
            <Bell className="w-12 h-12" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            No Active Alerts
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Monitoring markets for confluence setups...
          </p>
          <div
            className="mt-6 p-4 rounded-lg"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)'
            }}
          >
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Alerts will appear here when confluence patterns are detected
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Modern Header */}
      <div
        className="px-6 py-5 border-b flex-shrink-0"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--warning), var(--danger))',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
              }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                Confluence Alerts
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                High-probability trading setups
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {alerts.length > 0 && onClearAll && (
              <button
                onClick={onClearAll}
                className="px-4 py-2 rounded-lg transition-all flex items-center gap-2 font-medium text-sm"
                style={{
                  background: 'var(--danger-light)',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)'
                }}
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            )}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 rounded-lg transition-all"
              style={{
                background: soundEnabled ? 'var(--primary)' : 'var(--surface-elevated)',
                color: soundEnabled ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${soundEnabled ? 'var(--primary)' : 'var(--border)'}`
              }}
              title="Toggle sound"
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alert Stats */}
        <div className="flex items-center gap-3 mb-4">
          {criticalCount > 0 && (
            <div
              className="px-3 py-1.5 rounded-lg flex items-center gap-2"
              style={{
                background: 'var(--danger-light)',
                border: '1px solid var(--danger)'
              }}
            >
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--danger)' }}>
                {criticalCount} CRITICAL
              </span>
            </div>
          )}
          {highCount > 0 && (
            <div
              className="px-3 py-1.5 rounded-lg flex items-center gap-2"
              style={{
                background: 'var(--warning-light)',
                border: '1px solid var(--warning)'
              }}
            >
              <Target className="w-4 h-4" style={{ color: 'var(--warning)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--warning)' }}>
                {highCount} HIGH
              </span>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-all"
              style={{
                background: filter === f ? 'var(--primary)' : 'var(--surface-elevated)',
                color: filter === f ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${filter === f ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-4 min-h-0" style={{ background: 'var(--background)' }}>
        {filteredAlerts.length < alerts.length && (
          <div
            className="p-4 rounded-lg border"
            style={{
              background: 'var(--warning-light)',
              borderColor: 'var(--warning)'
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--warning)' }}>
              ℹ️ Showing {filteredAlerts.length} of {alerts.length} alerts. Dismiss old alerts to see more.
            </p>
          </div>
        )}
        {filteredAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onDismiss={() => onDismiss(alert.id)}
            onSymbolClick={onSymbolClick}
          />
        ))}
      </div>
    </div>
  );
}

function AlertCard({
  alert,
  onDismiss,
  onSymbolClick,
}: {
  alert: ConfluenceAlert;
  onDismiss: () => void;
  onSymbolClick?: (symbol: string) => void;
}) {
  const severityConfig = {
    CRITICAL: { border: 'var(--danger)', bg: 'var(--danger-light)', icon: AlertTriangle, iconColor: 'var(--danger)' },
    HIGH: { border: 'var(--warning)', bg: 'var(--warning-light)', icon: Target, iconColor: 'var(--warning)' },
    MEDIUM: { border: 'var(--info)', bg: 'var(--info-light)', icon: Bell, iconColor: 'var(--info)' },
    LOW: { border: 'var(--primary)', bg: 'var(--primary-light)', icon: Bell, iconColor: 'var(--primary)' },
  };

  const setupIcons = {
    SHORT_SQUEEZE: <TrendingUp className="w-5 h-5" style={{ color: 'var(--success)' }} />,
    LONG_FLUSH: <TrendingDown className="w-5 h-5" style={{ color: 'var(--danger)' }} />,
    CAPITULATION_BOTTOM: <TrendingUp className="w-5 h-5" style={{ color: 'var(--success-dark)' }} />,
    CAPITULATION_TOP: <TrendingDown className="w-5 h-5" style={{ color: 'var(--danger-dark)' }} />,
    BULLISH_DIVERGENCE: <TrendingUp className="w-5 h-5" style={{ color: 'var(--info)' }} />,
    BEARISH_DIVERGENCE: <TrendingDown className="w-5 h-5" style={{ color: 'var(--warning)' }} />,
  };

  const config = severityConfig[alert.severity];
  const SeverityIcon = config.icon;

  return (
    <div
      className="rounded-xl overflow-hidden animate-slide-in-right"
      style={{
        background: 'var(--surface)',
        border: `2px solid ${config.border}`,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Alert Header */}
      <div
        className="px-4 py-3 flex items-center justify-between border-b"
        style={{
          background: config.bg,
          borderColor: config.border
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <SeverityIcon className="w-5 h-5" style={{ color: config.iconColor }} />
            {setupIcons[alert.setupType]}
          </div>
          <button
            onClick={() => onSymbolClick?.(alert.symbol)}
            className="font-bold text-lg hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-primary)' }}
          >
            {alert.symbol.replace('USDT', '/USDT')}
          </button>
          <div
            className="px-2 py-0.5 text-xs font-bold rounded"
            style={{
              background: config.border,
              color: 'white'
            }}
          >
            {alert.severity}
          </div>
          <div className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
            Score: {alert.confluenceScore}/100
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Alert Body */}
      <div className="p-4">
        <h3 className="font-bold text-base mb-2" style={{ color: 'var(--text-primary)' }}>
          {alert.title}
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {alert.description}
        </p>

        {/* Signals */}
        <div className="space-y-2 mb-4">
          {alert.signals.map((signal, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-sm px-3 py-2 rounded-lg"
              style={{
                background: 'var(--surface-elevated)',
                color: 'var(--text-secondary)'
              }}
            >
              <span style={{ color: 'var(--primary)' }}>▸</span>
              <span>{signal}</span>
            </div>
          ))}
        </div>

        {/* Data Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <MetricBox
            label="Funding Rate"
            value={`${((alert.data.fundingRate || 0) * 100).toFixed(4)}%`}
            isPositive={(alert.data.fundingRate || 0) > 0}
          />
          <MetricBox
            label="OI Change"
            value={`${(alert.data.oiChange || 0).toFixed(1)}%`}
            isPositive={(alert.data.oiChange || 0) > 0}
          />
          <MetricBox
            label="CVD Trend"
            value={alert.data.cvdTrend || 'NEUTRAL'}
            isPositive={alert.data.cvdTrend === 'UP'}
          />
          <MetricBox
            label="Price Change"
            value={`${(alert.data.priceChange || 0).toFixed(1)}%`}
            isPositive={(alert.data.priceChange || 0) > 0}
          />
        </div>

        {/* Timestamp */}
        <div className="mt-3 pt-3 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-tertiary)' }}>
          {new Date(alert.timestamp).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function MetricBox({
  label,
  value,
  isPositive,
}: {
  label: string;
  value: string;
  isPositive: boolean;
}) {
  return (
    <div
      className="p-2 rounded-lg"
      style={{
        background: isPositive ? 'var(--success-light)' : value === 'NEUTRAL' ? 'var(--surface-elevated)' : 'var(--danger-light)',
        border: `1px solid ${isPositive ? 'var(--success)' : value === 'NEUTRAL' ? 'var(--border)' : 'var(--danger)'}`
      }}
    >
      <div className="text-xs mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </div>
      <div
        className="font-mono text-sm font-bold"
        style={{
          color: isPositive ? 'var(--success)' : value === 'NEUTRAL' ? 'var(--text-secondary)' : 'var(--danger)'
        }}
      >
        {isPositive && value !== 'UP' ? '+' : ''}{value}
      </div>
    </div>
  );
}
