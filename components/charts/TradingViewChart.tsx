'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type CandlestickSeriesPartialOptions, type LineSeriesPartialOptions, type AreaSeriesPartialOptions } from 'lightweight-charts';
import { X, TrendingUp, BarChart3, Clock, DollarSign, Maximize2 } from 'lucide-react';
import type { MarketData } from '@/lib/types';
import { formatPrice, formatPercentage, formatNumber } from '@/lib/utils/formatters';

interface TradingViewChartProps {
  symbol: string;
  data: MarketData;
  onClose: () => void;
}

export default function TradingViewChart({ symbol, data, onClose }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [timeframe, setTimeframe] = useState('1h');
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const [isLoading, setIsLoading] = useState(true);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#374151',
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6b7280',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1f2937',
        },
        horzLine: {
          color: '#6b7280',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1f2937',
        },
      },
    });

    chartRef.current = chart;

    // Handle window resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Generate and set chart data
    setTimeout(() => {
      updateChartData();
      setIsLoading(false);
    }, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart when type or timeframe changes
  useEffect(() => {
    if (chartRef.current) {
      updateChartData();
    }
  }, [chartType, timeframe, data]);

  const updateChartData = () => {
    if (!chartRef.current) return;

    // Clear existing series
    const chart = chartRef.current;

    // Generate mock data based on timeframe
    const candleData = generateCandleData(data.price, timeframe, 100);

    if (chartType === 'candlestick') {
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
      });
      candlestickSeries.setData(candleData);
    } else {
      const lineSeries = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
      });
      const lineData = candleData.map(c => ({
        time: c.time,
        value: c.close,
      }));
      lineSeries.setData(lineData);

      // Add area
      chart.addAreaSeries({
        topColor: 'rgba(59, 130, 246, 0.4)',
        bottomColor: 'rgba(59, 130, 246, 0.0)',
        lineColor: 'rgba(59, 130, 246, 0)',
      }).setData(lineData);
    }

    chart.timeScale().fitContent();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-gray-950 rounded-xl border border-gray-800 w-full max-w-[95vw] h-[95vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {symbol.replace('USDT', '/USDT')}
              <span className="text-sm text-gray-500 font-normal">Perpetual</span>
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono text-white">
                ${formatPrice(data.price)}
              </span>
              <span
                className={`text-lg font-semibold px-3 py-1 rounded-lg ${
                  data.priceChangePercent >= 0
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-red-400 bg-red-400/10'
                }`}
              >
                {data.priceChangePercent >= 0 ? '+' : ''}
                {data.priceChangePercent.toFixed(2)}%
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors group"
          >
            <X className="w-6 h-6 text-gray-400 group-hover:text-white" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 border-b border-gray-800 bg-gray-900/30">
          <StatCard
            label="24h Volume"
            value={`$${formatNumber(data.quoteVolume, 0)}`}
            change={null}
            color="text-blue-400"
          />
          <StatCard
            label="Open Interest"
            value={`$${formatNumber(data.openInterestValue, 0)}`}
            change={null}
            color="text-purple-400"
          />
          <StatCard
            label="Funding Rate"
            value={`${(data.fundingRate * 100).toFixed(4)}%`}
            change={`${((data.fundingRate * 365 * 3) * 100).toFixed(1)}% APR`}
            color={data.fundingRate >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <StatCard
            label="CVD"
            value={formatNumber(data.cvd, 0)}
            change={data.cvd >= 0 ? 'Bullish' : 'Bearish'}
            color={data.cvd >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <StatCard
            label="24h High/Low"
            value={`$${formatPrice(data.high)}`}
            change={`$${formatPrice(data.low)}`}
            color="text-gray-400"
          />
        </div>

        {/* Chart Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900/20">
          {/* Timeframes */}
          <div className="flex gap-1">
            {['1m', '5m', '15m', '30m', '1h', '4h', '12h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Type */}
          <div className="flex gap-1">
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                chartType === 'candlestick'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Candles
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                chartType === 'line'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Line
            </button>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-4 overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
              <div className="text-white text-lg">Loading chart...</div>
            </div>
          )}
          <div ref={chartContainerRef} className="w-full h-full rounded-lg" />
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex justify-between items-center p-2 bg-gray-800/30 rounded">
              <span className="text-gray-500">Buy Volume:</span>
              <span className="text-green-400 font-mono font-semibold">
                {formatNumber(data.buyVolume, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-800/30 rounded">
              <span className="text-gray-500">Sell Volume:</span>
              <span className="text-red-400 font-mono font-semibold">
                {formatNumber(data.sellVolume, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-800/30 rounded">
              <span className="text-gray-500">24h Trades:</span>
              <span className="text-white font-mono font-semibold">
                {formatNumber(data.trades, 0)}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-800/30 rounded">
              <span className="text-gray-500">Buy/Sell Ratio:</span>
              <span className={`font-mono font-semibold ${
                data.buyVolume > data.sellVolume ? 'text-green-400' : 'text-red-400'
              }`}>
                {(data.buyVolume / (data.sellVolume || 1)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  color,
}: {
  label: string;
  value: string;
  change: string | null;
  color: string;
}) {
  return (
    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-800/50">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-lg font-semibold font-mono ${color}`}>{value}</div>
      {change && (
        <div className="text-xs text-gray-600 mt-1">{change}</div>
      )}
    </div>
  );
}

// Generate realistic candlestick data
function generateCandleData(currentPrice: number, timeframe: string, count: number) {
  const data = [];
  const timeframeMinutes = getTimeframeMinutes(timeframe);
  const now = Math.floor(Date.now() / 1000);

  let price = currentPrice * (0.95 + Math.random() * 0.1);

  for (let i = count; i >= 0; i--) {
    const timestamp = now - (i * timeframeMinutes * 60);
    const volatility = currentPrice * 0.015;

    const open = price;
    const change = (Math.random() - 0.48) * volatility;
    const close = price + change;

    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low = Math.min(open, close) * (1 - Math.random() * 0.005);

    data.push({
      time: timestamp as any,
      open,
      high,
      low,
      close,
    });

    price = close;
  }

  return data;
}

function getTimeframeMinutes(timeframe: string): number {
  const map: { [key: string]: number } = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    '12h': 720,
    '1d': 1440,
  };
  return map[timeframe] || 60;
}
