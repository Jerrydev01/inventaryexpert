import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export async function StockSummaryWidget() {
  const supabase = await createClient();
  const { data } = await supabase.from("inventory_balances").select("quantity");

  const totalLines = data?.length ?? 0;
  const totalQty = data?.reduce((sum, r) => sum + Number(r.quantity), 0) ?? 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Stock Lines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{totalLines}</p>
        <p className="text-xs text-muted-foreground">
          {totalQty.toLocaleString()} total units
        </p>
      </CardContent>
    </Card>
  );
}
