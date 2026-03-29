import type { SectorModule } from "@inventaryexpert/types";

export const agricultureModule: SectorModule = {
  sector: "agriculture",
  displayName: "Agriculture",
  description: "Track inputs, produce, and farm location stock.",
  labels: {
    item: "Input",
    items: "Inputs",
    location: "Farm",
    locations: "Farms",
    stockIn: "Receive Input",
    stockOut: "Dispatch",
    transfer: "Move Between Farms",
    return: "Return to Store",
    adjustment: "Stock Count Correction",
    batch: "Harvest Batch",
  },
  nav: [
    { label: "Dashboard",  href: "/dashboard",                icon: "home" },
    { label: "Inputs",     href: "/dashboard/items",          icon: "leaf" },
    { label: "Farms",      href: "/dashboard/locations",      icon: "map" },
    { label: "Receive",    href: "/dashboard/stock/in",       icon: "arrow-down" },
    { label: "Dispatch",   href: "/dashboard/stock/out",      icon: "arrow-up" },
    { label: "Transfers",  href: "/dashboard/stock/transfer", icon: "arrows" },
    { label: "History",    href: "/dashboard/transactions",   icon: "list" },
  ],
  dashboard: {
    primary:   ["StockSummaryWidget", "LowStockWidget"],
    secondary: [],
  },
  onboarding: {
    welcomeTitle:   "Welcome to your agriculture inventory",
    welcomeBody:    "Start by adding your farms and input types.",
    firstStepLabel: "Add your first farm",
    firstStepHref:  "/dashboard/locations/new",
  },
};
