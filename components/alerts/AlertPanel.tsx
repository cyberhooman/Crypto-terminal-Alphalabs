'use client';

import { useEffect, useState } from 'react';
import { Bell, TrendingUp, TrendingDown, AlertTriangle, X, Volume2 } from 'lucide-react';
import type { ConfluenceAlert } from '@/lib/alerts/confluenceDetector';
import { AlertSeverity, SetupType } from '@/lib/alerts/confluenceDetector';

interface AlertPanelProps {
  alerts: ConfluenceAlert[];
  onDismiss: (id: string) => void;
  onSymbolClick?: (symbol: string) => void;
}

type FilterType = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export default function AlertPanel({ alerts, onDismiss, onSymbolClick }: AlertPanelProps) {
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

  const filteredAlerts = filter === 'ALL'
    ? alerts
    : alerts.filter(a => a.severity === filter);

  const criticalCount = alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length;
  const highCount = alerts.filter(a => a.severity === AlertSeverity.HIGH).length;

  if (alerts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-400 mb-2">
            No Active Alerts
          </h2>
          <p className="text-gray-500">
            Monitoring markets for confluence setups...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Confluence Alerts
            </h2>
            <div className="flex gap-2">
              {criticalCount > 0 && (
                <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                  {criticalCount} CRITICAL
                </span>
              )}
              {highCount > 0 && (
                <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full">
                  {highCount} HIGH
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              <Volume2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mt-4">
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
  const severityColors = {
    CRITICAL: 'border-red-500 bg-red-500/10',
    HIGH: 'border-orange-500 bg-orange-500/10',
    MEDIUM: 'border-yellow-500 bg-yellow-500/10',
    LOW: 'border-blue-500 bg-blue-500/10',
  };

  const setupIcons = {
    SHORT_SQUEEZE: <TrendingUp className="w-5 h-5 text-green-400" />,
    LONG_FLUSH: <TrendingDown className="w-5 h-5 text-red-400" />,
    CAPITULATION_BOTTOM: <TrendingUp className="w-5 h-5 text-green-500" />,
    CAPITULATION_TOP: <TrendingDown className="w-5 h-5 text-red-500" />,
    BULLISH_DIVERGENCE: <TrendingUp className="w-5 h-5 text-blue-400" />,
    BEARISH_DIVERGENCE: <TrendingDown className="w-5 h-5 text-orange-400" />,
  };

  return (
    <div
      className={`border-l-4 ${severityColors[alert.severity]} rounded-lg p-4 relative animate-in slide-in-from-right duration-300`}
    >
      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-gray-800 rounded transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        {setupIcons[alert.setupType]}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => onSymbolClick?.(alert.symbol)}
              className="text-lg font-bold text-white hover:text-blue-400 transition-colors"
            >
              {alert.symbol.replace('USDT', '/USDT')}
            </button>
            <span
              className={`px-2 py-0.5 text-xs font-bold rounded ${
                alert.severity === AlertSeverity.CRITICAL
                  ? 'bg-red-500 text-white'
                  : alert.severity === AlertSeverity.HIGH
                  ? 'bg-orange-500 text-white'
                  : alert.severity === AlertSeverity.MEDIUM
                  ? 'bg-yellow-500 text-black'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {alert.severity}
            </span>
            <span className="text-xs text-gray-500">
              Score: {alert.confluenceScore}/100
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">{alert.title}</h3>
          <p className="text-sm text-gray-400">{alert.description}</p>
        </div>
      </div>

      {/* Signals */}
      <div className="space-y-1 mb-3">
        {alert.signals.map((signal, i) => (
          <div key={i} className="text-xs text-gray-300 flex items-start gap-2">
            <span className="text-blue-400">▸</span>
            <span>{signal}</span>
          </div>
        ))}
      </div>

      {/* Data Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-900/50 p-2 rounded">
          <div className="text-gray-500">Funding APR</div>
          <div className={`font-mono font-semibold ${
            alert.data.fundingAPR > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {alert.data.fundingAPR > 0 ? '+' : ''}
            {alert.data.fundingAPR.toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-900/50 p-2 rounded">
          <div className="text-gray-500">OI Change</div>
          <div className={`font-mono font-semibold ${
            alert.data.oiChange > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {alert.data.oiChange > 0 ? '+' : ''}
            {alert.data.oiChange.toFixed(1)}%
          </div>
        </div>
        <div className="bg-gray-900/50 p-2 rounded">
          <div className="text-gray-500">CVD Trend</div>
          <div className={`font-mono font-semibold ${
            alert.data.cvdTrend === 'UP' ? 'text-green-400' :
            alert.data.cvdTrend === 'DOWN' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {alert.data.cvdTrend}
          </div>
        </div>
        <div className="bg-gray-900/50 p-2 rounded">
          <div className="text-gray-500">Price Δ</div>
          <div className={`font-mono font-semibold ${
            alert.data.priceChange > 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {alert.data.priceChange > 0 ? '+' : ''}
            {alert.data.priceChange.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-500 mt-2">
        {new Date(alert.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
