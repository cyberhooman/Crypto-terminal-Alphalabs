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
import { ArrowUpDown } from 'lucide-react';
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
        header: 'Pair',
        cell: ({ getValue }) => {
          const symbol = getValue() as string;
          const base = symbol.replace('USDT', '');
          return (
            <div className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
              {base}<span style={{ color: 'var(--text-muted)' }}>/USDT</span>
            </div>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
            ${formatPrice(getValue() as number)}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: 'priceChangePercent',
        header: '24h %',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          const color = value >= 0 ? 'var(--green)' : 'var(--red)';
          return (
            <span className="font-mono text-sm" style={{ color }}>
              {value >= 0 ? '+' : ''}{value.toFixed(2)}%
            </span>
          );
        },
        size: 90,
      },
      {
        accessorKey: 'quoteVolume',
        header: 'Volume',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          return (
            <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
              ${formatNumber(value, 0)}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: 'fundingRate',
        header: 'Funding',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          const apr = value * 3 * 365;
          const color = Math.abs(value) > 0.0006
            ? 'var(--yellow)'
            : value > 0
            ? 'var(--green)'
            : 'var(--red)';

          return (
            <div>
              <div className="font-mono text-sm" style={{ color }}>
                {(value * 100).toFixed(4)}%
              </div>
              <div className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                {apr >= 0 ? '+' : ''}{apr.toFixed(1)}%
              </div>
            </div>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'openInterestValue',
        header: 'OI',
        cell: ({ getValue, row }) => {
          const value = (getValue() as number) || 0;
          const oi = row.original.openInterest || 0;

          if (value === 0 && oi === 0) {
            return (
              <span
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
                title="Open Interest data unavailable for this symbol"
              >
                N/A
              </span>
            );
          }

          return (
            <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
              ${formatNumber(value, 1)}
            </span>
          );
        },
        size: 110,
      },
      {
        accessorKey: 'cvd',
        header: 'CVD',
        cell: ({ getValue }) => {
          const value = (getValue() as number) || 0;
          const color = value >= 0 ? 'var(--green)' : 'var(--red)';
          return (
            <span className="font-mono text-sm" style={{ color }}>
              {value >= 0 ? '+' : ''}{formatNumber(value, 0)}
            </span>
          );
        },
        size: 100,
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No market data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead
          className="sticky top-0"
          style={{
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left cursor-pointer select-none"
                  onClick={header.column.getToggleSortingHandler()}
                  style={{
                    width: header.getSize(),
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    userSelect: 'none'
                  }}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      <ArrowUpDown size={12} style={{ color: 'var(--accent)' }} />
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
              className="cursor-pointer"
              style={{
                borderBottom: '1px solid var(--border-color)',
                background: idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-tertiary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = idx % 2 === 0 ? 'var(--bg-secondary)' : 'transparent';
              }}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2">
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
