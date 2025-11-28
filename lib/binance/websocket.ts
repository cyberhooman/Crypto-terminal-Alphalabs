// Binance WebSocket integration for real-time data
import type { WebSocketMessage } from '../types';

export type WebSocketCallback = (data: any) => void;

export class BinanceWebSocket {
  private ws: WebSocket | null = null;
  private baseURL: string = 'wss://fstream.binance.com';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private callbacks: Map<string, WebSocketCallback[]> = new Map();
  private subscriptions: Set<string> = new Set();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(baseURL?: string) {
    if (baseURL) this.baseURL = baseURL;
  }

  // Connect to WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      try {
        this.ws = new WebSocket(`${this.baseURL}/ws`);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          this.startPing();

          // Resubscribe to previous subscriptions
          this.subscriptions.forEach(stream => {
            this.subscribe(stream);
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.stopPing();
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        reject(error);
      }
    });
  }

  // Handle incoming messages
  private handleMessage(data: any) {
    if (data.e) {
      // Event message
      const eventType = data.e;
      const callbacks = this.callbacks.get(eventType) || [];
      callbacks.forEach(callback => callback(data));

      // Also trigger symbol-specific callbacks
      if (data.s) {
        const symbolCallbacks = this.callbacks.get(`${eventType}:${data.s}`) || [];
        symbolCallbacks.forEach(callback => callback(data));
      }
    }
  }

  // Subscribe to a stream
  subscribe(stream: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, queuing subscription:', stream);
      this.subscriptions.add(stream);
      return;
    }

    const message = {
      method: 'SUBSCRIBE',
      params: [stream],
      id: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
    this.subscriptions.add(stream);
  }

  // Unsubscribe from a stream
  unsubscribe(stream: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.subscriptions.delete(stream);
      return;
    }

    const message = {
      method: 'UNSUBSCRIBE',
      params: [stream],
      id: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
    this.subscriptions.delete(stream);
  }

  // Subscribe to all market mini tickers
  subscribeAllMiniTickers(callback: WebSocketCallback) {
    this.on('24hrMiniTicker', callback);
    this.subscribe('!miniTicker@arr');
  }

  // Subscribe to mark price stream for all symbols
  subscribeMarkPriceAll(callback: WebSocketCallback) {
    this.on('markPriceUpdate', callback);
    this.subscribe('!markPrice@arr@1s');
  }

  // Subscribe to aggregated trades for CVD calculation
  subscribeAggTrades(symbol: string, callback: WebSocketCallback) {
    const stream = `${symbol.toLowerCase()}@aggTrade`;
    this.on(`aggTrade:${symbol}`, callback);
    this.subscribe(stream);
  }

  // Subscribe to klines
  subscribeKline(symbol: string, interval: string, callback: WebSocketCallback) {
    const stream = `${symbol.toLowerCase()}@kline_${interval}`;
    this.on(`kline:${symbol}`, callback);
    this.subscribe(stream);
  }

  // Register callback for event type
  on(eventType: string, callback: WebSocketCallback) {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, []);
    }
    this.callbacks.get(eventType)!.push(callback);
  }

  // Remove callback
  off(eventType: string, callback: WebSocketCallback) {
    const callbacks = this.callbacks.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // Attempt to reconnect with exponential backoff
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('⚠️  WebSocket max retries reached. Falling back to HTTP polling.');
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 30s)
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.warn('Reconnection failed, will retry:', error.message || 'Unknown error');
      });
    }, delay);
  }

  // Start ping to keep connection alive
  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ method: 'ping' }));
      }
    }, 180000); // Ping every 3 minutes
  }

  // Stop ping
  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // Disconnect
  disconnect() {
    this.stopPing();
    this.subscriptions.clear();
    this.callbacks.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const binanceWS = new BinanceWebSocket();
