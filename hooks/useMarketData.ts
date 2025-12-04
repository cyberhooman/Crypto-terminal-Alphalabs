// Custom hook for market data integration
'use client';

import { useEffect, useRef, useState } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';

export function useMarketData() {
  const { marketData, isLoading, setLoading, setMarketData } = useMarketStore();
  const isInitialized = useRef(false);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure we only run in browser
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Don't run on server or if already initialized
    if (!isMounted || isInitialized.current) return;
    isInitialized.current = true;

    const initializeData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Connecting to hybrid market data service (CoinGlass + Binance)...');

        // Dynamic import to prevent build-time execution
        const { hybridMarketDataService } = await import('@/lib/services/hybridMarketData');

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
        // Dynamic import for cleanup
        import('@/lib/services/hybridMarketData').then(({ hybridMarketDataService }) => {
          hybridMarketDataService.destroy();
        });
        isInitialized.current = false;
      }
    };
  }, [isMounted, setLoading, setMarketData]);

  return {
    marketData,
    isLoading,
  };
}
