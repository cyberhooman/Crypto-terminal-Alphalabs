'use client';

import { useState } from 'react';
import { Bell, Settings } from 'lucide-react';
import ScreenerView from '@/components/screener/ScreenerView';
import AlertsView from '@/components/alerts/AlertsView';
import { useMarketStore } from '@/stores/useMarketStore';

export default function Home() {
  const [currentView, setCurrentView] = useState('screener');
  const confluenceAlerts = useMarketStore((state) => state.confluenceAlerts);

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* Top Navigation */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div className="text-2xl">🚀</div>
            <h1 className="text-xl font-bold text-white">Crypto Terminal</h1>
          </div>

          {/* Center: Navigation */}
          <nav className="flex items-center gap-2">
            <button
              onClick={() => setCurrentView('screener')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                currentView === 'screener'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              Screener
            </button>

            <button
              onClick={() => setCurrentView('alerts')}
              className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                currentView === 'alerts'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span>Alerts</span>
                {confluenceAlerts.length > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {confluenceAlerts.length > 99 ? '99+' : confluenceAlerts.length}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setCurrentView('settings')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                currentView === 'settings'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </div>
            </button>
          </nav>

          {/* Right: Live Status */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">Live</span>
          </div>
        </div>

        {/* Subtitle */}
        <div className="px-6 pb-3">
          <p className="text-sm text-gray-400">
            {currentView === 'screener' &&
              'Real-time funding rates, open interest, and CVD tracking'}
            {currentView === 'alerts' && 'Intelligent confluence detection for high-probability setups'}
            {currentView === 'settings' && 'Configure your terminal preferences'}
          </p>
        </div>
      </header>

      {/* View Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'screener' && <ScreenerView />}
        {currentView === 'alerts' && <AlertsView />}
        {currentView === 'settings' && <SettingsPlaceholder />}
      </div>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-6xl mb-4">⚙️</div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-gray-400">
          Customize your terminal experience
        </p>
      </div>
    </div>
  );
}
