'use client';

import { useEffect, useRef, useState } from 'react';
import { X, TrendingUp, TrendingDown, BarChart3, Clock, DollarSign, Maximize2, Download } from 'lucide-react';
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
    ctx.fillStyle = '#0a0b0d';
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

  const base = symbol.replace('USDT', '');
  const isPositive = data.priceChangePercent >= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-fade-in"
      style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-7xl h-[92vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl animate-slide-in-right"
        style={{
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border-light)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium Header */}
        <div
          className="relative px-6 py-5 border-b"
          style={{
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-elevated) 100%)',
            borderColor: 'var(--border-light)'
          }}
        >
          <div className="flex items-center justify-between">
            {/* Symbol & Price */}
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--info))',
                  color: 'white',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
                }}
              >
                {base.substring(0, 2)}
              </div>
              <div>
                <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {base}
                  <span style={{ color: 'var(--text-tertiary)' }}>/USDT</span>
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-3xl font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                    ${formatPrice(data.price)}
                  </span>
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-lg"
                    style={{
                      background: isPositive ? 'var(--success-light)' : 'var(--danger-light)'
                    }}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-4 h-4" style={{ color: 'var(--success)' }} />
                    ) : (
                      <TrendingDown className="w-4 h-4" style={{ color: 'var(--danger)' }} />
                    )}
                    <span
                      className="text-lg font-semibold"
                      style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}
                    >
                      {data.priceChangePercent >= 0 ? '+' : ''}
                      {data.priceChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                className="p-2.5 rounded-lg transition-all"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)'
                }}
                title="Fullscreen"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              <button
                className="p-2.5 rounded-lg transition-all"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)'
                }}
                title="Export"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2.5 rounded-lg transition-all"
                style={{
                  background: 'var(--danger-light)',
                  border: '1px solid var(--danger)',
                  color: 'var(--danger)'
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 border-b"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)'
          }}
        >
          <MetricCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="24h Volume"
            value={`$${formatNumber(data.quoteVolume, 0)}`}
            color="primary"
          />
          <MetricCard
            icon={<BarChart3 className="w-4 h-4" />}
            label="Open Interest"
            value={`$${formatNumber(data.openInterestValue, 0)}`}
            color="info"
          />
          <MetricCard
            icon={<Clock className="w-4 h-4" />}
            label="Funding Rate"
            value={formatPercentage(data.fundingRate, 4)}
            color={data.fundingRate >= 0 ? 'success' : 'danger'}
          />
          <MetricCard
            icon={<DollarSign className="w-4 h-4" />}
            label="CVD"
            value={formatNumber(data.cvd, 0)}
            color={data.cvd >= 0 ? 'success' : 'danger'}
          />
        </div>

        {/* Chart Controls */}
        <div
          className="flex items-center justify-between px-6 py-3 border-b"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)'
          }}
        >
          {/* Timeframes */}
          <div className="flex gap-1.5">
            {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg transition-all"
                style={{
                  background: timeframe === tf ? 'var(--primary)' : 'var(--surface-elevated)',
                  color: timeframe === tf ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${timeframe === tf ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart Type */}
          <div className="flex gap-1.5">
            <button
              onClick={() => setChartType('candlestick')}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg transition-all"
              style={{
                background: chartType === 'candlestick' ? 'var(--primary)' : 'var(--surface-elevated)',
                color: chartType === 'candlestick' ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${chartType === 'candlestick' ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              Candlesticks
            </button>
            <button
              onClick={() => setChartType('line')}
              className="px-4 py-1.5 text-sm font-semibold rounded-lg transition-all"
              style={{
                background: chartType === 'line' ? 'var(--primary)' : 'var(--surface-elevated)',
                color: chartType === 'line' ? 'white' : 'var(--text-secondary)',
                border: `1px solid ${chartType === 'line' ? 'var(--primary)' : 'var(--border)'}`,
              }}
            >
              Line
            </button>
          </div>
        </div>

        {/* Chart Area */}
        <div className="flex-1 p-6 overflow-hidden" style={{ background: 'var(--background)' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full rounded-xl"
            style={{
              imageRendering: 'crisp-edges',
              border: '1px solid var(--border)'
            }}
          />
        </div>

        {/* Footer Stats */}
        <div
          className="px-6 py-4 border-t"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <FooterStat label="High 24h" value={`$${formatPrice(data.high)}`} />
            <FooterStat label="Low 24h" value={`$${formatPrice(data.low)}`} />
            <FooterStat
              label="Buy Volume"
              value={formatNumber(data.buyVolume, 0)}
              color="success"
            />
            <FooterStat
              label="Sell Volume"
              value={formatNumber(data.sellVolume, 0)}
              color="danger"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'primary' | 'success' | 'danger' | 'info';
}) {
  const colorMap = {
    primary: 'var(--primary)',
    success: 'var(--success)',
    danger: 'var(--danger)',
    info: 'var(--info)',
  };

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)'
      }}
    >
      <div style={{ color: colorMap[color] }}>{icon}</div>
      <div>
        <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </div>
        <div className="text-sm font-bold" style={{ color: colorMap[color] }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function FooterStat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: 'success' | 'danger';
}) {
  const textColor = color
    ? color === 'success'
      ? 'var(--success)'
      : 'var(--danger)'
    : 'var(--text-primary)';

  return (
    <div>
      <span style={{ color: 'var(--text-tertiary)' }}>{label}:</span>
      <span className="ml-2 font-mono font-semibold" style={{ color: textColor }}>
        {value}
      </span>
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
    ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    // Draw body
    ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
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
  ctx.strokeStyle = '#2a2d35';
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
