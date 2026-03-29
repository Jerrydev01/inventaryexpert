import type { SectorModule } from "@inventaryexpert/types";

export const constructionModule: SectorModule = {
  sector: "construction",
  displayName: "Construction",
  description: "Manage materials, tools, and site stock movements.",
  labels: {
    item: "Material",
    items: "Materials",
    location: "Site",
    locations: "Sites",
    stockIn: "Receive",
    stockOut: "Issue to Site",
    transfer: "Transfer Between Sites",
    return: "Return to Store",
    adjustment: "Stock Count Correction",
    batch: "Delivery",
  },
  nav: [
    { label: "Dashboard",  href: "/dashboard",                icon: "home" },
    { label: "Materials",  href: "/dashboard/items",          icon: "box" },
    { label: "Sites",      href: "/dashboard/locations",      icon: "building" },
    { label: "Receive",    href: "/dashboard/stock/in",       icon: "arrow-down" },
    { label: "Issue",      href: "/dashboard/stock/out",      icon: "arrow-up" },
    { label: "Transfers",  href: "/dashboard/stock/transfer", icon: "arrows" },
    { label: "History",    href: "/dashboard/transactions",   icon: "list" },
  ],
  dashboard: {
    primary:   ["StockSummaryWidget", "LowStockWidget"],
    secondary: ["ActiveSitesWidget"],
  },
  onboarding: {
    welcomeTitle:   "Welcome to your construction inventory",
    welcomeBody:    "Start by adding the sites and stores where your materials are held.",
    firstStepLabel: "Add your first site",
    firstStepHref:  "/dashboard/locations/new",
  },
};
