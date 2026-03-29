"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SectorModule } from "@inventaryexpert/types";

const ModuleContext = createContext<SectorModule | null>(null);

export function ModuleProvider({
  module,
  children,
}: {
  module: SectorModule;
  children: ReactNode;
}) {
  return (
    <ModuleContext value={module}>
      {children}
    </ModuleContext>
  );
}

export function useModule(): SectorModule {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModule must be used inside <ModuleProvider>");
  return ctx;
}
