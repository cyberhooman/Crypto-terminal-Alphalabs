'use client';

import { useEffect, useRef, useState } from 'react';
import { X, TrendingUp, BarChart3, Clock, DollarSign } from 'lucide-react';
import type { MarketData } from '@/lib/types';
import { formatPrice, formatPercentage, formatNumber } from '@/lib/utils/formatters';

interface ChartModalProps {
  symbol: string;
  data: MarketData;
  onClose: () => void;
}

export default function ChartModal({ symbol, data, onClose }: ChartModalProps) {
  const [timeframe, setTimeframe] = useState('1h');
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Generate mock candlestick data
    const candles = generateMockCandles(data.price, 50);

    // Draw chart
    if (chartType === 'candlestick') {
      drawCandlestickChart(ctx, candles, rect.width, rect.height);
    } else {
      drawLineChart(ctx, candles, rect.width, rect.height);
    }

    // Draw grid
    drawGrid(ctx, rect.width, rect.height);
  }, [data, chartType, timeframe]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-950 rounded-xl border border-gray-800 w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">
              {symbol.replace('USDT', '/USDT')}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-mono text-white">
                ${formatPrice(data.price)}
              </span>
              <span
                className={`text-lg font-semibold ${
                  data.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {data.priceChangePercent >= 0 ? '+' : ''}
                {data.priceChangePercent.toFixed(2)}%
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-gray-800 bg-gray-900/50">
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="24h Volume"
            value={`$${formatNumber(data.quoteVolume, 0)}`}
            color="text-blue-400"
          />
          <StatCard
            icon={<BarChart3 className="w-4 h-4" />}
            label="Open Interest"
            value={`$${formatNumber(data.openInterestValue, 0)}`}
            color="text-purple-400"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Funding Rate"
            value={formatPercentage(data.fundingRate, 4)}
            color={data.fundingRate >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <StatCard
            icon={<DollarSign className="w-4 h-4" />}
            label="CVD"
            value={formatNumber(data.cvd, 0)}
            color={data.cvd >= 0 ? 'text-green-400' : 'text-red-400'}
          />
        </div>

        {/* Chart Controls */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex gap-2">
            {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setChartType('candlestick')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                chartType === 'candlestick'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Candlesticks
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                chartType === 'line'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Line
            </button>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-4 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded-lg"
            style={{ imageRendering: 'crisp-edges' }}
          />
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">High 24h:</span>
              <span className="text-white ml-2 font-mono">
                ${formatPrice(data.high)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Low 24h:</span>
              <span className="text-white ml-2 font-mono">
                ${formatPrice(data.low)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Buy Volume:</span>
              <span className="text-green-400 ml-2 font-mono">
                {formatNumber(data.buyVolume, 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Sell Volume:</span>
              <span className="text-red-400 ml-2 font-mono">
                {formatNumber(data.sellVolume, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
      <div className={`${color}`}>{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className={`text-sm font-semibold ${color}`}>{value}</div>
      </div>
    </div>
  );
}

// Generate mock candlestick data
function generateMockCandles(currentPrice: number, count: number) {
  const candles = [];
  let price = currentPrice * 0.95;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * currentPrice * 0.02;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    candles.push({ open, high, low, close, volume: Math.random() * 1000000 });
    price = close;
  }

  return candles;
}

// Draw candlestick chart
function drawCandlestickChart(
  ctx: CanvasRenderingContext2D,
  candles: any[],
  width: number,
  height: number
) {
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Calculate price range
  const prices = candles.flatMap((c) => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  const candleWidth = chartWidth / candles.length;
  const bodyWidth = Math.max(candleWidth * 0.7, 2);

  candles.forEach((candle, i) => {
    const x = padding + i * candleWidth + candleWidth / 2;
    const isGreen = candle.close >= candle.open;

    // Calculate Y positions
    const openY =
      padding + chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight;
    const closeY =
      padding + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight;
    const highY =
      padding + chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight;
    const lowY =
      padding + chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight;

    // Draw wick
    ctx.strokeStyle = isGreen ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    // Draw body
    ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
    const bodyHeight = Math.abs(closeY - openY);
    const bodyY = Math.min(openY, closeY);
    ctx.fillRect(x - bodyWidth / 2, bodyY, bodyWidth, Math.max(bodyHeight, 1));
  });
}

// Draw line chart
function drawLineChart(
  ctx: CanvasRenderingContext2D,
  candles: any[],
  width: number,
  height: number
) {
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const prices = candles.map((c) => c.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();

  candles.forEach((candle, i) => {
    const x = padding + (i / (candles.length - 1)) * chartWidth;
    const y =
      padding + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.stroke();

  // Fill area under line
  ctx.lineTo(padding + chartWidth, padding + chartHeight);
  ctx.lineTo(padding, padding + chartHeight);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = gradient;
  ctx.fill();
}

// Draw grid
function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const padding = 40;
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1;

  // Horizontal lines
  for (let i = 0; i <= 5; i++) {
    const y = padding + (i * (height - padding * 2)) / 5;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  // Vertical lines
  for (let i = 0; i <= 10; i++) {
    const x = padding + (i * (width - padding * 2)) / 10;
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
  }
}
