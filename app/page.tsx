'use client';

import { useState } from 'react';
import Sidebar from '@/components/ui/Sidebar';
import ScreenerView from '@/components/screener/ScreenerView';

export default function Home() {
  const [currentView, setCurrentView] = useState('screener');

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {currentView === 'screener' && 'Market Screener'}
                {currentView === 'charts' && 'Charts'}
                {currentView === 'alerts' && 'Alerts'}
                {currentView === 'settings' && 'Settings'}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {currentView === 'screener' &&
                  'Real-time funding rates, open interest, and CVD tracking'}
                {currentView === 'charts' && 'Advanced chart analysis'}
                {currentView === 'alerts' && 'Manage your market alerts'}
                {currentView === 'settings' && 'Configure your terminal'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-300">Live</span>
              </div>
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-hidden">
          {currentView === 'screener' && <ScreenerView />}
          {currentView === 'charts' && <ChartsPlaceholder />}
          {currentView === 'alerts' && <AlertsPlaceholder />}
          {currentView === 'settings' && <SettingsPlaceholder />}
        </div>
      </div>
    </div>
  );
}

function ChartsPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-6xl mb-4">📈</div>
        <h2 className="text-2xl font-bold mb-2">Charts View</h2>
        <p className="text-gray-400">
          Advanced charting coming soon
        </p>
      </div>
    </div>
  );
}

function AlertsPlaceholder() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-6xl mb-4">🔔</div>
        <h2 className="text-2xl font-bold mb-2">Alerts System</h2>
        <p className="text-gray-400">
          Set up custom alerts for funding rates, OI, and CVD
        </p>
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
