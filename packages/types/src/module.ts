import type { SectorEnum as Sector } from "./database";

/** A single navigation item rendered in the sidebar. */
export interface NavItem {
  label: string;
  href: string;
  icon?: string; // icon key (e.g. 'warehouse', 'truck')
}

/**
 * Per-sector terminology overrides. Pages use these labels so the word
 * "Material", "Site", etc. never appears hard-coded in shared components.
 */
export interface SectorLabels {
  item: string;
  items: string;
  location: string;
  locations: string;
  stockIn: string;
  stockOut: string;
  transfer: string;
  return: string;
  adjustment: string;
  batch: string;
}

/** Widget key slots declared by a module. The dashboard renders them via the widget-registry. */
export interface DashboardWidgets {
  primary: string[];
  secondary: string[];
}

/** Shown to new companies the first time they open the dashboard. */
export interface OnboardingConfig {
  welcomeTitle: string;
  welcomeBody: string;
  firstStepLabel: string;
  firstStepHref: string;
}

/** Full module definition. Every sector must export an object that satisfies this. */
export interface SectorModule {
  sector: Sector;
  displayName: string;
  description: string;
  labels: SectorLabels;
  nav: NavItem[];
  dashboard: DashboardWidgets;
  onboarding: OnboardingConfig;
}
