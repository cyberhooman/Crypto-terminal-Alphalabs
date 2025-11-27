// Utility functions for formatting data

export function formatNumber(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1e9) {
    return (value / 1e9).toFixed(decimals) + 'B';
  }
  if (Math.abs(value) >= 1e6) {
    return (value / 1e6).toFixed(decimals) + 'M';
  }
  if (Math.abs(value) >= 1e3) {
    return (value / 1e3).toFixed(decimals) + 'K';
  }
  return value.toFixed(decimals);
}

export function formatCurrency(value: number, decimals: number = 2): string {
  return '$' + formatNumber(value, decimals);
}

export function formatPercentage(value: number, decimals: number = 4): string {
  return (value * 100).toFixed(decimals) + '%';
}

export function formatPrice(value: number): string {
  if (value >= 1000) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  if (value >= 0.01) return value.toFixed(6);
  return value.toFixed(8);
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return seconds + 's ago';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

export function getChangeColor(value: number): string {
  if (value > 0) return 'text-green-500';
  if (value < 0) return 'text-red-500';
  return 'text-gray-400';
}

export function getFundingRateColor(rate: number): string {
  const absRate = Math.abs(rate);
  if (absRate > 0.001) return 'text-red-500 font-bold'; // Very high
  if (absRate > 0.0005) return 'text-orange-500'; // High
  if (rate > 0) return 'text-green-500'; // Positive
  if (rate < 0) return 'text-blue-500'; // Negative
  return 'text-gray-400';
}

export function getCVDColor(cvd: number): string {
  if (cvd > 0) return 'text-green-500';
  if (cvd < 0) return 'text-red-500';
  return 'text-gray-400';
}
