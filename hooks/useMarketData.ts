// Custom hook for market data integration
'use client';

import { useEffect, useRef } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import { mockDataService } from '@/lib/services/mockData';

export function useMarketData() {
  const { marketData, isLoading, setLoading, setMarketData } = useMarketStore();
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const initializeData = async () => {
      try {
        setLoading(true);
        await mockDataService.initialize();

        // Subscribe to updates
        const unsubscribe = mockDataService.onUpdate((data) => {
          setMarketData(data);
        });

        // Initial data load
        const initialData = mockDataService.getAllData();
        setMarketData(initialData);
        setLoading(false);

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
        mockDataService.destroy();
        isInitialized.current = false;
      }
    };
  }, [setLoading, setMarketData]);

  return {
    marketData,
    isLoading,
  };
}
