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
        cell: ({ getValue }) => (
          <span className="font-mono text-sm font-medium text-white">
            {(getValue() as string).replace('USDT', '/USDT')}
          </span>
        ),
        size: 140,
      },
      {
        accessorKey: 'price',
        header: 'Price',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-gray-200">
            ${formatPrice(getValue() as number)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'priceChangePercent',
        header: '24h %',
        cell: ({ getValue }) => {
          const value = getValue() as number;
          const color = value >= 0 ? 'text-green-400' : 'text-red-400';
          return (
            <span className={`font-mono text-sm font-medium ${color}`}>
              {value >= 0 ? '+' : ''}
              {value.toFixed(2)}%
            </span>
          );
        },
        size: 90,
      },
      {
        accessorKey: 'quoteVolume',
        header: '24h Volume',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-gray-300">
            ${formatNumber(getValue() as number, 0)}
          </span>
        ),
        size: 120,
      },
      {
        accessorKey: 'fundingRate',
        header: 'Funding',
        cell: ({ getValue }) => {
          const value = getValue() as number;
          const absValue = Math.abs(value);
          let color = 'text-gray-300';

          if (absValue > 0.0008) color = 'text-red-400 font-bold';
          else if (absValue > 0.0004) color = 'text-orange-400';
          else if (value > 0) color = 'text-green-400';
          else if (value < 0) color = 'text-blue-400';

          return (
            <span className={`font-mono text-sm ${color}`}>
              {formatPercentage(value, 4)}
            </span>
          );
        },
        size: 100,
      },
      {
        accessorKey: 'openInterestValue',
        header: 'Open Interest',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-gray-300">
            ${formatNumber(getValue() as number, 1)}
          </span>
        ),
        size: 130,
      },
      {
        accessorKey: 'cvd',
        header: 'CVD',
        cell: ({ getValue }) => {
          const value = getValue() as number;
          const color = value >= 0 ? 'text-green-400' : 'text-red-400';
          return (
            <span className={`font-mono text-sm ${color}`}>
              {value >= 0 ? '+' : ''}
              {formatNumber(value, 0)}
            </span>
          );
        },
        size: 110,
      },
      {
        accessorKey: 'buyVolume',
        header: 'Buy Vol',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-green-400">
            {formatNumber(getValue() as number, 0)}
          </span>
        ),
        size: 100,
      },
      {
        accessorKey: 'sellVolume',
        header: 'Sell Vol',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-red-400">
            {formatNumber(getValue() as number, 0)}
          </span>
        ),
        size: 100,
      },
      {
        id: 'buySellRatio',
        header: 'B/S Ratio',
        accessorFn: (row) => {
          if (row.sellVolume === 0) return 0;
          return row.buyVolume / row.sellVolume;
        },
        cell: ({ getValue }) => {
          const ratio = getValue() as number;
          const color = ratio > 1 ? 'text-green-400' : ratio < 1 ? 'text-red-400' : 'text-gray-400';
          return (
            <span className={`font-mono text-sm ${color}`}>
              {ratio.toFixed(2)}
            </span>
          );
        },
        size: 90,
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
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto bg-gray-950" style={{ contain: 'strict' }}>
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-gray-900 z-10 border-b border-gray-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-800/80 transition-colors select-none"
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ width: header.getSize() }}
                >
                  <div className="flex items-center gap-1.5">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {header.column.getIsSorted() && (
                      <span className="text-blue-400 text-sm">
                        {header.column.getIsSorted() === 'desc' ? '↓' : '↑'}
                      </span>
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
              className={`border-b border-gray-900 hover:bg-gray-900/50 transition-colors ${
                idx % 2 === 0 ? 'bg-gray-950' : 'bg-gray-950/50'
              }`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2.5">
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
