// Zustand store for market data state management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MarketData, Filter, Alert, Settings, ColumnConfig } from '@/lib/types';
import type { ConfluenceAlert } from '@/lib/alerts/confluenceDetector';

interface MarketStore {
  // Market data
  marketData: MarketData[];
  selectedSymbol: string | null;
  isLoading: boolean;
  lastUpdate: number;

  // Filters
  activeFilter: Filter | null;
  savedFilters: Filter[];
  customFilters: FilterCondition[];

  // Alerts
  alerts: Alert[];
  alertsEnabled: boolean;

  // Confluence Alerts
  confluenceAlerts: ConfluenceAlert[];
  confluenceAlertsEnabled: boolean;

  // Settings
  settings: Settings;

  // Sidebar
  sidebarCollapsed: boolean;

  // Actions
  setMarketData: (data: MarketData[]) => void;
  updateMarketData: (data: MarketData) => void;
  setSelectedSymbol: (symbol: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Filter actions
  setActiveFilter: (filter: Filter | null) => void;
  addFilter: (filter: Filter) => void;
  updateFilter: (id: string, filter: Partial<Filter>) => void;
  deleteFilter: (id: string) => void;

  // Alert actions
  addAlert: (alert: Alert) => void;
  updateAlert: (id: string, alert: Partial<Alert>) => void;
  deleteAlert: (id: string) => void;
  toggleAlerts: () => void;
  checkAlerts: () => void;

  // Confluence Alert actions
  addConfluenceAlert: (alert: ConfluenceAlert) => void;
  removeConfluenceAlert: (id: string) => void;
  clearConfluenceAlerts: () => void;
  setConfluenceAlerts: (alerts: ConfluenceAlert[]) => void;
  toggleConfluenceAlerts: () => void;

  // Settings actions
  updateSettings: (settings: Partial<Settings>) => void;
  updateColumnConfig: (columns: ColumnConfig[]) => void;
  toggleTheme: () => void;

  // UI actions
  toggleSidebar: () => void;
}

interface FilterCondition {
  field: keyof MarketData;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  value: number;
}

// Default settings
const defaultSettings: Settings = {
  updateSpeed: 1,
  showNotionalValue: true,
  theme: 'dark',
  soundEnabled: true,
  autoRefresh: true,
  columns: [
    { id: 'symbol', label: 'Symbol', visible: true, format: 'number' },
    { id: 'price', label: 'Price', visible: true, format: 'currency' },
    { id: 'priceChangePercent', label: '24h %', visible: true, format: 'percentage' },
    { id: 'volume', label: 'Volume', visible: true, format: 'number' },
    { id: 'fundingRate', label: 'Funding Rate', visible: true, format: 'percentage' },
    { id: 'openInterest', label: 'Open Interest', visible: true, format: 'number' },
    { id: 'cvd', label: 'CVD', visible: true, format: 'number' },
    { id: 'buyVolume', label: 'Buy Volume', visible: true, format: 'number' },
    { id: 'sellVolume', label: 'Sell Volume', visible: true, format: 'number' },
  ],
};

// Predefined filters
const defaultFilters: Filter[] = [
  {
    id: 'high-funding',
    name: 'High Funding Rate',
    conditions: [
      { field: 'fundingRate', operator: '>', value: 0.0005 },
    ],
  },
  {
    id: 'negative-funding',
    name: 'Negative Funding',
    conditions: [
      { field: 'fundingRate', operator: '<', value: 0 },
    ],
  },
  {
    id: 'high-volume',
    name: 'High Volume',
    conditions: [
      { field: 'quoteVolume', operator: '>', value: 100000000 },
    ],
  },
  {
    id: 'positive-cvd',
    name: 'Positive CVD',
    conditions: [
      { field: 'cvd', operator: '>', value: 0 },
    ],
  },
  {
    id: 'high-oi',
    name: 'High Open Interest',
    conditions: [
      { field: 'openInterestValue', operator: '>', value: 50000000 },
    ],
  },
];

export const useMarketStore = create<MarketStore>()(
  persist(
    (set, get) => ({
      // Initial state
      marketData: [],
      selectedSymbol: null,
      isLoading: true,
      lastUpdate: Date.now(),

      activeFilter: null,
      savedFilters: defaultFilters,
      customFilters: [],

      alerts: [],
      alertsEnabled: true,

      confluenceAlerts: [],
      confluenceAlertsEnabled: true,

      settings: defaultSettings,
      sidebarCollapsed: false,

      // Market data actions
      setMarketData: (data) =>
        set({
          marketData: data,
          lastUpdate: Date.now(),
          isLoading: false,
        }),

      updateMarketData: (data) =>
        set((state) => {
          const index = state.marketData.findIndex((m) => m.symbol === data.symbol);
          if (index === -1) {
            return { marketData: [...state.marketData, data], lastUpdate: Date.now() };
          }

          const newData = [...state.marketData];
          newData[index] = data;
          return { marketData: newData, lastUpdate: Date.now() };
        }),

      setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

      setLoading: (loading) => set({ isLoading: loading }),

      // Filter actions
      setActiveFilter: (filter) => set({ activeFilter: filter }),

      addFilter: (filter) =>
        set((state) => ({
          savedFilters: [...state.savedFilters, filter],
        })),

      updateFilter: (id, filter) =>
        set((state) => ({
          savedFilters: state.savedFilters.map((f) =>
            f.id === id ? { ...f, ...filter } : f
          ),
        })),

      deleteFilter: (id) =>
        set((state) => ({
          savedFilters: state.savedFilters.filter((f) => f.id !== id),
          activeFilter: state.activeFilter?.id === id ? null : state.activeFilter,
        })),

      // Alert actions
      addAlert: (alert) =>
        set((state) => ({
          alerts: [...state.alerts, alert],
        })),

      updateAlert: (id, alert) =>
        set((state) => ({
          alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...alert } : a)),
        })),

      deleteAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      toggleAlerts: () =>
        set((state) => ({
          alertsEnabled: !state.alertsEnabled,
        })),

      checkAlerts: () => {
        const state = get();
        if (!state.alertsEnabled) return;

        const { marketData, alerts, settings } = state;

        alerts.forEach((alert) => {
          if (!alert.enabled || alert.triggered) return;

          const data = marketData.find((m) => m.symbol === alert.symbol);
          if (!data) return;

          const value = data[alert.condition.field];
          const meetsCondition = evaluateCondition(
            value as number,
            alert.condition.operator,
            alert.condition.value
          );

          if (meetsCondition) {
            // Trigger alert
            set((state) => ({
              alerts: state.alerts.map((a) =>
                a.id === alert.id
                  ? { ...a, triggered: true, triggeredAt: Date.now() }
                  : a
              ),
            }));

            // Show notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Crypto Terminal Alert', {
                body: alert.message,
                icon: '/icon.png',
              });
            }

            // Play sound
            if (settings.soundEnabled) {
              const audio = new Audio('/alert.mp3');
              audio.play().catch(console.error);
            }
          }
        });
      },

      // Confluence Alert actions
      addConfluenceAlert: (alert) =>
        set((state) => ({
          confluenceAlerts: [alert, ...state.confluenceAlerts],
        })),

      removeConfluenceAlert: (id) =>
        set((state) => ({
          confluenceAlerts: state.confluenceAlerts.filter((a) => a.id !== id),
        })),

      clearConfluenceAlerts: () =>
        set({
          confluenceAlerts: [],
        }),

      setConfluenceAlerts: (alerts) =>
        set({
          confluenceAlerts: alerts,
        }),

      toggleConfluenceAlerts: () =>
        set((state) => ({
          confluenceAlertsEnabled: !state.confluenceAlertsEnabled,
        })),

      // Settings actions
      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      updateColumnConfig: (columns) =>
        set((state) => ({
          settings: { ...state.settings, columns },
        })),

      toggleTheme: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            theme: state.settings.theme === 'dark' ? 'light' : 'dark',
          },
        })),

      // UI actions
      toggleSidebar: () =>
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        })),
    }),
    {
      name: 'crypto-terminal-storage',
      partialize: (state) => ({
        savedFilters: state.savedFilters,
        settings: state.settings,
        sidebarCollapsed: state.sidebarCollapsed,
        alertsEnabled: state.alertsEnabled,
        confluenceAlerts: state.confluenceAlerts,
        confluenceAlertsEnabled: state.confluenceAlertsEnabled,
      }),
      // Custom hydration to filter old alerts (older than 48 hours)
      onRehydrateStorage: () => (state) => {
        if (state?.confluenceAlerts) {
          const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
          state.confluenceAlerts = state.confluenceAlerts.filter(
            alert => alert.timestamp > fortyEightHoursAgo
          );
        }
      },
    }
  )
);

// Helper function to evaluate filter conditions
function evaluateCondition(
  value: number,
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=',
  target: number
): boolean {
  switch (operator) {
    case '>':
      return value > target;
    case '<':
      return value < target;
    case '=':
      return value === target;
    case '>=':
      return value >= target;
    case '<=':
      return value <= target;
    case '!=':
      return value !== target;
    default:
      return false;
  }
}
