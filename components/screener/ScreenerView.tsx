'use client';

import { useMemo, useState } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import { useMarketData } from '@/hooks/useMarketData';
import DataTable from './DataTable';
import FilterPanel from './FilterPanel';
import { Download, RefreshCw, CheckCircle } from 'lucide-react';
import type { MarketData } from '@/lib/types';

export default function ScreenerView() {
  const { marketData, isLoading } = useMarketData();
  const { activeFilter } = useMarketStore();
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
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Loading Market Data
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
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
      <div
        className="border-b px-4 py-2"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)'
        }}
      >
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Showing: </span>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {filteredData.length}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}> / {marketData.length} pairs</span>
            </div>
            {activeFilter && (
              <div style={{ color: 'var(--accent)' }}>
                Filter: <span className="font-semibold">{activeFilter.name}</span>
              </div>
            )}
            {searchTerm && (
              <div style={{ color: 'var(--info)' }}>
                Search: <span className="font-semibold">{searchTerm}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {exportStatus && (
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--success)' }}>
                <CheckCircle className="w-4 h-4" />
                {exportStatus}
              </div>
            )}
            <button
              onClick={handleExportCSV}
              disabled={!!exportStatus}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => {
                if (!exportStatus) {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={!!exportStatus}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => {
                if (!exportStatus) {
                  e.currentTarget.style.background = 'var(--bg-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
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
        />
      </div>

      {/* Only show "No Results Found" after data has loaded and filters/search returned no matches */}
      {!isLoading && marketData.length > 0 && filteredData.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.5)' }}>
          <div
            className="p-8 rounded-lg text-center"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No Results Found
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              {searchTerm
                ? `No symbols matching "${searchTerm}"`
                : 'No data matches the current filter'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
