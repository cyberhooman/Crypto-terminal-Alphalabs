import { useEffect, useCallback } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import { ConfluenceDetector, AlertSeverity } from '@/lib/alerts/confluenceDetector';
import type { ConfluenceAlert } from '@/lib/alerts/confluenceDetector';
import { backendAPI } from '@/lib/services/backendAPI';

const confluenceDetector = new ConfluenceDetector();

export function useAlerts() {
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

  // Detect patterns and generate alerts
  const detectPatterns = useCallback(() => {
    if (marketData.length === 0 || !confluenceAlertsEnabled) return;

    // Run confluence detection
    const newAlerts = confluenceDetector.detectPatterns(marketData);

    // Add new alerts to store (avoid duplicates)
    const existingAlertIds = new Set(confluenceAlerts.map(a => a.id));
    newAlerts.forEach(alert => {
      if (!existingAlertIds.has(alert.id)) {
        addConfluenceAlert(alert);

        // Show browser notification for CRITICAL alerts
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
      }
    });
  }, [marketData, confluenceAlerts, confluenceAlertsEnabled, addConfluenceAlert, settings.soundEnabled]);

  // Fetch historical alerts from backend on mount
  useEffect(() => {
    async function fetchHistoricalAlerts() {
      try {
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
  }, [setConfluenceAlerts]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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

  // Run detection periodically
  useEffect(() => {
    // Initial detection
    detectPatterns();

    // Run every 30 seconds
    const detectionInterval = setInterval(detectPatterns, 30000);

    // Cleanup old alerts every hour
    const cleanupInterval = setInterval(cleanupOldAlerts, 60 * 60 * 1000);

    return () => {
      clearInterval(detectionInterval);
      clearInterval(cleanupInterval);
    };
  }, [detectPatterns, cleanupOldAlerts]);

  return {
    alerts: confluenceAlerts,
    removeAlert: removeConfluenceAlert,
    clearAlerts: clearConfluenceAlerts,
  };
}
