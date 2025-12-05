'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import type { MarketData } from '@/lib/types';
import {
  formatNumber,
  formatPrice,
} from '@/lib/utils/formatters';

interface DataTableProps {
  data: MarketData[];
}

export default function DataTable({ data }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'quoteVolume', desc: true },
  ]);

  const columns = useMemo<ColumnDef<MarketData>[]>(
    () => [
      {
        accessorKey: 'symbol',
        header: 'PAIR',
        cell: ({ getValue }) => {
          const symbol = getValue() as string;
          const base = symbol.replace('USDT', '');
          return (
            <div className="flex items-center gap-2">
              <div className="font-mono text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {base}
              </div>
              <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>/USDT</span>
            </div>
          );
        },
        size: 130,
      },
      {
        accessorKey: 'price',
        header: 'PRICE',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            ${formatPrice(getValue() as number)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'priceChangePercent',
        header: '24H CHANGE',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          const isPositive = value >= 0;
          const color = isPositive ? 'var(--success)' : 'var(--danger)';
          return (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" style={{ color }} />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" style={{ color }} />
              )}
              <span className="font-mono text-sm font-bold" style={{
                color,
                textShadow: isPositive ? '0 0 6px rgba(0, 255, 159, 0.3)' : '0 0 6px rgba(255, 0, 80, 0.3)'
              }}>
                {value >= 0 ? '+' : ''}{value.toFixed(2)}%
              </span>
            </div>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'quoteVolume',
        header: 'VOLUME 24H',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          return (
            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              ${formatNumber(value, 0)}
            </span>
          );
        },
        size: 130,
      },
      {
        accessorKey: 'fundingRate',
        header: 'FUNDING',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          const apr = value * 3 * 365;
          const isExtreme = Math.abs(value) > 0.0006;
          const color = isExtreme
            ? 'var(--warning)'
            : value > 0
            ? 'var(--success)'
            : 'var(--danger)';

          return (
            <div className="space-y-0.5">
              <div className="font-mono text-sm font-bold" style={{
                color,
                textShadow: isExtreme ? '0 0 6px rgba(255, 229, 0, 0.4)' : undefined
              }}>
                {(value * 100).toFixed(4)}%
              </div>
              <div className="font-mono text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                APR: {apr >= 0 ? '+' : ''}{apr.toFixed(1)}%
              </div>
            </div>
          );
        },
        size: 110,
      },
      {
        accessorKey: 'openInterestValue',
        header: 'OPEN INTEREST',
        cell: ({ getValue, row }) => {
          const value = (getValue() as number) || 0;
          const oi = row.original.openInterest || 0;

          if (value === 0 && oi === 0) {
            return (
              <span
                className="font-mono text-xs font-bold px-2 py-1"
                style={{
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-tertiary)'
                }}
                title="Open Interest data unavailable for this symbol"
              >
                N/A
              </span>
            );
          }

          return (
            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--info)' }}>
              ${formatNumber(value, 1)}
            </span>
          );
        },
        size: 130,
      },
      {
        accessorKey: 'cvd',
        header: 'CVD',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          const isPositive = value >= 0;
          const color = isPositive ? 'var(--success)' : 'var(--danger)';
          return (
            <span className="font-mono text-sm font-bold" style={{
              color,
              textShadow: isPositive ? '0 0 6px rgba(0, 255, 159, 0.3)' : '0 0 6px rgba(255, 0, 80, 0.3)'
            }}>
              {value >= 0 ? '+' : ''}{formatNumber(value, 0)}
            </span>
          );
        },
        size: 110,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full terminal-grid">
        <div className="text-center animate-scale-in">
          <div className="inline-block p-8 mb-4" style={{
            border: '2px solid var(--border)',
            background: 'var(--bg-secondary)',
          }}>
            <div className="text-4xl">📊</div>
          </div>
          <div className="font-display text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            NO MARKET DATA
          </div>
          <div className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
            Waiting for market feed...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead
          className="sticky top-0 z-10"
          style={{
            background: 'var(--bg-secondary)',
            borderBottom: '2px solid var(--border-accent)',
            boxShadow: '0 2px 0 var(--accent-glow)'
          }}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3 text-left cursor-pointer select-none group"
                  onClick={header.column.getToggleSortingHandler()}
                  style={{
                    width: header.getSize(),
                    color: 'var(--text-secondary)',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.05em',
                    userSelect: 'none',
                    transition: 'all 0.1s'
                  }}
                >
                  <div className="flex items-center gap-2 group-hover:text-[var(--accent)]">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      <ArrowUpDown size={14} style={{ color: 'var(--accent)' }} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, idx) => (
            <tr
              key={row.id}
              className="cursor-pointer group animate-fade-in"
              style={{
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                transition: 'all 0.1s cubic-bezier(0.16, 1, 0.3, 1)',
                animationDelay: `${idx * 0.01}s`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--surface-hover)';
                e.currentTarget.style.borderLeftColor = 'var(--accent)';
                e.currentTarget.style.borderLeftWidth = '3px';
                e.currentTarget.style.boxShadow = '0 0 15px var(--accent-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-primary)';
                e.currentTarget.style.borderLeftColor = 'transparent';
                e.currentTarget.style.borderLeftWidth = '0px';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
