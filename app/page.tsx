'use client';

import { useState, useEffect } from 'react';
import { Zap, Bell, Settings, Activity, Power } from 'lucide-react';
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
    <div className="flex items-center justify-center h-full terminal-grid">
      <div className="text-center animate-flicker-in">
        <div className="inline-block px-6 py-3 mb-4" style={{
          border: '2px solid var(--primary)',
          background: 'var(--bg-secondary)',
          boxShadow: '0 0 20px var(--accent-glow)',
        }}>
          <div className="font-mono text-sm font-bold" style={{ color: 'var(--accent)' }}>
            INITIALIZING TERMINAL...
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState('screener');
  const alerts = useMarketStore((state) => state.confluenceAlerts);

  return (
    <div className="flex flex-col h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Neo-Brutalist Header */}
      <header
        className="border-b-2 flex items-center justify-between px-6 h-14 animate-slide-in-left"
        style={{
          borderColor: 'var(--border-accent)',
          background: 'var(--bg-secondary)',
          boxShadow: '0 2px 0 var(--accent-glow)'
        }}
      >
        {/* Terminal Branding */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5"
            style={{
              border: '2px solid var(--primary)',
              background: 'var(--bg-tertiary)',
              boxShadow: '0 0 15px var(--accent-glow)'
            }}
          >
            <Zap className="w-5 h-5 animate-pulse-glow" style={{ color: 'var(--accent)' }} />
            <div className="font-display text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              ALPHALABS
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="font-mono text-xs font-semibold px-2 py-1" style={{
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              background: 'var(--bg-tertiary)'
            }}>
              FUTURES
            </div>
            <div className="font-mono text-xs font-semibold px-2 py-1" style={{
              color: 'var(--accent)',
              border: '1px solid var(--primary)',
              background: 'var(--bg-tertiary)'
            }}>
              LIVE
            </div>
          </div>
        </div>

        {/* Sharp Navigation */}
        <nav className="flex items-center gap-2">
          <NavButton
            icon={<Activity size={18} />}
            label="SCREENER"
            active={view === 'screener'}
            onClick={() => setView('screener')}
          />
          <NavButton
            icon={<Bell size={18} />}
            label="ALERTS"
            badge={alerts.length}
            active={view === 'alerts'}
            onClick={() => setView('alerts')}
          />
          <NavButton
            icon={<Settings size={18} />}
            label="SETTINGS"
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
