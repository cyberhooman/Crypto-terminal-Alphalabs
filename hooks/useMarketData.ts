// Custom hook for market data integration
'use client';

import { useEffect, useRef } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import { hybridMarketDataService } from '@/lib/services/hybridMarketData';

export function useMarketData() {
  const { marketData, isLoading, setLoading, setMarketData } = useMarketStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializeData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Connecting to hybrid market data service (CoinGlass + Binance)...');

        await hybridMarketDataService.initialize();
        console.log('✅ Hybrid market data service initialized');

        // Subscribe to updates
        const unsubscribe = hybridMarketDataService.onUpdate((dataMap) => {
          // Convert Map to Array for store
          const dataArray = Array.from(dataMap.values());
          console.log(`📊 Received ${dataArray.length} market data items`);
          setMarketData(dataArray);
        });

        // Initial data load
        const initialData = hybridMarketDataService.getAllData();
        console.log(`📈 Initial data loaded: ${initialData.length} items`);

        if (initialData.length > 0) {
          setMarketData(initialData);
          setLoading(false);
          console.log('✅ Market data ready!');
        } else {
          console.warn('⚠️ No initial data received, waiting for updates...');
          // Set loading to false anyway to show empty state
          setTimeout(() => {
            const retryData = hybridMarketDataService.getAllData();
            if (retryData.length > 0) {
              setMarketData(retryData);
              console.log(`✅ Data received after delay: ${retryData.length} items`);
            }
            setLoading(false);
          }, 2000);
        }

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('❌ Error initializing market data:', error);
        console.error('Error details:', error instanceof Error ? error.message : String(error));
        setLoading(false);
      }
    };

    initializeData();

    return () => {
      if (isInitialized.current) {
        hybridMarketDataService.destroy();
        isInitialized.current = false;
      }
    };
  }, [setLoading, setMarketData]);

  return {
    marketData,
    isLoading,
  };
}
