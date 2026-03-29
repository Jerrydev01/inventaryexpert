import type { Sector, SectorModule } from "@inventaryexpert/types";
import { constructionModule } from "./construction";
import { agricultureModule } from "./agriculture";
import { salesModule } from "./sales";
import { otherModule } from "./other";

const registry: Record<Sector, SectorModule> = {
  construction: constructionModule,
  agriculture:  agricultureModule,
  sales:        salesModule,
  other:        otherModule,
};

export function getModule(sector: Sector): SectorModule {
  return registry[sector];
}
