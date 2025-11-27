// Custom hook for market data integration
'use client';

import { useEffect, useRef } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import { marketDataService } from '@/lib/services/marketData';

export function useMarketData() {
  const { marketData, isLoading, setLoading, setMarketData } = useMarketStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializeData = async () => {
      try {
        setLoading(true);
        console.log('Connecting to Binance real-time data...');

        await marketDataService.initialize();

        // Subscribe to updates
        const unsubscribe = marketDataService.onUpdate((dataMap) => {
          // Convert Map to Array for store
          const dataArray = Array.from(dataMap.values());
          setMarketData(dataArray);
        });

        // Initial data load
        const initialData = marketDataService.getAllData();
        setMarketData(initialData);
        setLoading(false);

        console.log('Connected to Binance with real-time data!');

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing market data:', error);
        setLoading(false);
      }
    };

    initializeData();

    return () => {
      if (isInitialized.current) {
        marketDataService.destroy();
        isInitialized.current = false;
      }
    };
  }, [setLoading, setMarketData]);

  return {
    marketData,
    isLoading,
  };
}
