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
      className="relative flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold tracking-wide transition-all"
      style={{
        background: active ? 'var(--primary)' : 'var(--bg-tertiary)',
        color: active ? '#000000' : 'var(--text-secondary)',
        border: `2px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
        borderRadius: '0',
        boxShadow: active ? '0 0 15px var(--accent-glow), inset 0 0 20px rgba(0, 0, 0, 0.2)' : 'none',
        transform: active ? 'translateY(-1px)' : 'none'
      }}
    >
      {icon}
      <span>{label}</span>
      {badge > 0 && (
        <span
          className="absolute -top-2 -right-2 px-1.5 py-0.5 text-xs font-bold animate-pulse-glow"
          style={{
            background: 'var(--danger)',
            color: '#ffffff',
            border: '2px solid var(--danger-dark)',
            minWidth: '20px',
            textAlign: 'center',
            boxShadow: '0 0 10px rgba(255, 0, 80, 0.5)'
          }}
        >
          {badge > 99 ? '99' : badge}
        </span>
      )}
    </button>
  );
}

function ConnectionStatus() {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5" style={{
      border: '2px solid var(--success)',
      background: 'var(--bg-tertiary)',
      boxShadow: '0 0 10px rgba(0, 255, 159, 0.2)'
    }}>
      <Power className="w-4 h-4 animate-pulse-glow" style={{ color: 'var(--success)' }} />
      <span className="font-mono text-xs font-bold tracking-wide" style={{ color: 'var(--success)' }}>
        ONLINE
      </span>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="flex items-center justify-center h-full terminal-grid">
      <div className="text-center animate-scale-in">
        <div className="inline-block p-8 mb-6" style={{
          border: '2px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}>
          <Settings
            size={64}
            style={{
              color: 'var(--text-muted)',
            }}
          />
        </div>
        <div className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          SETTINGS PANEL
        </div>
        <div className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          Configuration options will appear here
        </div>
      </div>
    </div>
  );
}
