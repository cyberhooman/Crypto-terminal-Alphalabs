'use client';

import { useEffect, useCallback, useState } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import type { ConfluenceAlert } from '@/lib/alerts/confluenceDetector';

// Alert severity enum (duplicated from server-side to avoid importing Node.js code)
export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export function useAlerts() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  const {
    marketData,
    confluenceAlerts,
    confluenceAlertsEnabled,
    addConfluenceAlert,
    removeConfluenceAlert,
    clearConfluenceAlerts,
    setConfluenceAlerts,
    settings,
  } = useMarketStore();

  // Fetch fresh alerts from backend (replaces local detection)
  const fetchBackendAlerts = useCallback(async () => {
    if (!confluenceAlertsEnabled || !isMounted) return;

    try {
      // Dynamic import to prevent build-time execution
      const { backendAPI } = await import('@/lib/services/backendAPI');
      const freshAlerts = await backendAPI.getAlerts();

      // Check for new alerts
      const existingAlertIds = new Set(confluenceAlerts.map(a => a.id));
      const newAlerts = freshAlerts.filter(alert => !existingAlertIds.has(alert.id));

      // Show notifications for new CRITICAL alerts
      newAlerts.forEach(alert => {
        if (alert.severity === AlertSeverity.CRITICAL && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification(`🚨 ${alert.title}`, {
              body: `${alert.symbol}: ${alert.description}`,
              icon: '/favicon.ico',
              tag: alert.id,
            });
          }
        }

        // Play sound for CRITICAL alerts
        if (alert.severity === AlertSeverity.CRITICAL && settings.soundEnabled) {
          // You can add a sound file later
          // const audio = new Audio('/alert-critical.mp3');
          // audio.play().catch(console.error);
        }
      });

      // Update store with all alerts from backend
      setConfluenceAlerts(freshAlerts);
    } catch (error) {
      console.error('Error fetching backend alerts:', error);
    }
  }, [isMounted, confluenceAlerts, confluenceAlertsEnabled, setConfluenceAlerts, settings.soundEnabled]);

  // Fetch historical alerts from backend on mount
  useEffect(() => {
    if (!isMounted) return;

    async function fetchHistoricalAlerts() {
      try {
        const { backendAPI } = await import('@/lib/services/backendAPI');
        const alerts = await backendAPI.getAlerts();
        if (alerts && alerts.length > 0) {
          setConfluenceAlerts(alerts);
          console.log(`📥 Loaded ${alerts.length} historical alerts from backend`);
        }
      } catch (error) {
        console.error('Error fetching historical alerts:', error);
      }
    }

    fetchHistoricalAlerts();
  }, [isMounted, setConfluenceAlerts]);

  // Request notification permission on mount
  useEffect(() => {
    if (!isMounted) return;
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isMounted]);

  // Cleanup old alerts (older than 48 hours)
  const cleanupOldAlerts = useCallback(() => {
    const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
    const oldAlerts = confluenceAlerts.filter(alert => alert.timestamp <= fortyEightHoursAgo);

    oldAlerts.forEach(alert => {
      removeConfluenceAlert(alert.id);
    });

    if (oldAlerts.length > 0) {
      console.log(`Cleaned up ${oldAlerts.length} old alerts (>48h)`);
    }
  }, [confluenceAlerts, removeConfluenceAlert]);

  // Fetch backend alerts periodically
  useEffect(() => {
    if (!isMounted) return;

    // Initial fetch
    fetchBackendAlerts();

    // Fetch every 30 seconds (backend detects 24/7, we just poll for updates)
    const fetchInterval = setInterval(fetchBackendAlerts, 30000);

    // Cleanup old alerts every hour
    const cleanupInterval = setInterval(cleanupOldAlerts, 60 * 60 * 1000);

    return () => {
      clearInterval(fetchInterval);
      clearInterval(cleanupInterval);
    };
  }, [isMounted, fetchBackendAlerts, cleanupOldAlerts]);

  // Clear alerts from both local state AND backend database
  const clearAlertsFromBackend = useCallback(async () => {
    try {
      // Clear local state immediately for instant UI feedback
      clearConfluenceAlerts();

      // Clear backend database
      const { backendAPI } = await import('@/lib/services/backendAPI');
      const result = await backendAPI.deleteAllAlerts();

      if (result.success) {
        console.log(`✅ ${result.message}`);
      } else {
        console.error('❌ Failed to clear alerts from backend:', result.message);
      }
    } catch (error) {
      console.error('❌ Error clearing alerts from backend:', error);
    }
  }, [clearConfluenceAlerts]);

  return {
    alerts: confluenceAlerts,
    removeAlert: removeConfluenceAlert,
    clearAlerts: clearAlertsFromBackend,
  };
}
