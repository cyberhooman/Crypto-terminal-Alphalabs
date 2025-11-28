'use client';

import { useState } from 'react';
import { Bell, Settings, Activity, Zap } from 'lucide-react';
import ScreenerView from '@/components/screener/ScreenerView';
import AlertsView from '@/components/alerts/AlertsView';
import { useMarketStore } from '@/stores/useMarketStore';

export default function Home() {
  const [currentView, setCurrentView] = useState('screener');
  const confluenceAlerts = useMarketStore((state) => state.confluenceAlerts);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--background)' }}>
      {/* Premium Header with Gradient */}
      <header
        className="relative border-b"
        style={{
          background: 'linear-gradient(135deg, var(--surface-elevated) 0%, var(--surface) 100%)',
          borderColor: 'var(--border)'
        }}
      >
        {/* Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{
          background: 'linear-gradient(90deg, transparent, var(--primary), transparent)'
        }} />

        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Brand Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--primary), var(--info))',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
                  }}
                >
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text" style={{ color: 'var(--text-primary)' }}>
                  Alphalabs Crypto Terminal
                </h1>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Professional Trading Intelligence
                </p>
              </div>
            </div>

            {/* Center Navigation - Tabs */}
            <nav className="flex items-center gap-1 p-1 rounded-xl" style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)'
            }}>
              <NavTab
                icon={<Activity className="w-4 h-4" />}
                label="Screener"
                active={currentView === 'screener'}
                onClick={() => setCurrentView('screener')}
              />

              <NavTab
                icon={<Bell className="w-4 h-4" />}
                label="Alerts"
                badge={confluenceAlerts.length}
                active={currentView === 'alerts'}
                onClick={() => setCurrentView('alerts')}
              />

              <NavTab
                icon={<Settings className="w-4 h-4" />}
                label="Settings"
                active={currentView === 'settings'}
                onClick={() => setCurrentView('settings')}
              />
            </nav>

            {/* Status Indicators */}
            <div className="flex items-center gap-3">
              <StatusIndicator />
            </div>
          </div>
        </div>

        {/* Context Bar */}
        <div className="px-8 pb-4">
          <div className="flex items-center gap-2">
            <div
              className="h-1 w-12 rounded-full"
              style={{ background: 'var(--primary)' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {currentView === 'screener' &&
                'Real-time funding rates, open interest, and CVD tracking across 200+ pairs'}
              {currentView === 'alerts' && 'Intelligent confluence detection for high-probability trading setups'}
              {currentView === 'settings' && 'Configure your terminal preferences and data sources'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full animate-fade-in">
          {currentView === 'screener' && <ScreenerView />}
          {currentView === 'alerts' && <AlertsView />}
          {currentView === 'settings' && <SettingsPlaceholder />}
        </div>
      </main>
    </div>
  );
}

function NavTab({
  icon,
  label,
  badge,
  active,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 flex items-center gap-2"
      style={{
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? 'white' : 'var(--text-secondary)',
      }}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold rounded-full"
          style={{
            background: active ? 'rgba(255, 255, 255, 0.2)' : 'var(--danger)',
            color: 'white'
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function StatusIndicator() {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2 rounded-lg"
      style={{
        background: 'var(--success-light)',
        border: '1px solid var(--success)'
      }}
    >
      <div
        className="w-2 h-2 rounded-full animate-pulse-glow"
        style={{
          background: 'var(--success)',
          boxShadow: '0 0 10px var(--success)'
        }}
      />
      <span className="text-sm font-semibold" style={{ color: 'var(--success)' }}>
        Live
      </span>
      <div className="h-3 w-px" style={{ background: 'var(--success)' }} />
      <span className="text-xs" style={{ color: 'var(--success-dark)' }}>
        Connected
      </span>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div
          className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)'
          }}
        >
          <Settings className="w-12 h-12" style={{ color: 'var(--primary)' }} />
        </div>
        <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          Terminal settings and configuration options will be available here.
        </p>
        <div className="mt-6 p-4 rounded-lg" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)'
        }}>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
            Coming soon: API configuration, alert preferences, display settings, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
