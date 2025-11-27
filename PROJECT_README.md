# 🚀 Advanced Crypto Terminal

A professional-grade cryptocurrency terminal for tracking **Funding Rates**, **Open Interest (OI)**, and **Cumulative Volume Delta (CVD)** from Binance Futures markets.

## ✨ Features (Better than Orion Terminal)

### 📊 Real-Time Data Streaming
- Live price updates via WebSocket
- Real-time funding rate monitoring
- Open interest tracking
- CVD calculation from aggregated trades
- Sub-second update latency

### 🔍 Advanced Filtering System
- Multi-condition filters
- Funding rate thresholds
- OI change % detection
- CVD momentum filters
- Volume/liquidity screening
- Save custom filter presets
- Quick filter switching

### 🔔 Smart Alert System
- Custom metric alerts
- Funding rate notifications
- OI spike detection
- CVD divergence alerts
- Browser push notifications
- Sound alerts
- Alert history tracking

### 📈 Data Visualization
- Sortable data tables
- Real-time updates without page refresh
- Column customization
- Virtual scrolling for performance
- Export to CSV/JSON
- Historical data charts

### ⚙️ Customization
- Dark/Light themes
- Adjustable update speeds
- Column show/hide
- Column reordering
- Persistent settings
- Multiple workspace layouts

## 🏗️ Technical Architecture

### Frontend Stack
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Zustand** - State management
- **TanStack Table** - Advanced data tables
- **Recharts** - Charting

### Backend/Data
- **Binance Futures API** - Market data
- **WebSocket** - Real-time streams
- **CVD Engine** - Custom calculation
- **IndexedDB** - Client-side caching

## 📁 Project Structure

```
crypto-terminal/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main screener page
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/
│   ├── screener/                 # Screener components
│   │   ├── DataTable.tsx         # Main data table
│   │   ├── FilterPanel.tsx       # Filter controls
│   │   └── SymbolRow.tsx         # Table rows
│   ├── charts/                   # Chart components
│   │   ├── FundingChart.tsx      # Funding rate chart
│   │   ├── OIChart.tsx           # Open interest chart
│   │   └── CVDChart.tsx          # CVD visualization
│   ├── alerts/                   # Alert system
│   │   ├── AlertPanel.tsx        # Alert management
│   │   └── AlertNotification.tsx # Alert notifications
│   ├── settings/                 # Settings components
│   │   └── SettingsPanel.tsx     # Settings UI
│   └── ui/                       # Reusable UI components
│       ├── Sidebar.tsx           # Navigation sidebar
│       └── Button.tsx            # Button component
├── lib/
│   ├── binance/                  # Binance integration
│   │   ├── api.ts                # REST API client
│   │   └── websocket.ts          # WebSocket client
│   ├── services/                 # Business logic
│   │   └── marketData.ts         # Data aggregation service
│   ├── utils/                    # Utilities
│   │   ├── cvd.ts                # CVD calculator
│   │   └── formatters.ts         # Data formatters
│   └── types/                    # TypeScript types
│       └── index.ts              # Type definitions
├── stores/                       # Zustand stores
│   └── useMarketStore.ts         # Market data store
└── hooks/                        # Custom React hooks
    └── useMarketData.ts          # Market data hook
```

## 🚀 Getting Started

### Installation

