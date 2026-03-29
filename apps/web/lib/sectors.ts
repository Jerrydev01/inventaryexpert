import "server-only";

import type { Database, SectorEnum } from "@inventaryexpert/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type SectorOptionRow =
  Database["public"]["Functions"]["get_available_sectors"]["Returns"][number];

export type SectorOption = {
  value: SectorEnum;
  label: string;
  sortOrder: number;
};

export async function getAvailableSectorOptions(
  supabase: SupabaseClient<Database>,
): Promise<SectorOption[]> {
  const { data, error } = await supabase.rpc("get_available_sectors");

  if (error) {
    throw new Error(`Failed to load sector options: ${error.message}`);
  }

  return (data ?? []).map((sector: SectorOptionRow) => ({
    value: sector.value,
    label: sector.label,
    sortOrder: sector.sort_order,
  }));
}

export async function validateSectorSelection(
  supabase: SupabaseClient<Database>,
  sector: string,
): Promise<SectorEnum | null> {
  const sectors = await getAvailableSectorOptions(supabase);
  const match = sectors.find((option) => option.value === sector);

  return match?.value ?? null;
}
