// Mock data service with ALL Binance Futures USDT perpetual pairs
import type { MarketData } from '../types';

// Complete list of Binance Futures USDT perpetual pairs (200+ pairs)
const symbols = [
  // Major Pairs
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  // Layer 1s
  'ADAUSDT', 'DOGEUSDT', 'MATICUSDT', 'DOTUSDT', 'AVAXUSDT',
  'TRXUSDT', 'LINKUSDT', 'ATOMUSDT', 'NEARUSDT', 'UNIUSDT',
  'LTCUSDT', 'ETCUSDT', 'ALGOUSDT', 'VETUSDT', 'ICPUSDT',
  'FILUSDT', 'APTUSDT', 'STXUSDT', 'INJUSDT', 'SUIUSDT',
  'SEIUSDT', 'TIAUSDT', 'ARBUSDT', 'OPUSDT', 'WLDUSDT',
  // DeFi
  'AAVEUSDT', 'MKRUSDT', 'SNXUSDT', 'COMPUSDT', 'CRVUSDT',
  'SUSHIUSDT', '1INCHUSDT', 'YFIUSDT', 'BALUSDT', 'RUNEUSDT',
  'LDOUSDT', 'RDNTUSDT', 'GMXUSDT', 'JOEUSDT', 'MAGICUSDT',
  // Layer 2s
  'ARBUSDT', 'OPUSDT', 'MATICUSDT', 'IMXUSDT', 'STRKUSDT',
  'METISUSDT', 'MANTAUSDT', 'BLURUSDT',
  // Gaming & Metaverse
  'AXSUSDT', 'SANDUSDT', 'MANAUSDT', 'APEUSDT', 'GALUSDT',
  'CHZUSDT', 'ENJUSDT', 'THETAUSDT', 'FLOWUSDT', 'GMTUSDT',
  'GFTUSDT', 'PIXELUSDT', 'PORTALUSDT', 'XAIUSDT', 'ACEUSDT',
  // Meme Coins
  'DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'FLOKIUSDT', 'BONKUSDT',
  'WIFUSDT', 'MEMEUSDT', 'BOMEUSDT', 'PEOPLEUSDT', 'RATUSDT',
  // AI & Data
  'FETUSDT', 'OCEANUSDT', 'AGIXUSDT', 'RNDRUSDT', 'ARKMUSDT',
  'GRTUSDT', 'AIUSDT', 'NMRUSDT', 'PHBUSDT', 'WLDUSDT',
  // Infrastructure
  'RENDERUSDT', 'ARUSDT', 'PYTHUSDT', 'JTOUSDT', 'DYMUSDT',
  'TNSRUSDT', 'ORBSUSDT', 'BANDUSDT', 'QNTUSDT',
  // Exchange Tokens
  'BNBUSDT', 'CAKEUSDT', 'BABYDOBEUSDT', 'SXPUSDT',
  // Privacy
  'XMRUSDT', 'ZECUSDT', 'DASHUSDT', 'SCRTUSDT',
  // Storage
  'FILUSDT', 'ARUSDT', 'STORJUSDT',
  // Interoperability
  'ATOMUSDT', 'DOTUSDT', 'QNTUSDT', 'CELRUSDT', 'AXLUSDT',
  // Oracle
  'LINKUSDT', 'BANDUSDT', 'TRBUSDТ',
  // NFT
  'BLZUSDT', 'ACHUSDT', 'BAKEUSDT',
  // Traditional Assets
  'PAXGUSDT', 'XAGUSDТ',
  // More Altcoins
  'XLMUSDT', 'XTZUSDT', 'EOSUSDT', 'NEOUSDT', 'IOTAUSDT',
  'ONTUSDT', 'ZILUSDT', 'ZRXUSDT', 'BATUSDT', 'ENJUSDT',
  'KAVAUSDT', 'KSMUSDT', 'LRCUSDT', 'OMGUSDT', 'QTUMUSDT',
  'RVNUSDT', 'SCUSDT', 'ZENUSDT', 'ALPHAUSDT', 'ARUSDT',
  'BADGERUSDT', 'BTSUSDT', 'CELOUSDT', 'CHRUSDT', 'CTXCUSDT',
  'CVCUSDT', 'DENTUSDT', 'DGBUSDT', 'DUSKUSDT', 'EGLDUSDT',
  'ENSUSDT', 'GALAUSDT', 'HBARUSDT', 'HNTUSDT', 'HOTUSDT',
  'JASMYUSDT', 'KLAYUSDT', 'KNCUSDT', 'LINAUSDT', 'LITUSDT',
  'LPTUSDT', 'MBOXUSDT', 'MINAUSDT', 'MTLUSDT', 'NKNUSDT',
  'OGNUSDT', 'ONEUSDT', 'REEFUSDT', 'RENUSDT', 'ROSEUSDT',
  'RSRUSDT', 'SFPUSDT', 'SKLUSDT', 'SRMUSDT', 'STGUSDT',
  'STMXUSDT', 'SUPERUSDT', 'SXPUSDT', 'TCTUSDT', 'TLMUSDT',
  'TOMOUSDT', 'TRBUSDT', 'TROYUSDT', 'TRUUSDT', 'TUSDT',
  'UMAUSDT', 'UNFIUSDT', 'WAVESUSDT', 'WINGUSDT', 'WNXMUSDT',
  'WOOUSDT', 'WRXUSDT', 'XEMUSDT', 'XVGUSDT', 'YFIIUSDT',
  'YGGUSDT', 'ZRXUSDT', 'BTCDOMUSDT', 'DEFIUSDT',
  // Recent Listings (2024)
  'PENDLEUSDT', 'ARKMUSDT', 'ENAUSDT', 'WUSDT', 'TNSRUSDT',
  'SAGAUSDT', 'TAOUSDT', 'OMNIUSDT', 'LUNCUSDT', 'REZUSDT',
  'BBUSDT', 'NOTUSDT', 'TURBOUSDT', 'IOUSDT', 'ZKUSDT',
  'MEWUSDT', 'LISTAUSDT', 'ZROUSDT', 'RENDERUSDT', 'ATAUSDT',
  'POLUSDT', 'SCRUSDT', 'MOVEUSDT', 'MEUSDT', 'VANAUSDT',
  'BANANAUSDT', 'PUFFERUSDT', 'CATIUSDT', 'HMSTRUSDT', 'EIGENUSDT',
  'NEIROUSDT', 'SUNUSDT', 'SAFEUSDT', '1MBABYDOGEUSDT', 'COWUSDT',
  'CETUS', 'GOATUSDT', 'SCRTUSDT', 'KAIAUSDT', 'ACTUSDT',
  'PNUTUSDT', 'CHILLGUYUSDT', 'SLERFUSDT', 'SCRUSDT',
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function generateMockData(): MarketData[] {
  return symbols.map((symbol, index) => {
    // Create more realistic price ranges based on symbol
    let priceBase = 1;
    if (symbol === 'BTCUSDT') priceBase = 45000;
    else if (symbol === 'ETHUSDT') priceBase = 2400;
    else if (symbol === 'BNBUSDT') priceBase = 350;
    else if (symbol.includes('BTC') || symbol.includes('ETH')) priceBase = randomBetween(100, 5000);
    else priceBase = randomBetween(0.01, 50);

    const price = priceBase * randomBetween(0.95, 1.05);
    const priceChangePercent = randomBetween(-15, 15);

    // Volume varies by market cap
    const volumeMultiplier = priceBase > 1000 ? 10 : priceBase > 100 ? 5 : 1;
    const volume = randomBetween(1000000, 500000000) * volumeMultiplier;
    const quoteVolume = volume * price;

    // Funding rate - mostly small, some extremes
    const fundingRate = randomBetween(-0.002, 0.002);

    // Open interest
    const openInterest = randomBetween(10000, 5000000) * volumeMultiplier;

    // CVD
    const buyVolume = randomBetween(500000, 300000000) * volumeMultiplier;
    const sellVolume = randomBetween(500000, 300000000) * volumeMultiplier;
    const cvd = buyVolume - sellVolume;

    return {
      symbol,
      price,
      priceChange: (price * priceChangePercent) / 100,
      priceChangePercent,
      volume: volume / price,
      quoteVolume,
      fundingRate,
      nextFundingTime: Date.now() + 3600000,
      openInterest,
      openInterestValue: openInterest * price,
      cvd,
      buyVolume,
      sellVolume,
      high: price * 1.08,
      low: price * 0.92,
      trades: Math.floor(randomBetween(10000, 2000000)),
      lastUpdate: Date.now(),
    };
  });
}

export class MockDataService {
  private data: MarketData[] = [];
  private updateCallbacks: Set<(data: MarketData[]) => void> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;

  initialize(): Promise<void> {
    return new Promise((resolve) => {
      console.log(`Initializing mock data with ${symbols.length} pairs...`);

      // Generate initial data
      this.data = generateMockData();

      // Simulate real-time updates every 2 seconds
      this.updateInterval = setInterval(() => {
        this.updateData();
      }, 2000);

      resolve();
    });
  }

  private updateData(): void {
    // Update prices slightly for realism
    this.data = this.data.map((item) => {
      const priceChange = randomBetween(-0.3, 0.3);
      const newPrice = item.price * (1 + priceChange / 100);

      // Update CVD more realistically
      const volumeDelta = randomBetween(-1000000, 1000000);
      const buyDelta = volumeDelta > 0 ? Math.abs(volumeDelta) : 0;
      const sellDelta = volumeDelta < 0 ? Math.abs(volumeDelta) : 0;

      return {
        ...item,
        price: newPrice,
        priceChange: newPrice - item.price,
        priceChangePercent: item.priceChangePercent + (priceChange / 10),
        fundingRate: item.fundingRate + randomBetween(-0.00002, 0.00002),
        cvd: item.cvd + volumeDelta,
        buyVolume: item.buyVolume + buyDelta,
        sellVolume: item.sellVolume + sellDelta,
        lastUpdate: Date.now(),
      };
    });

    this.notifyUpdate();
  }

  private notifyUpdate(): void {
    this.updateCallbacks.forEach((callback) => {
      callback(this.data);
    });
  }

  onUpdate(callback: (data: MarketData[]) => void): () => void {
    this.updateCallbacks.add(callback);
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  getAllData(): MarketData[] {
    return this.data;
  }

  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.updateCallbacks.clear();
  }
}

export const mockDataService = new MockDataService();
