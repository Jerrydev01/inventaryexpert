import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export async function ActiveSitesWidget() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("locations")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Active Locations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{count ?? 0}</p>
      </CardContent>
    </Card>
  );
}
