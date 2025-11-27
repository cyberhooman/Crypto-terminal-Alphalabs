'use client';

import { useMemo, useState } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import { useMarketData } from '@/hooks/useMarketData';
import DataTable from './DataTable';
import FilterPanel from './FilterPanel';
import ChartModal from '../charts/ChartModal';
import { Download, RefreshCw, CheckCircle } from 'lucide-react';
import type { MarketData } from '@/lib/types';

export default function ScreenerView() {
  const { marketData, isLoading } = useMarketData();
  const { activeFilter } = useMarketStore();
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Apply filters and search
  const filteredData = useMemo(() => {
    let data = marketData;

    // Apply search filter
    if (searchTerm) {
      data = data.filter((item) =>
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply active filter
    if (activeFilter) {
      data = data.filter((item) => {
        return activeFilter.conditions.every((condition) => {
          const value = item[condition.field] as number;
          const target = condition.value;

          switch (condition.operator) {
            case '>':
              return value > target;
            case '<':
              return value < target;
            case '>=':
              return value >= target;
            case '<=':
              return value <= target;
            case '=':
              return value === target;
            case '!=':
              return value !== target;
            default:
              return true;
          }
        });
      });
    }

    return data;
  }, [marketData, activeFilter, searchTerm]);

  const handleExportCSV = () => {
    setExportStatus('Exporting CSV...');

    const headers = [
      'Symbol',
      'Price',
      'Change %',
      'Volume',
      'Volume USD',
      'Funding Rate',
      'Open Interest',
      'OI Value',
      'CVD',
      'Buy Volume',
      'Sell Volume',
    ];

    const rows = filteredData.map((item) => [
      item.symbol,
      item.price,
      item.priceChangePercent,
      item.volume,
      item.quoteVolume,
      item.fundingRate,
      item.openInterest,
      item.openInterestValue,
      item.cvd,
      item.buyVolume,
      item.sellVolume,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto-terminal-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExportStatus('CSV Exported!');
    setTimeout(() => setExportStatus(null), 2000);
  };

  const handleExportJSON = () => {
    setExportStatus('Exporting JSON...');

    const json = JSON.stringify(filteredData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto-terminal-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportStatus('JSON Exported!');
    setTimeout(() => setExportStatus(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Loading Market Data
          </h2>
          <p className="text-gray-400">
            Initializing real-time data stream...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Filter Panel */}
      <FilterPanel searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* Stats Bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-gray-400">Showing: </span>
              <span className="text-white font-semibold">
                {filteredData.length}
              </span>
              <span className="text-gray-400"> / {marketData.length} pairs</span>
            </div>
            {activeFilter && (
              <div className="text-blue-400">
                Filter: <span className="font-semibold">{activeFilter.name}</span>
              </div>
            )}
            {searchTerm && (
              <div className="text-purple-400">
                Search: <span className="font-semibold">{searchTerm}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {exportStatus && (
              <div className="flex items-center gap-2 text-green-400 text-xs font-medium">
                <CheckCircle className="w-4 h-4" />
                {exportStatus}
              </div>
            )}
            <button
              onClick={handleExportCSV}
              disabled={!!exportStatus}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={!!exportStatus}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-3 h-3" />
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="flex-1 overflow-hidden">
        <DataTable
          data={filteredData}
          onSymbolClick={(symbol) => setSelectedSymbol(symbol)}
        />
      </div>

      {filteredData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 p-8 rounded-lg border border-gray-800 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Results Found</h3>
            <p className="text-gray-400">
              {searchTerm
                ? `No symbols matching "${searchTerm}"`
                : 'No data matches the current filter'}
            </p>
          </div>
        </div>
      )}

      {/* Chart Modal */}
      {selectedSymbol && (
        <ChartModal
          symbol={selectedSymbol}
          data={marketData.find((d) => d.symbol === selectedSymbol)!}
          onClose={() => setSelectedSymbol(null)}
        />
      )}
    </div>
  );
}
