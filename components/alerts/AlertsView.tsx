'use client';

import { useAlerts } from '@/hooks/useAlerts';
import { useMarketStore } from '@/stores/useMarketStore';
import AlertPanel from './AlertPanel';

export default function AlertsView() {
  const { alerts, removeAlert, clearAlerts } = useAlerts();
  const { setSelectedSymbol } = useMarketStore();

  const handleSymbolClick = (symbol: string) => {
    // Set selected symbol to open chart
    setSelectedSymbol(symbol);
    // TODO: Switch to screener view to show chart modal
    // This would require passing a view change callback from parent
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black">
      <AlertPanel
        alerts={alerts}
        onDismiss={removeAlert}
        onClearAll={clearAlerts}
        onSymbolClick={handleSymbolClick}
      />
    </div>
  );
}
