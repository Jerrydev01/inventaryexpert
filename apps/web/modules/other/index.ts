import type { SectorModule } from "@inventaryexpert/types";

export const otherModule: SectorModule = {
  sector: "other",
  displayName: "General",
  description: "General-purpose inventory management.",
  labels: {
    item: "Item",
    items: "Items",
    location: "Location",
    locations: "Locations",
    stockIn: "Receive",
    stockOut: "Issue",
    transfer: "Transfer",
    return: "Return",
    adjustment: "Stock Count Correction",
    batch: "Batch",
  },
  nav: [
    { label: "Dashboard",  href: "/dashboard",                icon: "home" },
    { label: "Items",      href: "/dashboard/items",          icon: "box" },
    { label: "Locations",  href: "/dashboard/locations",      icon: "map-pin" },
    { label: "Receive",    href: "/dashboard/stock/in",       icon: "arrow-down" },
    { label: "Issue",      href: "/dashboard/stock/out",      icon: "arrow-up" },
    { label: "Transfers",  href: "/dashboard/stock/transfer", icon: "arrows" },
    { label: "History",    href: "/dashboard/transactions",   icon: "list" },
  ],
  dashboard: {
    primary:   ["StockSummaryWidget", "LowStockWidget"],
    secondary: [],
  },
  onboarding: {
    welcomeTitle:   "Welcome to your inventory",
    welcomeBody:    "Start by adding your locations and item catalogue.",
    firstStepLabel: "Add your first location",
    firstStepHref:  "/dashboard/locations/new",
  },
};