```bash
cd crypto-terminal
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📊 Key Metrics Explained

### Funding Rate
- Periodic payment between long and short traders
- Positive = Longs pay shorts (bullish sentiment)
- Negative = Shorts pay longs (bearish sentiment)
- Typically occurs every 8 hours
- High funding rates indicate overheated positions

### Open Interest (OI)
- Total number of outstanding derivative contracts
- Increasing OI + Rising price = Bullish
- Increasing OI + Falling price = Bearish
- Decreasing OI = Position closing / Profit taking

### Cumulative Volume Delta (CVD)
- Difference between buy and sell volume
- Positive CVD = More buying pressure
- Negative CVD = More selling pressure
- CVD divergence from price = Potential reversal
- Tracks institutional order flow

## 🔧 API Integration

### Binance Futures Endpoints Used

**REST API:**
- `/fapi/v1/exchangeInfo` - Symbol information
- `/fapi/v1/premiumIndex` - Funding rates
- `/fapi/v1/openInterest` - Open interest data
- `/fapi/v1/ticker/24hr` - 24h statistics
- `/fapi/v1/aggTrades` - Aggregated trades for CVD
- `/fapi/v1/klines` - Candlestick data

**WebSocket Streams:**
- `!miniTicker@arr` - All market mini tickers
- `!markPrice@arr@1s` - Mark price updates
- `{symbol}@aggTrade` - Aggregated trades per symbol
- `{symbol}@kline_{interval}` - Kline streams

### Rate Limits
- REST API: 1200 requests/minute
- WebSocket: 5 incoming messages/second
- Connection limit: 300 connections

## 🎯 Filtering Examples

### High Funding Rate (Long Squeeze Risk)
```javascript
{
  field: 'fundingRate',
  operator: '>',
  value: 0.001  // 0.1% (very high)
}
```

### Positive CVD with Negative Funding (Bullish Setup)
```javascript
[
  { field: 'cvd', operator: '>', value: 0 },
  { field: 'fundingRate', operator: '<', value: 0 }
]
```

### High OI with High Volume (High Activity)
```javascript
[
  { field: 'openInterestValue', operator: '>', value: 100000000 },
  { field: 'quoteVolume', operator: '>', value: 500000000 }
]
```

## 📈 Performance Optimizations

1. **Virtual Scrolling** - Only render visible rows
2. **WebSocket Throttling** - Batch updates to reduce re-renders
3. **Memoization** - Cache expensive calculations
4. **Lazy Loading** - Load data on demand
5. **IndexedDB Caching** - Offline data access
6. **Web Workers** - Offload CVD calculations

## 🔐 Security Considerations

- Read-only API access (no trading)
- Client-side only (no API keys stored)
- CORS-compliant requests
- Rate limit handling
- Error boundaries
- Input validation

## 🎨 Customization Guide

### Adding New Columns

Edit `stores/useMarketStore.ts`:

```typescript
columns: [
  ...existingColumns,
  {
    id: 'yourMetric',
    label: 'Your Metric',
    visible: true,
    format: 'number'
  }
]
```

### Creating Custom Filters

```typescript
const myFilter: Filter = {
  id: 'my-custom-filter',
  name: 'My Filter',
  conditions: [
    { field: 'fundingRate', operator: '>', value: 0.0005 },
    { field: 'cvd', operator: '>', value: 0 }
  ]
};
```

### Adding Alert Types

Edit `stores/useMarketStore.ts` to add new alert logic in `checkAlerts()`.

## 🐛 Troubleshooting

### WebSocket Connection Issues
- Check Binance API status
- Verify network connectivity
- Clear browser cache
- Check for CORS issues

### Data Not Updating
- Verify WebSocket connection
- Check rate limits
- Inspect browser console for errors
- Refresh the page

### High CPU Usage
- Reduce number of symbols tracked
- Increase update interval
- Disable real-time CVD for less important symbols

## 📝 Roadmap

- [ ] Multi-exchange support (Bybit, OKX, Deribit)
- [ ] Portfolio tracking
- [ ] Liquidation heatmap
- [ ] Order flow imbalance indicators
- [ ] Market depth visualization
- [ ] Correlation matrix
- [ ] Backtesting module
- [ ] Mobile app (React Native)
- [ ] Trading integration
- [ ] Social sentiment analysis

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## ⚠️ Disclaimer

This tool is for informational purposes only. Not financial advice. Trading cryptocurrency involves substantial risk. Past performance does not guarantee future results.

## 🙏 Credits

- Inspired by Orion Terminal
- Data provided by Binance
- Built with Next.js and TypeScript

---

**Made with ❤️ for crypto traders**

For issues and feature requests, please open a GitHub issue.
