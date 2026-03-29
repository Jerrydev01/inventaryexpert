import { BalanceBadge } from "@/components/inventory/BalanceBadge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const LOW_STOCK_THRESHOLD = 5;

export default async function LowStockPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: balances, error } = await supabase
    .from("inventory_balances")
    .select(
      "quantity, item_id, location_id, items(name, unit, sku), locations(name, type)",
    )
    .eq("company_id", profile.company_id)
    .lte("quantity", LOW_STOCK_THRESHOLD)
    .order("quantity", { ascending: true });

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Low Stock</h1>
          <p className="text-sm text-muted-foreground">
            Items at or below {LOW_STOCK_THRESHOLD} units · requires attention
          </p>
        </div>
        <Link
          href="/dashboard/balances"
          className={buttonVariants({ variant: "outline" })}
        >
          All Balances
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Low Stock Items</CardTitle>
          <CardDescription>
            {balances?.length ?? 0} item-location
            {balances?.length !== 1 ? "s" : ""} below threshold
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load low stock data.
            </p>
          ) : !balances || balances.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              All items are sufficiently stocked.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => {
                  const item = b.items as {
                    name: string;
                    unit: string;
                    sku: string | null;
                  } | null;
                  const loc = b.locations as {
                    name: string;
                    type: string;
                  } | null;
                  return (
                    <TableRow key={`${b.item_id}-${b.location_id}`}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/items/${b.item_id}`}
                          className="hover:underline"
                        >
                          {item?.name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item?.sku ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/dashboard/locations/${b.location_id}`}
                          className="hover:underline"
                        >
                          {loc?.name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {loc?.type ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <BalanceBadge
                          quantity={b.quantity ?? 0}
                          unit={item?.unit ?? ""}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/stock/in?itemId=${b.item_id}&toLocationId=${b.location_id}`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          Restock
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
