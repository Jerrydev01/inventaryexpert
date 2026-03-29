import type { ComponentType } from "react";
import { ActiveSitesWidget } from "./ActiveSitesWidget";
import { LowStockWidget } from "./LowStockWidget";
import { StockSummaryWidget } from "./StockSummaryWidget";

export const widgetRegistry: Record<string, ComponentType> = {
  // StockSummaryWidget: StockSummaryWidget as ComponentType,
  // LowStockWidget: LowStockWidget as ComponentType,
  // ActiveSitesWidget: ActiveSitesWidget as ComponentType,
};
