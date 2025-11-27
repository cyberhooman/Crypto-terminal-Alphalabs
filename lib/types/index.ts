// Core types for the crypto terminal

export interface Symbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
}

export interface FundingRate {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  markPrice: number;
  nextFundingTime: number;
}

export interface OpenInterest {
  symbol: string;
  openInterest: number;
  openInterestValue: number;
  timestamp: number;
}

export interface CVDData {
  symbol: string;
  cvd: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  timestamp: number;
}

export interface TickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  high: number;
  low: number;
  trades: number;
}

export interface MarketData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  fundingRate: number;
  nextFundingTime: number;
  openInterest: number;
  openInterestValue: number;
  cvd: number;
  buyVolume: number;
  sellVolume: number;
  high: number;
  low: number;
  trades: number;
  lastUpdate: number;
}

export interface FilterCondition {
  field: keyof MarketData;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  value: number;
}

export interface Filter {
  id: string;
  name: string;
  conditions: FilterCondition[];
  exchanges?: string[];
  quoteCurrency?: string[];
}

export interface Alert {
  id: string;
  symbol: string;
  condition: FilterCondition;
  triggered: boolean;
  createdAt: number;
  triggeredAt?: number;
  message: string;
  enabled: boolean;
}

export interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
  width?: number;
  format?: 'number' | 'percentage' | 'currency' | 'datetime';
}

export interface Settings {
  updateSpeed: number; // seconds
  showNotionalValue: boolean;
  theme: 'dark' | 'light';
  columns: ColumnConfig[];
  soundEnabled: boolean;
  autoRefresh: boolean;
}

export interface WebSocketMessage {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  p?: string; // Price
  q?: string; // Quantity
  m?: boolean; // Is maker
  [key: string]: any;
}
