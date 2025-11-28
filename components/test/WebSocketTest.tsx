'use client';

import { useBinanceWebSocket } from '@/hooks/useBinanceWebSocket';

/**
 * Test component to verify WebSocket connection works
 *
 * Usage:
 * 1. Import this component in any page
 * 2. Add <WebSocketTest /> to the JSX
 * 3. Check browser console and UI for connection status
 */
export default function WebSocketTest() {
  const { marketData, isConnected, lastUpdate } = useBinanceWebSocket();

  // Get top 10 pairs by volume
  const topPairs = marketData
    .sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0))
    .slice(0, 10);

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-md shadow-lg z-50">
      <h3 className="text-lg font-bold text-white mb-2">
        WebSocket Test
      </h3>

      {/* Connection Status */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-300">
            {isConnected ? 'Connected to Binance' : 'Disconnected'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Last Update: {new Date(lastUpdate).toLocaleTimeString()}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-800 rounded p-2">
          <p className="text-xs text-gray-500">Total Pairs</p>
          <p className="text-xl font-bold text-white">{marketData.length}</p>
        </div>
        <div className="bg-gray-800 rounded p-2">
          <p className="text-xs text-gray-500">Updates/sec</p>
          <p className="text-xl font-bold text-green-400">
            {isConnected ? '~2' : '0'}
          </p>
        </div>
      </div>

      {/* Top Pairs */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Top 10 by Volume:</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {topPairs.map((pair) => (
            <div
              key={pair.symbol}
              className="flex items-center justify-between bg-gray-800 rounded px-2 py-1"
            >
              <span className="text-xs font-mono text-gray-300">
                {pair.symbol?.replace('USDT', '/USDT')}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-white">
                  ${pair.price?.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-mono ${
                    (pair.priceChangePercent || 0) >= 0
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {(pair.priceChangePercent || 0) >= 0 ? '+' : ''}
                  {pair.priceChangePercent?.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      {!isConnected && (
        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded">
          <p className="text-xs text-yellow-400">
            ⚠️ WebSocket not connected. Check browser console for errors.
          </p>
        </div>
      )}
    </div>
  );
}
