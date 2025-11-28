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
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Minus, Database } from 'lucide-react';
import type { MarketData } from '@/lib/types';
import {
  formatNumber,
  formatCurrency,
  formatPercentage,
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
        header: 'Symbol',
        cell: ({ getValue }) => {
          const symbol = getValue() as string;
          const base = symbol.replace('USDT', '');
          return (
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--info))',
                  color: 'white'
                }}
              >
                {base.substring(0, 2)}
              </div>
              <div>
                <div className="font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {base}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  /USDT
                </div>
              </div>
            </div>
          );
        },
        size: 160,
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            ${formatPrice(getValue() as number)}
          </span>
        ),
        size: 130,
      },
      {
        accessorKey: 'priceChangePercent',
        header: '24h Change',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          const isPositive = value >= 0;
          return (
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
              )}
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}
              >
                {value >= 0 ? '+' : ''}
                {value.toFixed(2)}%
              </span>
            </div>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'quoteVolume',
        header: '24h Volume',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          return (
            <div>
              <div className="font-mono text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                ${formatNumber(value, 0)}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {value > 1e9 ? 'High Volume' : value > 1e8 ? 'Medium' : 'Low'}
              </div>
            </div>
          );
        },
        size: 140,
      },
      {
        accessorKey: 'fundingRate',
        header: 'Funding Rate',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          const absValue = Math.abs(value);
          const apr = value * 3 * 365;

          let bgColor, textColor, label;
          if (absValue > 0.0008) {
            bgColor = 'var(--danger-light)';
            textColor = 'var(--danger)';
            label = 'Extreme';
          } else if (absValue > 0.0004) {
            bgColor = 'var(--warning-light)';
            textColor = 'var(--warning)';
            label = 'High';
          } else {
            bgColor = 'var(--surface-elevated)';
            textColor = value > 0 ? 'var(--success)' : 'var(--info)';
            label = 'Normal';
          }

          return (
            <div className="flex items-center gap-2">
              <div
                className="px-2 py-1 rounded-md flex-1"
                style={{ background: bgColor }}
              >
                <div className="font-mono text-sm font-semibold" style={{ color: textColor }}>
                  {formatPercentage(value, 4)}
                </div>
                <div className="text-xs" style={{ color: textColor, opacity: 0.7 }}>
                  {apr >= 0 ? '+' : ''}{apr.toFixed(1)}% APR
                </div>
              </div>
            </div>
          );
        },
        size: 140,
      },
      {
        accessorKey: 'openInterestValue',
        header: 'Open Interest',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          if (value === 0) return (
            <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>
              —
            </span>
          );
          return (
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5" style={{ color: 'var(--info)' }} />
              <div>
                <div className="font-mono text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  ${formatNumber(value, 1)}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  8h
                </div>
              </div>
            </div>
          );
        },
        size: 140,
      },
      {
        accessorKey: 'cvd',
        header: 'CVD',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          const isPositive = value >= 0;
          const absValue = Math.abs(value);

          return (
            <div
              className="px-2 py-1 rounded-md"
              style={{
                background: isPositive ? 'var(--success-light)' : 'var(--danger-light)'
              }}
            >
              <div className="flex items-center gap-1.5">
                {isPositive ? (
                  <ArrowUp className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />
                )}
                <div className="flex-1">
                  <div
                    className="font-mono text-sm font-semibold"
                    style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}
                  >
                    {value >= 0 ? '+' : ''}
                    {formatNumber(value, 0)}
                  </div>
                  <div className="text-xs" style={{ color: isPositive ? 'var(--success)' : 'var(--danger)', opacity: 0.7 }}>
                    1h Delta
                  </div>
                </div>
              </div>
            </div>
          );
        },
        size: 130,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)'
            }}
          >
            <Database className="w-10 h-10" style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            No data available
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            Waiting for market data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto" style={{ background: 'var(--background)' }}>
      <table className="w-full border-collapse">
        <thead
          className="sticky top-0 z-10"
          style={{
            background: 'var(--surface)',
            borderBottom: '2px solid var(--border-light)'
          }}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-4 py-3.5 text-left cursor-pointer select-none transition-all group"
                  onClick={header.column.getToggleSortingHandler()}
                  style={{
                    width: header.getSize(),
                    color: 'var(--text-tertiary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  <div className="flex items-center gap-2">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getIsSorted() ? (
                      header.column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                      ) : (
                        <ArrowUp className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                      )
                    ) : (
                      <Minus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
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
              className="transition-all cursor-pointer group"
              style={{
                background: idx % 2 === 0 ? 'var(--surface)' : 'var(--background)',
                borderBottom: '1px solid var(--border)'
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className="px-4 py-3 transition-all"
                  style={{
                    borderLeft: cell.column.id === 'symbol' ? '2px solid transparent' : 'none'
                  }}
                >
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
