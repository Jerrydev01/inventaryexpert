import type { SectorModule } from "@inventaryexpert/types";

export const salesModule: SectorModule = {
  sector: "sales",
  displayName: "Sales",
  description: "Manage products and sales distribution stock.",
  labels: {
    item: "Product",
    items: "Products",
    location: "Store",
    locations: "Stores",
    stockIn: "Receive Delivery",
    stockOut: "Sell",
    transfer: "Transfer Between Stores",
    return: "Return to Warehouse",
    adjustment: "Stock Count Correction",
    batch: "Shipment",
  },
  nav: [
    { label: "Dashboard",  href: "/dashboard",                icon: "home" },
    { label: "Products",   href: "/dashboard/items",          icon: "shopping-bag" },
    { label: "Stores",     href: "/dashboard/locations",      icon: "store" },
    { label: "Receive",    href: "/dashboard/stock/in",       icon: "arrow-down" },
    { label: "Sell",       href: "/dashboard/stock/out",      icon: "arrow-up" },
    { label: "Transfers",  href: "/dashboard/stock/transfer", icon: "arrows" },
    { label: "History",    href: "/dashboard/transactions",   icon: "list" },
  ],
  dashboard: {
    primary:   ["StockSummaryWidget", "LowStockWidget"],
    secondary: [],
  },
  onboarding: {
    welcomeTitle:   "Welcome to your sales inventory",
    welcomeBody:    "Start by adding your stores and product catalogue.",
    firstStepLabel: "Add your first store",
    firstStepHref:  "/dashboard/locations/new",
  },
};
