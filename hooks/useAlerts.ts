import { useEffect, useCallback } from 'react';
import { useMarketStore } from '@/stores/useMarketStore';
import { ConfluenceDetector, AlertSeverity } from '@/lib/alerts/confluenceDetector';
import type { ConfluenceAlert } from '@/lib/alerts/confluenceDetector';

const confluenceDetector = new ConfluenceDetector();

export function useAlerts() {
  const {
    marketData,
    confluenceAlerts,
    confluenceAlertsEnabled,
    addConfluenceAlert,
    removeConfluenceAlert,
    clearConfluenceAlerts,
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

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Run detection periodically
  useEffect(() => {
    // Initial detection
    detectPatterns();

    // Run every 60 seconds (reduced from 30s for performance)
    const interval = setInterval(detectPatterns, 60000);

    return () => clearInterval(interval);
  }, [detectPatterns]);

  return {
    alerts: confluenceAlerts,
    removeAlert: removeConfluenceAlert,
    clearAlerts: clearConfluenceAlerts,
  };
}
