// Client-side WebSocket connection to Binance Futures
// Bypasses IP blocking by connecting directly from user's browser

export type WebSocketMessage = {
  stream: string;
  data: any;
};

export type TickerData = {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  p: string; // Price change
  P: string; // Price change percent
  w: string; // Weighted average price
  c: string; // Last price
  Q: string; // Last quantity
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  O: number; // Statistics open time
  C: number; // Statistics close time
  F: number; // First trade ID
  L: number; // Last trade ID
  n: number; // Total number of trades
};

export type MarkPriceData = {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  p: string; // Mark price
  i: string; // Index price
  P: string; // Estimated Settle Price (only useful in the last hour before settlement)
  r: string; // Funding rate
  T: number; // Next funding time
};

export class BinanceWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isManualDisconnect = false;
  private subscriptions: Set<string> = new Set();
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  // Binance Futures WebSocket endpoints
  private readonly WS_BASE = 'wss://fstream.binance.com/ws';
  private readonly COMBINED_STREAMS = 'wss://fstream.binance.com/stream';

  constructor() {
    // Only run in browser
    if (typeof window === 'undefined') {
      console.warn('⚠️ WebSocket client can only run in browser');
    }
  }

  /**
   * Connect to Binance WebSocket
   */
  connect(): void {
    if (typeof window === 'undefined') return;

    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return;
    }

    this.isManualDisconnect = false;

    try {
      console.log('🔌 Connecting to Binance WebSocket...');
      this.ws = new WebSocket(this.COMBINED_STREAMS);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected to Binance');
        this.reconnectAttempts = 0;
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        if (!this.isManualDisconnect) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Subscribe to all 24hr tickers
   */
  subscribeAllTickers(callback: (tickers: TickerData[]) => void): () => void {
    const stream = '!ticker@arr';
    this.subscribe(stream, callback);
    return () => this.unsubscribe(stream, callback);
  }

  /**
   * Subscribe to all mark prices (includes funding rates)
   */
  subscribeAllMarkPrices(callback: (markPrices: MarkPriceData[]) => void): () => void {
    const stream = '!markPrice@arr@1s';
    this.subscribe(stream, callback);
    return () => this.unsubscribe(stream, callback);
  }

  /**
   * Subscribe to specific symbol ticker
   */
  subscribeSymbolTicker(symbol: string, callback: (ticker: TickerData) => void): () => void {
    const stream = `${symbol.toLowerCase()}@ticker`;
    this.subscribe(stream, callback);
    return () => this.unsubscribe(stream, callback);
  }

  /**
   * Subscribe to liquidations
   */
  subscribeLiquidations(callback: (liquidation: any) => void): () => void {
    const stream = '!forceOrder@arr';
    this.subscribe(stream, callback);
    return () => this.unsubscribe(stream, callback);
  }

  /**
   * Generic subscribe method
   */
  private subscribe(stream: string, callback: (data: any) => void): void {
    // Add to listeners
    if (!this.listeners.has(stream)) {
      this.listeners.set(stream, new Set());
    }
    this.listeners.get(stream)!.add(callback);

    // Add to subscriptions
    if (!this.subscriptions.has(stream)) {
      this.subscriptions.add(stream);
      this.sendSubscribe(stream);
    }
  }

  /**
   * Unsubscribe from stream
   */
  private unsubscribe(stream: string, callback: (data: any) => void): void {
    const streamListeners = this.listeners.get(stream);
    if (streamListeners) {
      streamListeners.delete(callback);

      // If no more listeners for this stream, unsubscribe from WebSocket
      if (streamListeners.size === 0) {
        this.listeners.delete(stream);
        this.subscriptions.delete(stream);
        this.sendUnsubscribe(stream);
      }
    }
  }

  /**
   * Send subscribe message to WebSocket
   */
  private sendSubscribe(stream: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        method: 'SUBSCRIBE',
        params: [stream],
        id: Date.now(),
      };
      this.ws.send(JSON.stringify(message));
      console.log(`📡 Subscribed to ${stream}`);
    }
  }

  /**
   * Send unsubscribe message to WebSocket
   */
  private sendUnsubscribe(stream: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = {
        method: 'UNSUBSCRIBE',
        params: [stream],
        id: Date.now(),
      };
      this.ws.send(JSON.stringify(message));
      console.log(`📡 Unsubscribed from ${stream}`);
    }
  }

  /**
   * Resubscribe to all streams after reconnection
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach((stream) => {
      this.sendSubscribe(stream);
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage): void {
    const listeners = this.listeners.get(message.stream);
    if (listeners) {
      listeners.forEach((callback) => callback(message.data));
    }
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    console.log(
      `⏳ Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${
        this.maxReconnectAttempts
      })`
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.isManualDisconnect = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscriptions.clear();
    this.listeners.clear();
    console.log('🔌 WebSocket manually disconnected');
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const binanceWS = new BinanceWebSocketClient();
