'use client';

import { useState, useEffect } from 'react';
import { Bell, Settings, Activity } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMarketStore } from '@/stores/useMarketStore';

const ScreenerView = dynamic(() => import('@/components/screener/ScreenerView'), {
  ssr: false,
  loading: () => <LoadingState />
});

const AlertsView = dynamic(() => import('@/components/alerts/AlertsView'), {
  ssr: false,
  loading: () => <LoadingState />
});

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState('screener');
  const alerts = useMarketStore((state) => state.confluenceAlerts);

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="border-b flex items-center justify-between px-4 h-12"
        style={{
          borderColor: 'var(--border-color)',
          background: 'var(--bg-secondary)'
        }}
      >
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Crypto Terminal
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Futures
          </div>
        </div>

        <nav className="flex items-center gap-1">
          <NavButton
            icon={<Activity size={16} />}
            label="Screener"
            active={view === 'screener'}
            onClick={() => setView('screener')}
          />
          <NavButton
            icon={<Bell size={16} />}
            label="Alerts"
            badge={alerts.length}
            active={view === 'alerts'}
            onClick={() => setView('alerts')}
          />
          <NavButton
            icon={<Settings size={16} />}
            label="Settings"
            active={view === 'settings'}
            onClick={() => setView('settings')}
          />
        </nav>

        <ConnectionStatus />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {view === 'screener' && <ScreenerView />}
        {view === 'alerts' && <AlertsView />}
        {view === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

function NavButton({ icon, label, badge, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium transition-colors"
      style={{
        background: active ? 'var(--bg-tertiary)' : 'transparent',
        color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
        border: active ? '1px solid var(--border-hover)' : '1px solid transparent',
        borderRadius: '4px'
      }}
    >
      {icon}
      <span>{label}</span>
      {badge > 0 && (
        <span
          className="px-1.5 py-0.5 text-xs rounded"
          style={{
            background: 'var(--red)',
            color: 'white',
            minWidth: '18px',
            textAlign: 'center'
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

function ConnectionStatus() {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: 'var(--green)' }}
      />
      <span style={{ color: 'var(--text-secondary)' }}>Connected</span>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <Settings
          size={48}
          style={{
            color: 'var(--text-muted)',
            margin: '0 auto 16px'
          }}
        />
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Settings panel
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Configuration options will appear here
        </div>
      </div>
    </div>
  );
}
